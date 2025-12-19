/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Optimized FEC Finance API Route
 * Provides real campaign finance data from FEC.gov with caching and performance optimizations
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { fecApiService, FECContribution, classifyPACType } from '@/lib/fec/fec-api-service';
import { bioguideToFECMapping } from '@/lib/data/bioguide-fec-mapping';
import { govCache } from '@/services/cache';
import {
  FinanceResponse,
  DeduplicatedContributor,
  IndustrySectorBreakdown,
  CategorizedContributor,
} from '@/types/campaign-finance';
import { deduplicateContributions, standardizeEmployerName } from '@/lib/fec/entity-resolution';
import {
  aggregateByIndustrySector,
  getTopCategories,
  categorizeContribution,
} from '@/lib/fec/industry-taxonomy';
import { categorizeIntoBaskets, getInterestGroupMetrics } from '@/lib/fec/interest-groups';

export const runtime = 'edge';
// Current year for cycle calculations
const CURRENT_YEAR = new Date().getFullYear();
// Calculate current election cycle (even years only)
const _CURRENT_CYCLE = CURRENT_YEAR % 2 === 0 ? CURRENT_YEAR : CURRENT_YEAR + 1;

// Election cycles to try in order (most recent first)
// Using 2024 as primary since that's the most recent completed cycle
const FALLBACK_CYCLES: [number, ...number[]] = [2024, 2022, 2020, 2018];

/**
 * Determine Senate class and next election year from FEC candidate ID
 * Senate classes: Class 1 (2024), Class 2 (2026), Class 3 (2028)
 * FEC IDs: S = Senate, first digit after state = class indicator
 */
function getSenateElectionInfo(
  fecId: string
): { nextElection: number; explanation: string } | null {
  // FEC Senate candidate IDs start with state code + S (e.g., "H8MI12345" for House, "S6MI00123" for Senate)
  // The digit after 'S' indicates the cycle year of first election
  if (!fecId || fecId.length < 2) return null;

  // Check if it's a Senate candidate (FEC ID contains 'S' in position for chamber)
  const chamberIndicator = fecId.charAt(0);
  if (chamberIndicator !== 'S') return null;

  // Calculate next election based on 6-year Senate terms
  // Senate elections: 2024, 2026, 2028 (then repeats)
  // Class 1: 2024, 2030, 2036...
  // Class 2: 2026, 2032, 2038...
  // Class 3: 2028, 2034, 2040...

  // Simplified: Cycle digit in FEC ID gives hint, but we'll calculate from known patterns
  const cycleDigit = parseInt(fecId.charAt(1), 10);

  // FEC IDs encode the first election cycle in positions 1-2
  // e.g., S2 = first elected in a cycle ending in 2 (2022, 2012, etc.)
  let nextElection: number;

  // Calculate based on the cycle digit pattern
  if (cycleDigit % 6 === 0 || cycleDigit % 6 === 4) {
    // Class 1 pattern (2024)
    nextElection = 2024;
    while (nextElection < CURRENT_YEAR) nextElection += 6;
  } else if (cycleDigit % 6 === 2) {
    // Class 2 pattern (2026)
    nextElection = 2026;
    while (nextElection < CURRENT_YEAR) nextElection += 6;
  } else {
    // Class 3 pattern (2028)
    nextElection = 2028;
    while (nextElection < CURRENT_YEAR) nextElection += 6;
  }

  return {
    nextElection,
    explanation: `Senators serve 6-year terms. This senator is next up for election in ${nextElection}.`,
  };
}

// ISR: Revalidate every 1 hour
export const revalidate = 3600;

/**
 * Analyze industry breakdown from contribution employer data
 * Excludes candidate self-contributions to prevent inflated industry numbers
 */
function analyzeIndustryBreakdown(
  contributions: FECContribution[],
  candidateName?: string
): Array<{
  sector: string;
  amount: number;
  percentage: number;
}> {
  if (!contributions.length) return [];

  const industryMap = new Map<string, number>();
  let totalAnalyzed = 0;

  // Extract candidate's last name for matching
  const candidateLastName = candidateName?.split(',')[0]?.trim().toUpperCase();

  contributions.forEach(contrib => {
    // Skip candidate self-contributions
    if (candidateLastName && contrib.contributor_name) {
      const contributorLastName = contrib.contributor_name.split(',')[0]?.trim().toUpperCase();
      if (contributorLastName === candidateLastName) {
        return; // Skip this contribution
      }
    }

    if (contrib.contributor_employer && contrib.contributor_employer.trim()) {
      const employer = contrib.contributor_employer.trim().toUpperCase();
      const amount = contrib.contribution_receipt_amount || 0;
      industryMap.set(employer, (industryMap.get(employer) || 0) + amount);
      totalAnalyzed += amount;
    }
  });

  return Array.from(industryMap.entries())
    .map(([sector, amount]) => ({
      sector,
      amount,
      percentage: totalAnalyzed > 0 ? (amount / totalAnalyzed) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
}

/**
 * Analyze geographic distribution from contributor state data
 */
function analyzeGeographicBreakdown(contributions: FECContribution[]): Array<{
  state: string;
  amount: number;
  percentage: number;
}> {
  if (!contributions.length) return [];

  const stateMap = new Map<string, number>();
  let totalAnalyzed = 0;

  contributions.forEach(contrib => {
    if (contrib.contributor_state && contrib.contributor_state.trim()) {
      const state = contrib.contributor_state.trim().toUpperCase();
      const amount = contrib.contribution_receipt_amount || 0;
      stateMap.set(state, (stateMap.get(state) || 0) + amount);
      totalAnalyzed += amount;
    }
  });

  return Array.from(stateMap.entries())
    .map(([state, amount]) => ({
      state,
      amount,
      percentage: totalAnalyzed > 0 ? (amount / totalAnalyzed) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
}

/**
 * Analyze top contributors from contribution data
 * Excludes candidate self-contributions
 */
function analyzeTopContributors(
  contributions: FECContribution[],
  candidateName?: string
): Array<{
  name: string;
  total_amount: number;
  count: number;
  employer?: string;
  occupation?: string;
}> {
  if (!contributions.length) return [];

  const contributorMap = new Map<
    string,
    {
      total_amount: number;
      count: number;
      employer?: string;
      occupation?: string;
    }
  >();

  // Extract candidate's last name for matching
  const candidateLastName = candidateName?.split(',')[0]?.trim().toUpperCase();

  contributions.forEach(contrib => {
    if (contrib.contributor_name && contrib.contributor_name.trim()) {
      const name = contrib.contributor_name.trim();

      // Skip candidate self-contributions
      if (candidateLastName) {
        const contributorLastName = name.split(',')[0]?.trim().toUpperCase();
        if (contributorLastName === candidateLastName) {
          return; // Skip this contribution
        }
      }

      const amount = contrib.contribution_receipt_amount || 0;
      const existing = contributorMap.get(name) || { total_amount: 0, count: 0 };

      contributorMap.set(name, {
        total_amount: existing.total_amount + amount,
        count: existing.count + 1,
        employer: contrib.contributor_employer || existing.employer,
        occupation: contrib.contributor_occupation || existing.occupation,
      });
    }
  });

  return Array.from(contributorMap.entries())
    .map(([name, data]) => ({
      name,
      ...data,
    }))
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, 20);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const startTime = Date.now();

  try {
    logger.info('[Finance API] Optimized endpoint called', { bioguideId });

    // Check cache first - uses multi-cycle key since we may fallback to older cycles
    const cacheKey = `finance:${bioguideId}:multi-cycle`;
    const cached = await govCache.get<FinanceResponse>(cacheKey);

    if (cached) {
      logger.info('[Finance API] Cache hit', {
        bioguideId,
        responseTime: Date.now() - startTime,
      });

      return NextResponse.json({
        ...cached,
        metadata: {
          ...cached.metadata,
          cacheHit: true,
        },
      });
    }

    // Check if we have FEC mapping for this bioguide ID
    const fecMapping = bioguideToFECMapping[bioguideId];

    // Debug: Log mapping check
    logger.info('[Finance API DEBUG] Mapping check', {
      bioguideId,
      hasFecMapping: !!fecMapping,
      fecId: fecMapping?.fecId || 'none',
    });

    if (!fecMapping) {
      logger.warn('[Finance API] No FEC mapping found', { bioguideId });

      const noDataResponse: FinanceResponse = {
        totalRaised: 0,
        totalSpent: 0,
        cashOnHand: 0,
        individualContributions: 0,
        pacContributions: 0,
        partyContributions: 0,
        candidateContributions: 0,
        industryBreakdown: [],
        geographicBreakdown: [],
        topContributors: [],
        recentContributions: [],
        // Legacy compatibility
        industry_breakdown: [],
        top_contributors: [],
        recent_contributions: [],
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
        candidateId: '',
        cycle: 2024,
        lastUpdated: new Date().toISOString(),
        fecDataSources: {
          financialSummary: 'No FEC mapping available',
          contributions: 'No FEC mapping available',
        },
        fecTransparencyLinks: {
          candidatePage: '',
          contributions: '',
          disbursements: '',
          financialSummary: '',
        },
        metadata: {
          note: `No FEC candidate ID mapping found for bioguide ${bioguideId}. This representative may be newly elected or serving in a non-federal office.`,
          bioguideId,
          hasFecMapping: false,
          cacheHit: false,
          mappingLastUpdated: '2025-09-18',
          suggestedAction: 'Check congress-legislators repository for recent updates',
        },
        // Phase 1 fields
        pacContributionsByType: {
          superPac: 0,
          traditional: 0,
          leadership: 0,
          hybrid: 0,
        },
        supportingExpenditures: [],
        opposingExpenditures: [],
      };

      // Cache the no-mapping response for shorter time
      await govCache.set(cacheKey, noDataResponse, {
        ttl: 3600000, // 1 hour
        source: 'no-fec-mapping',
        dataType: 'finance',
      });

      return NextResponse.json(noDataResponse);
    }

    logger.info('[Finance API] FEC mapping found', {
      bioguideId,
      fecId: fecMapping.fecId,
      name: fecMapping.name,
    });

    // MULTI-CYCLE FALLBACK: Try cycles in order until data is found
    // This ensures Senators not up for re-election still show their last campaign data
    let financialSummary = null;
    let dataFromCycle = FALLBACK_CYCLES[0]; // Start with most recent (2024)
    const requestedCycle = FALLBACK_CYCLES[0];

    for (const cycle of FALLBACK_CYCLES) {
      logger.info('[Finance API] Trying cycle', { bioguideId, cycle });
      financialSummary = await fecApiService.getFinancialSummary(fecMapping.fecId, cycle);
      if (financialSummary) {
        dataFromCycle = cycle;
        logger.info('[Finance API] Found data in cycle', { bioguideId, cycle });
        break;
      }
    }

    // Determine if this is historical data and get election context
    const isHistoricalData = dataFromCycle !== requestedCycle;
    const senateInfo = getSenateElectionInfo(fecMapping.fecId);
    const isSenator = fecMapping.fecId.charAt(0) === 'S';

    // Build cycle explanation for transparency
    let cycleExplanation: string | undefined;
    if (isHistoricalData && isSenator && senateInfo) {
      cycleExplanation = senateInfo.explanation;
    } else if (isHistoricalData) {
      cycleExplanation = `Showing data from ${dataFromCycle} election cycle. No campaign activity in more recent cycles.`;
    }

    if (!financialSummary) {
      logger.warn('[Finance API] No FEC financial data found in any cycle', {
        bioguideId,
        fecId: fecMapping.fecId,
        cyclesTried: FALLBACK_CYCLES,
      });

      const noDataResponse: FinanceResponse = {
        totalRaised: 0,
        totalSpent: 0,
        cashOnHand: 0,
        individualContributions: 0,
        pacContributions: 0,
        partyContributions: 0,
        candidateContributions: 0,
        industryBreakdown: [],
        geographicBreakdown: [],
        topContributors: [],
        recentContributions: [],
        // Legacy compatibility
        industry_breakdown: [],
        top_contributors: [],
        recent_contributions: [],
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
        candidateId: fecMapping.fecId,
        cycle: requestedCycle,
        lastUpdated: new Date().toISOString(),
        fecDataSources: {
          financialSummary: `No financial data available in cycles ${FALLBACK_CYCLES.join(', ')}`,
          contributions: 'No contribution data available',
        },
        fecTransparencyLinks: {
          candidatePage: `https://www.fec.gov/data/candidate/${fecMapping.fecId}`,
          contributions: `https://www.fec.gov/data/receipts/individual-contributions/?candidate_id=${fecMapping.fecId}`,
          disbursements: `https://www.fec.gov/data/disbursements/?candidate_id=${fecMapping.fecId}`,
          financialSummary: `https://www.fec.gov/data/candidate/${fecMapping.fecId}/totals`,
        },
        metadata: {
          note: `No FEC financial data available for candidate ${fecMapping.fecId} in cycles ${FALLBACK_CYCLES.join(', ')}. This member may have been recently appointed or have no active campaign committee.`,
          bioguideId,
          hasFecMapping: true,
          cacheHit: false,
          fecCandidateId: fecMapping.fecId,
          suggestedCycles: [],
          isHistoricalData: false,
          requestedCycle,
          nextElectionYear: senateInfo?.nextElection,
        },
        // Phase 1 fields
        pacContributionsByType: {
          superPac: 0,
          traditional: 0,
          leadership: 0,
          hybrid: 0,
        },
        supportingExpenditures: [],
        opposingExpenditures: [],
      };

      // Cache the no-data response for shorter time
      await govCache.set(cacheKey, noDataResponse, {
        ttl: 7200000, // 2 hours
        source: 'fec-no-data',
        dataType: 'finance',
      });

      return NextResponse.json(noDataResponse);
    }

    // Fetch sample contributions for detailed analysis
    logger.info('[Finance API] Fetching sample contributions for detailed analysis', {
      bioguideId,
      fecId: fecMapping.fecId,
    });

    const sampleContributions = await fecApiService.getSampleContributions(
      fecMapping.fecId,
      dataFromCycle,
      200
    );

    // PHASE 2: Entity Resolution & Deduplication
    logger.info('[Finance API] Running entity resolution on contributions', {
      bioguideId,
      contributionCount: sampleContributions.length,
    });

    const deduplicatedEntities = deduplicateContributions(sampleContributions);

    // Convert to API response format
    const deduplicatedContributors: DeduplicatedContributor[] = deduplicatedEntities
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 50) // Top 50 deduplicated contributors
      .map(entity => ({
        displayName: entity.displayName,
        normalizedName: entity.normalizedName,
        totalAmount: entity.totalAmount,
        contributionCount: entity.transactionCount,
        nameVariants: entity.rawVariants,
        entityType: entity.entityType,
        metadata: entity.metadata,
      }));

    // Enhanced industry breakdown using employer deduplication
    const employerMap = new Map<
      string,
      { amount: number; contributors: Set<string>; variants: Set<string> }
    >();

    for (const contrib of sampleContributions) {
      if (contrib.contributor_employer?.trim()) {
        const standardEmployer = standardizeEmployerName(contrib.contributor_employer);
        const existing = employerMap.get(standardEmployer) || {
          amount: 0,
          contributors: new Set(),
          variants: new Set(),
        };

        existing.amount += contrib.contribution_receipt_amount;
        existing.contributors.add(contrib.contributor_name);
        existing.variants.add(contrib.contributor_employer);

        employerMap.set(standardEmployer, existing);
      }
    }

    const totalEmployerAmount = Array.from(employerMap.values()).reduce(
      (sum, e) => sum + e.amount,
      0
    );

    const enhancedIndustryBreakdown = Array.from(employerMap.entries())
      .map(([sector, data]) => ({
        sector,
        amount: data.amount,
        percentage: totalEmployerAmount > 0 ? (data.amount / totalEmployerAmount) * 100 : 0,
        contributorCount: data.contributors.size,
        nameVariants: Array.from(data.variants),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Calculate entity resolution metrics
    const uniqueContributorNames = new Set(sampleContributions.map(c => c.contributor_name)).size;
    const entityResolutionMetrics = {
      contributorsBeforeDedup: uniqueContributorNames,
      contributorsAfterDedup: deduplicatedEntities.length,
      deduplicationRate:
        uniqueContributorNames > 0
          ? ((uniqueContributorNames - deduplicatedEntities.length) / uniqueContributorNames) * 100
          : 0,
      nameVariantsFound: deduplicatedEntities.reduce((sum, e) => sum + e.rawVariants.length - 1, 0),
    };

    logger.info('[Finance API] Entity resolution complete', {
      bioguideId,
      ...entityResolutionMetrics,
    });

    // PHASE 3: Industry Taxonomy & Categorization
    logger.info('[Finance API] Running industry categorization', {
      bioguideId,
      contributionCount: sampleContributions.length,
    });

    const sectorAggregation = aggregateByIndustrySector(sampleContributions);

    // Convert to API response format
    const industrySectorBreakdown: IndustrySectorBreakdown[] = sectorAggregation.map(sector => {
      const topCategories = Array.from(sector.categories.entries())
        .map(([category, data]) => ({
          category,
          amount: data.amount,
          count: data.count,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      return {
        sector: sector.sector,
        totalAmount: sector.totalAmount,
        contributionCount: sector.contributionCount,
        percentage: sector.percentage,
        confidence: 'high' as const,
        topCategories,
      };
    });

    // Get top categorized contributors
    const topCategorizedList = getTopCategories(sampleContributions, 50);

    const categorizedContributors: CategorizedContributor[] = topCategorizedList.map(cat => {
      // Find matching contributors for this category
      const matchingContribs = sampleContributions.filter(c => {
        const categorization = categorizeContribution(
          c.contributor_employer,
          c.contributor_occupation
        );
        return categorization.sector === cat.sector && categorization.category === cat.category;
      });

      const firstContrib = matchingContribs[0];

      return {
        name: firstContrib?.contributor_name || 'Unknown',
        totalAmount: cat.totalAmount,
        contributionCount: cat.contributionCount,
        industrySector: cat.sector,
        industryCategory: cat.category,
        employer: firstContrib?.contributor_employer,
        occupation: firstContrib?.contributor_occupation,
      };
    });

    // Calculate taxonomy metrics
    let highConfidence = 0;
    let mediumConfidence = 0;
    let lowConfidence = 0;

    for (const contrib of sampleContributions) {
      const categorization = categorizeContribution(
        contrib.contributor_employer,
        contrib.contributor_occupation
      );
      if (categorization.confidence === 'high') highConfidence++;
      else if (categorization.confidence === 'medium') mediumConfidence++;
      else lowConfidence++;
    }

    const industryTaxonomyMetrics = {
      totalContributionsCategorized: sampleContributions.length,
      highConfidenceCategories: highConfidence,
      mediumConfidenceCategories: mediumConfidence,
      lowConfidenceCategories: lowConfidence,
      sectorsRepresented: sectorAggregation.length,
    };

    logger.info('[Finance API] Industry categorization complete', {
      bioguideId,
      ...industryTaxonomyMetrics,
    });

    // PHASE 4: Interest Group Baskets
    logger.info('[Finance API] Categorizing into interest group baskets', {
      bioguideId,
      contributionCount: sampleContributions.length,
    });

    const interestGroupBaskets = categorizeIntoBaskets(
      sampleContributions,
      financialSummary.candidate_contribution || 0
    );

    const interestGroupMetrics = getInterestGroupMetrics(interestGroupBaskets);

    logger.info('[Finance API] Interest group categorization complete', {
      bioguideId,
      baskets: interestGroupBaskets.length,
      topInfluencer: interestGroupMetrics.topInfluencer,
      grassrootsPercentage: interestGroupMetrics.grassrootsPercentage,
    });

    // Analyze industry breakdown from employer data (legacy)
    // Exclude candidate self-contributions using their name from FEC mapping
    const industryBreakdown = analyzeIndustryBreakdown(sampleContributions, fecMapping.name);

    // Analyze geographic distribution
    const geographicBreakdown = analyzeGeographicBreakdown(sampleContributions);

    // Get top contributors (legacy)
    // Exclude candidate self-contributions using their name from FEC mapping
    const topContributors = analyzeTopContributors(sampleContributions, fecMapping.name);

    // Get recent contributions (last 20)
    const recentContributions = sampleContributions
      .sort(
        (a, b) =>
          new Date(b.contribution_receipt_date).getTime() -
          new Date(a.contribution_receipt_date).getTime()
      )
      .slice(0, 20)
      .map(contrib => ({
        contributor_name: contrib.contributor_name,
        contributor_employer: contrib.contributor_employer || undefined,
        contribution_receipt_amount: contrib.contribution_receipt_amount,
        contribution_receipt_date: contrib.contribution_receipt_date,
      }));

    // Fetch independent expenditures (Schedule E)
    logger.info('[Finance API] Fetching independent expenditures', {
      bioguideId,
      fecId: fecMapping.fecId,
    });

    const independentExpenditures = await fecApiService.getIndependentExpenditures(
      fecMapping.fecId,
      dataFromCycle
    );

    // Fetch PAC contributions (Schedule A - non-individual)
    logger.info('[Finance API] Fetching PAC contributions', {
      bioguideId,
      fecId: fecMapping.fecId,
    });

    const pacContributions = await fecApiService.getPACContributions(
      fecMapping.fecId,
      dataFromCycle
    );

    // Process and classify independent expenditures
    const supportingExpenditures: Array<{
      pacName: string;
      pacType: 'superPac' | 'traditional' | 'leadership' | 'hybrid' | 'unknown';
      amount: number;
      date: string;
      description: string;
    }> = [];

    const opposingExpenditures: Array<{
      pacName: string;
      pacType: 'superPac' | 'traditional' | 'leadership' | 'hybrid' | 'unknown';
      amount: number;
      date: string;
      description: string;
    }> = [];

    // Classify PAC contributions by type
    logger.info('[Finance API] Classifying PAC contributions by type', {
      bioguideId,
      fecId: fecMapping.fecId,
    });

    const pacBreakdown = {
      superPac: 0,
      traditional: 0,
      leadership: 0,
      hybrid: 0,
    };

    // OPTIMIZATION: Deduplicate committee info lookups to reduce FEC API calls
    // Collect all unique committee IDs from both contributions and expenditures
    const uniqueCommitteeIds = new Set<string>();
    pacContributions.forEach(c => uniqueCommitteeIds.add(c.committee_id));
    independentExpenditures.forEach(e => uniqueCommitteeIds.add(e.committee_id));

    // Fetch committee info once per unique committee ID
    logger.info(
      `[Finance API] Fetching info for ${uniqueCommitteeIds.size} unique committees (optimized)`
    );
    const committeeInfoCache = new Map<
      string,
      Awaited<ReturnType<typeof fecApiService.getCommitteeInfo>>
    >();

    // Fetch all committee info in parallel for better performance
    const committeeIds = Array.from(uniqueCommitteeIds);
    const committeeInfoResults = await Promise.all(
      committeeIds.map(id => fecApiService.getCommitteeInfo(id))
    );

    // Populate cache with results
    committeeInfoResults.forEach((info, index) => {
      const committeeId = committeeIds[index];
      if (committeeId) {
        committeeInfoCache.set(committeeId, info);
      }
    });

    // Process PAC contributions (Schedule A) - these are actual contributions TO the candidate
    logger.info(`[Finance API] Processing ${pacContributions.length} PAC contributions`);
    for (const contribution of pacContributions) {
      const committeeInfo = committeeInfoCache.get(contribution.committee_id);

      if (committeeInfo) {
        const pacType = classifyPACType(committeeInfo.committee_type, committeeInfo.designation);

        if (pacType) {
          pacBreakdown[pacType] += contribution.contribution_receipt_amount;
          logger.debug(
            `[Finance API] Classified ${contribution.committee_name} as ${pacType}: $${contribution.contribution_receipt_amount}`
          );
        }
      }
    }

    logger.info('[Finance API] PAC contribution breakdown complete', pacBreakdown);

    // Classify independent expenditures by type using cached committee information
    for (const expenditure of independentExpenditures) {
      const committeeInfo = committeeInfoCache.get(expenditure.committee_id);

      const pacType = committeeInfo
        ? classifyPACType(committeeInfo.committee_type, committeeInfo.designation)
        : null;

      const expenditureRecord = {
        pacName: expenditure.committee_name,
        pacType: (pacType || 'unknown') as
          | 'superPac'
          | 'traditional'
          | 'leadership'
          | 'hybrid'
          | 'unknown',
        amount: expenditure.expenditure_amount,
        date: expenditure.expenditure_date,
        description: expenditure.expenditure_description,
      };

      if (expenditure.support_oppose_indicator === 'S') {
        supportingExpenditures.push(expenditureRecord);
      } else if (expenditure.support_oppose_indicator === 'O') {
        opposingExpenditures.push(expenditureRecord);
      }
    }

    // Process FEC financial summary into our response format
    const response: FinanceResponse = {
      totalRaised: financialSummary.receipts || financialSummary.total_receipts || 0,
      totalSpent: financialSummary.disbursements || financialSummary.total_disbursements || 0,
      cashOnHand:
        financialSummary.last_cash_on_hand_end_period ||
        financialSummary.cash_on_hand_end_period ||
        0,
      individualContributions: financialSummary.individual_contributions || 0,
      pacContributions: financialSummary.other_political_committee_contributions || 0,
      partyContributions: financialSummary.political_party_committee_contributions || 0,
      candidateContributions: financialSummary.candidate_contribution || 0,

      // Real analyzed data from FEC contributions
      industryBreakdown,
      geographicBreakdown,
      topContributors,
      recentContributions,
      // Legacy compatibility for existing component
      industry_breakdown: industryBreakdown,
      top_contributors: topContributors,
      recent_contributions: recentContributions,

      dataQuality: {
        industry: {
          totalContributionsAnalyzed: sampleContributions.length,
          contributionsWithEmployer: sampleContributions.filter(c => c.contributor_employer?.trim())
            .length,
          completenessPercentage:
            sampleContributions.length > 0
              ? Math.round(
                  (sampleContributions.filter(c => c.contributor_employer?.trim()).length /
                    sampleContributions.length) *
                    100
                )
              : 0,
        },
        geography: {
          totalContributionsAnalyzed: sampleContributions.length,
          contributionsWithState: sampleContributions.filter(c => c.contributor_state?.trim())
            .length,
          completenessPercentage:
            sampleContributions.length > 0
              ? Math.round(
                  (sampleContributions.filter(c => c.contributor_state?.trim()).length /
                    sampleContributions.length) *
                    100
                )
              : 0,
        },
        overallDataConfidence: 'high', // FEC official data
      },

      candidateId: fecMapping.fecId,
      cycle: dataFromCycle, // Use the actual cycle the data came from
      lastUpdated: new Date().toISOString(),
      fecDataSources: {
        financialSummary: `FEC.gov candidate/${fecMapping.fecId}/totals (${dataFromCycle} cycle)`,
        contributions: `FEC.gov Schedule A (${sampleContributions.length} contributions analyzed)`,
        independentExpenditures: `FEC.gov Schedule E (${independentExpenditures.length} expenditures)`,
      },
      fecTransparencyLinks: {
        candidatePage: `https://www.fec.gov/data/candidate/${fecMapping.fecId}`,
        contributions: `https://www.fec.gov/data/receipts/individual-contributions/?candidate_id=${fecMapping.fecId}&two_year_transaction_period=${dataFromCycle}`,
        disbursements: `https://www.fec.gov/data/disbursements/?candidate_id=${fecMapping.fecId}&two_year_transaction_period=${dataFromCycle}`,
        financialSummary: `https://www.fec.gov/data/candidate/${fecMapping.fecId}/totals`,
        independentExpenditures: `https://www.fec.gov/data/independent-expenditures/?candidate_id=${fecMapping.fecId}`,
      },

      metadata: {
        bioguideId,
        hasFecMapping: true,
        cacheHit: false,
        // Multi-cycle fallback transparency fields
        isHistoricalData,
        dataFromCycle,
        requestedCycle,
        cycleExplanation,
        nextElectionYear: senateInfo?.nextElection,
      },

      // Phase 1 fields - Now populated with real FEC data
      pacContributionsByType: pacBreakdown,
      supportingExpenditures,
      opposingExpenditures,

      // Phase 2 fields - Entity Resolution & Name Standardization
      deduplicatedContributors,
      enhancedIndustryBreakdown,
      entityResolutionMetrics,

      // Phase 3 fields - Industry Taxonomy & Categorization
      industrySectorBreakdown,
      categorizedContributors,
      industryTaxonomyMetrics,

      // Phase 4 fields - Interest Group Baskets
      interestGroupBaskets,
      interestGroupMetrics,
    };

    // Cache successful response - FEC data updates quarterly (30 day cache)
    await govCache.set(cacheKey, response, {
      ttl: 2592000000, // 30 days (FEC quarterly reporting cycle)
      source: 'fec-api',
      dataType: 'finance',
    });

    logger.info('[Finance API] Successfully returned FEC data', {
      bioguideId,
      fecId: fecMapping.fecId,
      totalRaised: response.totalRaised,
      responseTime: Date.now() - startTime,
    });

    // Add HTTP cache headers - FEC data updates quarterly (30 day cache)
    const headers = new Headers({
      'Cache-Control': 'public, max-age=2592000, stale-while-revalidate=86400',
      'CDN-Cache-Control': 'public, max-age=2592000',
      Vary: 'Accept-Encoding',
    });

    return NextResponse.json(response, { headers });
  } catch (error) {
    logger.error('[Finance API] Error fetching finance data', error as Error, {
      bioguideId,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch campaign finance data',
        bioguideId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
