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
          fetchDistrictProfile(representative.state),
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
        if (districtData.unemploymentRate > 0) dataSources.push('bls.gov');
        if (districtData.medianIncome > 0) dataSources.push('census.gov');

        const hasVotes = votesRaw.length > 0;
        const hasFinance = financeData.totalRaised > 0;
        const hasDistrict = districtData.unemploymentRate > 0 || districtData.medianIncome > 0;
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
 * Fetch district profile from BLS + Census ACS
 */
async function fetchDistrictProfile(stateCode: string): Promise<CivicAlignmentInput['district']> {
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

  // Fetch BLS unemployment and Census ACS data in parallel
  const [blsData, censusData] = await Promise.all([
    fetchBLSUnemployment(stateFips),
    fetchCensusACS(stateFips),
  ]);

  return {
    population: censusData.population,
    medianIncome: censusData.medianIncome,
    unemploymentRate: blsData.unemploymentRate,
    povertyRate: censusData.povertyRate,
    uninsuredRate: censusData.uninsuredRate,
    broadbandAvailability: 0, // FCC data not critical for alignment analysis
    topFederalSpendingAgencies: [],
    topIndustries: blsData.majorIndustries,
  };
}

/**
 * Fetch unemployment rate from BLS (same as economic-profile route)
 */
async function fetchBLSUnemployment(
  stateFips: string
): Promise<{ unemploymentRate: number; majorIndustries: string[] }> {
  try {
    const response = await fetch(
      `https://api.bls.gov/publicAPI/v2/timeseries/data/LAUST${stateFips}0000000000003`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      throw new Error(`BLS API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.status === 'REQUEST_SUCCEEDED' && data.Results?.series?.[0]?.data?.length > 0) {
      const latestData = data.Results.series[0].data[0];
      return {
        unemploymentRate: parseFloat(latestData.value) || 0,
        majorIndustries: [],
      };
    }

    return { unemploymentRate: 0, majorIndustries: [] };
  } catch (error) {
    logger.warn('BLS fetch failed for civic alignment', {
      stateFips,
      error: (error as Error).message,
    });
    return { unemploymentRate: 0, majorIndustries: [] };
  }
}

/**
 * Fetch key metrics from Census ACS 5-year estimates
 */
async function fetchCensusACS(stateFips: string): Promise<{
  population: number;
  medianIncome: number;
  povertyRate: number;
  uninsuredRate: number;
}> {
  try {
    // Census ACS Data Profile: DP03_0062E=median income, DP03_0128PE=poverty rate,
    // DP03_0096PE=no health insurance, DP05_0001E=total population
    const censusKey = process.env.CENSUS_API_KEY;
    const keyParam = censusKey ? `&key=${censusKey}` : '';
    const url = `https://api.census.gov/data/2022/acs/acs5/profile?get=DP05_0001E,DP03_0062E,DP03_0128PE,DP03_0096PE&for=state:${stateFips}${keyParam}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Census API error: ${response.status}`);
    }

    const data = await response.json();
    // Census returns array of arrays: [headers, ...data]
    if (Array.isArray(data) && data.length >= 2) {
      const row = data[1];
      return {
        population: parseInt(row[0]) || 0,
        medianIncome: parseInt(row[1]) || 0,
        povertyRate: parseFloat(row[2]) || 0,
        uninsuredRate: parseFloat(row[3]) || 0,
      };
    }

    return { population: 0, medianIncome: 0, povertyRate: 0, uninsuredRate: 0 };
  } catch (error) {
    logger.warn('Census ACS fetch failed for civic alignment', {
      stateFips,
      error: (error as Error).message,
    });
    return { population: 0, medianIncome: 0, povertyRate: 0, uninsuredRate: 0 };
  }
}
