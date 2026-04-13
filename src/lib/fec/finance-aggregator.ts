/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Finance Data Aggregator - Transforms Raw FEC Data into Processed Insights
 *
 * Takes raw FEC API data and processes it into structured analytics
 * with full transparency about data completeness and quality.
 */

import { fecApiService, FECContribution } from './fec-api-service';
import { categorizeContribution, IndustrySector } from './industry-taxonomy';
import logger from '@/lib/logging/simple-logger';

// Data quality interfaces
export interface DataQuality {
  industry: {
    totalContributionsAnalyzed: number;
    contributionsWithEmployer: number;
    completenessPercentage: number;
  };
  geography: {
    totalContributionsAnalyzed: number;
    contributionsWithState: number;
    completenessPercentage: number;
  };
  overallDataConfidence: 'high' | 'medium' | 'low';
}

export interface ProcessedIndustryData {
  industry: string;
  amount: number;
  percentage: number;
  count: number;
  topEmployers: Array<{
    name: string;
    amount: number;
    count: number;
  }>;
}

export interface ProcessedGeographicData {
  state: string;
  stateName: string;
  amount: number;
  percentage: number;
  count: number;
  isHomeState: boolean;
}

export interface ProcessedFinanceData {
  // Raw financial totals (directly from FEC)
  totalRaised: number;
  totalSpent: number;
  cashOnHand: number;
  individualContributions: number;
  pacContributions: number;
  partyContributions: number;
  candidateContributions: number;

  // Processed breakdowns (from individual contribution analysis)
  industryBreakdown: ProcessedIndustryData[];
  geographicBreakdown: ProcessedGeographicData[];

  // Data quality and transparency
  dataQuality: DataQuality;

  // Metadata
  candidateId: string;
  cycle: number;
  lastUpdated: string;
  fecDataSources: {
    financialSummary: string;
    contributions: string;
  };
}

/**
 * Process raw FEC contributions into industry breakdown
 *
 * Uses the unified industry taxonomy from @civiq/entity-resolution
 * for classification. For the OTHER sector (Retired, Not Employed, etc.),
 * uses the category name to keep those visible as distinct entries.
 */
function processIndustryBreakdown(
  contributions: FECContribution[],
  totalAmount: number
): { breakdown: ProcessedIndustryData[]; quality: DataQuality['industry'] } {
  const industryTotals: Record<
    string,
    {
      amount: number;
      count: number;
      employers: Record<string, { amount: number; count: number }>;
    }
  > = {};

  let contributionsWithEmployer = 0;

  // Process each contribution
  for (const contribution of contributions) {
    const amount = contribution.contribution_receipt_amount || 0;
    if (amount <= 0) continue;

    const employer = contribution.contributor_employer || '';
    const occupation = contribution.contributor_occupation || '';
    const result = categorizeContribution(employer, occupation);
    const industry = result.sector === IndustrySector.OTHER ? result.category : result.sector;

    // Track employer data quality
    if (employer && employer.trim() !== '') {
      contributionsWithEmployer++;
    }

    // Initialize industry tracking
    if (!industryTotals[industry]) {
      industryTotals[industry] = {
        amount: 0,
        count: 0,
        employers: {},
      };
    }

    // Add to industry totals
    industryTotals[industry].amount += amount;
    industryTotals[industry].count += 1;

    // Track specific employers within industry
    const cleanEmployer = employer || 'Unknown Employer';
    if (!industryTotals[industry].employers[cleanEmployer]) {
      industryTotals[industry].employers[cleanEmployer] = { amount: 0, count: 0 };
    }
    industryTotals[industry].employers[cleanEmployer].amount += amount;
    industryTotals[industry].employers[cleanEmployer].count += 1;
  }

  // Convert to processed format
  const breakdown: ProcessedIndustryData[] = Object.entries(industryTotals)
    .map(([industry, data]) => ({
      industry,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      count: data.count,
      topEmployers: Object.entries(data.employers)
        .map(([name, emp]) => ({
          name,
          amount: emp.amount,
          count: emp.count,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5), // Top 5 employers per industry
    }))
    .sort((a, b) => b.amount - a.amount);

  // Calculate data quality
  const quality: DataQuality['industry'] = {
    totalContributionsAnalyzed: contributions.length,
    contributionsWithEmployer,
    completenessPercentage:
      contributions.length > 0 ? (contributionsWithEmployer / contributions.length) * 100 : 0,
  };

  return { breakdown, quality };
}

/**
 * Process raw FEC contributions into geographic breakdown
 */
function processGeographicBreakdown(
  contributions: FECContribution[],
  totalAmount: number,
  representativeState: string
): { breakdown: ProcessedGeographicData[]; quality: DataQuality['geography'] } {
  const stateTotals: Record<string, { amount: number; count: number }> = {};
  let contributionsWithState = 0;

  // Process each contribution
  for (const contribution of contributions) {
    const amount = contribution.contribution_receipt_amount || 0;
    if (amount <= 0) continue;

    const state = contribution.contributor_state || '';
    const cleanState = state.trim().toUpperCase();

    // Track state data quality
    if (cleanState !== '') {
      contributionsWithState++;

      // Initialize state tracking
      if (!stateTotals[cleanState]) {
        stateTotals[cleanState] = { amount: 0, count: 0 };
      }

      stateTotals[cleanState].amount += amount;
      stateTotals[cleanState].count += 1;
    }
  }

  // Convert to processed format
  const breakdown: ProcessedGeographicData[] = Object.entries(stateTotals)
    .map(([state, data]) => ({
      state,
      stateName: getStateName(state),
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      count: data.count,
      isHomeState: state === representativeState.toUpperCase(),
    }))
    .sort((a, b) => b.amount - a.amount);

  // Calculate data quality
  const quality: DataQuality['geography'] = {
    totalContributionsAnalyzed: contributions.length,
    contributionsWithState,
    completenessPercentage:
      contributions.length > 0 ? (contributionsWithState / contributions.length) * 100 : 0,
  };

  return { breakdown, quality };
}

/**
 * Get full state name from abbreviation
 */
function getStateName(stateCode: string): string {
  const stateNames: Record<string, string> = {
    AL: 'Alabama',
    AK: 'Alaska',
    AZ: 'Arizona',
    AR: 'Arkansas',
    CA: 'California',
    CO: 'Colorado',
    CT: 'Connecticut',
    DE: 'Delaware',
    FL: 'Florida',
    GA: 'Georgia',
    HI: 'Hawaii',
    ID: 'Idaho',
    IL: 'Illinois',
    IN: 'Indiana',
    IA: 'Iowa',
    KS: 'Kansas',
    KY: 'Kentucky',
    LA: 'Louisiana',
    ME: 'Maine',
    MD: 'Maryland',
    MA: 'Massachusetts',
    MI: 'Michigan',
    MN: 'Minnesota',
    MS: 'Mississippi',
    MO: 'Missouri',
    MT: 'Montana',
    NE: 'Nebraska',
    NV: 'Nevada',
    NH: 'New Hampshire',
    NJ: 'New Jersey',
    NM: 'New Mexico',
    NY: 'New York',
    NC: 'North Carolina',
    ND: 'North Dakota',
    OH: 'Ohio',
    OK: 'Oklahoma',
    OR: 'Oregon',
    PA: 'Pennsylvania',
    RI: 'Rhode Island',
    SC: 'South Carolina',
    SD: 'South Dakota',
    TN: 'Tennessee',
    TX: 'Texas',
    UT: 'Utah',
    VT: 'Vermont',
    VA: 'Virginia',
    WA: 'Washington',
    WV: 'West Virginia',
    WI: 'Wisconsin',
    WY: 'Wyoming',
    DC: 'District of Columbia',
  };

  return stateNames[stateCode] || stateCode;
}

/**
 * Calculate overall data confidence based on quality metrics
 */
function calculateDataConfidence(
  industryQuality: DataQuality['industry'],
  geographyQuality: DataQuality['geography'],
  totalContributions: number
): DataQuality['overallDataConfidence'] {
  // High confidence: >1000 contributions, >60% employer data, >80% geography data
  if (
    totalContributions > 1000 &&
    industryQuality.completenessPercentage > 60 &&
    geographyQuality.completenessPercentage > 80
  ) {
    return 'high';
  }

  // Medium confidence: >100 contributions, >30% employer data, >50% geography data
  if (
    totalContributions > 100 &&
    industryQuality.completenessPercentage > 30 &&
    geographyQuality.completenessPercentage > 50
  ) {
    return 'medium';
  }

  return 'low';
}

/**
 * Main aggregation function - processes candidate's complete finance data
 */
export async function aggregateFinanceData(
  candidateId: string,
  cycle: number,
  representativeState: string,
  useSampleData: boolean = false
): Promise<ProcessedFinanceData | null> {
  try {
    // Step 1: Get financial summary (always required)
    const financialSummary = await fecApiService.getFinancialSummary(candidateId, cycle);

    // Get committee ID for accurate data source URLs
    const committeeId = await fecApiService.getPrincipalCommitteeId(candidateId, cycle);
    if (!financialSummary) {
      return null; // No financial data available
    }

    // Step 2: Get contribution data
    const contributions = useSampleData
      ? await fecApiService.getSampleContributions(candidateId, cycle, 1000)
      : await fecApiService.getAllIndividualContributions(candidateId, cycle);

    if (contributions.length === 0) {
      // Return basic financial data without breakdowns
      return {
        totalRaised: financialSummary.total_receipts ?? financialSummary.receipts,
        totalSpent: financialSummary.total_disbursements ?? financialSummary.disbursements,
        cashOnHand:
          financialSummary.cash_on_hand_end_period ?? financialSummary.last_cash_on_hand_end_period,
        individualContributions: financialSummary.individual_contributions,
        pacContributions: financialSummary.other_political_committee_contributions,
        partyContributions: financialSummary.political_party_committee_contributions,
        candidateContributions: financialSummary.candidate_contribution,
        industryBreakdown: [],
        geographicBreakdown: [],
        dataQuality: {
          industry: {
            totalContributionsAnalyzed: 0,
            contributionsWithEmployer: 0,
            completenessPercentage: 0,
          },
          geography: {
            totalContributionsAnalyzed: 0,
            contributionsWithState: 0,
            completenessPercentage: 0,
          },
          overallDataConfidence: 'low',
        },
        candidateId,
        cycle,
        lastUpdated: new Date().toISOString(),
        fecDataSources: {
          financialSummary: `https://api.open.fec.gov/v1/candidate/${candidateId}/totals/?cycle=${cycle}`,
          contributions: committeeId
            ? `https://api.open.fec.gov/v1/schedules/schedule_a/?candidate_id=${candidateId}&committee_id=${committeeId}&cycle=${cycle}`
            : `https://api.open.fec.gov/v1/schedules/schedule_a/?candidate_id=${candidateId}&cycle=${cycle}`,
        },
      };
    }

    // Step 3: Process contributions into breakdowns
    const totalContributions = contributions.reduce(
      (sum, c) => sum + (c.contribution_receipt_amount || 0),
      0
    );

    const industryResults = processIndustryBreakdown(contributions, totalContributions);
    const geographyResults = processGeographicBreakdown(
      contributions,
      totalContributions,
      representativeState
    );

    // Step 4: Calculate overall data quality
    const overallDataConfidence = calculateDataConfidence(
      industryResults.quality,
      geographyResults.quality,
      contributions.length
    );

    // Step 5: Return complete processed data
    return {
      totalRaised: financialSummary.total_receipts ?? financialSummary.receipts,
      totalSpent: financialSummary.total_disbursements ?? financialSummary.disbursements,
      cashOnHand:
        financialSummary.cash_on_hand_end_period ?? financialSummary.last_cash_on_hand_end_period,
      individualContributions: financialSummary.individual_contributions,
      pacContributions: financialSummary.other_political_committee_contributions,
      partyContributions: financialSummary.political_party_committee_contributions,
      candidateContributions: financialSummary.candidate_contribution,
      industryBreakdown: industryResults.breakdown,
      geographicBreakdown: geographyResults.breakdown,
      dataQuality: {
        industry: industryResults.quality,
        geography: geographyResults.quality,
        overallDataConfidence,
      },
      candidateId,
      cycle,
      lastUpdated: new Date().toISOString(),
      fecDataSources: {
        financialSummary: `https://api.open.fec.gov/v1/candidate/${candidateId}/totals/?cycle=${cycle}`,
        contributions: committeeId
          ? `https://api.open.fec.gov/v1/schedules/schedule_a/?candidate_id=${candidateId}&committee_id=${committeeId}&cycle=${cycle}`
          : `https://api.open.fec.gov/v1/schedules/schedule_a/?candidate_id=${candidateId}&cycle=${cycle}`,
      },
    };
  } catch (error) {
    logger.error(`[Finance Aggregator] Failed to process data for ${candidateId}:`, error);
    throw error;
  }
}
