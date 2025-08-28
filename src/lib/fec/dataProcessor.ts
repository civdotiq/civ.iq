/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  EnhancedFECData,
  ContributionDetail,
  ExpenditureDetail,
  FECScheduleAResponse,
  FECScheduleBResponse,
  FECCandidateTotalsResponse,
} from '@/types/fec';
import { categorizeContributionsByIndustry, calculateIndustryStats } from './industryMapper';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';

// Configuration constants
const SMALL_DONOR_THRESHOLD = 200;
const LARGE_DONOR_THRESHOLD = 2800;
const MAX_RECORDS_PER_REQUEST = 100;

/**
 * Fetch comprehensive FEC data for a candidate
 */
export async function fetchComprehensiveFECData(candidateId: string): Promise<EnhancedFECData> {
  const startTime = Date.now();

  try {
    logger.info('Starting comprehensive FEC data fetch', { candidateId });

    // Fetch all data types in parallel
    const [candidateTotals, contributions, expenditures] = await Promise.all([
      fetchCandidateTotals(candidateId),
      fetchAllContributions(candidateId),
      fetchAllExpenditures(candidateId),
    ]);

    // Process the data
    const processedData = await processRawFECData(
      candidateId,
      candidateTotals,
      contributions,
      expenditures
    );

    const processingTime = Date.now() - startTime;
    logger.info('Comprehensive FEC data processing completed', {
      candidateId,
      processingTime,
      contributionsCount: contributions.length,
      expendituresCount: expenditures.length,
    });

    return processedData;
  } catch (error) {
    logger.error('Error fetching comprehensive FEC data', error as Error, {
      candidateId,
      processingTime: Date.now() - startTime,
    });
    throw error;
  }
}

/**
 * Fetch candidate financial totals
 */
async function fetchCandidateTotals(candidateId: string): Promise<FECCandidateTotalsResponse> {
  const currentCycle = new Date().getFullYear() + (new Date().getFullYear() % 2 === 0 ? 0 : 1);

  return cachedFetch(
    `fec-candidate-totals-${candidateId}-${currentCycle}`,
    async () => {
      const response = await fetch(
        `https://api.open.fec.gov/v1/candidate/${candidateId}/totals/` +
          `?api_key=${process.env.FEC_API_KEY}` +
          `&cycle=${currentCycle}&cycle=${currentCycle - 2}&cycle=${currentCycle - 4}` +
          `&sort=-cycle`
      );

      if (!response.ok) {
        throw new Error(`FEC totals API error: ${response.status}`);
      }

      return response.json();
    },
    2 * 60 * 60 * 1000 // 2 hours
  );
}

/**
 * Fetch all contributions for a candidate (with pagination)
 */
async function fetchAllContributions(candidateId: string): Promise<ContributionDetail[]> {
  const currentCycle = new Date().getFullYear() + (new Date().getFullYear() % 2 === 0 ? 0 : 1);

  return cachedFetch(
    `fec-all-contributions-${candidateId}-${currentCycle}`,
    async () => {
      const allContributions: ContributionDetail[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await fetch(
          `https://api.open.fec.gov/v1/schedules/schedule_a/` +
            `?api_key=${process.env.FEC_API_KEY}` +
            `&candidate_id=${candidateId}` +
            `&two_year_transaction_period=${currentCycle}` +
            `&per_page=${MAX_RECORDS_PER_REQUEST}` +
            `&page=${page}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            logger.warn('No contributions found for candidate', { candidateId });
            break;
          }
          throw new Error(`FEC contributions API error: ${response.status}`);
        }

        const data: FECScheduleAResponse = await response.json();

        // Convert to our format
        const contributions = data.results.map(mapFECContribution);
        allContributions.push(...contributions);

        // Check if we have more pages
        hasMore = data.pagination && page < data.pagination.pages;
        page++;

        // Safety limit to prevent runaway pagination
        if (page > 100) {
          logger.warn('Hit pagination safety limit for contributions', { candidateId });
          break;
        }
      }

      return allContributions;
    },
    60 * 60 * 1000 // 1 hour
  );
}

/**
 * Fetch all expenditures for a candidate (with pagination)
 */
async function fetchAllExpenditures(candidateId: string): Promise<ExpenditureDetail[]> {
  const currentCycle = new Date().getFullYear() + (new Date().getFullYear() % 2 === 0 ? 0 : 1);

  return cachedFetch(
    `fec-all-expenditures-${candidateId}-${currentCycle}`,
    async () => {
      const allExpenditures: ExpenditureDetail[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await fetch(
          `https://api.open.fec.gov/v1/schedules/schedule_b/` +
            `?api_key=${process.env.FEC_API_KEY}` +
            `&candidate_id=${candidateId}` +
            `&two_year_transaction_period=${currentCycle}` +
            `&per_page=${MAX_RECORDS_PER_REQUEST}` +
            `&page=${page}` +
            `&sort=-disbursement_date`
        );

        if (!response.ok) {
          if (response.status === 404) {
            logger.warn('No expenditures found for candidate', { candidateId });
            break;
          }
          throw new Error(`FEC expenditures API error: ${response.status}`);
        }

        const data: FECScheduleBResponse = await response.json();

        // Convert to our format
        const expenditures = data.results.map(mapFECExpenditure);
        allExpenditures.push(...expenditures);

        // Check if we have more pages
        hasMore = data.pagination && page < data.pagination.pages;
        page++;

        // Safety limit to prevent runaway pagination
        if (page > 100) {
          logger.warn('Hit pagination safety limit for expenditures', { candidateId });
          break;
        }
      }

      return allExpenditures;
    },
    60 * 60 * 1000 // 1 hour
  );
}

/**
 * Type guard for FEC contribution data
 */
function isFECContribution(obj: unknown): obj is {
  sub_id: string;
  contributor_name?: string;
  contributor_employer?: string;
  contributor_occupation?: string;
  contribution_receipt_amount?: number;
  contribution_receipt_date?: string;
  contributor_city?: string;
  contributor_state?: string;
  contributor_zip?: string;
  is_individual?: boolean;
} {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as unknown as { sub_id?: unknown }).sub_id === 'string'
  );
}

/**
 * Map FEC contribution to our format
 */
function mapFECContribution(fecContrib: unknown): ContributionDetail {
  if (!isFECContribution(fecContrib)) {
    return {
      id: 'unknown',
      contributorName: 'Unknown',
      employerName: undefined,
      occupation: undefined,
      amount: 0,
      date: new Date().toISOString(),
      city: undefined,
      state: undefined,
      zipCode: undefined,
      contributionType: 'individual',
      isSmallDonor: true,
    };
  }
  return {
    id: fecContrib.sub_id,
    contributorName: fecContrib.contributor_name || 'Unknown',
    employerName: fecContrib.contributor_employer,
    occupation: fecContrib.contributor_occupation,
    amount: fecContrib.contribution_receipt_amount || 0,
    date: fecContrib.contribution_receipt_date || new Date().toISOString(),
    city: fecContrib.contributor_city,
    state: fecContrib.contributor_state,
    zipCode: fecContrib.contributor_zip,
    contributionType: fecContrib.is_individual ? 'individual' : 'pac',
    isSmallDonor: (fecContrib.contribution_receipt_amount || 0) <= SMALL_DONOR_THRESHOLD,
  };
}

/**
 * Type guard for FEC expenditure data
 */
function isFECExpenditure(obj: unknown): obj is {
  sub_id: string;
  recipient_name?: string;
  disbursement_description?: string;
  disbursement_amount?: number;
  disbursement_date?: string;
  category_code_full?: string;
  purpose_code?: string;
} {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as unknown as { sub_id?: unknown }).sub_id === 'string'
  );
}

/**
 * Map FEC expenditure to our format
 */
function mapFECExpenditure(fecExp: unknown): ExpenditureDetail {
  if (!isFECExpenditure(fecExp)) {
    return {
      id: 'unknown',
      recipientName: 'Unknown',
      description: 'Unknown',
      amount: 0,
      date: new Date().toISOString(),
      category: 'Other',
      subcategory: undefined,
      purpose: undefined,
      isMedia: false,
      isStaff: false,
      isAdmin: false,
    };
  }

  const description = fecExp.disbursement_description || 'Unknown';
  const category = categorizeExpenditure(fecExp);

  return {
    id: fecExp.sub_id,
    recipientName: fecExp.recipient_name || 'Unknown',
    description,
    amount: fecExp.disbursement_amount || 0,
    date: fecExp.disbursement_date || new Date().toISOString(),
    category,
    subcategory: fecExp.category_code_full,
    purpose: fecExp.purpose_code,
    isMedia: category === 'Media and Advertising',
    isStaff: category === 'Staff and Payroll',
    isAdmin: category === 'Office Operations',
  };
}

/**
 * Categorize expenditure based on description and codes
 */
function categorizeExpenditure(exp: unknown): string {
  if (typeof exp !== 'object' || exp === null) {
    return 'Other';
  }

  const expObj = exp as { disbursement_description?: string; category_code_full?: string };
  const desc = (expObj.disbursement_description || '').toLowerCase();
  const category = (expObj.category_code_full || '').toLowerCase();

  // Media and advertising
  if (
    desc.includes('media') ||
    desc.includes('advertising') ||
    desc.includes('ad') ||
    desc.includes('television') ||
    desc.includes('radio') ||
    desc.includes('digital') ||
    category.includes('media') ||
    category.includes('advertising')
  ) {
    return 'Media and Advertising';
  }

  // Staff and payroll
  if (
    desc.includes('salary') ||
    desc.includes('payroll') ||
    desc.includes('staff') ||
    desc.includes('consultant') ||
    desc.includes('wage') ||
    category.includes('salary') ||
    category.includes('payroll')
  ) {
    return 'Staff and Payroll';
  }

  // Events and fundraising
  if (
    desc.includes('event') ||
    desc.includes('fundrais') ||
    desc.includes('venue') ||
    desc.includes('catering') ||
    desc.includes('reception') ||
    category.includes('event') ||
    category.includes('fundraising')
  ) {
    return 'Events and Fundraising';
  }

  // Travel and transportation
  if (
    desc.includes('travel') ||
    desc.includes('hotel') ||
    desc.includes('airline') ||
    desc.includes('transportation') ||
    desc.includes('mileage') ||
    category.includes('travel')
  ) {
    return 'Travel and Transportation';
  }

  // Office operations
  if (
    desc.includes('office') ||
    desc.includes('rent') ||
    desc.includes('utilities') ||
    desc.includes('phone') ||
    desc.includes('equipment') ||
    desc.includes('supplies') ||
    category.includes('office') ||
    category.includes('rent')
  ) {
    return 'Office Operations';
  }

  return 'Other';
}

/**
 * Process raw FEC data into enhanced format
 */
async function processRawFECData(
  candidateId: string,
  totals: FECCandidateTotalsResponse,
  contributions: ContributionDetail[],
  expenditures: ExpenditureDetail[]
): Promise<EnhancedFECData> {
  // Calculate summary metrics
  const latestTotals = totals.results[0];
  const summary = {
    totalRaised: latestTotals?.receipts || 0,
    totalSpent: latestTotals?.disbursements || 0,
    cashOnHand: latestTotals?.cash_on_hand_end_period || 0,
    burnRate: calculateBurnRate(totals.results),
    quarterlyAverage: calculateQuarterlyAverage(totals.results),
    efficiency: calculateEfficiency(latestTotals?.receipts || 0, latestTotals?.disbursements || 0),
  };

  // Calculate breakdown
  const breakdown = calculateBreakdown(contributions, latestTotals);

  // Process industries
  const industryMap = categorizeContributionsByIndustry(contributions);
  const industries = calculateIndustryStats(industryMap);

  // Calculate geography
  const geography = calculateGeography(contributions);

  // Calculate timeline
  const timeline = calculateTimeline(totals.results, contributions);

  // Calculate donor metrics
  const donors = calculateDonorMetrics(contributions);

  // Calculate expenditure metrics
  const expenditureMetrics = calculateExpenditureMetrics(expenditures);

  return {
    summary,
    breakdown,
    industries,
    geography,
    timeline,
    donors,
    expenditures: expenditureMetrics,
    metadata: {
      dataSource: 'fec.gov',
      lastUpdated: new Date().toISOString(),
      coverage: calculateCoverage(contributions, expenditures),
      dataQuality: calculateDataQuality(contributions, expenditures),
      cyclesCovered: totals.results.map(r => r.cycle),
    },
  };
}

/**
 * Type guard for FEC totals data
 */
function isFECTotal(obj: unknown): obj is {
  coverage_end_date?: string;
  disbursements?: number;
  receipts?: number;
} {
  return typeof obj === 'object' && obj !== null;
}

/**
 * Calculate burn rate from financial totals
 */
function calculateBurnRate(totals: unknown[]): number {
  if (totals.length < 2) return 0;

  const latest = totals[0];
  const previous = totals[1];

  if (!isFECTotal(latest) || !isFECTotal(previous)) return 0;

  const latestDate = latest.coverage_end_date;
  const previousDate = previous.coverage_end_date;

  if (!latestDate || !previousDate) return 0;

  const timeDiff = new Date(latestDate).getTime() - new Date(previousDate).getTime();
  const monthsDiff = timeDiff / (1000 * 60 * 60 * 24 * 30);

  if (monthsDiff <= 0) return 0;

  const latestDisbursements = latest.disbursements || 0;
  const previousDisbursements = previous.disbursements || 0;

  return (latestDisbursements - previousDisbursements) / monthsDiff;
}

/**
 * Calculate quarterly average
 */
function calculateQuarterlyAverage(totals: unknown[]): number {
  if (totals.length === 0) return 0;

  const totalReceipts = totals.reduce((sum: number, total) => {
    if (isFECTotal(total)) {
      return sum + (total.receipts || 0);
    }
    return sum;
  }, 0);
  const quarters = totals.length;

  return quarters > 0 ? totalReceipts / quarters : 0;
}

/**
 * Calculate spending efficiency
 */
function calculateEfficiency(raised: number, spent: number): number {
  if (raised === 0) return 0;
  return (1 - spent / raised) * 100;
}

/**
 * Calculate contribution breakdown
 */
function calculateBreakdown(contributions: ContributionDetail[], totals: unknown) {
  // Type guard for totals object
  const totalsObj =
    typeof totals === 'object' && totals !== null
      ? (totals as {
          political_party_committee_contributions?: number;
          candidate_contribution?: number;
        })
      : {};
  const totalAmount = contributions.reduce((sum, contrib) => sum + contrib.amount, 0);

  const individual = contributions.filter(c => c.contributionType === 'individual');
  const pac = contributions.filter(c => c.contributionType === 'pac');
  const smallDonors = contributions.filter(c => c.isSmallDonor);
  const largeDonors = contributions.filter(c => c.amount > LARGE_DONOR_THRESHOLD);

  return {
    individual: {
      amount: individual.reduce((sum, c) => sum + c.amount, 0),
      percent:
        totalAmount > 0
          ? (individual.reduce((sum, c) => sum + c.amount, 0) / totalAmount) * 100
          : 0,
    },
    pac: {
      amount: pac.reduce((sum, c) => sum + c.amount, 0),
      percent:
        totalAmount > 0 ? (pac.reduce((sum, c) => sum + c.amount, 0) / totalAmount) * 100 : 0,
    },
    party: {
      amount: totalsObj.political_party_committee_contributions || 0,
      percent:
        totalAmount > 0
          ? ((totalsObj.political_party_committee_contributions || 0) / totalAmount) * 100
          : 0,
    },
    candidate: {
      amount: totalsObj.candidate_contribution || 0,
      percent: totalAmount > 0 ? ((totalsObj.candidate_contribution || 0) / totalAmount) * 100 : 0,
    },
    smallDonors: {
      amount: smallDonors.reduce((sum, c) => sum + c.amount, 0),
      percent:
        totalAmount > 0
          ? (smallDonors.reduce((sum, c) => sum + c.amount, 0) / totalAmount) * 100
          : 0,
      count: smallDonors.length,
    },
    largeDonors: {
      amount: largeDonors.reduce((sum, c) => sum + c.amount, 0),
      percent:
        totalAmount > 0
          ? (largeDonors.reduce((sum, c) => sum + c.amount, 0) / totalAmount) * 100
          : 0,
      count: largeDonors.length,
    },
  };
}

/**
 * Calculate geography breakdown
 */
function calculateGeography(contributions: ContributionDetail[]) {
  const totalAmount = contributions.reduce((sum, contrib) => sum + contrib.amount, 0);
  const _totalCount = contributions.length;

  // Note: This requires knowing the candidate's state
  // For now, we'll use a placeholder implementation
  // In production, this would come from the representative's state data
  const candidateState = 'MI'; // This should come from representative data
  const inState = contributions.filter(c => c.state === candidateState);
  const outOfState = contributions.filter(c => c.state !== candidateState);

  const stateMap = new Map<string, { amount: number; count: number }>();

  for (const contrib of contributions) {
    const state = contrib.state || 'Unknown';
    if (!stateMap.has(state)) {
      stateMap.set(state, { amount: 0, count: 0 });
    }
    const stateData = stateMap.get(state)!;
    stateData.amount += contrib.amount;
    stateData.count += 1;
  }

  const topStates = Array.from(stateMap.entries())
    .map(([state, data]) => ({
      state,
      amount: data.amount,
      percent: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return {
    inState: {
      amount: inState.reduce((sum, c) => sum + c.amount, 0),
      percent:
        totalAmount > 0 ? (inState.reduce((sum, c) => sum + c.amount, 0) / totalAmount) * 100 : 0,
      count: inState.length,
    },
    outOfState: {
      amount: outOfState.reduce((sum, c) => sum + c.amount, 0),
      percent:
        totalAmount > 0
          ? (outOfState.reduce((sum, c) => sum + c.amount, 0) / totalAmount) * 100
          : 0,
      count: outOfState.length,
    },
    topStates,
    diversityScore: calculateGeographicDiversity(topStates),
  };
}

/**
 * Calculate geographic diversity score
 */
function calculateGeographicDiversity(topStates: Array<{ amount: number }>): number {
  if (topStates.length === 0) return 0;

  // Use entropy calculation for diversity
  const totalAmount = topStates.reduce((sum, state) => sum + state.amount, 0);
  if (totalAmount === 0) return 0;

  let entropy = 0;
  for (const state of topStates) {
    const proportion = state.amount / totalAmount;
    if (proportion > 0) {
      entropy -= proportion * Math.log2(proportion);
    }
  }

  // Normalize to 0-100 scale
  const maxEntropy = Math.log2(Math.min(50, topStates.length)); // Max 50 states
  return maxEntropy > 0 ? Math.round((entropy / maxEntropy) * 100) : 0;
}

/**
 * Calculate timeline from totals
 */
function calculateTimeline(totals: unknown[], contributions: ContributionDetail[] = []) {
  return totals.map(total => {
    if (!isFECTotal(total)) {
      return {
        period: 'Unknown',
        quarter: 'Q1',
        raised: 0,
        spent: 0,
        netChange: 0,
        cashOnHand: 0,
        burnRate: 0,
        contributorCount: 0,
      };
    }

    const totalObj = total as {
      cycle?: number;
      coverage_end_date?: string;
      receipts?: number;
      disbursements?: number;
      cash_on_hand_end_period?: number;
    };

    const endDate = totalObj.coverage_end_date ? new Date(totalObj.coverage_end_date) : new Date();

    return {
      period: `${totalObj.cycle || 'Unknown'}`,
      quarter: `Q${Math.ceil((endDate.getMonth() + 1) / 3)}`,
      raised: totalObj.receipts || 0,
      spent: totalObj.disbursements || 0,
      netChange: (totalObj.receipts || 0) - (totalObj.disbursements || 0),
      cashOnHand: totalObj.cash_on_hand_end_period || 0,
      burnRate: calculateBurnRate(totals),
      contributorCount: calculateContributorCount(contributions),
    };
  });
}

/**
 * Calculate donor metrics
 */
function calculateDonorMetrics(contributions: ContributionDetail[]) {
  const smallDonors = contributions.filter(c => c.isSmallDonor);
  const largeDonors = contributions.filter(c => c.amount > LARGE_DONOR_THRESHOLD);
  const totalAmount = contributions.reduce((sum, c) => sum + c.amount, 0);

  return {
    smallDonorMetrics: {
      averageAmount:
        smallDonors.length > 0
          ? smallDonors.reduce((sum, c) => sum + c.amount, 0) / smallDonors.length
          : 0,
      count: smallDonors.length,
      percentage: contributions.length > 0 ? (smallDonors.length / contributions.length) * 100 : 0,
      grassrootsScore: calculateGrassrootsScore(smallDonors, contributions),
    },
    largeDonorMetrics: {
      averageAmount:
        largeDonors.length > 0
          ? largeDonors.reduce((sum, c) => sum + c.amount, 0) / largeDonors.length
          : 0,
      count: largeDonors.length,
      percentage: contributions.length > 0 ? (largeDonors.length / contributions.length) * 100 : 0,
      dependencyScore: calculateDependencyScore(largeDonors, totalAmount),
    },
    repeatDonors: {
      count: calculateRepeatDonors(contributions),
      percentage: 0,
      averageTotal: 0,
    },
  };
}

/**
 * Calculate grassroots score
 */
function calculateGrassrootsScore(
  smallDonors: ContributionDetail[],
  allContributions: ContributionDetail[]
): number {
  if (allContributions.length === 0) return 0;

  const smallDonorAmount = smallDonors.reduce((sum, c) => sum + c.amount, 0);
  const totalAmount = allContributions.reduce((sum, c) => sum + c.amount, 0);

  const smallDonorPercentage = totalAmount > 0 ? (smallDonorAmount / totalAmount) * 100 : 0;

  return Math.round(smallDonorPercentage);
}

/**
 * Calculate dependency score
 */
function calculateDependencyScore(largeDonors: ContributionDetail[], totalAmount: number): number {
  if (totalAmount === 0) return 0;

  const largeDonorAmount = largeDonors.reduce((sum, c) => sum + c.amount, 0);
  const dependencyPercentage = (largeDonorAmount / totalAmount) * 100;

  return Math.round(dependencyPercentage);
}

/**
 * Calculate expenditure metrics
 */
function calculateExpenditureMetrics(expenditures: ExpenditureDetail[]) {
  const totalAmount = expenditures.reduce((sum, exp) => sum + exp.amount, 0);

  const categoryMap = new Map<string, { amount: number; count: number }>();

  for (const exp of expenditures) {
    if (!categoryMap.has(exp.category)) {
      categoryMap.set(exp.category, { amount: 0, count: 0 });
    }
    const cat = categoryMap.get(exp.category)!;
    cat.amount += exp.amount;
    cat.count += 1;
  }

  const categories = Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      count: data.count,
      trend: 'stable' as const,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    categories,
    efficiency: {
      adminCosts: 0, // Would need separate admin cost calculation for expenditures
      fundraisingCosts: 0, // Would need separate fundraising cost calculation for expenditures
      programCosts: 0, // Would need separate program cost calculation for expenditures
      efficiencyRatio: 0, // Would need separate efficiency calculation for expenditures
    },
  };
}

/**
 * Calculate data coverage percentage
 */
function calculateCoverage(
  contributions: ContributionDetail[],
  expenditures: ExpenditureDetail[]
): number {
  // Simple coverage calculation based on data availability
  let score = 0;

  if (contributions.length > 0) score += 50;
  if (expenditures.length > 0) score += 50;

  return score;
}

/**
 * Calculate data quality score
 */
function calculateDataQuality(
  contributions: ContributionDetail[],
  expenditures: ExpenditureDetail[]
): 'high' | 'medium' | 'low' {
  const totalRecords = contributions.length + expenditures.length;

  if (totalRecords > 1000) return 'high';
  if (totalRecords > 100) return 'medium';
  return 'low';
}

/**
 * Calculate unique contributor count
 */
function calculateContributorCount(contributions: ContributionDetail[]): number {
  const uniqueContributors = new Set();

  for (const contrib of contributions) {
    const key = `${contrib.contributorName}-${contrib.city}-${contrib.state}`;
    uniqueContributors.add(key);
  }

  return uniqueContributors.size;
}

/**
 * Calculate repeat donors
 */
function calculateRepeatDonors(contributions: ContributionDetail[]): number {
  const contributorCounts = new Map<string, number>();

  for (const contrib of contributions) {
    const key = `${contrib.contributorName}-${contrib.city}-${contrib.state}`;
    contributorCounts.set(key, (contributorCounts.get(key) || 0) + 1);
  }

  return Array.from(contributorCounts.values()).filter(count => count > 1).length;
}

/**
 * Calculate admin costs (estimated)
 */
function _calculateAdminCosts(contributions: ContributionDetail[]): number {
  const totalRaised = contributions.reduce((sum, c) => sum + c.amount, 0);
  // Estimate admin costs as 15% of total raised
  return totalRaised * 0.15;
}

/**
 * Calculate fundraising costs (estimated)
 */
function _calculateFundraisingCosts(contributions: ContributionDetail[]): number {
  const totalRaised = contributions.reduce((sum, c) => sum + c.amount, 0);
  // Estimate fundraising costs as 20% of total raised
  return totalRaised * 0.2;
}

/**
 * Calculate program costs (estimated)
 */
function _calculateProgramCosts(contributions: ContributionDetail[]): number {
  const totalRaised = contributions.reduce((sum, c) => sum + c.amount, 0);
  // Estimate program costs as 65% of total raised
  return totalRaised * 0.65;
}

/**
 * Calculate efficiency ratio
 */
function _calculateEfficiencyRatio(contributions: ContributionDetail[]): number {
  const totalRaised = contributions.reduce((sum, c) => sum + c.amount, 0);
  const adminCosts = _calculateAdminCosts(contributions);
  const fundraisingCosts = _calculateFundraisingCosts(contributions);
  const overhead = adminCosts + fundraisingCosts;

  if (totalRaised === 0) return 0;
  return (totalRaised - overhead) / totalRaised;
}

/**
 * Get date range from contributions
 */
function _getDateRange(contributions: ContributionDetail[]): {
  months: number;
  start: Date;
  end: Date;
} {
  if (contributions.length === 0) {
    return { months: 1, start: new Date(), end: new Date() };
  }

  const dates = contributions
    .map(c => new Date(c.date))
    .filter(date => !isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) {
    return { months: 1, start: new Date(), end: new Date() };
  }

  const start = dates[0]!; // We know this exists because we checked dates.length > 0
  const end = dates[dates.length - 1]!; // We know this exists because we checked dates.length > 0

  const monthsDiff =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

  return {
    months: Math.max(1, monthsDiff),
    start,
    end,
  };
}

const dataProcessorExports = {
  fetchComprehensiveFECData,
  processRawFECData,
};

export default dataProcessorExports;
