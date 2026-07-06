/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache';
import type { EconomicProfile } from '@/types/district-enhancements';

// ISR: Revalidate every 1 day
export const revalidate = 86400;

// State-to-FIPS mapping for BLS API
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

const CACHE_KEY_PREFIX = 'district-economic-profile';

interface BLSEmploymentData {
  unemploymentRate: number | null;
  laborForceParticipation: number | null;
}

function parseBLSSeriesValue(data: {
  status?: string;
  Results?: { series?: Array<{ data?: Array<{ value?: string }> }> };
}): number | null {
  if (data.status !== 'REQUEST_SUCCEEDED') return null;
  const raw = data.Results?.series?.[0]?.data?.[0]?.value;
  if (raw == null) return null;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchBLSData(stateCode: string): Promise<BLSEmploymentData> {
  try {
    const stateFips = STATE_FIPS[stateCode];
    if (!stateFips) {
      throw new Error(`Invalid state code: ${stateCode}`);
    }

    // Fetch unemployment (003) and labor force participation (006) in parallel
    const [unemploymentRes, laborForceRes] = await Promise.all([
      fetch(`https://api.bls.gov/publicAPI/v2/timeseries/data/LAUST${stateFips}0000000000003`, {
        signal: AbortSignal.timeout(10000),
      }),
      fetch(`https://api.bls.gov/publicAPI/v2/timeseries/data/LAUST${stateFips}0000000000006`, {
        signal: AbortSignal.timeout(10000),
      }),
    ]);

    logger.info('Fetching BLS employment data (unemployment + labor force)', {
      stateCode,
      stateFips,
    });

    let unemploymentRate: number | null = null;
    let laborForceParticipation: number | null = null;

    if (unemploymentRes.ok) {
      unemploymentRate = parseBLSSeriesValue(await unemploymentRes.json());
    }

    if (laborForceRes.ok) {
      laborForceParticipation = parseBLSSeriesValue(await laborForceRes.json());
    }

    logger.info('BLS data received', { stateCode, unemploymentRate, laborForceParticipation });

    return { unemploymentRate, laborForceParticipation };
  } catch (error) {
    logger.error('Error fetching BLS data', error as Error, { stateCode });
    return { unemploymentRate: null, laborForceParticipation: null };
  }
}

async function fetchBLSWageData(stateCode: string): Promise<number | null> {
  try {
    const stateFips = STATE_FIPS[stateCode];
    if (!stateFips) return null;

    // BLS QCEW annual averages — CSV endpoint for total all industries (industry code 10)
    const year = new Date().getFullYear() - 1; // Use previous year for complete data
    const url = `https://data.bls.gov/cew/data/api/${year}/a/area/ST${stateFips}000/industry/10.csv`;

    logger.info('Fetching BLS QCEW wage data', { stateCode, stateFips, url });

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      // Try year before if current year-1 isn't available yet
      const fallbackUrl = `https://data.bls.gov/cew/data/api/${year - 1}/a/area/ST${stateFips}000/industry/10.csv`;
      const fallbackResponse = await fetch(fallbackUrl, {
        signal: AbortSignal.timeout(15000),
      });
      if (!fallbackResponse.ok) {
        throw new Error(`BLS QCEW API error: ${response.status}`);
      }
      const csvText = await fallbackResponse.text();
      return parseQCEWCsv(csvText, stateCode);
    }

    const csvText = await response.text();
    return parseQCEWCsv(csvText, stateCode);
  } catch (error) {
    logger.error('Error fetching BLS QCEW wage data', error as Error, { stateCode });
    return null;
  }
}

function parseQCEWCsv(csvText: string, stateCode: string): number | null {
  const lines = csvText.split('\n');
  if (lines.length < 2) return null;

  // Parse CSV header to find avg_wkly_wage column index
  const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, '')) || [];
  const wageIndex = headers.indexOf('avg_wkly_wage');
  if (wageIndex === -1) {
    logger.warn('avg_wkly_wage column not found in QCEW CSV', {
      stateCode,
      headers: headers.slice(0, 10),
    });
    return null;
  }

  // Parse first data row (total, all industries)
  const dataRow = lines[1]?.split(',').map(v => v.trim().replace(/"/g, '')) || [];
  const avgWeeklyWage = parseInt(dataRow[wageIndex] || '0') || 0;

  if (avgWeeklyWage > 0) {
    const annualWage = avgWeeklyWage * 52;
    logger.info('BLS QCEW wage data parsed', { stateCode, avgWeeklyWage, annualWage });
    return annualWage;
  }

  return null;
}

// Connectivity: the prior FCC integration derived download/upload speeds and
// a "fiber availability" percentage from provider counts via invented
// formulas — not measured values. Disabled pending a correct FCC Broadband
// Data Collection integration; all connectivity metrics are null until then.
// Infrastructure: no real API source exists for these metrics; always null.
const UNAVAILABLE_INFRASTRUCTURE: EconomicProfile['infrastructure'] = {
  bridgeConditionRating: null,
  highwayFunding: null,
  broadbandAvailability: null,
  publicTransitAccessibility: null,
};

const UNAVAILABLE_CONNECTIVITY: EconomicProfile['connectivity'] = {
  fiberAvailability: null,
  averageDownloadSpeed: null,
  averageUploadSpeed: null,
  digitalDivideIndex: null,
};

// All metrics honestly unavailable (null, never 0)
const UNAVAILABLE_PROFILE: EconomicProfile = {
  employment: {
    unemploymentRate: null,
    laborForceParticipation: null,
    jobGrowthRate: null,
    majorIndustries: [],
    averageWage: null,
  },
  infrastructure: UNAVAILABLE_INFRASTRUCTURE,
  connectivity: UNAVAILABLE_CONNECTIVITY,
};

async function getEconomicProfile(districtId: string): Promise<EconomicProfile> {
  const cacheKey = `${CACHE_KEY_PREFIX}:${districtId}`;
  const cached = await govCache.get<EconomicProfile>(cacheKey);

  if (cached) {
    logger.info('Returning cached economic data', { districtId });
    return cached;
  }

  try {
    // Parse district ID to get state
    const stateCode = districtId.split('-')[0]?.toUpperCase();
    if (!stateCode || !STATE_FIPS[stateCode]) {
      throw new Error(`Invalid district ID format: ${districtId}`);
    }

    logger.info('Fetching economic profile for district', { districtId, stateCode });

    // Fetch data from multiple sources in parallel
    const [blsData, averageWage] = await Promise.all([
      fetchBLSData(stateCode),
      fetchBLSWageData(stateCode),
    ]);

    // Combine all data sources — null when a metric is unavailable (never 0)
    const economicProfile: EconomicProfile = {
      employment: {
        unemploymentRate: blsData.unemploymentRate,
        laborForceParticipation: blsData.laborForceParticipation,
        jobGrowthRate: null, // No real data source
        majorIndustries: [], // No real data source
        averageWage,
      },
      infrastructure: UNAVAILABLE_INFRASTRUCTURE,
      connectivity: UNAVAILABLE_CONNECTIVITY,
    };

    // Cache the result (Redis + memory fallback; shared across instances)
    await govCache.set(cacheKey, economicProfile, {
      dataType: 'heavyEndpoints',
      source: 'district-economic-profile',
    });

    logger.info('Economic profile compiled successfully', {
      districtId,
      stateCode,
      unemploymentRate: economicProfile.employment.unemploymentRate,
      averageWage: economicProfile.employment.averageWage,
    });

    return economicProfile;
  } catch (error) {
    logger.error('Error compiling economic profile', error as Error, { districtId });

    // Error fallback: everything honestly unavailable, never cached
    return UNAVAILABLE_PROFILE;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
) {
  try {
    const { districtId } = await params;

    logger.info('Economic profile API request', { districtId });

    const economicProfile = await getEconomicProfile(districtId);

    return NextResponse.json(
      {
        districtId,
        economic: economicProfile,
        metadata: {
          timestamp: new Date().toISOString(),
          dataSources: {
            bls: 'Bureau of Labor Statistics - https://api.bls.gov/',
            blsQcew: 'BLS Quarterly Census of Employment and Wages - https://data.bls.gov/cew/',
            connectivity: 'Data unavailable - pending FCC Broadband Data Collection integration',
            infrastructure: 'Data unavailable - no real API source',
          },
          notes: [
            'Employment figures are statewide (BLS publishes LAUS and QCEW at the state level, not by congressional district)',
            'Unemployment rate and labor force participation from BLS LAUS series',
            'Average annual wage from BLS QCEW data',
            'Connectivity metrics disabled: the prior FCC-derived values were formula estimates, not measurements',
            'Infrastructure data unavailable - no real government API source',
            'null means data unavailable; 0 is a genuine measured zero',
          ],
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
        },
      }
    );
  } catch (error) {
    const resolvedParams = await params;
    logger.error('Economic profile API error', error as Error, {
      districtId: resolvedParams.districtId,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch economic profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
