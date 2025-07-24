/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type {
  FecApiCandidate,
  FecApiCandidatesResponse,
  FecApiContribution,
  FecApiContributionsResponse,
  FecApiFinancialSummary,
} from '../types/api-responses';

/**
 * Federal Election Commission (FEC) API Integration
 * 
 * This module provides utilities for integrating with the FEC API
 * to fetch real campaign finance data for federal candidates.
 * 
 * API Documentation: https://api.open.fec.gov/developers/
 */

interface FECConfig {
  apiKey?: string;
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

interface FECCandidate {
  candidate_id: string;
  name: string;
  party: string;
  office: 'H' | 'S' | 'P'; // House, Senate, President
  state: string;
  district?: string;
  election_years: number[];
  candidate_status: string;
  incumbent_challenge: string;
  cycles: number[];
}

interface FECCommittee {
  committee_id: string;
  name: string;
  committee_type: string;
  committee_type_full: string;
  designation: string;
  designation_full: string;
  party: string;
  filing_frequency: string;
  organization_type: string;
  state: string;
  cycles: number[];
  candidate_ids: string[];
}

interface FECFinancialSummary {
  candidate_id: string;
  cycle: number;
  coverage_start_date: string;
  coverage_end_date: string;
  total_receipts: number;
  total_disbursements: number;
  cash_on_hand: number;
  debts_owed: number;
  individual_contributions: number;
  pac_contributions: number;
  party_contributions: number;
  candidate_contributions: number;
  transfer_from_other_committees: number;
  transfer_to_other_committees: number;
  refunds_to_individuals: number;
  refunds_to_committees: number;
}

interface FECContribution {
  contributor_name: string;
  contributor_city: string;
  contributor_state: string;
  contributor_zip: string;
  contributor_employer: string;
  contributor_occupation: string;
  contribution_receipt_amount: number;
  contribution_receipt_date: string;
  receipt_type: string;
  receipt_type_full: string;
  committee_id: string;
  committee_name: string;
  candidate_id: string;
  candidate_name: string;
  memo_text?: string;
}

interface FECExpenditure {
  committee_id: string;
  committee_name: string;
  recipient_name: string;
  recipient_city: string;
  recipient_state: string;
  disbursement_amount: number;
  disbursement_date: string;
  disbursement_description: string;
  purpose_code: string;
  purpose_code_full: string;
  category_code: string;
  category_code_full: string;
  candidate_id?: string;
  candidate_name?: string;
}

interface FECAPIResponse<T> {
  results: T[];
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    count: number;
  };
}

// Rate limiter for FEC API calls
class FECRateLimiter {
  private requests: number[] = [];
  private readonly maxRequestsPerHour = 1000; // FEC API limit

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    // Remove requests older than 1 hour
    this.requests = this.requests.filter(time => time > oneHourAgo);
    
    if (this.requests.length >= this.maxRequestsPerHour) {
      const waitTime = 3600000 - (now - this.requests[0]);
      if (waitTime > 0) {
        console.log(`FEC API rate limit reached, waiting ${Math.round(waitTime / 1000)} seconds`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
  }
}

class FECAPI {
  private config: FECConfig;
  private cache: Map<string, { data: unknown; timestamp: number; ttl: number }>;
  private rateLimiter: FECRateLimiter;

  constructor(config?: Partial<FECConfig>) {
    this.config = {
      apiKey: process.env.FEC_API_KEY,
      baseUrl: 'https://api.open.fec.gov/v1',
      timeout: 30000,
      retryAttempts: 3,
      ...config
    };
    
    this.cache = new Map();
    this.rateLimiter = new FECRateLimiter();
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<FECAPIResponse<T> | null> {
    await this.rateLimiter.waitIfNeeded();
    
    const cacheKey = `${endpoint}?${new URLSearchParams(params).toString()}`;
    const cached = this.cache.get(cacheKey);
    
    // Check cache first (6 hour TTL for FEC data)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    if (!this.config.apiKey) {
      console.warn('FEC API key not configured, some features may not work');
      return null;
    }

    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    
    // Add API key
    params.api_key = this.config.apiKey;
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
            'Accept': 'application/json'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Try to get error details from response body
          let errorDetails = '';
          try {
            const errorBody = await response.text();
            errorDetails = errorBody.substring(0, 500); // Limit error message length
          } catch (e) {
            errorDetails = 'Could not read error response body';
          }
          
          throw new Error(`HTTP ${response.status}: ${response.statusText}. Details: ${errorDetails}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(`FEC API Error: ${data.error}`);
        }

        // Cache successful response for 6 hours
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl: 6 * 60 * 60 * 1000
        });

        return data;

      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    console.error('FEC API request failed:', lastError?.message);
    return null;
  }

  /**
   * Search for candidates by name
   */
  async searchCandidates(name: string, cycle?: number): Promise<FECCandidate[]> {
    try {
      const params: Record<string, string> = {
        name: name,
        per_page: '20'
      };

      if (cycle) {
        params.cycle = cycle.toString();
      }

      const response = await this.makeRequest<FECCandidate>('/candidates/search/', params);
      return response?.results || [];

    } catch (error) {
      console.error('Error searching FEC candidates:', error);
      return [];
    }
  }

  /**
   * Get candidate by ID
   */
  async getCandidateById(candidateId: string): Promise<FECCandidate | null> {
    try {
      // Normalize and validate candidate ID
      const normalizedId = FECUtils.normalizeCandidateId(candidateId);
      const validationInfo = FECUtils.getCandidateIdValidationInfo(normalizedId);
      
      if (!validationInfo.isValid) {
        console.error('Invalid FEC candidate ID format:', {
          candidateId,
          normalizedId,
          errors: validationInfo.errors
        });
        return null;
      }
      
      const response = await this.makeRequest<FECCandidate>(`/candidate/${normalizedId}/`);
      return response?.results?.[0] || null;

    } catch (error) {
      console.error('Error fetching FEC candidate:', error);
      return null;
    }
  }

  /**
   * Get financial summary for a candidate
   */
  async getCandidateFinancials(candidateId: string, cycle?: number): Promise<FECFinancialSummary[]> {
    try {
      const params: Record<string, string> = {
        sort: '-cycle',
        per_page: '20'
      };

      if (cycle) {
        params.cycle = cycle.toString();
      }

      const response = await this.makeRequest<FECFinancialSummary>(`/candidate/${candidateId}/totals/`, params);
      return response?.results || [];

    } catch (error) {
      console.error('Error fetching candidate financials:', error);
      return [];
    }
  }

  /**
   * Get committees associated with a candidate
   */
  async getCandidateCommittees(candidateId: string, cycle?: number): Promise<FECCommittee[]> {
    try {
      const params: Record<string, string> = {
        candidate_id: candidateId,
        sort: '-receipts',
        per_page: '20'
      };

      if (cycle) {
        params.cycle = cycle.toString();
      }

      const response = await this.makeRequest<FECCommittee>('/committees/', params);
      return response?.results || [];

    } catch (error) {
      console.error('Error fetching candidate committees:', error);
      return [];
    }
  }

  /**
   * Get contributions to a candidate
   */
  async getCandidateContributions(
    candidateId: string, 
    cycle?: number, 
    minAmount?: number,
    limit = 100
  ): Promise<FECContribution[]> {
    try {
      const params: Record<string, string> = {
        candidate_id: candidateId,
        sort: '-contribution_receipt_date',
        per_page: limit.toString()
      };

      if (cycle) {
        params.cycle = cycle.toString();
      }

      if (minAmount) {
        params.min_amount = minAmount.toString();
      }

      const response = await this.makeRequest<FECContribution>('/schedules/schedule_a/', params);
      return response?.results || [];

    } catch (error) {
      console.error('Error fetching candidate contributions:', error);
      return [];
    }
  }

  /**
   * Get expenditures by a candidate's committees
   */
  async getCandidateExpenditures(
    candidateId: string,
    cycle?: number,
    limit = 100
  ): Promise<FECExpenditure[]> {
    try {
      // First get the candidate's committees
      const committees = await this.getCandidateCommittees(candidateId, cycle);
      
      if (committees.length === 0) {
        return [];
      }

      // Get expenditures for the primary committee
      const primaryCommittee = committees[0];
      
      const params: Record<string, string> = {
        committee_id: primaryCommittee.committee_id,
        sort: '-disbursement_date',
        per_page: limit.toString()
      };

      if (cycle) {
        params.cycle = cycle.toString();
      }

      const response = await this.makeRequest<FECExpenditure>('/schedules/schedule_b/', params);
      return response?.results || [];

    } catch (error) {
      console.error('Error fetching candidate expenditures:', error);
      return [];
    }
  }

  /**
   * Get top contributors to a candidate
   */
  async getTopContributors(
    candidateId: string,
    cycle?: number,
    limit = 20
  ): Promise<Array<{
    contributor_name: string;
    total_amount: number;
    contribution_count: number;
    employer?: string;
    occupation?: string;
  }>> {
    try {
      const contributions = await this.getCandidateContributions(candidateId, cycle, 200, 1000);
      
      // Aggregate by contributor name
      const contributorMap = new Map<string, {
        name: string;
        total: number;
        count: number;
        employer?: string;
        occupation?: string;
      }>();

      contributions.forEach(contribution => {
        const name = contribution.contributor_name;
        const existing = contributorMap.get(name);
        
        if (existing) {
          existing.total += contribution.contribution_receipt_amount;
          existing.count += 1;
        } else {
          contributorMap.set(name, {
            name,
            total: contribution.contribution_receipt_amount,
            count: 1,
            employer: contribution.contributor_employer,
            occupation: contribution.contributor_occupation
          });
        }
      });

      // Sort by total amount and return top contributors
      return Array.from(contributorMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, limit)
        .map(contributor => ({
          contributor_name: contributor.name,
          total_amount: contributor.total,
          contribution_count: contributor.count,
          employer: contributor.employer,
          occupation: contributor.occupation
        }));

    } catch (error) {
      console.error('Error fetching top contributors:', error);
      return [];
    }
  }

  /**
   * Get spending categories for a candidate
   */
  async getSpendingCategories(
    candidateId: string,
    cycle?: number
  ): Promise<Array<{
    category: string;
    total_amount: number;
    expenditure_count: number;
  }>> {
    try {
      const expenditures = await this.getCandidateExpenditures(candidateId, cycle, 1000);
      
      // Aggregate by category
      const categoryMap = new Map<string, {
        total: number;
        count: number;
      }>();

      expenditures.forEach(expenditure => {
        const category = expenditure.category_code_full || expenditure.purpose_code_full || 'Other';
        const existing = categoryMap.get(category);
        
        if (existing) {
          existing.total += expenditure.disbursement_amount;
          existing.count += 1;
        } else {
          categoryMap.set(category, {
            total: expenditure.disbursement_amount,
            count: 1
          });
        }
      });

      // Sort by total amount
      return Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          total_amount: data.total,
          expenditure_count: data.count
        }))
        .sort((a, b) => b.total_amount - a.total_amount);

    } catch (error) {
      console.error('Error fetching spending categories:', error);
      return [];
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Get PAC contributions to a candidate
   */
  async getPACContributions(
    candidateId: string, 
    cycle?: number, 
    limit: number = 20
  ): Promise<FECContribution[]> {
    try {
      const params: Record<string, string> = {
        candidate_id: candidateId,
        contributor_type: 'committee',
        sort: '-contribution_receipt_date',
        per_page: limit.toString()
      };

      if (cycle) {
        params.cycle = cycle.toString();
      }

      const response = await this.makeRequest<FECContribution>('/schedules/schedule_a/', params);
      
      // Filter for actual PACs
      const pacContributions = response?.results?.filter(contribution => 
        contribution.receipt_type_full?.includes('PAC') ||
        contribution.committee_name?.includes('PAC') ||
        contribution.receipt_type === 'PAC'
      ) || [];

      return pacContributions.slice(0, limit);
    } catch (error) {
      console.error('Error fetching PAC contributions:', error);
      return [];
    }
  }

  /**
   * Get comprehensive funding breakdown
   */
  async getComprehensiveFunding(candidateId: string, cycle?: number): Promise<{
    individual: number;
    pac: number;
    party: number;
    self: number;
    total: number;
    percentages: { individual: number; pac: number; party: number; self: number };
    lastUpdated: string;
    filingStatus: string;
  }> {
    try {
      const [contributions, committees] = await Promise.all([
        this.getCandidateContributions(candidateId, cycle, 200),
        this.getCandidateCommittees(candidateId, cycle)
      ]);

      // Categorize contributions
      let individual = 0, pac = 0, party = 0, self = 0;

      contributions.forEach(contrib => {
        const amount = contrib.contribution_receipt_amount || 0;
        const type = contrib.receipt_type_full?.toLowerCase() || '';
        const name = contrib.committee_name?.toLowerCase() || '';

        if (type.includes('individual') || (!type.includes('committee') && !name.includes('pac'))) {
          individual += amount;
        } else if (type.includes('pac') || name.includes('pac')) {
          pac += amount;
        } else if (type.includes('party') || name.includes('democratic') || name.includes('republican')) {
          party += amount;
        } else if (contrib.contributor_name?.toLowerCase().includes(contrib.candidate_name?.toLowerCase() || '')) {
          self += amount;
        } else {
          individual += amount; // Default to individual
        }
      });

      const total = individual + pac + party + self;

      return {
        individual,
        pac,
        party,
        self,
        total,
        percentages: {
          individual: total > 0 ? (individual / total) * 100 : 0,
          pac: total > 0 ? (pac / total) * 100 : 0,
          party: total > 0 ? (party / total) * 100 : 0,
          self: total > 0 ? (self / total) * 100 : 0
        },
        lastUpdated: new Date().toISOString(),
        filingStatus: committees.length > 0 ? committees[0].filing_frequency || 'Unknown' : 'No committee data'
      };
    } catch (error) {
      console.error('Error fetching comprehensive funding:', error);
      return {
        individual: 0, pac: 0, party: 0, self: 0, total: 0,
        percentages: { individual: 0, pac: 0, party: 0, self: 0 },
        lastUpdated: new Date().toISOString(),
        filingStatus: 'Error fetching data'
      };
    }
  }
}

// Default instance
export const fecAPI = new FECAPI();

// Export types
export type {
  FECCandidate,
  FECCommittee,
  FECFinancialSummary,
  FECContribution,
  FECExpenditure,
  FECAPIResponse,
  FECConfig
};

// Export class for custom instances
export { FECAPI };

/**
 * Utility functions for working with FEC data
 */
export const FECUtils = {
  /**
   * Check if FEC API is configured
   */
  isConfigured(): boolean {
    return !!process.env.FEC_API_KEY;
  },

  /**
   * Validate FEC candidate ID format
   * Expected format: [H|S|P][0-9][STATE][00000]
   * Examples: H8MI09068, S2MA00170, P80003338
   */
  validateCandidateId(candidateId: string): boolean {
    if (!candidateId || typeof candidateId !== 'string') {
      return false;
    }
    
    // Standard FEC candidate ID format
    const fecIdPattern = /^[HSP]\d[A-Z]{2}\d{5}$/;
    return fecIdPattern.test(candidateId);
  },

  /**
   * Get detailed validation info for a candidate ID
   */
  getCandidateIdValidationInfo(candidateId: string): {
    isValid: boolean;
    office?: string;
    state?: string;
    sequence?: string;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!candidateId || typeof candidateId !== 'string') {
      errors.push('Candidate ID is required and must be a string');
      return { isValid: false, errors };
    }
    
    if (candidateId.length !== 9) {
      errors.push(`Expected length 9, got ${candidateId.length}`);
    }
    
    // Check office code
    const officeCode = candidateId.charAt(0);
    if (!['H', 'S', 'P'].includes(officeCode)) {
      errors.push(`Invalid office code '${officeCode}', expected H, S, or P`);
    }
    
    // Check cycle digit
    const cycleDigit = candidateId.charAt(1);
    if (!/^\d$/.test(cycleDigit)) {
      errors.push(`Invalid cycle digit '${cycleDigit}', expected a number`);
    }
    
    // Check state code
    const stateCode = candidateId.substring(2, 4);
    if (!/^[A-Z]{2}$/.test(stateCode)) {
      errors.push(`Invalid state code '${stateCode}', expected 2 uppercase letters`);
    }
    
    // Check sequence number
    const sequenceNumber = candidateId.substring(4, 9);
    if (!/^\d{5}$/.test(sequenceNumber)) {
      errors.push(`Invalid sequence number '${sequenceNumber}', expected 5 digits`);
    }
    
    const isValid = errors.length === 0;
    
    return {
      isValid,
      office: isValid ? this.getOfficeDescription(officeCode) : undefined,
      state: isValid ? stateCode : undefined,
      sequence: isValid ? sequenceNumber : undefined,
      errors
    };
  },

  /**
   * Normalize candidate ID (uppercase, trim whitespace)
   */
  normalizeCandidateId(candidateId: string): string {
    if (!candidateId || typeof candidateId !== 'string') {
      return '';
    }
    
    return candidateId.trim().toUpperCase();
  },

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  /**
   * Get current election cycle
   */
  getCurrentCycle(): number {
    const currentYear = new Date().getFullYear();
    return currentYear % 2 === 0 ? currentYear : currentYear + 1;
  },

  /**
   * Get office description from code
   */
  getOfficeDescription(office: string): string {
    switch (office) {
      case 'H': return 'House of Representatives';
      case 'S': return 'Senate';
      case 'P': return 'President';
      default: return 'Unknown';
    }
  },

  /**
   * Get party color for UI display
   */
  getPartyColor(party: string): string {
    switch (party?.toUpperCase()) {
      case 'DEM': return '#3B82F6'; // Blue
      case 'REP': return '#EF4444'; // Red
      case 'IND': return '#8B5CF6'; // Purple
      default: return '#6B7280'; // Gray
    }
  },

  /**
   * Calculate fundraising efficiency (receipts per day)
   */
  calculateFundraisingRate(
    totalReceipts: number, 
    startDate: string, 
    endDate: string
  ): number {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    
    return totalReceipts / days;
  },

  /**
   * Categorize contribution amount
   */
  categorizeContribution(amount: number): string {
    if (amount < 200) return 'Small Dollar';
    if (amount < 1000) return 'Medium Dollar';
    if (amount < 2900) return 'Large Dollar';
    return 'Max Contribution';
  }
};