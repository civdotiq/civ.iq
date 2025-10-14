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

/**
 * Analyze industry breakdown from contribution employer data
 */
function analyzeIndustryBreakdown(contributions: FECContribution[]): Array<{
  sector: string;
  amount: number;
  percentage: number;
}> {
  if (!contributions.length) return [];

  const industryMap = new Map<string, number>();
  let totalAnalyzed = 0;

  contributions.forEach(contrib => {
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
 */
function analyzeTopContributors(contributions: FECContribution[]): Array<{
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

  contributions.forEach(contrib => {
    if (contrib.contributor_name && contrib.contributor_name.trim()) {
      const name = contrib.contributor_name.trim();
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

    // Check cache first
    const cacheKey = `finance:${bioguideId}:2024`;
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

    // Fetch FEC financial summary for 2024 cycle
    const financialSummary = await fecApiService.getFinancialSummary(fecMapping.fecId, 2024);

    if (!financialSummary) {
      logger.warn('[Finance API] No FEC financial data found', {
        bioguideId,
        fecId: fecMapping.fecId,
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
        cycle: 2024,
        lastUpdated: new Date().toISOString(),
        fecDataSources: {
          financialSummary: 'No 2024 financial data available',
          contributions: 'No 2024 contribution data available',
        },
        fecTransparencyLinks: {
          candidatePage: `https://www.fec.gov/data/candidate/${fecMapping.fecId}`,
          contributions: `https://www.fec.gov/data/receipts/individual-contributions/?candidate_id=${fecMapping.fecId}`,
          disbursements: `https://www.fec.gov/data/disbursements/?candidate_id=${fecMapping.fecId}`,
          financialSummary: `https://www.fec.gov/data/candidate/${fecMapping.fecId}/totals`,
        },
        metadata: {
          note: `No FEC financial data available for candidate ${fecMapping.fecId} in 2024 cycle. This may occur for senators not up for re-election or newly elected representatives.`,
          bioguideId,
          hasFecMapping: true,
          cacheHit: false,
          fecCandidateId: fecMapping.fecId,
          suggestedCycles: [2022, 2020, 2018],
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
      2024,
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
    const industryBreakdown = analyzeIndustryBreakdown(sampleContributions);

    // Analyze geographic distribution
    const geographicBreakdown = analyzeGeographicBreakdown(sampleContributions);

    // Get top contributors (legacy)
    const topContributors = analyzeTopContributors(sampleContributions);

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
      2024
    );

    // Fetch PAC contributions (Schedule A - non-individual)
    logger.info('[Finance API] Fetching PAC contributions', {
      bioguideId,
      fecId: fecMapping.fecId,
    });

    const pacContributions = await fecApiService.getPACContributions(fecMapping.fecId, 2024);

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

    // Process PAC contributions (Schedule A) - these are actual contributions TO the candidate
    logger.info(`[Finance API] Processing ${pacContributions.length} PAC contributions`);
    for (const contribution of pacContributions) {
      const committeeInfo = await fecApiService.getCommitteeInfo(contribution.committee_id);

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

    // Classify independent expenditures by type using committee information
    for (const expenditure of independentExpenditures) {
      const committeeInfo = await fecApiService.getCommitteeInfo(expenditure.committee_id);

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
      cycle: financialSummary.cycle || 2024,
      lastUpdated: new Date().toISOString(),
      fecDataSources: {
        financialSummary: `FEC.gov candidate/${fecMapping.fecId}/totals`,
        contributions: `FEC.gov Schedule A (${sampleContributions.length} contributions analyzed)`,
        independentExpenditures: `FEC.gov Schedule E (${independentExpenditures.length} expenditures)`,
      },
      fecTransparencyLinks: {
        candidatePage: `https://www.fec.gov/data/candidate/${fecMapping.fecId}`,
        contributions: `https://www.fec.gov/data/receipts/individual-contributions/?candidate_id=${fecMapping.fecId}`,
        disbursements: `https://www.fec.gov/data/disbursements/?candidate_id=${fecMapping.fecId}`,
        financialSummary: `https://www.fec.gov/data/candidate/${fecMapping.fecId}/totals`,
        independentExpenditures: `https://www.fec.gov/data/independent-expenditures/?candidate_id=${fecMapping.fecId}`,
      },

      metadata: {
        bioguideId,
        hasFecMapping: true,
        cacheHit: false,
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

    // Cache successful response for longer time
    await govCache.set(cacheKey, response, {
      ttl: 21600000, // 6 hours
      source: 'fec-api',
      dataType: 'finance',
    });

    logger.info('[Finance API] Successfully returned FEC data', {
      bioguideId,
      fecId: fecMapping.fecId,
      totalRaised: response.totalRaised,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(response);
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
