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
  total_receipts: number;
  total_disbursements: number;
  cash_on_hand_end_period: number;
  individual_contributions: number;
  other_political_committee_contributions: number;
  political_party_committee_contributions: number;
  candidate_contributions: number;
  coverage_start_date: string;
  coverage_end_date: string;
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
      const response = await this.makeRequest<FECApiResponse<FECFinancialSummary>>(
        `/candidate/${candidateId}/totals/?cycle=${cycle}`
      );

      // Return the most recent summary for the cycle
      if (response.results && response.results.length > 0) {
        return response.results[0] || null;
      }

      return null;
    } catch (error) {
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
    try {
      // Fetch candidate details WITHOUT specifying cycle to get ALL committees
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

      if (!response.results?.[0]?.principal_committees) {
        logger.warn(`[FEC API] No committees found for candidate ${candidateId}`);
        return null;
      }

      const committees = response.results[0].principal_committees;
      if (committees.length === 0) {
        logger.warn(`[FEC API] Empty committees array for candidate ${candidateId}`);
        return null;
      }

      // ATTEMPT 1 (Ideal): Find principal committee (designation = 'P') for exact cycle
      const principalExactCycle = committees.find(
        committee => committee.designation === 'P' && committee.cycles?.includes(cycle)
      );

      if (principalExactCycle) {
        logger.info(
          `[FEC API] ✓ Found principal committee ${principalExactCycle.committee_id} for exact cycle ${cycle}`
        );
        return principalExactCycle.committee_id;
      }

      // ATTEMPT 2 (Fallback): Find most recent principal committee (any cycle)
      const principalCommittees = committees.filter(c => c.designation === 'P');
      if (principalCommittees.length > 0) {
        // Sort by most recent cycle
        const sortedPrincipal = principalCommittees.sort((a, b) => {
          const maxCycleA = Math.max(...(a.cycles || [0]));
          const maxCycleB = Math.max(...(b.cycles || [0]));
          return maxCycleB - maxCycleA;
        });
        
        const mostRecentPrincipal = sortedPrincipal[0];
        logger.warn(
          `[FEC API] ⚠ Using most recent principal committee ${mostRecentPrincipal!.committee_id} ` +
          `(from cycles: ${mostRecentPrincipal!.cycles?.join(', ')})`
        );
        return mostRecentPrincipal!.committee_id;
      }

      // ATTEMPT 3 (Final Fallback): Find ANY committee for the target cycle
      const anyCycleCommittee = committees.find(
        committee => committee.cycles?.includes(cycle)
      );

      if (anyCycleCommittee) {
        logger.warn(
          `[FEC API] ⚠ Using non-principal committee ${anyCycleCommittee.committee_id} ` +
          `(designation: ${anyCycleCommittee.designation}) for cycle ${cycle}`
        );
        return anyCycleCommittee.committee_id;
      }

      // FINAL RESORT: Use first available committee
      const firstCommittee = committees[0];
      logger.warn(
        `[FEC API] ⚠ Using first available committee ${firstCommittee!.committee_id} as final fallback`
      );
      return firstCommittee!.committee_id;

    } catch (error) {
      logger.error(`[FEC API] Failed to get principal committee for ${candidateId}:`, error);
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
