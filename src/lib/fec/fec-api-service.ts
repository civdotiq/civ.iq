/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * FEC API Service - Single Source of Truth for Campaign Finance Data
 *
 * This service provides direct, unfiltered access to FEC.gov API data.
 * NO mock data, NO fallbacks, NO estimates - only real FEC data.
 */

import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache';
import { PAC_ACRONYMS } from '@/lib/data/pac-acronyms';

const FEC_API_BASE = 'https://api.open.fec.gov/v1';

// Get API key lazily to avoid build-time errors
function getFECApiKey(): string {
  const apiKey = process.env.FEC_API_KEY;
  if (!apiKey) {
    throw new Error('FEC_API_KEY environment variable is required');
  }
  return apiKey;
}

// In-memory request deduplication for concurrent identical requests
const pendingRequests = new Map<string, Promise<unknown>>();

// Raw FEC API Response Types - exactly as returned by FEC
export interface FECFinancialSummary {
  candidate_id: string;
  cycle: number;
  receipts: number; // Changed from total_receipts
  disbursements: number; // Changed from total_disbursements
  last_cash_on_hand_end_period: number; // Changed from cash_on_hand_end_period
  individual_contributions: number;
  other_political_committee_contributions: number;
  political_party_committee_contributions: number;
  candidate_contribution: number; // Changed from candidate_contributions
  coverage_start_date: string;
  coverage_end_date: string;
  // Legacy field mappings for backward compatibility
  total_receipts?: number;
  total_disbursements?: number;
  cash_on_hand_end_period?: number;
}

export interface FECContribution {
  contributor_name: string;
  contributor_city: string;
  contributor_state: string;
  contributor_zip: string;
  contributor_employer: string;
  contributor_occupation: string;
  contribution_receipt_amount: number;
  contribution_receipt_date: string;
  committee_name: string;
  candidate_id: string;
  file_number: number;
  line_number: string;
}

export interface FECPaginatedResponse<T> {
  results: T[];
  pagination: {
    pages: number;
    per_page: number;
    count: number;
    page: number;
  };
}

/**
 * FEC pagination cursor — returned by schedule_a / schedule_b endpoints.
 *
 * FEC's `page=N` pagination is hard-capped at page 10,000 (~1M rows). Deeper
 * results MUST be reached via `last_indexes`: for each follow-up request,
 * pass every key/value from the previous response's `last_indexes` as query
 * params alongside the same `sort` parameter.
 */
export type FECLastIndexes = Record<string, string | number>;

export interface FECApiResponse<T> {
  api_version: string;
  pagination: {
    pages: number;
    per_page: number;
    count: number;
    page: number;
    last_indexes?: FECLastIndexes | null;
  };
  results: T[];
}

// Committee search result (returned by /committees/?q= search)
export interface FECCommitteeSearchResult {
  committee_id: string;
  name: string;
  committee_type: string;
  committee_type_full: string;
  designation: string;
  designation_full: string;
  party: string;
  state: string;
  treasurer_name: string;
  cycles: number[];
  candidate_ids: string[];
  total_disbursements: number;
  total_receipts: number;
}

// Committee financial totals (returned by /committee/{id}/totals/)
export interface FECCommitteeTotals {
  cycle: number;
  receipts: number;
  disbursements: number;
  last_cash_on_hand_end_period: number;
  individual_contributions: number;
  other_political_committee_contributions: number;
  independent_expenditures: number;
  contributions: number;
  coverage_start_date: string;
  coverage_end_date: string;
}

// Aggregated disbursement by recipient (returned by /schedules/schedule_b/by_recipient_id/)
export interface FECDisbursementByRecipient {
  recipient_id: string;
  recipient_name: string;
  total: number;
  count: number;
  committee_id: string;
  cycle: number;
  memo_total: number;
  memo_count: number;
}

// Individual disbursement record (returned by /schedules/schedule_b/)
export interface FECDisbursementRecord {
  recipient_name: string;
  disbursement_amount: number;
  disbursement_date: string;
  candidate_office: string;
  candidate_office_state: string;
  candidate_office_district: string;
  recipient_committee_id: string;
  recipient_state: string;
  disbursement_description: string;
  memo_text: string;
  line_number: string;
}

// New interfaces for committee endpoint responses
export interface FECCommitteeResponse {
  committee_id: string;
  name: string;
  designation: string;
  cycles: number[];
  candidate_ids: string[];
  party: string;
  state: string;
  committee_type: string;
  committee_type_full: string;
  treasurer_name?: string;
  sponsor_candidate_ids?: string[];
}

export interface FECCandidateCommitteesResponse {
  candidate_id: string;
  committees: Array<{
    committee_id: string;
    designation: string;
    cycles: number[];
    name: string;
  }>;
}

class FECApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public endpoint: string
  ) {
    super(message);
    this.name = 'FECApiError';
  }
}

/**
 * Classify PAC type based on FEC committee type codes
 * Reference: https://www.fec.gov/campaign-finance-data/committee-type-code-descriptions/
 */
export function classifyPACType(
  committeeType: string,
  designation: string
): 'superPac' | 'traditional' | 'leadership' | 'hybrid' | null {
  // Super PACs (Independent Expenditure-Only Committees)
  if (committeeType === 'O') {
    return 'superPac';
  }

  // Leadership PACs (typically designated 'J' - Joint Fundraiser, or 'D' - Delegate Committee)
  if (designation === 'D' || designation === 'J') {
    return 'leadership';
  }

  // Hybrid PACs (can operate as both traditional PAC and Super PAC)
  // These are relatively rare and would be indicated by specific designations
  if (designation === 'B' && committeeType === 'N') {
    return 'hybrid';
  }

  // Traditional PACs
  if (committeeType === 'N' || committeeType === 'Q') {
    return 'traditional';
  }

  // If it doesn't match any PAC category, return null
  return null;
}

/**
 * Core FEC API Service
 * Handles all direct communication with FEC.gov API
 */
export class FECApiService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = getFECApiKey();
    this.baseUrl = FEC_API_BASE;
  }

  /**
   * Make authenticated request to FEC API.
   *
   * FEC enforces a 1000 req/hr quota and returns 429 when exhausted. On 429
   * we back off (honouring Retry-After when present) and retry up to
   * maxRetries times before surfacing the failure. 5xx errors get the same
   * retry treatment because FEC occasionally times out under load.
   */
  private async makeRequest<T>(endpoint: string, maxRetries: number = 3): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    logger.info(`[FEC API] Requesting: ${endpoint}`);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CivicIntelHub/1.0',
            'X-API-Key': this.apiKey,
          },
          signal: AbortSignal.timeout(30000),
        });

        if (response.ok) {
          return (await response.json()) as T;
        }

        const shouldRetry = response.status === 429 || response.status >= 500;
        if (shouldRetry && attempt < maxRetries) {
          const retryAfterHeader = response.headers.get('retry-after');
          const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : NaN;
          const backoffMs = Number.isFinite(retryAfterSec)
            ? retryAfterSec * 1000
            : Math.min(30000, 1000 * 2 ** attempt);
          logger.warn(
            `[FEC API] ${response.status} on ${endpoint} — retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`
          );
          await new Promise(r => setTimeout(r, backoffMs));
          continue;
        }

        throw new FECApiError(
          `FEC API error: ${response.status} ${response.statusText}`,
          response.status,
          endpoint
        );
      } catch (error) {
        if (error instanceof FECApiError) {
          throw error;
        }
        if (attempt < maxRetries) {
          const backoffMs = Math.min(30000, 1000 * 2 ** attempt);
          logger.warn(
            `[FEC API] Network error on ${endpoint} — retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`
          );
          await new Promise(r => setTimeout(r, backoffMs));
          continue;
        }
        throw new FECApiError(
          `Failed to fetch from FEC API: ${error instanceof Error ? error.message : 'Unknown error'}`,
          0,
          endpoint
        );
      }
    }

    // Unreachable: loop either returns success or throws.
    throw new FECApiError(`FEC API retries exhausted for ${endpoint}`, 0, endpoint);
  }

  /**
   * Get candidate's financial summary for a specific cycle
   * Returns raw FEC financial totals - no processing, no estimates
   */
  async getFinancialSummary(
    candidateId: string,
    cycle: number
  ): Promise<FECFinancialSummary | null> {
    try {
      logger.debug('Getting FEC financial summary', { candidateId, cycle });

      const response = await this.makeRequest<FECApiResponse<FECFinancialSummary>>(
        `/candidate/${candidateId}/totals/?cycle=${cycle}`
      );

      logger.debug('FEC response received', {
        hasResults: !!(response.results && response.results.length > 0),
        resultsCount: response.results?.length || 0,
        firstResult: response.results?.[0],
      });

      // Return the most recent summary for the cycle
      if (response.results && response.results.length > 0) {
        return response.results[0] || null;
      }

      return null;
    } catch (error) {
      logger.debug('Error getting FEC financial summary', error);
      logger.error(`[FEC API] Failed to get financial summary for ${candidateId}:`, error);
      throw error;
    }
  }

  /**
   * Paginate all individual contributions (Schedule A) for a candidate using
   * FEC's `last_indexes` cursor.
   *
   * FEC caps `page=N` pagination at page 10,000 — for high-volume candidates
   * that translates to roughly the first 1M rows in the best case. Deep
   * results MUST be reached via the cursor returned in
   * `pagination.last_indexes`. This method pages until `limit` rows have been
   * collected or the cursor runs out.
   *
   * Caching: closed cycles are immutable, so they are cached for 30 days;
   * the current/in-progress cycle is cached for 1 hour. Cache keys include
   * `limit` because callers with different budgets should not share a slice.
   *
   * Returns the collected rows plus coverage metadata (`fetched`,
   * `estimatedTotal`, `coveragePercent`) so consumers can show citizens how
   * much of the donor base their view represents.
   */
  async getAllContributions(
    candidateId: string,
    cycle: number,
    opts: {
      limit?: number;
      perPage?: number;
      sort?: string;
      onPage?: (page: { fetched: number; estimatedTotal: number }) => void;
    } = {}
  ): Promise<{
    contributions: FECContribution[];
    coverage: {
      fetched: number;
      estimatedTotal: number;
      coveragePercent: number;
      cappedAt: number | null;
      cursorExhausted: boolean;
    };
  }> {
    const limit = opts.limit ?? 2000;
    const perPage = Math.min(opts.perPage ?? 100, 100);
    const sort = opts.sort ?? '-contribution_receipt_amount';

    const committeeIds = await this.findCandidateCommitteeIds(candidateId, cycle);
    if (committeeIds.length === 0) {
      logger.warn(`[FEC API] No committees found for ${candidateId}, cannot fetch contributions`);
      return {
        contributions: [],
        coverage: {
          fetched: 0,
          estimatedTotal: 0,
          coveragePercent: 0,
          cappedAt: limit,
          cursorExhausted: true,
        },
      };
    }

    const cacheKey = `fec:all-contributions:${candidateId}:${cycle}:${limit}:${sort}`;
    const currentYear = new Date().getFullYear();
    const isClosedCycle = cycle < currentYear;
    const cacheTtlMs = isClosedCycle ? 30 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000;

    try {
      const cached = await govCache.get<{
        contributions: FECContribution[];
        coverage: {
          fetched: number;
          estimatedTotal: number;
          coveragePercent: number;
          cappedAt: number | null;
          cursorExhausted: boolean;
        };
      }>(cacheKey);
      if (cached) {
        logger.info(
          `[FEC API] Cache hit for getAllContributions ${candidateId}:${cycle} (fetched=${cached.coverage.fetched})`
        );
        return cached;
      }
    } catch {
      // Cache miss — continue to API fetch
    }

    // Probe every committee up-front so `estimatedTotal` reflects the full
    // universe even when the caller-provided limit stops pagination before we
    // touch later committees. Each probe is `per_page=1`, so N probes cost N
    // FEC requests regardless of payload depth. This is a cheap fix for the
    // previous behaviour where `estimatedTotal` depended on how far
    // pagination got and could be misleadingly low.
    //
    // Caveat: when a donor contributes to multiple committees linked to the
    // same candidate (principal + leadership PAC + joint fundraiser), those
    // rows appear in both committee counts, so this sum is an upper bound
    // rather than an exact dedupe. The `coveragePercent` is still a useful
    // magnitude estimate; consumers that need exact dedupe must fetch the
    // full set and match on `transaction_id`.
    const collected: FECContribution[] = [];
    let estimatedTotal = 0;
    let cursorExhausted = false;

    for (const committeeId of committeeIds) {
      const probeUrl =
        `/schedules/schedule_a/?candidate_id=${candidateId}` +
        `&committee_id=${committeeId}` +
        `&two_year_transaction_period=${cycle}&per_page=1`;
      try {
        const probe = await this.makeRequest<FECApiResponse<FECContribution>>(probeUrl);
        estimatedTotal += probe.pagination?.count ?? 0;
      } catch (error) {
        logger.warn(
          `[FEC API] estimatedTotal probe failed for committee ${committeeId}: ${error instanceof Error ? error.message : String(error)}`
        );
        // Continue — a missing probe leaves the committee out of the
        // denominator but pagination can still proceed.
      }
    }

    for (const committeeId of committeeIds) {
      if (collected.length >= limit) break;

      const baseUrl =
        `/schedules/schedule_a/?candidate_id=${candidateId}` +
        `&committee_id=${committeeId}` +
        `&two_year_transaction_period=${cycle}` +
        `&per_page=${perPage}` +
        `&sort=${encodeURIComponent(sort)}`;

      let cursor: FECLastIndexes | null = null;
      let pageNum = 0;
      let committeeDone = false;

      while (collected.length < limit && !committeeDone) {
        const cursorParams = cursor
          ? '&' +
            Object.entries(cursor)
              .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
              .join('&')
          : '';
        const url = `${baseUrl}${cursorParams}`;

        let response: FECApiResponse<FECContribution>;
        try {
          response = await this.makeRequest<FECApiResponse<FECContribution>>(url);
        } catch (error) {
          logger.warn(
            `[FEC API] getAllContributions committee ${committeeId} page ${pageNum} failed:`,
            error instanceof Error ? error.message : String(error)
          );
          break;
        }

        const results = response.results ?? [];
        if (results.length === 0) {
          committeeDone = true;
          cursorExhausted = true;
          break;
        }

        collected.push(...results);

        if (opts.onPage) {
          opts.onPage({ fetched: collected.length, estimatedTotal });
        }

        const nextCursor = response.pagination?.last_indexes;
        if (!nextCursor || Object.keys(nextCursor).length === 0) {
          committeeDone = true;
          cursorExhausted = true;
          break;
        }
        cursor = nextCursor;
        pageNum++;
      }
    }

    const trimmed = collected.slice(0, limit);
    const coveragePercent =
      estimatedTotal > 0 ? Math.min(100, (trimmed.length / estimatedTotal) * 100) : 0;

    const result = {
      contributions: trimmed,
      coverage: {
        fetched: trimmed.length,
        estimatedTotal,
        coveragePercent: Math.round(coveragePercent * 10) / 10,
        cappedAt: trimmed.length >= limit ? limit : null,
        cursorExhausted,
      },
    };

    try {
      await govCache.set(cacheKey, result, {
        ttl: cacheTtlMs,
        source: isClosedCycle ? 'fec-all-contributions-closed' : 'fec-all-contributions-current',
        dataType: 'finance',
      });
    } catch {
      // Non-fatal — cache failure shouldn't drop the payload.
    }

    logger.info(
      `[FEC API] getAllContributions ${candidateId}:${cycle} — fetched ${trimmed.length}/${estimatedTotal} (${coveragePercent.toFixed(1)}% coverage, cursorExhausted=${cursorExhausted})`
    );

    return result;
  }

  /**
   * Get ALL individual contributions for a candidate in a cycle
   * This method handles pagination automatically to get complete data
   * WARNING: This can be thousands of records for major candidates
   */
  async getAllIndividualContributions(
    candidateId: string,
    cycle: number,
    progressCallback?: (current: number, total: number) => void
  ): Promise<FECContribution[]> {
    // Get all available committee IDs using robust method
    const committeeIds = await this.findCandidateCommitteeIds(candidateId, cycle);
    if (committeeIds.length === 0) {
      logger.warn(`[FEC API] No committees found for ${candidateId}, cannot fetch contributions`);
      return [];
    }

    const allContributions: FECContribution[] = [];
    let totalPages = 0;
    let currentPage = 0;
    const perPage = 100; // FEC API max per page

    logger.info(
      `[FEC API] Starting to fetch all contributions for ${candidateId} from ${committeeIds.length} committees in cycle ${cycle}`
    );

    try {
      // Fetch contributions from all committees
      for (const committeeId of committeeIds) {
        logger.info(`[FEC API] Fetching contributions from committee ${committeeId}`);

        let page = 1;
        let committeeTotalPages = 1;

        do {
          try {
            const response = await this.makeRequest<FECApiResponse<FECContribution>>(
              `/schedules/schedule_a/?candidate_id=${candidateId}&committee_id=${committeeId}&two_year_transaction_period=${cycle}&per_page=${perPage}&page=${page}`
            );

            if (response.results) {
              allContributions.push(...response.results);
            }

            committeeTotalPages = response.pagination.pages;
            totalPages += committeeTotalPages;
            currentPage++;

            if (progressCallback) {
              progressCallback(currentPage, totalPages);
            }

            logger.info(
              `[FEC API] Committee ${committeeId}: Fetched page ${page}/${committeeTotalPages}, total contributions so far: ${allContributions.length}`
            );

            page++;
          } catch (committeeError) {
            logger.warn(
              `[FEC API] Error fetching from committee ${committeeId} page ${page}:`,
              committeeError instanceof Error ? committeeError.message : String(committeeError)
            );
            break; // Move to next committee
          }
        } while (page <= committeeTotalPages);
      }

      logger.info(
        `[FEC API] Completed fetching all contributions from ${committeeIds.length} committees: ${allContributions.length} records`
      );
      return allContributions;
    } catch (error) {
      logger.error(`[FEC API] Failed to get contributions for ${candidateId}:`, error);
      throw error;
    }
  }

  /**
   * Get a sample of individual contributions (first page only)
   * Useful for quick analysis without fetching thousands of records
   * Automatically tries multiple cycles to find contribution data
   */
  async getSampleContributions(
    candidateId: string,
    cycle: number,
    count: number = 100
  ): Promise<FECContribution[]> {
    // Check cache first — multiple analyzers fetch the same contributions per page load
    const cacheKey = `fec:contributions:${candidateId}:${cycle}:${count}`;
    try {
      const cached = await govCache.get<FECContribution[]>(cacheKey);
      if (cached) {
        logger.info(`[FEC API] Cache hit for sample contributions`, { candidateId, cycle });
        return cached;
      }
    } catch {
      // Cache miss — continue to API fetch
    }

    // Get all available committee IDs using robust method
    const committeeIds = await this.findCandidateCommitteeIds(candidateId, cycle);
    if (committeeIds.length === 0) {
      logger.warn(
        `[FEC API] No committees found for ${candidateId}, cannot fetch sample contributions`
      );
      return [];
    }

    logger.info(`[FEC API] Fetching sample contributions using committee IDs:`, committeeIds);

    // Helper function to check if a contribution is a conduit
    const isConduit = (contribution: FECContribution): boolean => {
      const name = contribution.contributor_name?.toUpperCase() || '';
      return name.includes('ACTBLUE') || name.includes('WINRED');
    };

    // ENHANCED: Fetch multiple pages and filter out conduits to get real contributor data
    try {
      // Try each committee for the requested cycle until we have enough data
      for (let i = 0; i < committeeIds.length; i++) {
        const committeeId = committeeIds[i];
        const allContributions: FECContribution[] = [];
        const nonConduitContributions: FECContribution[] = [];

        try {
          const perPage = 100;
          const baseUrl = `/schedules/schedule_a/?candidate_id=${candidateId}&committee_id=${committeeId}&two_year_transaction_period=${cycle}&per_page=${perPage}&sort=-contribution_receipt_amount`;

          // Fetch page 1 first to learn total count
          const firstPage = await this.makeRequest<FECApiResponse<FECContribution>>(
            `${baseUrl}&page=1`
          );

          if (firstPage.results && firstPage.results.length > 0) {
            allContributions.push(...firstPage.results);
            const pageNonConduits = firstPage.results.filter(c => !isConduit(c));
            nonConduitContributions.push(...pageNonConduits);

            // Determine how many more pages to fetch (max 4 more, cap at 500 total)
            const totalAvailable = firstPage.pagination?.count ?? firstPage.results.length;
            const maxPages = Math.min(5, Math.ceil(totalAvailable / perPage));
            const needMore =
              nonConduitContributions.length < count &&
              firstPage.results.length >= perPage &&
              maxPages > 1;

            if (needMore) {
              // Fetch remaining pages in parallel
              const pageNumbers = Array.from({ length: maxPages - 1 }, (_, i) => i + 2);
              const pageResults = await Promise.all(
                pageNumbers.map(page =>
                  this.makeRequest<FECApiResponse<FECContribution>>(
                    `${baseUrl}&page=${page}`
                  ).catch(() => null)
                )
              );

              for (const response of pageResults) {
                if (response?.results && response.results.length > 0) {
                  allContributions.push(...response.results);
                  nonConduitContributions.push(...response.results.filter(c => !isConduit(c)));
                }
              }
            }

            logger.info(
              `[FEC API] Fetched ${allContributions.length} total (${nonConduitContributions.length} non-conduit) contributions from committee ${committeeId}`
            );
          }

          if (nonConduitContributions.length > 0) {
            logger.info(
              `[FEC API] SUCCESS: Found ${nonConduitContributions.length} non-conduit contributions (${allContributions.length} total) from committee ${committeeId} in cycle ${cycle}`
            );
            // Return up to the requested count of non-conduit contributions
            const result = nonConduitContributions.slice(0, count);
            govCache
              .set(cacheKey, result, { dataType: 'finance', source: 'fec-api' })
              .catch(() => {});
            return result;
          } else if (allContributions.length > 0) {
            logger.warn(
              `[FEC API] WARNING: Only found conduit contributions for committee ${committeeId}, returning them anyway`
            );
            const result = allContributions.slice(0, count);
            govCache
              .set(cacheKey, result, { dataType: 'finance', source: 'fec-api' })
              .catch(() => {});
            return result;
          } else {
            logger.info(
              `[FEC API] No contributions found for committee ${committeeId} in cycle ${cycle}`
            );
          }
        } catch (committeeError) {
          if (committeeError instanceof FECApiError && committeeError.status === 422) {
            logger.info(
              `[FEC API] No data available for committee ${committeeId} in cycle ${cycle} (422 error)`
            );
          } else {
            logger.warn(
              `[FEC API] Error fetching from committee ${committeeId} cycle ${cycle}:`,
              committeeError instanceof Error ? committeeError.message : String(committeeError)
            );
          }
        }
      }

      logger.warn(`[FEC API] No contributions found across ${committeeIds.length} committees`);
      return [];
    } catch (error) {
      logger.error(`[FEC API] Failed to get sample contributions for ${candidateId}:`, error);
      throw error;
    }
  }

  /**
   * Get candidate basic information
   */
  async getCandidateInfo(candidateId: string): Promise<Record<string, unknown> | null> {
    try {
      const response = await this.makeRequest<FECApiResponse<Record<string, unknown>>>(
        `/candidate/${candidateId}/`
      );

      return response.results?.[0] || null;
    } catch (error) {
      logger.error(`[FEC API] Failed to get candidate info for ${candidateId}:`, error);
      throw error;
    }
  }

  /**
   * Validate that a candidate exists and has data for the specified cycle
   */
  async validateCandidateData(
    candidateId: string,
    cycle: number
  ): Promise<{
    exists: boolean;
    hasFinancialData: boolean;
    hasContributions: boolean;
    estimatedContributionCount: number;
  }> {
    try {
      // Check if candidate exists and has financial summary
      const summary = await this.getFinancialSummary(candidateId, cycle);
      const hasFinancialData = summary !== null;

      // Check if they have any contributions
      const sampleContributions = await this.getSampleContributions(candidateId, cycle, 1);
      const hasContributions = sampleContributions.length > 0;

      // Get estimated total count without fetching all data
      let estimatedCount = 0;
      if (hasContributions) {
        // Need committee ID for accurate count
        const committeeId = await this.getPrincipalCommitteeId(candidateId, cycle);
        if (committeeId) {
          const response = await this.makeRequest<FECApiResponse<FECContribution>>(
            `/schedules/schedule_a/?candidate_id=${candidateId}&committee_id=${committeeId}&two_year_transaction_period=${cycle}&per_page=1&page=1`
          );
          estimatedCount = response.pagination.count;
        }
      }

      return {
        exists: hasFinancialData || hasContributions,
        hasFinancialData,
        hasContributions,
        estimatedContributionCount: estimatedCount,
      };
    } catch (error) {
      logger.error(`[FEC API] Failed to validate candidate ${candidateId}:`, error);
      return {
        exists: false,
        hasFinancialData: false,
        hasContributions: false,
        estimatedContributionCount: 0,
      };
    }
  }

  /**
   * Find candidate committee IDs using robust multi-endpoint fallback strategy
   * Returns array of committee IDs prioritized by relevance to the candidate and cycle
   */
  /**
   * Short-lived in-memory cache for committee IDs (5 min TTL).
   * Prevents redundant multi-step lookups when getSampleContributions,
   * getIndividualContributionsWithEmployer, and getPrincipalCommitteeId
   * all call findCandidateCommitteeIds in the same request cycle.
   */
  private static committeeIdCache = new Map<string, { ids: string[]; expires: number }>();

  async findCandidateCommitteeIds(candidateId: string, cycle: number): Promise<string[]> {
    // Check in-memory cache first (avoids 2-4 FEC calls per redundant invocation)
    const cacheKey = `${candidateId}:${cycle}`;
    const cached = FECApiService.committeeIdCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      logger.info(
        `[FEC API] Committee cache hit for ${candidateId}: ${cached.ids.length} committees`
      );
      return cached.ids;
    }

    logger.info(`[FEC API] Starting robust committee finding for ${candidateId} cycle ${cycle}`);

    const foundCommittees: string[] = [];

    // STEP 1: /committees/?candidate_id={id}&cycle={cycle} (Primary - most reliable)
    try {
      logger.info(`[FEC API] STEP 1 - Trying committees endpoint with candidate_id and cycle`);
      const response = await this.makeRequest<FECApiResponse<FECCommitteeResponse>>(
        `/committees/?candidate_id=${candidateId}&cycle=${cycle}&per_page=100`
      );

      if (response.results && response.results.length > 0) {
        const committeeIds = response.results
          .filter(
            committee =>
              committee.candidate_ids?.includes(candidateId) && committee.cycles?.includes(cycle)
          )
          .sort((a, b) => {
            // Prioritize principal committees (designation = 'P')
            if (a.designation === 'P' && b.designation !== 'P') return -1;
            if (a.designation !== 'P' && b.designation === 'P') return 1;
            return 0;
          })
          .map(committee => committee.committee_id);

        foundCommittees.push(...committeeIds);
        logger.info(
          `[FEC API] STEP 1 SUCCESS - Found ${committeeIds.length} committees:`,
          committeeIds
        );
      } else {
        logger.info(`[FEC API] STEP 1 - No committees found via committees endpoint`);
      }
    } catch (error) {
      logger.warn(
        `[FEC API] STEP 1 FAILED - committees endpoint error:`,
        error instanceof Error ? error.message : String(error)
      );
    }

    // STEP 2: /candidate/{id}/committees/?cycle={cycle} (Secondary alternative)
    // Skip if Step 1 already found committees — saves an FEC API call
    if (foundCommittees.length === 0) {
      try {
        logger.info(`[FEC API] STEP 2 - Trying candidate committees endpoint`);
        const response = await this.makeRequest<FECApiResponse<FECCommitteeResponse>>(
          `/candidate/${candidateId}/committees/?cycle=${cycle}&per_page=100`
        );

        if (response.results && response.results.length > 0) {
          const allCommittees = response.results
            .filter(committee => committee.cycles?.includes(cycle))
            .map(committee => committee.committee_id);

          const newCommittees = allCommittees.filter(id => !foundCommittees.includes(id));
          foundCommittees.push(...newCommittees);

          logger.info(
            `[FEC API] STEP 2 SUCCESS - Found ${newCommittees.length} additional committees:`,
            newCommittees
          );
        } else {
          logger.info(`[FEC API] STEP 2 - No committees found via candidate committees endpoint`);
        }
      } catch (error) {
        logger.warn(
          `[FEC API] STEP 2 FAILED - candidate committees endpoint error:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    } else {
      logger.info(`[FEC API] STEP 2 - Skipped (Step 1 found ${foundCommittees.length} committees)`);
    }

    // STEP 3: /candidate/{id}/ (Legacy fallback - current approach)
    if (foundCommittees.length === 0) {
      try {
        logger.info(`[FEC API] STEP 3 - Trying legacy candidate endpoint`);
        const legacyCommitteeId = await this.getPrincipalCommitteeIdLegacy(candidateId, cycle);
        if (legacyCommitteeId) {
          foundCommittees.push(legacyCommitteeId);
          logger.info(`[FEC API] STEP 3 SUCCESS - Found legacy committee:`, legacyCommitteeId);
        } else {
          logger.info(`[FEC API] STEP 3 - No committee found via legacy endpoint`);
        }
      } catch (error) {
        logger.warn(
          `[FEC API] STEP 3 FAILED - legacy endpoint error:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    // STEP 4: Direct contribution lookup with proper API parameters (Ultimate fallback)
    if (foundCommittees.length === 0) {
      try {
        logger.info(
          `[FEC API] STEP 4 - Trying direct contribution lookup with two_year_transaction_period`
        );
        // Use two_year_transaction_period instead of cycle to avoid API requirements
        const response = await this.makeRequest<
          FECApiResponse<{ committee_id: string; candidate_id?: string }>
        >(`/schedules/schedule_a/?two_year_transaction_period=${cycle}&per_page=10`);

        if (response.results && response.results.length > 0) {
          // Filter for contributions to this specific candidate
          const candidateContributions = response.results.filter(
            r => r.candidate_id === candidateId
          );

          if (candidateContributions.length > 0) {
            const contributionCommittees = [
              ...new Set(candidateContributions.map(r => r.committee_id)),
            ].filter(id => id && !foundCommittees.includes(id));
            foundCommittees.push(...contributionCommittees);
            logger.info(
              `[FEC API] STEP 4 SUCCESS - Found ${contributionCommittees.length} committees via contributions:`,
              contributionCommittees
            );
          } else {
            logger.info(`[FEC API] STEP 4 - No contributions found for candidate ${candidateId}`);
          }
        } else {
          logger.info(`[FEC API] STEP 4 - No contribution data found`);
        }
      } catch (error) {
        // Try alternative Step 4 with contributor name filter as final resort
        logger.warn(
          `[FEC API] STEP 4 FAILED - trying alternative with contributor filter:`,
          error instanceof Error ? error.message : String(error)
        );

        try {
          // Alternative: Search with candidate's last name as contributor filter
          const candidateInfo = await this.getCandidateInfo(candidateId);
          const candidateName = ((candidateInfo as Record<string, unknown>)?.name as string) || '';
          const lastName = candidateName.split(',')[0]?.trim() || '';

          if (lastName) {
            logger.info(`[FEC API] STEP 4 ALT - Trying with contributor name filter: ${lastName}`);
            const altResponse = await this.makeRequest<
              FECApiResponse<{ committee_id: string; candidate_id?: string }>
            >(
              `/schedules/schedule_a/?contributor_name=${encodeURIComponent(lastName)}&two_year_transaction_period=${cycle}&per_page=50`
            );

            if (altResponse.results && altResponse.results.length > 0) {
              const candidateContributions = altResponse.results.filter(
                r => r.candidate_id === candidateId
              );

              if (candidateContributions.length > 0) {
                const contributionCommittees = [
                  ...new Set(candidateContributions.map(r => r.committee_id)),
                ].filter(id => id && !foundCommittees.includes(id));
                foundCommittees.push(...contributionCommittees);
                logger.info(
                  `[FEC API] STEP 4 ALT SUCCESS - Found ${contributionCommittees.length} committees:`,
                  contributionCommittees
                );
              }
            }
          }
        } catch (altError) {
          logger.warn(
            `[FEC API] STEP 4 ALT FAILED - all fallback attempts exhausted:`,
            altError instanceof Error ? altError.message : String(altError)
          );
        }
      }
    }

    logger.info(
      `[FEC API] Committee finding complete for ${candidateId}: found ${foundCommittees.length} committees:`,
      foundCommittees
    );

    // Cache for 5 minutes to avoid redundant lookups within the same request cycle
    FECApiService.committeeIdCache.set(cacheKey, {
      ids: foundCommittees,
      expires: Date.now() + 5 * 60 * 1000,
    });

    return foundCommittees;
  }

  /**
   * Get principal campaign committee ID for a candidate in a specific cycle
   * NEW ROBUST METHOD - Uses multi-endpoint fallback strategy
   */
  async getPrincipalCommitteeId(candidateId: string, cycle: number): Promise<string | null> {
    // Use the new robust method and return the first (most relevant) committee
    const committees = await this.findCandidateCommitteeIds(candidateId, cycle);
    return committees.length > 0 ? committees[0]! : null;
  }

  /**
   * Get principal campaign committee ID for a candidate in a specific cycle
   * LEGACY METHOD - Uses original single-endpoint approach for backward compatibility
   */
  async getPrincipalCommitteeIdLegacy(candidateId: string, cycle: number): Promise<string | null> {
    logger.info(`[FEC API DIAGNOSTIC] Starting committee resolution:`, {
      candidateId,
      cycle,
      timestamp: new Date().toISOString(),
    });

    try {
      // Fetch candidate details WITHOUT specifying cycle to get ALL committees
      logger.info(
        `[FEC API DIAGNOSTIC] Fetching candidate details for committee lookup: ${candidateId}`
      );
      const response = await this.makeRequest<
        FECApiResponse<{
          principal_committees: Array<{
            committee_id: string;
            designation: string;
            cycles: number[];
            name: string;
          }>;
        }>
      >(`/candidate/${candidateId}/`);

      logger.info(`[FEC API DIAGNOSTIC] Candidate details API response:`, {
        candidateId,
        responseReceived: !!response,
        hasResults: !!response.results?.[0],
        hasPrincipalCommittees: !!response.results?.[0]?.principal_committees,
        committeesCount: response.results?.[0]?.principal_committees?.length || 0,
      });

      if (!response.results?.[0]?.principal_committees) {
        logger.warn(
          `[FEC API DIAGNOSTIC] Committee resolution FAILED - no committees structure found:`,
          {
            candidateId,
            cycle,
            response: response.results?.[0],
          }
        );
        return null;
      }

      const committees = response.results[0].principal_committees;
      if (committees.length === 0) {
        logger.warn(`[FEC API DIAGNOSTIC] Committee resolution FAILED - empty committees array:`, {
          candidateId,
          cycle,
        });
        return null;
      }

      // DIAGNOSTIC: Log all available committees
      logger.info(`[FEC API DIAGNOSTIC] All available committees for ${candidateId}:`, {
        candidateId,
        cycle,
        committeesCount: committees.length,
        committees: committees.map(c => ({
          committee_id: c.committee_id,
          designation: c.designation,
          name: c.name,
          cycles: c.cycles,
        })),
      });

      // ATTEMPT 1 (Ideal): Find principal committee (designation = 'P') for exact cycle
      logger.info(
        `[FEC API DIAGNOSTIC] ATTEMPT 1 - Looking for principal committee with exact cycle ${cycle}`
      );
      const principalExactCycle = committees.find(
        committee => committee.designation === 'P' && committee.cycles?.includes(cycle)
      );

      logger.info(`[FEC API DIAGNOSTIC] ATTEMPT 1 result:`, {
        candidateId,
        cycle,
        found: !!principalExactCycle,
        committee: principalExactCycle
          ? {
              committee_id: principalExactCycle.committee_id,
              designation: principalExactCycle.designation,
              cycles: principalExactCycle.cycles,
              name: principalExactCycle.name,
            }
          : null,
      });

      if (principalExactCycle) {
        logger.info(
          `[FEC API DIAGNOSTIC] ATTEMPT 1 SUCCESS - Found principal committee ${principalExactCycle.committee_id} for exact cycle ${cycle}`
        );
        return principalExactCycle.committee_id;
      }

      // ATTEMPT 2 (Fallback): Find most recent principal committee (any cycle)
      logger.info(
        `[FEC API DIAGNOSTIC] ATTEMPT 2 - Looking for any principal committee (designation = 'P')`
      );
      const principalCommittees = committees.filter(c => c.designation === 'P');

      logger.info(`[FEC API DIAGNOSTIC] ATTEMPT 2 result:`, {
        candidateId,
        cycle,
        principalCommitteesFound: principalCommittees.length,
        principalCommittees: principalCommittees.map(c => ({
          committee_id: c.committee_id,
          cycles: c.cycles,
          name: c.name,
        })),
      });

      if (principalCommittees.length > 0) {
        // Sort by most recent cycle
        const sortedPrincipal = principalCommittees.sort((a, b) => {
          const maxCycleA = Math.max(...(a.cycles || [0]));
          const maxCycleB = Math.max(...(b.cycles || [0]));
          return maxCycleB - maxCycleA;
        });

        const mostRecentPrincipal = sortedPrincipal[0];
        if (!mostRecentPrincipal) {
          return null;
        }
        logger.warn(
          `[FEC API DIAGNOSTIC] ATTEMPT 2 SUCCESS - Using most recent principal committee:`,
          {
            candidateId,
            cycle,
            selectedCommittee: mostRecentPrincipal.committee_id,
            selectedCycles: mostRecentPrincipal.cycles,
            allPrincipalCommittees: sortedPrincipal.map(c => ({
              committee_id: c.committee_id,
              cycles: c.cycles,
            })),
          }
        );
        return mostRecentPrincipal.committee_id;
      }

      // ATTEMPT 3 (Final Fallback): Find ANY committee for the target cycle
      logger.info(
        `[FEC API DIAGNOSTIC] ATTEMPT 3 - Looking for any committee with target cycle ${cycle}`
      );
      const anyCycleCommittee = committees.find(committee => committee.cycles?.includes(cycle));

      logger.info(`[FEC API DIAGNOSTIC] ATTEMPT 3 result:`, {
        candidateId,
        cycle,
        found: !!anyCycleCommittee,
        committee: anyCycleCommittee
          ? {
              committee_id: anyCycleCommittee.committee_id,
              designation: anyCycleCommittee.designation,
              cycles: anyCycleCommittee.cycles,
              name: anyCycleCommittee.name,
            }
          : null,
      });

      if (anyCycleCommittee) {
        logger.warn(`[FEC API DIAGNOSTIC] ATTEMPT 3 SUCCESS - Using non-principal committee:`, {
          candidateId,
          cycle,
          selectedCommittee: anyCycleCommittee.committee_id,
          designation: anyCycleCommittee.designation,
          cycles: anyCycleCommittee.cycles,
        });
        return anyCycleCommittee.committee_id;
      }

      // FINAL RESORT: Use first available committee
      logger.info(`[FEC API DIAGNOSTIC] FINAL RESORT - Using first available committee`);
      const firstCommittee = committees[0];
      if (!firstCommittee) {
        return null;
      }
      logger.warn(
        `[FEC API DIAGNOSTIC] FINAL RESORT - Using first available committee as last fallback:`,
        {
          candidateId,
          cycle,
          selectedCommittee: firstCommittee.committee_id,
          designation: firstCommittee.designation,
          cycles: firstCommittee.cycles,
          allCommittees: committees.length,
        }
      );
      return firstCommittee.committee_id;
    } catch (error) {
      logger.error(`[FEC API DIAGNOSTIC] Committee resolution COMPLETELY FAILED:`, {
        candidateId,
        cycle,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      return null;
    }
  }

  /**
   * Get available election cycles for a candidate
   * Only returns cycles with actual data (2000-2024)
   */
  async getCandidateElectionCycles(candidateId: string): Promise<number[]> {
    try {
      const response = await this.makeRequest<FECApiResponse<{ cycle: number }>>(
        `/candidate/${candidateId}/totals/`
      );

      if (response.results && response.results.length > 0) {
        // Extract unique cycles, filter to valid election years only, and sort in descending order
        const cycles = [...new Set(response.results.map(result => result.cycle))]
          .filter(cycle => cycle >= 2000 && cycle <= 2024 && cycle % 2 === 0) // Only even years 2000-2024
          .sort((a, b) => b - a);

        logger.info(`[FEC API] Found election cycles for ${candidateId}:`, cycles);
        return cycles;
      }

      return [];
    } catch (error) {
      logger.error(`[FEC API] Failed to get election cycles for ${candidateId}:`, error);
      return [];
    }
  }

  /**
   * Get committee information including type classifications
   * Uses 30-day cache (committee data rarely changes) + request deduplication
   */
  async getCommitteeInfo(committeeId: string): Promise<FECCommitteeResponse | null> {
    const cacheKey = `fec:committee:${committeeId}`;

    try {
      // Check cache first (30-day TTL)
      const cached = await govCache.get<FECCommitteeResponse>(cacheKey);
      if (cached) {
        logger.debug(`[FEC API] Committee info cache hit: ${committeeId}`);
        return cached;
      }

      // Check if there's already a pending request for this committee
      const pendingKey = `committee:${committeeId}`;
      const existingRequest = pendingRequests.get(pendingKey) as
        | Promise<FECCommitteeResponse | null>
        | undefined;

      if (existingRequest) {
        logger.debug(`[FEC API] Deduplicating concurrent request for committee ${committeeId}`);
        return existingRequest;
      }

      // Create new request and track it
      const requestPromise = (async () => {
        try {
          logger.info(`[FEC API] Fetching committee info for ${committeeId}`);

          const response = await this.makeRequest<FECApiResponse<FECCommitteeResponse>>(
            `/committee/${committeeId}/`
          );

          const result =
            response.results && response.results.length > 0 ? response.results[0] || null : null;

          // Cache successful response for 30 days
          if (result) {
            await govCache.set(cacheKey, result, {
              ttl: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
              source: 'fec-committee-api',
              dataType: 'committees',
            });
            logger.debug(`[FEC API] Cached committee info for ${committeeId} (30 days)`);
          }

          return result;
        } finally {
          // Always clean up the pending request tracker
          pendingRequests.delete(pendingKey);
        }
      })();

      // Store the promise so concurrent requests can use it
      pendingRequests.set(pendingKey, requestPromise);

      return requestPromise;
    } catch (error) {
      logger.error(`[FEC API] Failed to get committee info for ${committeeId}:`, error);
      return null;
    }
  }

  /**
   * Get independent expenditures (Schedule E) supporting or opposing a candidate
   */
  async getIndependentExpenditures(
    candidateId: string,
    cycle: number
  ): Promise<
    Array<{
      committee_id: string;
      committee_name: string;
      support_oppose_indicator: 'S' | 'O';
      expenditure_amount: number;
      expenditure_date: string;
      payee_name: string;
      expenditure_description: string;
    }>
  > {
    try {
      logger.info(`[FEC API] Fetching independent expenditures for ${candidateId} cycle ${cycle}`);

      const response = await this.makeRequest<
        FECApiResponse<{
          committee_id: string;
          committee_name: string;
          support_oppose_indicator: 'S' | 'O';
          expenditure_amount: number;
          expenditure_date: string;
          payee_name: string;
          expenditure_description: string;
        }>
      >(
        `/schedules/schedule_e/by_candidate/?candidate_id=${candidateId}&cycle=${cycle}&per_page=100`
      );

      if (response.results && response.results.length > 0) {
        logger.info(
          `[FEC API] Found ${response.results.length} independent expenditures for ${candidateId}`
        );
        return response.results;
      }

      return [];
    } catch (error) {
      logger.error(`[FEC API] Failed to get independent expenditures for ${candidateId}:`, error);
      return [];
    }
  }

  /**
   * Get individual contributions (Schedule A) with employer/occupation data
   * Filters for is_individual=true to get actual people, not committees
   * This provides better industry categorization data
   */
  async getIndividualContributionsWithEmployer(
    candidateId: string,
    cycle: number,
    count: number = 200
  ): Promise<FECContribution[]> {
    const committeeIds = await this.findCandidateCommitteeIds(candidateId, cycle);
    if (committeeIds.length === 0) {
      logger.warn(`[FEC API] No committees found for ${candidateId}`);
      return [];
    }

    logger.info(
      `[FEC API] Fetching individual contributions with employer data for ${candidateId}`
    );

    try {
      // Use is_individual=true to get actual donors (not committees)
      // Sort by amount to get largest individual donors first
      for (const committeeId of committeeIds) {
        const baseUrl = `/schedules/schedule_a/?committee_id=${committeeId}&two_year_transaction_period=${cycle}&is_individual=true&per_page=100&sort=-contribution_receipt_amount`;

        // Fetch page 1 first to learn total count
        const firstPage = await this.makeRequest<FECApiResponse<FECContribution>>(
          `${baseUrl}&page=1`
        ).catch(() => null);

        if (!firstPage?.results || firstPage.results.length === 0) continue;

        const allContributions: FECContribution[] = firstPage.results.filter(
          c => c.contributor_employer || c.contributor_occupation
        );

        // Determine if we need more pages and fetch in parallel
        const maxPages = Math.ceil(count / 100);
        const needMore =
          allContributions.length < count && firstPage.results.length >= 100 && maxPages > 1;

        if (needMore) {
          const pageNumbers = Array.from({ length: Math.min(maxPages - 1, 4) }, (_, i) => i + 2);
          const pageResults = await Promise.all(
            pageNumbers.map(page =>
              this.makeRequest<FECApiResponse<FECContribution>>(`${baseUrl}&page=${page}`).catch(
                () => null
              )
            )
          );

          for (const response of pageResults) {
            if (response?.results && response.results.length > 0) {
              allContributions.push(
                ...response.results.filter(c => c.contributor_employer || c.contributor_occupation)
              );
            }
          }
        }

        if (allContributions.length > 0) {
          logger.info(
            `[FEC API] Found ${allContributions.length} individual contributions with employer data`
          );
          return allContributions.slice(0, count);
        }
      }

      return [];
    } catch (error) {
      logger.error(`[FEC API] Failed to get individual contributions for ${candidateId}:`, error);
      return [];
    }
  }

  /**
   * Get contribution totals grouped by size bucket
   * Returns: $200 and under, $200.01-$499.99, $500-$999.99, $1000-$1999.99, $2000+
   * FEC aggregate endpoints filter by committee_id, not candidate_id, so we
   * resolve the principal committee first. In-memory committee cache makes
   * multiple aggregate calls for the same candidate share one lookup.
   */
  async getContributionsBySize(
    candidateId: string,
    cycle: number
  ): Promise<Array<{ size: number; total: number; count: number }>> {
    try {
      const committeeIds = await this.findCandidateCommitteeIds(candidateId, cycle);
      if (committeeIds.length === 0) return [];

      const committeeId = committeeIds[0];
      logger.info(
        `[FEC API] Fetching contributions by size for ${candidateId} (committee ${committeeId}) cycle ${cycle}`
      );

      const response = await this.makeRequest<
        FECApiResponse<{ size: number; total: number; count: number }>
      >(`/schedules/schedule_a/by_size/?committee_id=${committeeId}&cycle=${cycle}&per_page=20`);

      return response.results ?? [];
    } catch (error) {
      logger.error(`[FEC API] Failed to get contributions by size for ${candidateId}:`, error);
      return [];
    }
  }

  /**
   * Get contribution totals grouped by employer (top N by dollar amount).
   * Single FEC request; replaces per-contribution pagination for industry analysis.
   */
  async getContributionsByEmployer(
    candidateId: string,
    cycle: number,
    topN: number = 100
  ): Promise<Array<{ employer: string; total: number; count: number }>> {
    try {
      const committeeIds = await this.findCandidateCommitteeIds(candidateId, cycle);
      if (committeeIds.length === 0) return [];

      const committeeId = committeeIds[0];
      logger.info(
        `[FEC API] Fetching contributions by employer for ${candidateId} (committee ${committeeId}) cycle ${cycle}`
      );

      const response = await this.makeRequest<
        FECApiResponse<{ employer: string | null; total: number | null; count: number | null }>
      >(
        `/schedules/schedule_a/by_employer/?committee_id=${committeeId}&cycle=${cycle}&per_page=${topN}&sort=-total`
      );

      return (response.results ?? []).map(r => ({
        employer: r.employer ?? '',
        total: r.total ?? 0,
        count: r.count ?? 0,
      }));
    } catch (error) {
      logger.error(`[FEC API] Failed to get contributions by employer for ${candidateId}:`, error);
      return [];
    }
  }

  /**
   * Get contribution totals grouped by occupation (top N by dollar amount).
   * Complements by_employer for rows where employer is blank or non-informative.
   */
  async getContributionsByOccupation(
    candidateId: string,
    cycle: number,
    topN: number = 100
  ): Promise<Array<{ occupation: string; total: number; count: number }>> {
    try {
      const committeeIds = await this.findCandidateCommitteeIds(candidateId, cycle);
      if (committeeIds.length === 0) return [];

      const committeeId = committeeIds[0];
      logger.info(
        `[FEC API] Fetching contributions by occupation for ${candidateId} (committee ${committeeId}) cycle ${cycle}`
      );

      const response = await this.makeRequest<
        FECApiResponse<{ occupation: string | null; total: number | null; count: number | null }>
      >(
        `/schedules/schedule_a/by_occupation/?committee_id=${committeeId}&cycle=${cycle}&per_page=${topN}&sort=-total`
      );

      return (response.results ?? []).map(r => ({
        occupation: r.occupation ?? '',
        total: r.total ?? 0,
        count: r.count ?? 0,
      }));
    } catch (error) {
      logger.error(
        `[FEC API] Failed to get contributions by occupation for ${candidateId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Get contribution totals grouped by contributor state.
   * Single FEC request; replaces per-contribution pagination for geography analysis.
   */
  async getContributionsByState(
    candidateId: string,
    cycle: number
  ): Promise<Array<{ state: string; stateFull: string; total: number; count: number }>> {
    try {
      const committeeIds = await this.findCandidateCommitteeIds(candidateId, cycle);
      if (committeeIds.length === 0) return [];

      const committeeId = committeeIds[0];
      logger.info(
        `[FEC API] Fetching contributions by state for ${candidateId} (committee ${committeeId}) cycle ${cycle}`
      );

      const response = await this.makeRequest<
        FECApiResponse<{
          state: string | null;
          state_full: string | null;
          total: number | null;
          count: number | null;
        }>
      >(
        `/schedules/schedule_a/by_state/?committee_id=${committeeId}&cycle=${cycle}&per_page=100&sort=-total`
      );

      return (response.results ?? []).map(r => ({
        state: (r.state ?? '').toUpperCase(),
        stateFull: r.state_full ?? '',
        total: r.total ?? 0,
        count: r.count ?? 0,
      }));
    } catch (error) {
      logger.error(`[FEC API] Failed to get contributions by state for ${candidateId}:`, error);
      return [];
    }
  }

  /**
   * Search committees by name
   * Uses 5-minute cache for search results
   * Expands well-known acronyms so e.g. "AIPAC" finds the real committee
   */
  async searchCommittees(
    query: string,
    page: number = 1,
    perPage: number = 20,
    committeeType?: string[]
  ): Promise<FECPaginatedResponse<FECCommitteeSearchResult>> {
    const cacheKey = `fec:committee-search:${query}:${page}:${perPage}:${committeeType?.join(',') ?? 'all'}`;

    const cached = await govCache.get<FECPaginatedResponse<FECCommitteeSearchResult>>(cacheKey);
    if (cached) {
      logger.debug(`[FEC API] Committee search cache hit: ${query}`);
      return cached;
    }

    try {
      const typeParams = committeeType?.map(t => `&committee_type=${t}`).join('') ?? '';
      const baseParams = `&page=${page}&per_page=${perPage}&sort=-receipts${typeParams}`;

      const response = await this.makeRequest<FECApiResponse<FECCommitteeSearchResult>>(
        `/committees/?q=${encodeURIComponent(query)}${baseParams}`
      );

      let results = response.results ?? [];
      const { pagination } = response;

      // If the query matches a known acronym, also search the expanded name
      // and merge results. Many major PACs register under full names only.
      const expanded = PAC_ACRONYMS[query.toUpperCase()];
      if (expanded && page === 1) {
        try {
          const expandedResponse = await this.makeRequest<FECApiResponse<FECCommitteeSearchResult>>(
            `/committees/?q=${encodeURIComponent(expanded)}${baseParams}`
          );

          const expandedResults = expandedResponse.results ?? [];
          if (expandedResults.length > 0) {
            const seen = new Set(results.map(r => r.committee_id));
            const newResults = expandedResults.filter(r => !seen.has(r.committee_id));
            // Prepend expanded results (they're the ones the user actually wants)
            // Keep original API count — the extra merged results are a page-1 bonus
            results = [...newResults, ...results];
          }
        } catch {
          // Expanded search failed; original results are fine
        }
      }

      const result: FECPaginatedResponse<FECCommitteeSearchResult> = {
        results,
        pagination,
      };

      await govCache.set(cacheKey, result, {
        ttl: 5 * 60 * 1000, // 5 minutes
        source: 'fec-committee-search',
        dataType: 'committees',
      });

      return result;
    } catch (error) {
      logger.error(`[FEC API] Failed to search committees for "${query}":`, error);
      throw error;
    }
  }

  /**
   * Get committee financial totals for a specific cycle
   * Uses 6-hour cache
   */
  async getCommitteeTotals(committeeId: string, cycle: number): Promise<FECCommitteeTotals | null> {
    const cacheKey = `fec:committee-totals:${committeeId}:${cycle}`;

    const cached = await govCache.get<FECCommitteeTotals>(cacheKey);
    if (cached) {
      logger.debug(`[FEC API] Committee totals cache hit: ${committeeId}`);
      return cached;
    }

    try {
      const response = await this.makeRequest<FECApiResponse<FECCommitteeTotals>>(
        `/committee/${committeeId}/totals/?cycle=${cycle}`
      );

      const result = response.results?.[0] ?? null;

      if (result) {
        await govCache.set(cacheKey, result, {
          ttl: 6 * 60 * 60 * 1000, // 6 hours
          source: 'fec-committee-totals',
          dataType: 'finance',
        });
      }

      return result;
    } catch (error) {
      logger.error(`[FEC API] Failed to get committee totals for ${committeeId}:`, error);
      return null;
    }
  }

  /**
   * Get committee disbursements aggregated by recipient
   * Returns one row per recipient (not individual transactions)
   * Uses 6-hour cache
   */
  async getCommitteeDisbursementsByRecipient(
    committeeId: string,
    cycle: number,
    page: number = 1,
    perPage: number = 100
  ): Promise<FECPaginatedResponse<FECDisbursementByRecipient>> {
    const cacheKey = `fec:committee-disb-by-recipient:${committeeId}:${cycle}:${page}:${perPage}`;

    const cached = await govCache.get<FECPaginatedResponse<FECDisbursementByRecipient>>(cacheKey);
    if (cached) {
      logger.debug(`[FEC API] Disbursements by recipient cache hit: ${committeeId} page ${page}`);
      return cached;
    }

    try {
      const response = await this.makeRequest<FECApiResponse<FECDisbursementByRecipient>>(
        `/schedules/schedule_b/by_recipient_id/?committee_id=${committeeId}&cycle=${cycle}&page=${page}&per_page=${perPage}&sort=-total`
      );

      const result: FECPaginatedResponse<FECDisbursementByRecipient> = {
        results: response.results ?? [],
        pagination: response.pagination,
      };

      await govCache.set(cacheKey, result, {
        ttl: 6 * 60 * 60 * 1000, // 6 hours
        source: 'fec-disbursements-by-recipient',
        dataType: 'finance',
      });

      return result;
    } catch (error) {
      logger.error(`[FEC API] Failed to get disbursements by recipient for ${committeeId}:`, error);
      throw error;
    }
  }

  /**
   * Get individual committee disbursement records (Schedule B)
   * For drill-down into specific recipient transactions
   */
  async getCommitteeDisbursements(
    committeeId: string,
    cycle: number,
    recipientCommitteeId?: string,
    page: number = 1,
    perPage: number = 100
  ): Promise<FECPaginatedResponse<FECDisbursementRecord>> {
    try {
      let endpoint = `/schedules/schedule_b/?committee_id=${committeeId}&two_year_transaction_period=${cycle}&page=${page}&per_page=${perPage}&sort=-disbursement_amount`;
      if (recipientCommitteeId) {
        endpoint += `&recipient_committee_id=${recipientCommitteeId}`;
      }

      const response = await this.makeRequest<FECApiResponse<FECDisbursementRecord>>(endpoint);

      return {
        results: response.results ?? [],
        pagination: response.pagination,
      };
    } catch (error) {
      logger.error(`[FEC API] Failed to get disbursements for ${committeeId}:`, error);
      throw error;
    }
  }

  /**
   * Get PAC contributions (Schedule A) to a candidate
   * Filters for non-individual contributions (PACs, parties, etc.)
   */
  async getPACContributions(
    candidateId: string,
    cycle: number
  ): Promise<
    Array<{
      committee_id: string;
      committee_name: string;
      contribution_receipt_amount: number;
      contribution_receipt_date: string;
      entity_type: string;
    }>
  > {
    try {
      logger.info(`[FEC API] Fetching PAC contributions for ${candidateId} cycle ${cycle}`);

      const response = await this.makeRequest<
        FECApiResponse<{
          committee_id: string;
          committee_name: string;
          contribution_receipt_amount: number;
          contribution_receipt_date: string;
          entity_type: string;
          is_individual: boolean;
        }>
      >(
        `/schedules/schedule_a/?candidate_id=${candidateId}&two_year_transaction_period=${cycle}&is_individual=false&per_page=100`
      );

      if (response.results && response.results.length > 0) {
        logger.info(
          `[FEC API] Found ${response.results.length} PAC contributions for ${candidateId}`
        );
        return response.results;
      }

      return [];
    } catch (error) {
      logger.error(`[FEC API] Failed to get PAC contributions for ${candidateId}:`, error);
      return [];
    }
  }

  /**
   * Look up an FEC committee by ID and return its candidate_ids.
   *
   * Principal campaign committees (e.g., "LARSON FOR CONGRESS") have a
   * candidate_ids array linking to the candidate (e.g., ["H8CT01046"]).
   * Party committees and PACs return an empty array.
   */
  async getCommitteeCandidateIds(committeeId: string): Promise<string[]> {
    const cacheKey = `fec:committee-candidates:${committeeId}`;

    const cached = await govCache.get<string[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.makeRequest<FECApiResponse<{ candidate_ids: string[] }>>(
        `/committee/${committeeId}/`
      );

      const candidateIds = response.results?.[0]?.candidate_ids ?? [];

      await govCache.set(cacheKey, candidateIds, {
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 days — committee-candidate links rarely change
        source: 'fec-committee-candidates',
        dataType: 'finance',
      });

      return candidateIds;
    } catch (error) {
      logger.warn(`[FEC API] Failed to look up committee ${committeeId}:`, error);
      return [];
    }
  }
}

// Lazy singleton instance - only created when first accessed (avoids build-time errors)
let _fecApiService: FECApiService | null = null;

function getFecApiServiceInstance(): FECApiService {
  if (!_fecApiService) {
    _fecApiService = new FECApiService();
  }
  return _fecApiService;
}

// Proxy for backward compatibility - lazily instantiates the service on first method call
export const fecApiService = new Proxy({} as FECApiService, {
  get(_target, prop) {
    const instance = getFecApiServiceInstance();
    const value = instance[prop as keyof FECApiService];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});
