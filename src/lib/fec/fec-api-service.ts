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

const FEC_API_BASE = 'https://api.open.fec.gov/v1';
const FEC_API_KEY = process.env.FEC_API_KEY;

if (!FEC_API_KEY) {
  throw new Error('FEC_API_KEY environment variable is required');
}

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

export interface FECApiResponse<T> {
  api_version: string;
  pagination: {
    pages: number;
    per_page: number;
    count: number;
    page: number;
  };
  results: T[];
}

// New interfaces for committee endpoint responses
export interface FECCommitteeResponse {
  committee_id: string;
  name: string;
  designation: string;
  cycles: number[];
  candidate_ids: string[];
  party: string;
  committee_type: string;
  committee_type_full: string;
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
    if (!FEC_API_KEY) {
      throw new Error('FEC_API_KEY is required but not provided');
    }
    this.apiKey = FEC_API_KEY;
    this.baseUrl = FEC_API_BASE;
  }

  /**
   * Make authenticated request to FEC API
   */
  private async makeRequest<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const urlWithKey = `${url}${url.includes('?') ? '&' : '?'}api_key=${this.apiKey}`;

    logger.info(`[FEC API] Requesting: ${endpoint}`);

    try {
      const response = await fetch(urlWithKey, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CivicIntelHub/1.0',
        },
        // Add timeout
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        throw new FECApiError(
          `FEC API error: ${response.status} ${response.statusText}`,
          response.status,
          endpoint
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof FECApiError) {
        throw error;
      }
      throw new FECApiError(
        `Failed to fetch from FEC API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0,
        endpoint
      );
    }
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
              `/schedules/schedule_a/?candidate_id=${candidateId}&committee_id=${committeeId}&cycle=${cycle}&per_page=${perPage}&page=${page}`
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
    // Get all available committee IDs using robust method
    const committeeIds = await this.findCandidateCommitteeIds(candidateId, cycle);
    if (committeeIds.length === 0) {
      logger.warn(
        `[FEC API] No committees found for ${candidateId}, cannot fetch sample contributions`
      );
      return [];
    }

    logger.info(`[FEC API] Fetching sample contributions using committee IDs:`, committeeIds);

    // Define cycles to try - current cycle and next election cycle
    const cyclesToTry = [cycle, cycle + 2, cycle - 2].filter(c => c >= 2020 && c <= 2030);
    logger.info(`[FEC API] Will try cycles: ${cyclesToTry.join(', ')} for contributions`);

    try {
      // Try each cycle with each committee until we find data
      for (const testCycle of cyclesToTry) {
        logger.info(`[FEC API] Trying cycle ${testCycle} for contributions`);

        for (let i = 0; i < committeeIds.length; i++) {
          const committeeId = committeeIds[i];
          try {
            const response = await this.makeRequest<FECApiResponse<FECContribution>>(
              `/schedules/schedule_a/?candidate_id=${candidateId}&committee_id=${committeeId}&cycle=${testCycle}&per_page=${Math.min(count, 100)}&page=1`
            );

            if (response.results && response.results.length > 0) {
              logger.info(
                `[FEC API] ✅ SUCCESS: Found ${response.results.length} contributions from committee ${committeeId} in cycle ${testCycle}`
              );
              return response.results;
            } else {
              logger.info(
                `[FEC API] No contributions found for committee ${committeeId} in cycle ${testCycle}`
              );
            }
          } catch (cycleError) {
            if (cycleError instanceof FECApiError && cycleError.status === 422) {
              logger.info(
                `[FEC API] No data available for committee ${committeeId} in cycle ${testCycle} (422 error)`
              );
            } else {
              logger.warn(
                `[FEC API] Error fetching from committee ${committeeId} cycle ${testCycle}:`,
                cycleError instanceof Error ? cycleError.message : String(cycleError)
              );
            }
          }
        }
      }

      logger.warn(
        `[FEC API] No contributions found across ${committeeIds.length} committees and ${cyclesToTry.length} cycles`
      );
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
            `/schedules/schedule_a/?candidate_id=${candidateId}&committee_id=${committeeId}&cycle=${cycle}&per_page=1&page=1`
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
  async findCandidateCommitteeIds(candidateId: string, cycle: number): Promise<string[]> {
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
    try {
      logger.info(`[FEC API] STEP 2 - Trying candidate committees endpoint`);
      const response = await this.makeRequest<FECApiResponse<FECCommitteeResponse>>(
        `/candidate/${candidateId}/committees/?cycle=${cycle}&per_page=100`
      );

      if (response.results && response.results.length > 0) {
        // Step 2 returns committee objects directly, not nested in committees property
        const allCommittees = response.results
          .filter(committee => committee.cycles?.includes(cycle))
          .map(committee => committee.committee_id);

        // Add new committees not already found
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
          `[FEC API DIAGNOSTIC] ✓ ATTEMPT 1 SUCCESS - Found principal committee ${principalExactCycle.committee_id} for exact cycle ${cycle}`
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
        logger.warn(
          `[FEC API DIAGNOSTIC] ⚠ ATTEMPT 2 SUCCESS - Using most recent principal committee:`,
          {
            candidateId,
            cycle,
            selectedCommittee: mostRecentPrincipal!.committee_id,
            selectedCycles: mostRecentPrincipal!.cycles,
            allPrincipalCommittees: sortedPrincipal.map(c => ({
              committee_id: c.committee_id,
              cycles: c.cycles,
            })),
          }
        );
        return mostRecentPrincipal!.committee_id;
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
        logger.warn(`[FEC API DIAGNOSTIC] ⚠ ATTEMPT 3 SUCCESS - Using non-principal committee:`, {
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
      logger.warn(
        `[FEC API DIAGNOSTIC] ⚠ FINAL RESORT - Using first available committee as last fallback:`,
        {
          candidateId,
          cycle,
          selectedCommittee: firstCommittee!.committee_id,
          designation: firstCommittee!.designation,
          cycles: firstCommittee!.cycles,
          allCommittees: committees.length,
        }
      );
      return firstCommittee!.committee_id;
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
   */
  async getCommitteeInfo(committeeId: string): Promise<FECCommitteeResponse | null> {
    try {
      logger.info(`[FEC API] Fetching committee info for ${committeeId}`);

      const response = await this.makeRequest<FECApiResponse<FECCommitteeResponse>>(
        `/committee/${committeeId}/`
      );

      if (response.results && response.results.length > 0) {
        return response.results[0] || null;
      }

      return null;
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
}

// Export singleton instance
export const fecApiService = new FECApiService();
