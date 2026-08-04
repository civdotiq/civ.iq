/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Comprehensive Finance API Route - OPTIMIZED FOR PERFORMANCE
 * Returns ALL finance data in a single request:
 * - Basic finance summary (Total Raised, Spent, Cash on Hand)
 * - Top contributors with deduplication
 * - Industry breakdown
 * - Contribution trends
 * - Conduit aggregates (ActBlue/WinRed)
 *
 * This endpoint consolidates 3 separate API calls into one,
 * reducing network round-trips and improving perceived performance.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { fecApiService, classifyPACType } from '@/lib/fec/fec-api-service';
import { govCache } from '@/services/cache';
import {
  getTopCategories,
  IndustrySector,
  categorizeContributionSmart,
} from '@/lib/fec/industry-taxonomy';
import { getTopIndustrySectorsFromAggregates } from '@/lib/fec/finance-aggregator';
import { ZIP_TO_DISTRICT_MAP_119TH } from '@/lib/data/zip-district-mapping-119th';
import { bioguideToFECMapping } from '@/lib/data/bioguide-fec-mapping';
import { categorizeIntoBaskets, getInterestGroupMetrics } from '@/lib/fec/interest-groups';

// Build reverse mapping: FEC candidate ID -> representative info
const fecIdToRepresentative: Record<
  string,
  { bioguideId: string; name: string; state: string; party?: string }
> = {};
for (const [bioguideId, mapping] of Object.entries(bioguideToFECMapping)) {
  fecIdToRepresentative[mapping.fecId] = {
    bioguideId,
    name: mapping.name,
    state: mapping.state,
  };
}
import {
  getFECMapping,
  getFECCandidateLink,
  getFECReceiptsLink,
  getFECDisbursementsLink,
  FinanceCacheKeys,
  EmptyFinanceResponses,
  FEC_CACHE_OPTIONS,
  withFECCacheHeaders,
} from '@/lib/api/finance-helpers';
import { ApiErrors } from '@/lib/api/error-responses';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;

interface ComprehensiveFinanceResponse {
  // Basic Finance Summary
  finance: {
    totalRaised: number;
    totalSpent: number;
    cashOnHand: number;
    individualContributions: number;
    pacContributions: number;
    partyContributions: number;
    candidateContributions: number;
    candidateId?: string;
    fecTransparencyLinks?: {
      candidatePage: string;
      contributions: string;
      disbursements: string;
      financialSummary: string;
    };
  };

  // Top Contributors
  contributors: {
    topContributors: Array<{
      name: string;
      totalAmount: number;
      contributionCount: number;
      city: string;
      state: string;
      employer: string;
      occupation: string;
      fecTransparencyLink: string;
      isCommittee?: boolean;
    }>;
    conduitAggregates?: {
      actblue?: {
        totalAmount: number;
        contributionCount: number;
        individualDonors: number;
      };
      winred?: {
        totalAmount: number;
        contributionCount: number;
        individualDonors: number;
      };
    };
    contributionTrends?: Array<{
      month: string;
      amount: number;
      count: number;
    }>;
    metadata: {
      totalIndividualContributors: number;
      totalCommitteeContributors: number;
      fecCandidateLink?: string;
      fecCommitteeId?: string;
      fecReceiptsLink?: string;
    };
  };

  // Industry Breakdown (OpenSecrets-inspired taxonomy)
  industries: {
    topIndustries: Array<{
      sector: string; // e.g., "Health", "Finance/Insurance/Real Estate"
      category: string; // e.g., "Health Professionals", "Commercial Banks"
      industry: string; // Display name: "Health: Health Professionals"
      amount: number;
      percentage: number;
      contributionCount: number;
      fecVerifyLink: string; // Link to verify on FEC.gov
    }>;
    metadata: {
      totalAnalyzed: number;
    };
  };

  // Interest Groups & PACs (OpenSecrets-inspired)
  interestGroups?: {
    baskets: Array<{
      basket: string; // e.g., "Big Tech & Internet", "Wall Street & Finance"
      totalAmount: number;
      percentage: number;
      contributionCount: number;
      description: string;
      icon: string; // emoji
      color: string; // hex color
      topCategories: Array<{
        category: string;
        amount: number;
      }>;
    }>;
    pacContributions: {
      byType: {
        superPac: number;
        traditional: number;
        leadership: number;
        hybrid: number;
      };
      supportingExpenditures: Array<{
        amount: number;
        date: string;
        pacName: string;
        pacType: string;
        description: string;
      }>;
      opposingExpenditures: Array<{
        amount: number;
        date: string;
        pacName: string;
        pacType: string;
        description: string;
      }>;
    };
    metrics: {
      topInfluencer: string | null;
      grassrootsPercentage: number;
      corporatePercentage: number;
      diversityScore: number;
    };
  };

  // Geographic Breakdown
  geographic?: {
    topStates: Array<{
      state: string;
      amount: number;
      percentage: number;
      contributionCount: number;
    }>;
    inDistrict?: {
      amount: number;
      percentage: number;
      contributionCount: number;
    };
    outOfDistrict?: {
      amount: number;
      percentage: number;
      contributionCount: number;
    };
  };

  // Top Contributing Organizations (OpenSecrets-style employer aggregation)
  organizations?: {
    topOrganizations: Array<{
      name: string; // Normalized employer name
      totalAmount: number;
      contributionCount: number;
      percentage: number;
      employees: number; // Unique employee contributors
      fecVerifyLink: string;
    }>;
    metadata: {
      totalOrganizations: number;
      totalFromOrganizations: number;
      excludedCategories: string[]; // e.g., "Self-Employed", "Retired", "Not Employed"
    };
  };

  // Recent Contributions
  recentContributions?: Array<{
    name: string;
    amount: number;
    date: string;
    city: string;
    state: string;
    employer?: string;
  }>;

  // Enhanced Donor Metrics
  donorMetrics?: {
    /** Distinct donors in the contribution sample — not the campaign's donor count. */
    donorsInSample: number;
    /** Contributions the sample held, so the figure above has a denominator. */
    sampleSize: number;
    smallDonors: number; // ≤$200
    smallDonorPercentage: number;
    averageSmallDonation: number;
    medianDonation: number;
    averageDonation: number;
    largestDonation: number;
  };

  // PAC Direct Contributions (not independent expenditures)
  pacDirect?: {
    contributions: Array<{
      pacName: string;
      pacId: string;
      amount: number;
      date: string;
      pacType: 'superPac' | 'traditional' | 'leadership' | 'hybrid' | 'unknown';
      fecLink: string;
    }>;
    totalAmount: number;
    totalCount: number;
    byType: {
      superPac: number;
      traditional: number;
      leadership: number;
      hybrid: number;
    };
    // Leadership PACs from other politicians
    leadershipPACSponsors?: Array<{
      sponsorName: string;
      sponsorBioguideId: string;
      sponsorState: string;
      pacName: string;
      pacId: string;
      amount: number;
      date: string;
      fecLink: string;
    }>;
  };

  // Sector Summary Cards (Business vs Labor vs Ideological)
  sectorSummary?: {
    business: {
      amount: number;
      percentage: number;
      contributionCount: number;
      topIndustries: Array<{ name: string; amount: number }>;
    };
    labor: {
      amount: number;
      percentage: number;
      contributionCount: number;
      topUnions: Array<{ name: string; amount: number }>;
    };
    ideological: {
      amount: number;
      percentage: number;
      contributionCount: number;
      topCauses: Array<{ name: string; amount: number }>;
    };
    other: {
      amount: number;
      percentage: number;
      contributionCount: number;
    };
  };

  // In-District vs Out-of-District Analysis
  districtAnalysis?: {
    inDistrict: {
      amount: number;
      percentage: number;
      contributionCount: number;
    };
    outOfDistrict: {
      amount: number;
      percentage: number;
      contributionCount: number;
    };
    representativeDistrict?: string; // e.g., "MI-12"
    unknownLocation: {
      amount: number;
      contributionCount: number;
    };
  };

  // Metadata
  metadata: {
    bioguideId: string;
    cycle: number;
    lastUpdated: string;
    cacheHit: boolean;
    // Size of the raw contribution sample used for per-donor sections
    // (top contributors, district/ZIP analysis, recent contributions).
    sampleSize: number;
    // Provenance of the industry breakdown: 'aggregate' = exact FEC by_employer/
    // by_occupation totals across ALL contributions; 'sample' = fallback derived
    // from the 250-row contribution sample.
    industriesBasedOn: 'aggregate' | 'sample';
    // Provenance of the geographic breakdown: 'aggregate' = exact FEC by_state
    // totals; 'sample' = fallback derived from the contribution sample.
    geographyBasedOn: 'aggregate' | 'sample';
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const startTime = Date.now();

  // Cycle selector: the tab's other panels (funding sources, expenditures) are
  // already cycle-aware, so the headline/industry/geography data must respect
  // the same param instead of being pinned to a single cycle. Mirrors the
  // validation used by the sibling finance routes.
  const cycle = parseInt(request.nextUrl.searchParams.get('cycle') ?? '', 10) || 2024;
  if (cycle < 1980 || cycle > 2030) {
    return NextResponse.json(
      { error: 'cycle must be a year between 1980 and 2030' },
      { status: 400 }
    );
  }

  try {
    logger.info('[Comprehensive Finance API] Called', { bioguideId, cycle });

    // Check unified cache first (keyed per cycle)
    const cacheKey = FinanceCacheKeys.comprehensive(bioguideId, cycle);
    const cached = await govCache.get<ComprehensiveFinanceResponse>(cacheKey);

    if (cached) {
      logger.info('[Comprehensive Finance API] Cache hit', {
        bioguideId,
        responseTime: Date.now() - startTime,
      });
      // Same cache headers as the cold path below — a Redis hit is still a
      // fully-valid response and is by far the common case, so without this
      // the majority of traffic fell to the blanket 300s API default.
      return withFECCacheHeaders({
        ...cached,
        metadata: { ...cached.metadata, cacheHit: true },
      });
    }

    // Check FEC mapping
    const fecMapping = getFECMapping(bioguideId);
    if (!fecMapping) {
      return NextResponse.json(EmptyFinanceResponses.comprehensive(bioguideId, undefined, cycle));
    }

    // PERFORMANCE OPTIMIZATION: Fetch all FEC data in parallel
    // These 6 API calls are independent and can run concurrently
    // This reduces total latency from ~6x single call to ~1x (parallel execution)
    logger.info('[Comprehensive Finance API] Fetching FEC data in parallel');

    const [
      financialSummary,
      contributions,
      individualContributionsForIndustry,
      principalCommitteeId,
      pacContributions,
      independentExpenditures,
      byState,
      byEmployer,
      byOccupation,
    ] = await Promise.all([
      fecApiService.getFinancialSummary(fecMapping.fecId, cycle),
      fecApiService.getSampleContributions(fecMapping.fecId, cycle, 250),
      fecApiService.getIndividualContributionsWithEmployer(fecMapping.fecId, cycle, 200),
      fecApiService.getPrincipalCommitteeId(fecMapping.fecId, cycle),
      fecApiService.getPACContributions(fecMapping.fecId, cycle),
      fecApiService.getIndependentExpenditures(fecMapping.fecId, cycle),
      // EXACT aggregates across ALL contributions (not the 250-row sample) for
      // the industry + geographic breakdowns. Internally reuse the committee
      // cache, so parallelizing here is safe.
      fecApiService.getContributionsByState(fecMapping.fecId, cycle),
      fecApiService.getContributionsByEmployer(fecMapping.fecId, cycle, 100),
      fecApiService.getContributionsByOccupation(fecMapping.fecId, cycle, 100),
    ]);

    logger.info('[Comprehensive Finance API] Parallel fetch complete', {
      hasFinancialSummary: !!financialSummary,
      contributionsCount: contributions.length,
      individualContributionsCount: individualContributionsForIndustry.length,
      hasPrincipalCommittee: !!principalCommitteeId,
      pacContributionsCount: pacContributions.length,
      independentExpendituresCount: independentExpenditures.length,
      byStateRows: byState.length,
      byEmployerRows: byEmployer.length,
      byOccupationRows: byOccupation.length,
    });

    if (!financialSummary) {
      return NextResponse.json(
        EmptyFinanceResponses.comprehensive(bioguideId, fecMapping.fecId, cycle)
      );
    }

    // Process contributors
    const contributorMap = new Map<
      string,
      {
        name: string;
        totalAmount: number;
        contributionCount: number;
        city: string;
        state: string;
        employer: string;
        occupation: string;
        isCommittee?: boolean;
      }
    >();

    const conduitStats = {
      actblue: { totalAmount: 0, contributionCount: 0, uniqueDonors: new Set<string>() },
      winred: { totalAmount: 0, contributionCount: 0, uniqueDonors: new Set<string>() },
    };

    const trendMap = new Map<string, { amount: number; count: number }>();

    // Single pass through contributions - process everything at once
    for (const contribution of contributions) {
      const name = contribution.contributor_name || 'Unknown';
      const nameUpper = name.toUpperCase();
      const amount = contribution.contribution_receipt_amount || 0;
      const date = contribution.contribution_receipt_date;

      // Track monthly trends
      if (date) {
        const monthKey = date.substring(0, 7); // YYYY-MM
        const existing = trendMap.get(monthKey) || { amount: 0, count: 0 };
        trendMap.set(monthKey, {
          amount: existing.amount + amount,
          count: existing.count + 1,
        });
      }

      // Identify conduits
      const isActBlue = nameUpper.includes('ACTBLUE');
      const isWinRed = nameUpper.includes('WINRED');
      const isConduit = isActBlue || isWinRed;

      // Track conduit stats
      if (isActBlue) {
        conduitStats.actblue.totalAmount += amount;
        conduitStats.actblue.contributionCount += 1;
        if (contribution.contributor_city && contribution.contributor_state) {
          conduitStats.actblue.uniqueDonors.add(
            `${contribution.contributor_city}-${contribution.contributor_state}`
          );
        }
      } else if (isWinRed) {
        conduitStats.winred.totalAmount += amount;
        conduitStats.winred.contributionCount += 1;
        if (contribution.contributor_city && contribution.contributor_state) {
          conduitStats.winred.uniqueDonors.add(
            `${contribution.contributor_city}-${contribution.contributor_state}`
          );
        }
      }

      // Skip conduits from main contributor list
      if (isConduit) continue;

      // Identify committees
      const isCommittee =
        nameUpper.includes('PAC') ||
        nameUpper.includes('COMMITTEE') ||
        nameUpper.includes('DCCC') ||
        nameUpper.includes('NRCC') ||
        nameUpper.includes('DSCC') ||
        nameUpper.includes('NRSC') ||
        nameUpper.includes(' FOR ') ||
        nameUpper.includes('FUND');

      const existing = contributorMap.get(name);
      if (existing) {
        existing.totalAmount += amount;
        existing.contributionCount += 1;
      } else {
        contributorMap.set(name, {
          name,
          totalAmount: amount,
          contributionCount: 1,
          city: contribution.contributor_city || '',
          state: contribution.contributor_state || '',
          employer: contribution.contributor_employer || '',
          occupation: contribution.contributor_occupation || '',
          isCommittee,
        });
      }
    }

    // Format contributors (principalCommitteeId already fetched in parallel above)
    const allContributors = Array.from(contributorMap.values());
    const individualContributors = allContributors
      .filter(c => !c.isCommittee)
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const topContributors = individualContributors.slice(0, 50).map(contributor => ({
      ...contributor,
      fecTransparencyLink: principalCommitteeId
        ? `https://www.fec.gov/data/receipts/?two_year_transaction_period=${cycle}&committee_id=${principalCommitteeId}&contributor_name=${encodeURIComponent(contributor.name)}`
        : `https://www.fec.gov/data/receipts/individual-contributions/?contributor_name=${encodeURIComponent(contributor.name)}&candidate_id=${fecMapping.fecId}`,
    }));

    // Format contribution trends (last 12 months)
    const contributionTrends = Array.from(trendMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    // Format industries. PREFERRED path: FEC's pre-aggregated by_employer +
    // by_occupation endpoints give EXACT sector totals across ALL contributions.
    // FALLBACK (older filer / no principal committee / FEC hiccup → empty
    // aggregates): the OpenSecrets-inspired taxonomy over the 250-row sample.
    const fecVerifyLink = principalCommitteeId
      ? `https://www.fec.gov/data/receipts/?two_year_transaction_period=${cycle}&committee_id=${principalCommitteeId}&min_amount=1`
      : `https://www.fec.gov/data/receipts/individual-contributions/?two_year_transaction_period=${cycle}&candidate_id=${fecMapping.fecId}&min_amount=1`;

    const aggregateIndustries = getTopIndustrySectorsFromAggregates(byEmployer, byOccupation, 10);
    let industriesBasedOn: 'aggregate' | 'sample';
    let topIndustries: ComprehensiveFinanceResponse['industries']['topIndustries'];

    if (aggregateIndustries.length > 0) {
      industriesBasedOn = 'aggregate';
      topIndustries = aggregateIndustries.map(cat => ({
        sector: cat.sector,
        category: cat.category,
        industry: `${cat.sector}: ${cat.category}`, // Display name
        amount: cat.amount,
        percentage: cat.percentage,
        contributionCount: cat.contributionCount,
        fecVerifyLink,
      }));
    } else {
      industriesBasedOn = 'sample';
      // Combine individual contributions (better employer data) with all contributions (PAC names)
      const combinedForIndustry = [...individualContributionsForIndustry, ...contributions];
      const topCategorizedIndustries = getTopCategories(combinedForIndustry, 10);
      topIndustries = topCategorizedIndustries.map(cat => ({
        sector: cat.sector,
        category: cat.category,
        industry: `${cat.sector}: ${cat.category}`, // Display name
        amount: cat.totalAmount,
        percentage: cat.percentage,
        contributionCount: cat.contributionCount,
        fecVerifyLink,
      }));
    }

    logger.info('[Comprehensive Finance API] Industry breakdown built', {
      industriesBasedOn,
      topIndustriesCount: topIndustries.length,
    });

    // Process PAC contributions by type (pacContributions & independentExpenditures already fetched in parallel above)
    const pacByType = {
      superPac: 0,
      traditional: 0,
      leadership: 0,
      hybrid: 0,
    };

    // Deduplicate committee lookups
    const uniqueCommitteeIds = new Set<string>();
    pacContributions.forEach(c => uniqueCommitteeIds.add(c.committee_id));
    independentExpenditures.forEach(e => uniqueCommitteeIds.add(e.committee_id));

    const committeeInfoCache = new Map();

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

    // Classify PAC contributions
    for (const contribution of pacContributions) {
      const committeeInfo = committeeInfoCache.get(contribution.committee_id);
      if (committeeInfo) {
        const pacType = classifyPACType(committeeInfo.committee_type, committeeInfo.designation);
        if (pacType) {
          pacByType[pacType] += contribution.contribution_receipt_amount || 0;
        }
      }
    }

    // Classify independent expenditures
    const supportingExpenditures: Array<{
      amount: number;
      date: string;
      pacName: string;
      pacType: string;
      description: string;
      committeeId: string;
    }> = [];
    const opposingExpenditures: Array<{
      amount: number;
      date: string;
      pacName: string;
      pacType: string;
      description: string;
      committeeId: string;
    }> = [];

    for (const expenditure of independentExpenditures) {
      const committeeInfo = committeeInfoCache.get(expenditure.committee_id);
      const classifiedType = committeeInfo
        ? classifyPACType(committeeInfo.committee_type, committeeInfo.designation)
        : null;
      const pacType = classifiedType || 'unknown';

      const expData = {
        amount: expenditure.expenditure_amount || 0,
        date: expenditure.expenditure_date || '',
        pacName: expenditure.committee_name || '',
        pacType,
        description: expenditure.expenditure_description || '',
        committeeId: expenditure.committee_id || '',
      };

      if (expenditure.support_oppose_indicator === 'S') {
        supportingExpenditures.push(expData);
      } else if (expenditure.support_oppose_indicator === 'O') {
        opposingExpenditures.push(expData);
      }
    }

    // Calculate Interest Group Baskets
    // Use individual contributions (with employer/occupation data) for accurate
    // sector classification. Raw contributions include committee transfers and
    // PAC-to-PAC transfers that lack employer data and misclassify as "Other".
    const basketInput =
      individualContributionsForIndustry.length > 0
        ? individualContributionsForIndustry
        : contributions;
    const interestGroupBaskets = categorizeIntoBaskets(basketInput);
    const interestGroupMetrics = getInterestGroupMetrics(interestGroupBaskets);

    logger.info('[Comprehensive Finance API] Interest Group data processed', {
      baskets: interestGroupBaskets.length,
      pacContributions: pacContributions.length,
      independentExpenditures: independentExpenditures.length,
    });

    // Calculate geographic breakdown.
    // PREFERRED path: FEC's pre-aggregated by_state endpoint gives EXACT totals
    // across ALL contributions. FALLBACK (empty aggregate): derive from the
    // 250-row sample so the section never regresses to empty.
    let geographyBasedOn: 'aggregate' | 'sample';
    let topStates: NonNullable<ComprehensiveFinanceResponse['geographic']>['topStates'];

    if (byState.length > 0) {
      geographyBasedOn = 'aggregate';
      const totalStateAmount = byState.reduce((sum, r) => sum + (r.total || 0), 0);
      topStates = byState
        .filter(r => (r.total || 0) > 0 && (r.state || '').trim() !== '')
        .map(r => ({
          state: r.state.toUpperCase(),
          amount: r.total,
          percentage: totalStateAmount > 0 ? (r.total / totalStateAmount) * 100 : 0,
          contributionCount: r.count,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);
    } else {
      geographyBasedOn = 'sample';
      const stateMap = new Map<string, { amount: number; count: number }>();
      let totalGeographic = 0;

      contributions.forEach(contrib => {
        if (contrib.contributor_state) {
          const state = contrib.contributor_state.trim().toUpperCase();
          const amount = contrib.contribution_receipt_amount || 0;
          const existing = stateMap.get(state) || { amount: 0, count: 0 };
          stateMap.set(state, {
            amount: existing.amount + amount,
            count: existing.count + 1,
          });
          totalGeographic += amount;
        }
      });

      topStates = Array.from(stateMap.entries())
        .map(([state, data]) => ({
          state,
          amount: data.amount,
          percentage: totalGeographic > 0 ? (data.amount / totalGeographic) * 100 : 0,
          contributionCount: data.count,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);
    }

    logger.info('[Comprehensive Finance API] Geographic breakdown built', {
      geographyBasedOn,
      topStatesCount: topStates.length,
    });

    // Get recent contributions (last 20)
    const recentContribs = contributions
      .filter(c => c.contribution_receipt_date)
      .sort((a, b) => {
        const dateA = new Date(a.contribution_receipt_date || '');
        const dateB = new Date(b.contribution_receipt_date || '');
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 20)
      .map(c => ({
        name: c.contributor_name || 'Unknown',
        amount: c.contribution_receipt_amount || 0,
        date: c.contribution_receipt_date || '',
        city: c.contributor_city || '',
        state: c.contributor_state || '',
        employer: c.contributor_employer,
      }));

    // Calculate enhanced donor metrics
    const allDonationAmounts = contributions
      .map(c => c.contribution_receipt_amount || 0)
      .filter(amt => amt > 0);
    const smallDonations = allDonationAmounts.filter(amt => amt <= 200);
    const sortedAmounts = [...allDonationAmounts].sort((a, b) => a - b);

    const donorMetrics = {
      // Distinct donors in the 250-row sample, not the campaign's donor count.
      // FEC reports no distinct-donor figure — unitemized givers are never
      // listed individually — so there is no exact number to swap in, and this
      // is named for what it counts rather than dressed up as a total.
      donorsInSample: allContributors.length,
      sampleSize: contributions.length,
      smallDonors: smallDonations.length,
      smallDonorPercentage:
        allDonationAmounts.length > 0
          ? (smallDonations.length / allDonationAmounts.length) * 100
          : 0,
      averageSmallDonation:
        smallDonations.length > 0
          ? smallDonations.reduce((sum, amt) => sum + amt, 0) / smallDonations.length
          : 0,
      medianDonation:
        sortedAmounts.length > 0 ? sortedAmounts[Math.floor(sortedAmounts.length / 2)] || 0 : 0,
      averageDonation:
        allDonationAmounts.length > 0
          ? allDonationAmounts.reduce((sum, amt) => sum + amt, 0) / allDonationAmounts.length
          : 0,
      largestDonation: sortedAmounts.length > 0 ? sortedAmounts[sortedAmounts.length - 1] || 0 : 0,
    };

    logger.info('[Comprehensive Finance API] Geographic and donor analysis complete', {
      topStates: topStates.length,
      recentContributions: recentContribs.length,
      donorsInSample: donorMetrics.donorsInSample,
    });

    // Calculate Top Contributing Organizations (OpenSecrets-style employer aggregation)
    // Excludes self-employed, retired, not employed, homemakers, and students
    const EXCLUDED_EMPLOYERS = new Set([
      'SELF-EMPLOYED',
      'SELF EMPLOYED',
      'SELF',
      'RETIRED',
      'NOT EMPLOYED',
      'NONE',
      'N/A',
      'NA',
      'HOMEMAKER',
      'STUDENT',
      'UNEMPLOYED',
      'INFORMATION REQUESTED',
      'INFORMATION REQUESTED PER BEST EFFORTS',
      'REQUESTED',
      '',
    ]);

    // Normalize employer names to handle variations
    const normalizeEmployer = (employer: string): string => {
      let normalized = employer.toUpperCase().trim();
      // Remove common suffixes
      normalized = normalized
        .replace(
          /,?\s*(INC\.?|LLC|LLP|CORP\.?|CORPORATION|CO\.?|COMPANY|LTD\.?|LIMITED|PC|PLLC|PA|PLC)\.?$/i,
          ''
        )
        .replace(/\s+/g, ' ')
        .trim();
      return normalized;
    };

    const orgMap = new Map<
      string,
      {
        originalName: string; // Keep first seen capitalization
        totalAmount: number;
        contributionCount: number;
        employees: Set<string>; // Unique contributor names
      }
    >();

    let totalOrgAmount = 0;

    for (const contrib of contributions) {
      const employer = contrib.contributor_employer;
      if (!employer) continue;

      const employerUpper = employer.toUpperCase().trim();

      // Skip excluded categories
      if (EXCLUDED_EMPLOYERS.has(employerUpper)) continue;

      // Skip if employer looks like a person's name (has comma suggesting "LAST, FIRST" format)
      if (
        employerUpper.includes(',') &&
        !employerUpper.includes('INC') &&
        !employerUpper.includes('LLC')
      )
        continue;

      const normalizedName = normalizeEmployer(employer);
      if (!normalizedName || normalizedName.length < 2) continue;

      const amount = contrib.contribution_receipt_amount || 0;
      const contributorName = contrib.contributor_name || 'Unknown';

      const existing = orgMap.get(normalizedName);
      if (existing) {
        existing.totalAmount += amount;
        existing.contributionCount += 1;
        existing.employees.add(contributorName);
      } else {
        orgMap.set(normalizedName, {
          originalName: employer.trim(), // Keep original casing
          totalAmount: amount,
          contributionCount: 1,
          employees: new Set([contributorName]),
        });
      }
      totalOrgAmount += amount;
    }

    // Convert to array and sort by total amount
    const topOrganizations = Array.from(orgMap.entries())
      .map(([normalizedName, data]) => ({
        name: data.originalName,
        totalAmount: data.totalAmount,
        contributionCount: data.contributionCount,
        percentage: totalOrgAmount > 0 ? (data.totalAmount / totalOrgAmount) * 100 : 0,
        employees: data.employees.size,
        fecVerifyLink: principalCommitteeId
          ? `https://www.fec.gov/data/receipts/?two_year_transaction_period=${cycle}&committee_id=${principalCommitteeId}&contributor_employer=${encodeURIComponent(normalizedName)}`
          : `https://www.fec.gov/data/receipts/individual-contributions/?two_year_transaction_period=${cycle}&candidate_id=${fecMapping.fecId}&contributor_employer=${encodeURIComponent(normalizedName)}`,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 20); // Top 20 organizations

    logger.info('[Comprehensive Finance API] Organization aggregation complete', {
      totalOrganizations: orgMap.size,
      topOrganizationsCount: topOrganizations.length,
      totalFromOrganizations: totalOrgAmount,
    });

    // ========================================
    // FEATURE 1: PAC Direct Contributions
    // ========================================
    // Process PAC contributions (direct, not independent expenditures)
    const pacDirectContributions = pacContributions
      .map(pac => {
        const committeeInfo = committeeInfoCache.get(pac.committee_id);
        const pacType = committeeInfo
          ? classifyPACType(committeeInfo.committee_type, committeeInfo.designation)
          : null;
        return {
          pacName: pac.committee_name || 'Unknown PAC',
          pacId: pac.committee_id,
          amount: pac.contribution_receipt_amount || 0,
          date: pac.contribution_receipt_date || '',
          pacType: (pacType || 'unknown') as
            | 'superPac'
            | 'traditional'
            | 'leadership'
            | 'hybrid'
            | 'unknown',
          fecLink: `https://www.fec.gov/data/committee/${pac.committee_id}/`,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const pacDirectTotal = pacDirectContributions.reduce((sum, p) => sum + p.amount, 0);
    const pacDirectByType = {
      superPac: pacDirectContributions
        .filter(p => p.pacType === 'superPac')
        .reduce((sum, p) => sum + p.amount, 0),
      traditional: pacDirectContributions
        .filter(p => p.pacType === 'traditional')
        .reduce((sum, p) => sum + p.amount, 0),
      leadership: pacDirectContributions
        .filter(p => p.pacType === 'leadership')
        .reduce((sum, p) => sum + p.amount, 0),
      hybrid: pacDirectContributions
        .filter(p => p.pacType === 'hybrid')
        .reduce((sum, p) => sum + p.amount, 0),
    };

    // ========================================
    // FEATURE: Leadership PAC Sponsors
    // ========================================
    // Extract Leadership PACs and identify their sponsoring politicians
    const leadershipPACSponsors: Array<{
      sponsorName: string;
      sponsorBioguideId: string;
      sponsorState: string;
      pacName: string;
      pacId: string;
      amount: number;
      date: string;
      fecLink: string;
    }> = [];

    for (const pac of pacContributions) {
      const committeeInfo = committeeInfoCache.get(pac.committee_id);
      if (!committeeInfo) continue;

      const pacType = classifyPACType(committeeInfo.committee_type, committeeInfo.designation);
      if (pacType !== 'leadership') continue;

      // Check for sponsor candidate IDs
      const sponsorIds = committeeInfo.sponsor_candidate_ids || committeeInfo.candidate_ids || [];

      for (const sponsorFecId of sponsorIds) {
        const sponsor = fecIdToRepresentative[sponsorFecId];
        if (sponsor) {
          leadershipPACSponsors.push({
            sponsorName: sponsor.name,
            sponsorBioguideId: sponsor.bioguideId,
            sponsorState: sponsor.state,
            pacName: pac.committee_name || committeeInfo.name || 'Unknown PAC',
            pacId: pac.committee_id,
            amount: pac.contribution_receipt_amount || 0,
            date: pac.contribution_receipt_date || '',
            fecLink: `https://www.fec.gov/data/committee/${pac.committee_id}/`,
          });
        }
      }
    }

    // Sort by amount and deduplicate (same sponsor might have multiple entries)
    const leadershipPACSponsorsSorted = leadershipPACSponsors.sort((a, b) => b.amount - a.amount);

    logger.info('[Comprehensive Finance API] Leadership PAC sponsors identified', {
      totalLeadershipPACs: pacDirectContributions.filter(p => p.pacType === 'leadership').length,
      sponsorsIdentified: leadershipPACSponsorsSorted.length,
    });

    logger.info('[Comprehensive Finance API] PAC direct contributions processed', {
      totalPACs: pacDirectContributions.length,
      totalAmount: pacDirectTotal,
    });

    // ========================================
    // FEATURE 2: Sector Summary Cards
    // ========================================
    // Map 13 sectors into 4 super-sectors: Business, Labor, Ideological, Other
    const BUSINESS_SECTORS = new Set([
      IndustrySector.AGRIBUSINESS,
      IndustrySector.COMMUNICATIONS_ELECTRONICS,
      IndustrySector.CONSTRUCTION,
      IndustrySector.DEFENSE,
      IndustrySector.ENERGY_NATURAL_RESOURCES,
      IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
      IndustrySector.HEALTH,
      IndustrySector.LAWYERS_LOBBYISTS,
      IndustrySector.TRANSPORTATION,
      IndustrySector.MISC_BUSINESS,
    ]);

    const sectorAggregation = {
      business: { amount: 0, count: 0, industries: new Map<string, number>() },
      labor: { amount: 0, count: 0, unions: new Map<string, number>() },
      ideological: { amount: 0, count: 0, causes: new Map<string, number>() },
      other: { amount: 0, count: 0 },
    };

    let totalSectorAmount = 0;

    for (const contrib of contributions) {
      const categorization = categorizeContributionSmart(
        contrib.contributor_employer,
        contrib.contributor_occupation,
        contrib.contributor_name
      );
      const amount = contrib.contribution_receipt_amount || 0;
      totalSectorAmount += amount;

      if (BUSINESS_SECTORS.has(categorization.sector)) {
        sectorAggregation.business.amount += amount;
        sectorAggregation.business.count += 1;
        const industry = `${categorization.sector}: ${categorization.category}`;
        sectorAggregation.business.industries.set(
          industry,
          (sectorAggregation.business.industries.get(industry) || 0) + amount
        );
      } else if (categorization.sector === IndustrySector.LABOR) {
        sectorAggregation.labor.amount += amount;
        sectorAggregation.labor.count += 1;
        sectorAggregation.labor.unions.set(
          categorization.category,
          (sectorAggregation.labor.unions.get(categorization.category) || 0) + amount
        );
      } else if (categorization.sector === IndustrySector.IDEOLOGY_SINGLE_ISSUE) {
        sectorAggregation.ideological.amount += amount;
        sectorAggregation.ideological.count += 1;
        sectorAggregation.ideological.causes.set(
          categorization.category,
          (sectorAggregation.ideological.causes.get(categorization.category) || 0) + amount
        );
      } else {
        sectorAggregation.other.amount += amount;
        sectorAggregation.other.count += 1;
      }
    }

    // Convert to sorted arrays for top items
    const topBusinessIndustries = Array.from(sectorAggregation.business.industries.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const topLaborUnions = Array.from(sectorAggregation.labor.unions.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const topIdeologicalCauses = Array.from(sectorAggregation.ideological.causes.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const sectorSummary = {
      business: {
        amount: sectorAggregation.business.amount,
        percentage:
          totalSectorAmount > 0 ? (sectorAggregation.business.amount / totalSectorAmount) * 100 : 0,
        contributionCount: sectorAggregation.business.count,
        topIndustries: topBusinessIndustries,
      },
      labor: {
        amount: sectorAggregation.labor.amount,
        percentage:
          totalSectorAmount > 0 ? (sectorAggregation.labor.amount / totalSectorAmount) * 100 : 0,
        contributionCount: sectorAggregation.labor.count,
        topUnions: topLaborUnions,
      },
      ideological: {
        amount: sectorAggregation.ideological.amount,
        percentage:
          totalSectorAmount > 0
            ? (sectorAggregation.ideological.amount / totalSectorAmount) * 100
            : 0,
        contributionCount: sectorAggregation.ideological.count,
        topCauses: topIdeologicalCauses,
      },
      other: {
        amount: sectorAggregation.other.amount,
        percentage:
          totalSectorAmount > 0 ? (sectorAggregation.other.amount / totalSectorAmount) * 100 : 0,
        contributionCount: sectorAggregation.other.count,
      },
    };

    logger.info('[Comprehensive Finance API] Sector summary calculated', {
      business: sectorSummary.business.percentage.toFixed(1) + '%',
      labor: sectorSummary.labor.percentage.toFixed(1) + '%',
      ideological: sectorSummary.ideological.percentage.toFixed(1) + '%',
    });

    // ========================================
    // FEATURE 3: In-District vs Out-of-District
    // ========================================
    // Build set of ZIPs in the representative's district
    const repState = fecMapping.state;
    const repDistrict = fecMapping.district;
    const representativeDistrict = repDistrict
      ? `${repState}-${repDistrict}`
      : `${repState} (Senate)`;

    // For House members, build set of district ZIPs
    const districtZips = new Set<string>();
    if (repDistrict && fecMapping.office === 'H') {
      // Iterate through ZIP mapping to find all ZIPs in this district
      for (const [zip, mapping] of Object.entries(ZIP_TO_DISTRICT_MAP_119TH)) {
        if (Array.isArray(mapping)) {
          // Multi-district ZIP - check if any match
          if (mapping.some(m => m.state === repState && m.district === repDistrict)) {
            districtZips.add(zip);
          }
        } else if (mapping && mapping.state === repState && mapping.district === repDistrict) {
          districtZips.add(zip);
        }
      }
    }

    // For Senators, use state-level analysis (all ZIPs in the state)
    const stateZips = new Set<string>();
    if (fecMapping.office === 'S') {
      for (const [zip, mapping] of Object.entries(ZIP_TO_DISTRICT_MAP_119TH)) {
        if (Array.isArray(mapping)) {
          if (mapping.some(m => m.state === repState)) {
            stateZips.add(zip);
          }
        } else if (mapping && mapping.state === repState) {
          stateZips.add(zip);
        }
      }
    }

    // Analyze contributions by location
    const districtAnalysisData = {
      inDistrict: { amount: 0, count: 0 },
      outOfDistrict: { amount: 0, count: 0 },
      unknown: { amount: 0, count: 0 },
    };

    for (const contrib of contributions) {
      const amount = contrib.contribution_receipt_amount || 0;
      const contributorZip = contrib.contributor_zip?.substring(0, 5); // First 5 digits only

      if (!contributorZip) {
        districtAnalysisData.unknown.amount += amount;
        districtAnalysisData.unknown.count += 1;
        continue;
      }

      // For House members, check district ZIPs
      if (fecMapping.office === 'H' && districtZips.size > 0) {
        if (districtZips.has(contributorZip)) {
          districtAnalysisData.inDistrict.amount += amount;
          districtAnalysisData.inDistrict.count += 1;
        } else {
          districtAnalysisData.outOfDistrict.amount += amount;
          districtAnalysisData.outOfDistrict.count += 1;
        }
      }
      // For Senators, check state ZIPs
      else if (fecMapping.office === 'S' && stateZips.size > 0) {
        if (stateZips.has(contributorZip)) {
          districtAnalysisData.inDistrict.amount += amount;
          districtAnalysisData.inDistrict.count += 1;
        } else {
          districtAnalysisData.outOfDistrict.amount += amount;
          districtAnalysisData.outOfDistrict.count += 1;
        }
      } else {
        // Fallback: can't determine
        districtAnalysisData.unknown.amount += amount;
        districtAnalysisData.unknown.count += 1;
      }
    }

    const totalDistrictAmount =
      districtAnalysisData.inDistrict.amount + districtAnalysisData.outOfDistrict.amount;

    const districtAnalysis = {
      inDistrict: {
        amount: districtAnalysisData.inDistrict.amount,
        percentage:
          totalDistrictAmount > 0
            ? (districtAnalysisData.inDistrict.amount / totalDistrictAmount) * 100
            : 0,
        contributionCount: districtAnalysisData.inDistrict.count,
      },
      outOfDistrict: {
        amount: districtAnalysisData.outOfDistrict.amount,
        percentage:
          totalDistrictAmount > 0
            ? (districtAnalysisData.outOfDistrict.amount / totalDistrictAmount) * 100
            : 0,
        contributionCount: districtAnalysisData.outOfDistrict.count,
      },
      representativeDistrict,
      unknownLocation: {
        amount: districtAnalysisData.unknown.amount,
        contributionCount: districtAnalysisData.unknown.count,
      },
    };

    logger.info('[Comprehensive Finance API] District analysis complete', {
      inDistrict: districtAnalysis.inDistrict.percentage.toFixed(1) + '%',
      outOfDistrict: districtAnalysis.outOfDistrict.percentage.toFixed(1) + '%',
      districtZipsCount: districtZips.size,
      stateZipsCount: stateZips.size,
    });

    // Build comprehensive response
    const response: ComprehensiveFinanceResponse = {
      finance: {
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
        candidateId: fecMapping.fecId,
        fecTransparencyLinks: {
          candidatePage: getFECCandidateLink(fecMapping.fecId),
          contributions: getFECReceiptsLink(fecMapping.fecId, principalCommitteeId || undefined),
          disbursements: getFECDisbursementsLink(
            fecMapping.fecId,
            principalCommitteeId || undefined
          ),
          financialSummary: `${getFECCandidateLink(fecMapping.fecId)}/totals`,
        },
      },
      contributors: {
        topContributors,
        conduitAggregates: {
          ...(conduitStats.actblue.contributionCount > 0 && {
            actblue: {
              totalAmount: conduitStats.actblue.totalAmount,
              contributionCount: conduitStats.actblue.contributionCount,
              individualDonors: conduitStats.actblue.uniqueDonors.size,
            },
          }),
          ...(conduitStats.winred.contributionCount > 0 && {
            winred: {
              totalAmount: conduitStats.winred.totalAmount,
              contributionCount: conduitStats.winred.contributionCount,
              individualDonors: conduitStats.winred.uniqueDonors.size,
            },
          }),
        },
        contributionTrends,
        metadata: {
          totalIndividualContributors: individualContributors.length,
          totalCommitteeContributors: allContributors.filter(c => c.isCommittee).length,
          fecCandidateLink: getFECCandidateLink(fecMapping.fecId),
          fecCommitteeId: principalCommitteeId || undefined,
          fecReceiptsLink: principalCommitteeId
            ? getFECReceiptsLink(fecMapping.fecId, principalCommitteeId)
            : undefined,
        },
      },
      industries: {
        topIndustries,
        metadata: {
          totalAnalyzed: contributions.length,
        },
      },
      interestGroups: {
        baskets: interestGroupBaskets.map(basket => ({
          basket: basket.basket,
          totalAmount: basket.totalAmount,
          percentage: basket.percentage,
          contributionCount: basket.contributionCount,
          description: basket.description,
          icon: basket.icon,
          color: basket.color,
          topCategories: basket.topCategories,
        })),
        pacContributions: {
          byType: pacByType,
          supportingExpenditures,
          opposingExpenditures,
        },
        metrics: interestGroupMetrics,
      },
      geographic: {
        topStates,
      },
      organizations: {
        topOrganizations,
        metadata: {
          totalOrganizations: orgMap.size,
          totalFromOrganizations: totalOrgAmount,
          excludedCategories: ['Self-Employed', 'Retired', 'Not Employed', 'Homemaker', 'Student'],
        },
      },
      recentContributions: recentContribs,
      donorMetrics,
      // NEW: PAC Direct Contributions
      pacDirect: {
        contributions: pacDirectContributions.slice(0, 25), // Top 25 PACs
        totalAmount: pacDirectTotal,
        totalCount: pacDirectContributions.length,
        byType: pacDirectByType,
        leadershipPACSponsors:
          leadershipPACSponsorsSorted.length > 0 ? leadershipPACSponsorsSorted : undefined,
      },
      // NEW: Sector Summary (Business vs Labor vs Ideological)
      sectorSummary,
      // NEW: In-District vs Out-of-District Analysis
      districtAnalysis,
      metadata: {
        bioguideId,
        cycle,
        lastUpdated: new Date().toISOString(),
        cacheHit: false,
        sampleSize: contributions.length,
        industriesBasedOn,
        geographyBasedOn,
      },
    };

    // Cache the comprehensive response - FEC data updates quarterly (30 day cache)
    await govCache.set(cacheKey, response, FEC_CACHE_OPTIONS);

    logger.info('[Comprehensive Finance API] Success', {
      bioguideId,
      responseTime: Date.now() - startTime,
      sampleSize: contributions.length,
    });

    return withFECCacheHeaders(response);
  } catch (error) {
    logger.error('[Comprehensive Finance API] Error', error as Error, { bioguideId });
    return ApiErrors.serverError(error as Error);
  }
}
