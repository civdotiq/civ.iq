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
import logger from '@/lib/logging/simple-logger';

// Industry classification mapping - maps employer names to industries
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  'Finance/Insurance/Real Estate': [
    'bank',
    'insurance',
    'financial',
    'credit',
    'mortgage',
    'investment',
    'securities',
    'capital',
    'asset',
    'wealth',
    'fund',
    'trading',
    'real estate',
    'realty',
    'property',
    'lending',
    'loan',
    'goldman sachs',
    'morgan stanley',
    'jpmorgan',
    'citigroup',
    'wells fargo',
    'blackstone',
    'blackrock',
    'fidelity',
  ],
  Health: [
    'hospital',
    'medical',
    'health',
    'healthcare',
    'pharmaceutical',
    'pharma',
    'clinic',
    'physician',
    'therapy',
    'surgical',
    'medicine',
    'biotech',
    'dental',
    'veterinary',
    'pfizer',
    'merck',
    'johnson & johnson',
    'abbott',
    'medtronic',
    'unitedhealth',
    'aetna',
    'cigna',
    'humana',
    'anthem',
    'kaiser',
    'blue cross',
  ],
  'Communications/Electronics': [
    'telecom',
    'technology',
    'software',
    'computer',
    'electronics',
    'internet',
    'media',
    'broadcasting',
    'wireless',
    'tech',
    'digital',
    'semiconductor',
    'google',
    'microsoft',
    'apple',
    'amazon',
    'meta',
    'facebook',
    'oracle',
    'intel',
    'cisco',
    'ibm',
    'comcast',
    'verizon',
    'at&t',
  ],
  'Energy/Natural Resources': [
    'energy',
    'oil',
    'gas',
    'petroleum',
    'coal',
    'mining',
    'utility',
    'electric',
    'power',
    'renewable',
    'solar',
    'wind',
    'natural gas',
    'pipeline',
    'extraction',
    'drilling',
    'refining',
    'exxon',
    'chevron',
    'conocophillips',
    'duke energy',
    'nextera',
    'exelon',
  ],
  Transportation: [
    'airline',
    'transportation',
    'shipping',
    'logistics',
    'freight',
    'trucking',
    'rail',
    'automotive',
    'auto',
    'car',
    'vehicle',
    'delivery',
    'cargo',
    'transit',
    'aviation',
  ],
  Agribusiness: [
    'agriculture',
    'farming',
    'food',
    'agricultural',
    'crop',
    'livestock',
    'grain',
    'dairy',
    'meat',
    'produce',
    'fertilizer',
    'seed',
    'feed',
    'ranch',
    'farm',
  ],
  Construction: [
    'construction',
    'building',
    'contractor',
    'development',
    'engineering',
    'architecture',
    'infrastructure',
    'materials',
    'cement',
    'steel',
    'concrete',
    'electrical',
    'plumbing',
    'roofing',
  ],
  Defense: [
    'defense',
    'military',
    'aerospace',
    'weapons',
    'lockheed',
    'raytheon',
    'boeing',
    'northrop grumman',
    'general dynamics',
    'l3harris',
    'bae systems',
  ],
  Education: [
    'education',
    'university',
    'college',
    'school',
    'academic',
    'educational',
    'learning',
    'teaching',
    'training',
    'institute',
    'academy',
    'student',
    'faculty',
  ],
  Labor: [
    'union',
    'labor union',
    'teamsters',
    'afl-cio',
    'brotherhood',
    'laborers',
    'steelworkers',
    'seiu',
    'afscme',
    'uaw',
    'ibew',
    'ufcw',
    'carpenters',
    'pipefitters',
    'firefighter',
  ],
  'Lawyers/Lobbyists': [
    'law firm',
    'legal',
    'attorney',
    'lawyer',
    'law office',
    'lobbying',
    'lobbyist',
    'counsel',
    'litigation',
  ],
  'Ideology/Single Issue': [
    'political action',
    'non-profit',
    'nonprofit',
    'foundation',
    'planned parenthood',
    'sierra club',
    'nra',
    'aipac',
    'aclu',
    'naacp',
  ],
};

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
 * Non-informative employer values from FEC filings
 */
const NON_INFORMATIVE_EMPLOYERS_SET = new Set([
  'none',
  'n/a',
  'na',
  'not employed',
  'not applicable',
  'information requested',
  'information requested per best efforts',
  'info requested',
  'refused',
  'self',
  'self-employed',
  'self employed',
  'selfemployed',
  'independent',
  'private',
  'personal',
  'individual',
]);

/**
 * Classify employer into industry category
 */
function classifyIndustry(employer: string, occupation?: string): string {
  if (!employer || employer.trim() === '') {
    // No employer data — try occupation
    if (occupation) return classifyByOccupation(occupation);
    return 'Unknown';
  }

  const cleanEmployer = employer.toLowerCase().trim();

  // Skip non-informative employer values like "NONE" or "SELF-EMPLOYED"
  if (NON_INFORMATIVE_EMPLOYERS_SET.has(cleanEmployer)) {
    if (occupation) return classifyByOccupation(occupation);
    return 'Unknown';
  }

  // Handle retired specifically
  if (cleanEmployer === 'retired' || cleanEmployer === 'retiree') {
    return 'Retired';
  }

  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (cleanEmployer.includes(keyword.toLowerCase())) {
        return industry;
      }
    }
  }

  // Employer exists but didn't match — try occupation
  if (occupation) {
    const occResult = classifyByOccupation(occupation);
    if (occResult !== 'Unknown') return occResult;
  }

  return 'Miscellaneous Business';
}

/**
 * Classify by occupation when employer is missing or non-informative
 */
const OCCUPATION_KEYWORDS: Record<string, string[]> = {
  Health: [
    'physician',
    'doctor',
    'nurse',
    'surgeon',
    'medical',
    'healthcare',
    'dentist',
    'pharmacist',
    'therapist',
  ],
  'Lawyers/Lobbyists': ['attorney', 'lawyer', 'legal', 'counsel', 'paralegal', 'lobbyist'],
  'Finance/Insurance/Real Estate': [
    'banker',
    'financial',
    'realtor',
    'real estate',
    'insurance',
    'accountant',
    'cpa',
    'auditor',
    'investment',
    'trader',
  ],
  'Communications/Electronics': [
    'software',
    'developer',
    'programmer',
    'data scientist',
    'engineer',
    'tech',
  ],
  Education: ['teacher', 'professor', 'educator', 'principal', 'academic'],
  Construction: ['contractor', 'construction', 'builder', 'plumber', 'electrician', 'carpenter'],
  Transportation: ['pilot', 'flight attendant', 'truck driver', 'driver'],
  Labor: ['union'],
  Retired: ['retired', 'retiree'],
  'Not Employed': ['homemaker', 'home maker', 'not employed', 'student', 'unemployed'],
};

function classifyByOccupation(occupation: string): string {
  const clean = occupation.toLowerCase().trim();
  if (!clean) return 'Unknown';

  for (const [industry, keywords] of Object.entries(OCCUPATION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (clean.includes(keyword)) return industry;
    }
  }

  // Common executive titles → generic business
  if (
    [
      'owner',
      'executive',
      'ceo',
      'president',
      'manager',
      'director',
      'partner',
      'founder',
      'entrepreneur',
    ].some(t => clean.includes(t))
  ) {
    return 'Miscellaneous Business';
  }

  return 'Unknown';
}

/**
 * Process raw FEC contributions into industry breakdown
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
    const industry = classifyIndustry(employer, occupation);

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
