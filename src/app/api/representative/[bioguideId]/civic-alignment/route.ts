/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { PLAIN_LANGUAGE_ATTRIBUTION } from '@/lib/ai/plain-language';
import type { CivicAlignmentInput } from '@/types/ai';

export const dynamic = 'force-dynamic';

// State-to-FIPS mapping for BLS/Census APIs
const STATE_FIPS: Record<string, string> = {
  AL: '01',
  AK: '02',
  AZ: '04',
  AR: '05',
  CA: '06',
  CO: '08',
  CT: '09',
  DE: '10',
  FL: '12',
  GA: '13',
  HI: '15',
  ID: '16',
  IL: '17',
  IN: '18',
  IA: '19',
  KS: '20',
  KY: '21',
  LA: '22',
  ME: '23',
  MD: '24',
  MA: '25',
  MI: '26',
  MN: '27',
  MS: '28',
  MO: '29',
  MT: '30',
  NE: '31',
  NV: '32',
  NH: '33',
  NJ: '34',
  NM: '35',
  NY: '36',
  NC: '37',
  ND: '38',
  OH: '39',
  OK: '40',
  OR: '41',
  PA: '42',
  RI: '44',
  SC: '45',
  SD: '46',
  TN: '47',
  TX: '48',
  UT: '49',
  VT: '50',
  VA: '51',
  WA: '53',
  WV: '54',
  WI: '55',
  WY: '56',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const startTime = Date.now();

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  try {
    const alignmentData = await cachedFetch(
      `civic-alignment-${bioguideId}`,
      async () => {
        // 1. Get representative info
        const { getEnhancedRepresentative } = await import(
          '@/features/representatives/services/congress.service'
        );
        const representative = await getEnhancedRepresentative(bioguideId);

        if (!representative) {
          throw new NotFoundError('Representative not found');
        }

        // 2. Fetch votes, finance, and district data in parallel
        const [votesRaw, financeData, districtData] = await Promise.all([
          fetchVotes(bioguideId),
          fetchFinanceProfile(bioguideId),
          fetchDistrictProfile(
            representative.state,
            representative.district || '',
            (representative.chamber as 'House' | 'Senate') || 'House'
          ),
        ]);

        // 3. Transform votes into analyzer input format
        const votes: CivicAlignmentInput['votes'] = votesRaw.map(v => ({
          billNumber: v.bill?.number || '',
          title: v.bill?.title || v.description || '',
          vote: normalizePosition(v.position),
          date: v.date || '',
          subjects: v.category ? [v.category] : [],
        }));

        // 4. Build analyzer input
        const input: CivicAlignmentInput = {
          legislator: {
            bioguideId,
            name: representative.name,
            party: representative.party,
            state: representative.state,
            district: representative.district || '',
            chamber: representative.chamber as 'House' | 'Senate',
            committees: (representative.committees || []).map(c => ({
              name: c.name,
              role: c.role || 'Member',
            })),
          },
          votes,
          finance: financeData,
          district: districtData,
        };

        // 5. Run analysis
        const { CivicAlignmentAnalyzer } = await import(
          '@/features/legislation/services/ai/civic-alignment-analyzer'
        );
        const alignment = await CivicAlignmentAnalyzer.analyzeAlignment(input);

        // 6. Determine data sources and quality
        const dataSources: string[] = ['congress.gov'];
        if (votesRaw.length > 0) dataSources.push('congress.gov/votes');
        if (financeData.totalRaised > 0) dataSources.push('fec.gov');
        if (districtData.population > 0) dataSources.push('census.gov (ACS 5-Year 2022)');

        const hasVotes = votesRaw.length > 0;
        const hasFinance = financeData.totalRaised > 0;
        const hasDistrict = districtData.population > 0;
        const dataQuality: 'complete' | 'partial' | 'degraded' =
          hasVotes && hasFinance && hasDistrict
            ? 'complete'
            : hasVotes || hasFinance || hasDistrict
              ? 'partial'
              : 'degraded';

        return {
          bioguideId,
          name: representative.name,
          party: representative.party,
          state: representative.state,
          district: representative.district || '',
          alignment,
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources,
            dataQuality,
            cached: false,
            responseTime: Date.now() - startTime,
            plainLanguage: PLAIN_LANGUAGE_ATTRIBUTION,
          },
        };
      },
      43200 // 12 hours
    );

    return NextResponse.json(alignmentData, {
      headers: {
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    logger.error('Error generating civic alignment', error as Error, { bioguideId });

    return NextResponse.json(
      {
        error: 'Failed to generate civic alignment analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ── Data Fetching Helpers ─────────────────────────────────────────────

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

interface RawVote {
  bill?: { number?: string; title?: string };
  position: string;
  date?: string;
  description?: string;
  category?: string;
}

function normalizePosition(position: string): 'Yea' | 'Nay' | 'Not Voting' {
  if (position === 'Yea' || position === 'Yes') return 'Yea';
  if (position === 'Nay' || position === 'No') return 'Nay';
  return 'Not Voting';
}

/**
 * Fetch recent votes from internal API (same pattern as party-alignment)
 */
async function fetchVotes(bioguideId: string): Promise<RawVote[]> {
  try {
    const response = await fetch(
      `http://localhost:3000/api/representative/${bioguideId}/votes?limit=100`
    );
    if (response.ok) {
      const data = await response.json();
      return data.votes || [];
    }
    logger.warn('Failed to fetch votes for civic alignment', {
      bioguideId,
      status: response.status,
    });
    return [];
  } catch (error) {
    logger.warn('Error fetching votes for civic alignment', {
      bioguideId,
      error: (error as Error).message,
    });
    return [];
  }
}

/**
 * Fetch campaign finance profile from FEC
 */
async function fetchFinanceProfile(bioguideId: string): Promise<CivicAlignmentInput['finance']> {
  const emptyFinance: CivicAlignmentInput['finance'] = {
    totalRaised: 0,
    topSectors: [],
    topContributors: [],
    smallDonorPercentage: 0,
    inDistrictPercentage: 0,
  };

  try {
    const { getFECMapping } = await import('@/lib/api/finance-helpers');
    const mapping = getFECMapping(bioguideId);

    if (!mapping) {
      logger.info('No FEC mapping for civic alignment', { bioguideId });
      return emptyFinance;
    }

    const { fecApiService } = await import('@/lib/fec/fec-api-service');
    const { aggregateByIndustrySector } = await import('@/lib/fec/industry-taxonomy');

    const cycle = 2024;

    // Fetch financial summary and contributions in parallel
    const [summary, contributions] = await Promise.all([
      fecApiService.getFinancialSummary(mapping.fecId, cycle).catch(() => null),
      fecApiService.getSampleContributions(mapping.fecId, cycle, 100).catch(() => []),
    ]);

    const totalRaised = summary?.receipts || summary?.total_receipts || 0;

    // Aggregate contributions by sector
    const sectorAggregation = aggregateByIndustrySector(contributions);
    const topSectors = sectorAggregation.slice(0, 10).map(s => ({
      sector: s.sector,
      amount: s.totalAmount,
      percentage: s.percentage,
    }));

    // Build top contributors list
    const topContributors = contributions
      .filter(c => c.contributor_name && c.contribution_receipt_amount > 0)
      .sort((a, b) => b.contribution_receipt_amount - a.contribution_receipt_amount)
      .slice(0, 10)
      .map(c => ({
        name: c.contributor_name,
        amount: c.contribution_receipt_amount,
        employer: c.contributor_employer || 'Not reported',
      }));

    // Calculate small donor percentage (under $200)
    const smallDonors = contributions.filter(c => c.contribution_receipt_amount < 200);
    const totalContributionAmount = contributions.reduce(
      (sum, c) => sum + c.contribution_receipt_amount,
      0
    );
    const smallDonorAmount = smallDonors.reduce((sum, c) => sum + c.contribution_receipt_amount, 0);
    const smallDonorPercentage =
      totalContributionAmount > 0 ? (smallDonorAmount / totalContributionAmount) * 100 : 0;

    // Calculate in-state percentage
    const inStateContributions = contributions.filter(c => c.contributor_state === mapping.state);
    const inStateAmount = inStateContributions.reduce(
      (sum, c) => sum + c.contribution_receipt_amount,
      0
    );
    const inDistrictPercentage =
      totalContributionAmount > 0 ? (inStateAmount / totalContributionAmount) * 100 : 0;

    return {
      totalRaised,
      topSectors,
      topContributors,
      smallDonorPercentage,
      inDistrictPercentage,
    };
  } catch (error) {
    logger.warn('Error fetching finance data for civic alignment', {
      bioguideId,
      error: (error as Error).message,
    });
    return emptyFinance;
  }
}

/**
 * Fetch district/state profile from Census ACS 5-Year Data Profile.
 * House members: congressional district-level data (falls back to state if unavailable).
 * Senators: state-level data (the state IS their constituency).
 *
 * Census ACS 2022 uses 118th Congress district boundaries.
 * Variables: DP05_0001E=population, DP03_0062E=median income, DP03_0005PE=unemployment,
 * DP03_0128PE=poverty, DP03_0099PE=uninsured (no health insurance coverage)
 */
async function fetchDistrictProfile(
  stateCode: string,
  district: string,
  chamber: 'House' | 'Senate'
): Promise<CivicAlignmentInput['district']> {
  const emptyDistrict: CivicAlignmentInput['district'] = {
    population: 0,
    medianIncome: 0,
    unemploymentRate: 0,
    povertyRate: 0,
    uninsuredRate: 0,
    broadbandAvailability: 0,
    topFederalSpendingAgencies: [],
    topIndustries: [],
  };

  const stateFips = STATE_FIPS[stateCode];
  if (!stateFips) {
    logger.warn('Invalid state code for district profile', { stateCode });
    return emptyDistrict;
  }

  // Senators represent the whole state — state-level is the correct geography
  if (chamber === 'Senate') {
    return fetchCensusACS(stateFips, null);
  }

  // House members: try district-level first, fall back to state
  const districtNum = district.padStart(2, '0');
  const districtData = await fetchCensusACS(stateFips, districtNum);
  if (districtData.population > 0) {
    return districtData;
  }

  logger.info('District-level Census data unavailable, using state-level', {
    stateCode,
    district: districtNum,
  });
  return fetchCensusACS(stateFips, null);
}

/**
 * Fetch all metrics from a single Census ACS 5-Year Data Profile query.
 * When districtNum is provided, queries at congressional district level.
 * When null, queries at state level (correct for Senators).
 */
async function fetchCensusACS(
  stateFips: string,
  districtNum: string | null
): Promise<CivicAlignmentInput['district']> {
  const empty: CivicAlignmentInput['district'] = {
    population: 0,
    medianIncome: 0,
    unemploymentRate: 0,
    povertyRate: 0,
    uninsuredRate: 0,
    broadbandAvailability: 0,
    topFederalSpendingAgencies: [],
    topIndustries: [],
  };

  try {
    const censusKey = process.env.CENSUS_API_KEY;
    const keyParam = censusKey ? `&key=${censusKey}` : '';
    const variables = 'DP05_0001E,DP03_0062E,DP03_0005PE,DP03_0128PE,DP03_0099PE';

    const geography =
      districtNum !== null
        ? `for=congressional%20district:${districtNum}&in=state:${stateFips}`
        : `for=state:${stateFips}`;

    const url = `https://api.census.gov/data/2022/acs/acs5/profile?get=${variables}&${geography}${keyParam}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Census API error: ${response.status}`);
    }

    const data = await response.json();
    // Census returns [[headers], [row1], ...]
    if (Array.isArray(data) && data.length >= 2) {
      const row = data[1];
      return {
        population: parseInt(row[0]) || 0,
        medianIncome: parseInt(row[1]) || 0,
        unemploymentRate: parseFloat(row[2]) || 0,
        povertyRate: parseFloat(row[3]) || 0,
        uninsuredRate: parseFloat(row[4]) || 0,
        broadbandAvailability: 0,
        topFederalSpendingAgencies: [],
        topIndustries: [],
      };
    }

    return empty;
  } catch (error) {
    logger.warn('Census ACS fetch failed for civic alignment', {
      stateFips,
      district: districtNum,
      error: (error as Error).message,
    });
    return empty;
  }
}
