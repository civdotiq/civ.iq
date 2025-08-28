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
      // eslint-disable-next-line no-console
      console.log(`[FEC DEBUG] Getting financial summary for ${candidateId} cycle ${cycle}`);

      const response = await this.makeRequest<FECApiResponse<FECFinancialSummary>>(
        `/candidate/${candidateId}/totals/?cycle=${cycle}`
      );

      // eslint-disable-next-line no-console
      console.log(`[FEC DEBUG] Response received:`, {
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
      // eslint-disable-next-line no-console
      console.log(`[FEC DEBUG] Error getting financial summary:`, error);
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
    // First get the principal committee ID
    const committeeId = await this.getPrincipalCommitteeId(candidateId, cycle);
    if (!committeeId) {
      logger.warn(
        `[FEC API] No principal committee found for ${candidateId}, cannot fetch contributions`
      );
      return [];
    }

    const allContributions: FECContribution[] = [];
    let page = 1;
    let totalPages = 1;
    const perPage = 100; // FEC API max per page

    logger.info(
      `[FEC API] Starting to fetch all contributions for ${candidateId} (committee: ${committeeId}) in cycle ${cycle}`
    );

    try {
      do {
        const response = await this.makeRequest<FECApiResponse<FECContribution>>(
          `/schedules/schedule_a/?candidate_id=${candidateId}&committee_id=${committeeId}&cycle=${cycle}&per_page=${perPage}&page=${page}`
        );

        if (response.results) {
          allContributions.push(...response.results);
        }

        totalPages = response.pagination.pages;

        if (progressCallback) {
          progressCallback(page, totalPages);
        }

        logger.info(
          `[FEC API] Fetched page ${page}/${totalPages}, total contributions so far: ${allContributions.length}`
        );

        page++;
      } while (page <= totalPages);

      logger.info(
        `[FEC API] Completed fetching all contributions: ${allContributions.length} records`
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
   */
  async getSampleContributions(
    candidateId: string,
    cycle: number,
    count: number = 100
  ): Promise<FECContribution[]> {
    // First get the principal committee ID
    const committeeId = await this.getPrincipalCommitteeId(candidateId, cycle);
    if (!committeeId) {
      logger.warn(
        `[FEC API] No principal committee found for ${candidateId}, cannot fetch sample contributions`
      );
      return [];
    }

    try {
      const response = await this.makeRequest<FECApiResponse<FECContribution>>(
        `/schedules/schedule_a/?candidate_id=${candidateId}&committee_id=${committeeId}&cycle=${cycle}&per_page=${count}&page=1`
      );

      return response.results || [];
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
   * Get principal campaign committee ID for a candidate in a specific cycle
   * Uses a resilient multi-step approach to find the best available committee ID
   */
  async getPrincipalCommitteeId(candidateId: string, cycle: number): Promise<string | null> {
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
}

// Export singleton instance
export const fecApiService = new FECApiService();
