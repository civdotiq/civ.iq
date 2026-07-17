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

const NON_INFORMATIVE_EMPLOYER_RX =
  /^(|n\/a|na|none|not\s*employed|not\s*applicable|information\s*requested.*|info\s*requested|refused|self|self[-\s]?employed|retired|null|unknown|private|personal|individual|independent|homemaker)$/i;

function isInformativeEmployer(employer: string): boolean {
  return !NON_INFORMATIVE_EMPLOYER_RX.test(employer.trim());
}

/**
 * Build industry breakdown from FEC's pre-aggregated by_employer + by_occupation
 * endpoints.
 *
 * Attribution policy:
 * 1. Rows with informative employers are categorized via the entity-resolution
 *    taxonomy and attributed directly.
 * 2. The non-informative-employer residual (blank / RETIRED / SELF-EMPLOYED /
 *    N/A rows) is partially recovered by by_occupation: under the common
 *    assumption that informative-employer donors also list informative
 *    occupations, the "extra" informative-occupation signal beyond
 *    informative-employer totals represents donors whose employer is blank but
 *    whose occupation is meaningful (e.g., self-employed attorneys). This
 *    extra is proportionally distributed across informative-occupation rows.
 * 3. The remaining residual — contributions with no recoverable attribution —
 *    is bucketed as "Unaffiliated / Non-employed".
 *
 * Caveats: the employer/occupation aggregates are independent one-dimensional
 * partitions of the same underlying contributions; the cross-tab is not
 * available. Step 2 is therefore an approximation, not an exact recovery.
 */
/**
 * A single categorized slice of the aggregate contributions, tagged with both
 * its sector and category so different consumers can key on whichever they need.
 */
interface AggregateIndustryAttribution {
  sector: IndustrySector;
  category: string;
  /** Employer name, or "(via occupation: X)" for occupation-recovered signal. */
  label: string;
  amount: number;
  count: number;
}

interface AggregateIndustryAttributionResult {
  attributions: AggregateIndustryAttribution[];
  /** Non-informative-employer dollars with no recoverable attribution. */
  residualAmount: number;
  residualCount: number;
  /** Total contribution count across all by_employer rows. */
  totalContributionCount: number;
  /** Contributions attributed to a real industry (informative employer + recovered occupation). */
  attributedContributionCount: number;
}

/**
 * Shared attribution engine for FEC's pre-aggregated by_employer + by_occupation
 * endpoints. Implements the attribution policy documented on
 * {@link processIndustryFromAggregates}: informative-employer rows are
 * categorized directly, the non-informative-employer residual is partially
 * recovered via the proportional occupation "extra signal" heuristic, and the
 * leftover residual is returned for the caller to bucket. Both breakdown
 * builders share this so the residual math lives in exactly one place.
 */
function attributeIndustriesFromAggregates(
  byEmployer: Array<{ employer: string; total: number; count: number }>,
  byOccupation: Array<{ occupation: string; total: number; count: number }>
): AggregateIndustryAttributionResult {
  const attributions: AggregateIndustryAttribution[] = [];

  let totalContributionCount = 0;
  let informativeEmployerTotal = 0;
  let informativeEmployerCount = 0;
  let nonInformativeEmployerTotal = 0;
  let nonInformativeEmployerCount = 0;

  for (const row of byEmployer) {
    const amount = row.total || 0;
    const count = row.count || 0;
    totalContributionCount += count;
    if (amount <= 0) continue;

    const employer = row.employer || '';
    if (isInformativeEmployer(employer)) {
      informativeEmployerTotal += amount;
      informativeEmployerCount += count;
      const result = categorizeContribution(employer, '');
      attributions.push({
        sector: result.sector,
        category: result.category,
        label: employer,
        amount,
        count,
      });
    } else {
      nonInformativeEmployerTotal += amount;
      nonInformativeEmployerCount += count;
    }
  }

  let informativeOccupationTotal = 0;
  const informativeOccupationRows: Array<{
    sector: IndustrySector;
    category: string;
    label: string;
    total: number;
    count: number;
  }> = [];

  for (const row of byOccupation) {
    const amount = row.total || 0;
    if (amount <= 0) continue;
    const occupation = (row.occupation || '').trim();
    if (!occupation) continue;
    const result = categorizeContribution('', occupation);
    if (result.sector === IndustrySector.OTHER) continue;
    informativeOccupationTotal += amount;
    informativeOccupationRows.push({
      sector: result.sector,
      category: result.category,
      label: `(via occupation: ${occupation})`,
      total: amount,
      count: row.count || 0,
    });
  }

  const extraOccupationSignal = Math.max(
    0,
    Math.min(nonInformativeEmployerTotal, informativeOccupationTotal - informativeEmployerTotal)
  );

  let occupationAttributedCount = 0;
  if (extraOccupationSignal > 0 && informativeOccupationTotal > 0) {
    const scale = extraOccupationSignal / informativeOccupationTotal;
    for (const row of informativeOccupationRows) {
      const attributedAmount = row.total * scale;
      const attributedCount = Math.round(row.count * scale);
      if (attributedAmount <= 0) continue;
      attributions.push({
        sector: row.sector,
        category: row.category,
        label: row.label,
        amount: attributedAmount,
        count: attributedCount,
      });
      occupationAttributedCount += attributedCount;
    }
  }

  return {
    attributions,
    residualAmount: Math.max(0, nonInformativeEmployerTotal - extraOccupationSignal),
    residualCount: Math.max(0, nonInformativeEmployerCount - occupationAttributedCount),
    totalContributionCount,
    attributedContributionCount: informativeEmployerCount + occupationAttributedCount,
  };
}

function processIndustryFromAggregates(
  byEmployer: Array<{ employer: string; total: number; count: number }>,
  byOccupation: Array<{ occupation: string; total: number; count: number }>,
  totalAmount: number
): { breakdown: ProcessedIndustryData[]; quality: DataQuality['industry'] } {
  const industryTotals: Record<
    string,
    { amount: number; count: number; employers: Record<string, { amount: number; count: number }> }
  > = {};

  const addToIndustry = (key: string, subLabel: string, amount: number, count: number): void => {
    if (amount <= 0) return;
    const bucket =
      industryTotals[key] ?? (industryTotals[key] = { amount: 0, count: 0, employers: {} });
    bucket.amount += amount;
    bucket.count += count;
    const sub =
      bucket.employers[subLabel] ?? (bucket.employers[subLabel] = { amount: 0, count: 0 });
    sub.amount += amount;
    sub.count += count;
  };

  const {
    attributions,
    residualAmount,
    residualCount,
    totalContributionCount,
    attributedContributionCount,
  } = attributeIndustriesFromAggregates(byEmployer, byOccupation);

  for (const a of attributions) {
    const industryKey = a.sector === IndustrySector.OTHER ? a.category : a.sector;
    addToIndustry(industryKey, a.label, a.amount, a.count);
  }

  if (residualAmount > 0) {
    addToIndustry('Unaffiliated / Non-employed', 'Unknown Employer', residualAmount, residualCount);
  }

  const breakdown: ProcessedIndustryData[] = Object.entries(industryTotals)
    .map(([industry, data]) => ({
      industry,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      count: data.count,
      topEmployers: Object.entries(data.employers)
        .map(([name, emp]) => ({ name, amount: emp.amount, count: emp.count }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
    }))
    .sort((a, b) => b.amount - a.amount);

  const quality: DataQuality['industry'] = {
    totalContributionsAnalyzed: totalContributionCount,
    contributionsWithEmployer: attributedContributionCount,
    completenessPercentage:
      totalContributionCount > 0 ? (attributedContributionCount / totalContributionCount) * 100 : 0,
  };

  return { breakdown, quality };
}

/**
 * Sector/category industry breakdown from FEC's pre-aggregated by_employer +
 * by_occupation endpoints — the aggregate-exact analogue of `getTopCategories`
 * (which samples raw Schedule A). Returns the top-N sector:category buckets by
 * dollar amount, with percentage taken over ALL categorized dollars (including
 * the recovered residual) so the shares are honest.
 *
 * Shares the residual/occupation-recovery math with the internal
 * `processIndustryFromAggregates` via `attributeIndustriesFromAggregates`.
 */
export function getTopIndustrySectorsFromAggregates(
  byEmployer: Array<{ employer: string; total: number; count: number }>,
  byOccupation: Array<{ occupation: string; total: number; count: number }>,
  topN: number
): Array<{
  sector: string;
  category: string;
  amount: number;
  percentage: number;
  contributionCount: number;
}> {
  const { attributions, residualAmount, residualCount } = attributeIndustriesFromAggregates(
    byEmployer,
    byOccupation
  );

  const buckets = new Map<
    string,
    { sector: string; category: string; amount: number; count: number }
  >();

  const add = (sector: string, category: string, amount: number, count: number): void => {
    if (amount <= 0) return;
    const key = `${sector}|${category}`;
    const bucket = buckets.get(key) ?? { sector, category, amount: 0, count: 0 };
    bucket.amount += amount;
    bucket.count += count;
    buckets.set(key, bucket);
  };

  for (const a of attributions) {
    add(a.sector, a.category, a.amount, a.count);
  }
  if (residualAmount > 0) {
    add('Unaffiliated / Non-employed', 'Non-employed', residualAmount, residualCount);
  }

  const totalAmount = Array.from(buckets.values()).reduce((sum, b) => sum + b.amount, 0);

  return Array.from(buckets.values())
    .map(b => ({
      sector: b.sector,
      category: b.category,
      amount: b.amount,
      percentage: totalAmount > 0 ? (b.amount / totalAmount) * 100 : 0,
      contributionCount: b.count,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, topN);
}

/**
 * Build geographic breakdown from FEC's pre-aggregated by_state endpoint.
 */
function processGeographyFromState(
  byState: Array<{ state: string; stateFull: string; total: number; count: number }>,
  totalAmount: number,
  representativeState: string
): { breakdown: ProcessedGeographicData[]; quality: DataQuality['geography'] } {
  const homeState = representativeState.trim().toUpperCase();
  let contributionsWithState = 0;
  let totalContributions = 0;

  const breakdown: ProcessedGeographicData[] = byState
    .filter(row => (row.total || 0) > 0 && (row.state || '').trim() !== '')
    .map(row => {
      const stateCode = row.state.toUpperCase();
      const count = row.count || 0;
      totalContributions += count;
      contributionsWithState += count;
      return {
        state: stateCode,
        stateName: row.stateFull || getStateName(stateCode),
        amount: row.total,
        percentage: totalAmount > 0 ? (row.total / totalAmount) * 100 : 0,
        count,
        isHomeState: stateCode === homeState,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const quality: DataQuality['geography'] = {
    totalContributionsAnalyzed: totalContributions,
    contributionsWithState,
    completenessPercentage: totalContributions > 0 ? 100 : 0,
  };

  return { breakdown, quality };
}

/**
 * Aggregate-endpoint variant of aggregateFinanceData.
 *
 * Replaces O(2,400)-page Schedule A pagination with 5 FEC server-side aggregate
 * calls regardless of candidate fundraising size. Uses the candidate's principal
 * committee only (matches prior getSampleContributions semantics).
 *
 * Trade-offs vs raw Schedule A:
 *   - Industry attribution uses by_employer directly; by_occupation is used to
 *     partially recover the non-informative-employer residual via a proportional
 *     "extra signal" approximation. This approximates but does not exactly
 *     reproduce the per-contribution employer+occupation fallback available on
 *     raw Schedule A.
 *   - FEC aggregate totals differ from raw Schedule A sums by ~1-3% due to how
 *     FEC handles memos and refunds on the aggregate endpoints.
 */
export async function aggregateFinanceDataFromAggregates(
  candidateId: string,
  cycle: number,
  representativeState: string
): Promise<ProcessedFinanceData | null> {
  try {
    // Resolve the principal committee FIRST and alone. The 3 aggregate methods
    // each internally call findCandidateCommitteeIds; racing them on a cold
    // cache fires 4+ concurrent identical committee lookups and triggers FEC's
    // burst rate limit. Prefetching populates the in-memory committee cache
    // so the subsequent parallel aggregate calls hit cache.
    const [financialSummary, committeeId] = await Promise.all([
      fecApiService.getFinancialSummary(candidateId, cycle),
      fecApiService.getPrincipalCommitteeId(candidateId, cycle),
    ]);

    if (!financialSummary) {
      return null;
    }

    const [byEmployer, byOccupation, byState] = await Promise.all([
      fecApiService.getContributionsByEmployer(candidateId, cycle, 100),
      fecApiService.getContributionsByOccupation(candidateId, cycle, 100),
      fecApiService.getContributionsByState(candidateId, cycle),
    ]);

    const hasAggregates = byEmployer.length > 0 || byState.length > 0;
    const totalEmployerAmount = byEmployer.reduce((sum, r) => sum + (r.total || 0), 0);
    const totalStateAmount = byState.reduce((sum, r) => sum + (r.total || 0), 0);

    const industryResults = processIndustryFromAggregates(
      byEmployer,
      byOccupation,
      totalEmployerAmount
    );
    const geographyResults = processGeographyFromState(
      byState,
      totalStateAmount,
      representativeState
    );

    const overallDataConfidence: DataQuality['overallDataConfidence'] = hasAggregates
      ? 'high'
      : 'low';

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
          ? `https://api.open.fec.gov/v1/schedules/schedule_a/by_employer/?committee_id=${committeeId}&cycle=${cycle}`
          : `https://api.open.fec.gov/v1/schedules/schedule_a/?candidate_id=${candidateId}&cycle=${cycle}`,
      },
    };
  } catch (error) {
    logger.error(
      `[Finance Aggregator] Failed to aggregate from FEC aggregates for ${candidateId}:`,
      error
    );
    throw error;
  }
}
