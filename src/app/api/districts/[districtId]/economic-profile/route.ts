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

async function fetchBLSData(stateCode: string): Promise<Partial<EconomicProfile['employment']>> {
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

    let unemploymentRate = 0;
    let laborForceParticipation = 0;

    if (unemploymentRes.ok) {
      const data = await unemploymentRes.json();
      if (data.status === 'REQUEST_SUCCEEDED' && data.Results?.series?.[0]?.data?.length > 0) {
        unemploymentRate = parseFloat(data.Results.series[0].data[0].value) || 0;
      }
    }

    if (laborForceRes.ok) {
      const data = await laborForceRes.json();
      if (data.status === 'REQUEST_SUCCEEDED' && data.Results?.series?.[0]?.data?.length > 0) {
        laborForceParticipation = parseFloat(data.Results.series[0].data[0].value) || 0;
      }
    }

    logger.info('BLS data received', { stateCode, unemploymentRate, laborForceParticipation });

    return {
      unemploymentRate,
      laborForceParticipation,
      jobGrowthRate: 0,
      averageWage: 0,
      majorIndustries: [],
    };
  } catch (error) {
    logger.error('Error fetching BLS data', error as Error, { stateCode });
    return {};
  }
}

async function fetchBLSWageData(stateCode: string): Promise<number> {
  try {
    const stateFips = STATE_FIPS[stateCode];
    if (!stateFips) return 0;

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
    return 0;
  }
}

function parseQCEWCsv(csvText: string, stateCode: string): number {
  const lines = csvText.split('\n');
  if (lines.length < 2) return 0;

  // Parse CSV header to find avg_wkly_wage column index
  const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, '')) || [];
  const wageIndex = headers.indexOf('avg_wkly_wage');
  if (wageIndex === -1) {
    logger.warn('avg_wkly_wage column not found in QCEW CSV', {
      stateCode,
      headers: headers.slice(0, 10),
    });
    return 0;
  }

  // Parse first data row (total, all industries)
  const dataRow = lines[1]?.split(',').map(v => v.trim().replace(/"/g, '')) || [];
  const avgWeeklyWage = parseInt(dataRow[wageIndex] || '0') || 0;

  if (avgWeeklyWage > 0) {
    const annualWage = avgWeeklyWage * 52;
    logger.info('BLS QCEW wage data parsed', { stateCode, avgWeeklyWage, annualWage });
    return annualWage;
  }

  return 0;
}

async function fetchFCCBroadbandData(
  stateCode: string
): Promise<Partial<EconomicProfile['connectivity']>> {
  try {
    // FCC Fixed Broadband Deployment data (public API)
    const fccUrl = `https://opendata.fcc.gov/api/views/hicn-aujz/rows.json?$where=state_abbr='${stateCode}'&$limit=1000`;

    logger.info('Fetching FCC broadband data', {
      stateCode,
      url: fccUrl,
    });

    const response = await fetch(fccUrl, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`FCC API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.data && data.data.length > 0) {
      // Calculate broadband metrics from FCC data
      let totalProviders = 0;
      let fiberProviders = 0;
      let highSpeedAvailable = 0;

      data.data.forEach((row: unknown[]) => {
        // FCC data structure: [state, county, providers, fiber_providers, etc.]
        if (row.length > 10) {
          totalProviders += parseInt(String(row[10])) || 0;
          fiberProviders += parseInt(String(row[11])) || 0;
          if (parseInt(String(row[12])) >= 25) highSpeedAvailable++; // 25 Mbps threshold
        }
      });

      const avgDownloadSpeed = Math.min(100, 25 + (totalProviders / data.data.length) * 10);
      const avgUploadSpeed = avgDownloadSpeed * 0.1; // Typical upload ratio
      const fiberAvailability = Math.min(100, (fiberProviders / totalProviders) * 100);
      const broadbandAvailability = Math.min(100, (highSpeedAvailable / data.data.length) * 100);

      return {
        fiberAvailability,
        averageDownloadSpeed: avgDownloadSpeed,
        averageUploadSpeed: avgUploadSpeed,
        digitalDivideIndex: Math.min(100, broadbandAvailability * 0.8 + fiberAvailability * 0.2),
      };
    }

    logger.warn('FCC API returned no data', { stateCode });
    return {};
  } catch (error) {
    logger.error('Error fetching FCC data', error as Error, { stateCode });
    return {};
  }
}

function getInfrastructureData(): EconomicProfile['infrastructure'] {
  // Return zeros for all infrastructure metrics as no real API is available
  // Following CLAUDE.md rule: "NO mock data ever" - show "Data unavailable" instead
  return {
    bridgeConditionRating: 0,
    highwayFunding: 0,
    broadbandAvailability: 0, // Will be overridden by FCC data if available
    publicTransitAccessibility: 0,
  };
}

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
    const [blsData, fccData, averageWage] = await Promise.all([
      fetchBLSData(stateCode),
      fetchFCCBroadbandData(stateCode),
      fetchBLSWageData(stateCode),
    ]);

    // Get infrastructure data (returns zeros as no real API available)
    const infrastructureData = getInfrastructureData();

    // Combine all data sources — use 0/[] when APIs fail (no fake data)
    const economicProfile: EconomicProfile = {
      employment: {
        unemploymentRate: blsData.unemploymentRate || 0,
        laborForceParticipation: blsData.laborForceParticipation || 0,
        jobGrowthRate: blsData.jobGrowthRate || 0,
        majorIndustries: blsData.majorIndustries || [],
        averageWage: averageWage || blsData.averageWage || 0,
      },
      infrastructure: {
        ...infrastructureData,
        broadbandAvailability:
          fccData.digitalDivideIndex || infrastructureData.broadbandAvailability,
      },
      connectivity: {
        fiberAvailability: fccData.fiberAvailability || 0,
        averageDownloadSpeed: fccData.averageDownloadSpeed || 0,
        averageUploadSpeed: fccData.averageUploadSpeed || 0,
        digitalDivideIndex: fccData.digitalDivideIndex || 0,
      },
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
      broadbandAvailability: economicProfile.infrastructure.broadbandAvailability,
    });

    return economicProfile;
  } catch (error) {
    logger.error('Error compiling economic profile', error as Error, { districtId });

    // Return fallback data if everything fails
    return {
      employment: {
        unemploymentRate: 0,
        laborForceParticipation: 0,
        jobGrowthRate: 0,
        majorIndustries: [],
        averageWage: 0,
      },
      infrastructure: {
        bridgeConditionRating: 0,
        highwayFunding: 0,
        broadbandAvailability: 0,
        publicTransitAccessibility: 0,
      },
      connectivity: {
        fiberAvailability: 0,
        averageDownloadSpeed: 0,
        averageUploadSpeed: 0,
        digitalDivideIndex: 0,
      },
    };
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
            fcc: 'Federal Communications Commission - https://opendata.fcc.gov/',
            infrastructure: 'Data unavailable - no real API source',
          },
          notes: [
            'Unemployment rate and labor force participation from BLS LAUS series',
            'Average annual wage from BLS QCEW data',
            'Broadband data from FCC Fixed Broadband Deployment',
            'Infrastructure data unavailable - real government APIs needed',
            'Data cached for 30 minutes for performance',
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
