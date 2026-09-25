/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache';
import { fetchDistrictPlacesData } from '@/lib/data-sources/cdc-places-service';
import { computeDistrictPlacesEstimate } from '@/lib/data-sources/cdc-places-district-estimate';
import { CCD_YEAR, fetchDistrictStaffing } from '@/lib/data-sources/nces-ccd-service';
import type { ServicesHealthProfile } from '@/types/district-enhancements';

// ISR: Revalidate every 1 day
export const revalidate = 86400;

// State-to-FIPS mapping for various APIs
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

// v2: entries cached while the retired ASFIN endpoint 404'd hold null funding
const CACHE_KEY_PREFIX = 'district-services-health:v2';

/**
 * CDC PLACES crude prevalence for the counties overlapping the district.
 * null = data unavailable. Never synthesized into a district number —
 * PLACES publishes county-level estimates, and they are shown as such.
 */
async function fetchPublicHealthData(
  districtId: string
): Promise<ServicesHealthProfile['publicHealth']> {
  const districtPart = districtId.split('-')[1]?.toUpperCase() ?? '';
  const districtNumber = /^\d+$/.test(districtPart) ? parseInt(districtPart, 10) : 0;
  const stateCode = districtId.split('-')[0]?.toUpperCase() ?? '';

  // County table (provenance / drill-down) + population-weighted district
  // estimate (tract aggregation), fetched in parallel. Either may be null.
  const [county, districtEstimate] = await Promise.all([
    fetchDistrictPlacesData(stateCode, districtNumber),
    computeDistrictPlacesEstimate(stateCode, districtNumber),
  ]);

  if (!county && !districtEstimate) return null;

  return {
    dataYear: county?.dataYear ?? districtEstimate?.dataYear ?? null,
    measures: county?.measures ?? [],
    districtEstimate,
  };
}

function getHealthcareData(): ServicesHealthProfile['healthcare'] {
  // No real API source for these healthcare metrics.
  // Following CLAUDE.md "NO mock data ever": emit null (= unavailable), not 0
  // (which a consumer would read as a genuine measurement).
  return {
    hospitalQualityRating: null,
    primaryCarePhysiciansPerCapita: null,
    healthOutcomeIndex: null,
    medicareProviderCount: null,
    healthcareCostIndex: null,
  };
}

// Census Annual Survey of School System Finances, state level. The old
// data/{year}/asfin endpoint 404s; the survey now lives in this long-format
// timeseries (one row per AGG_DESC aggregate per year).
const SCHOOL_FINANCE_URL = 'https://api.census.gov/data/timeseries/govsschfin';
const AGG_FEDERAL_REVENUE = 'SS0201'; // Total revenue from federal sources ($ thousands)
const AGG_SPENDING_PER_PUPIL = 'SS1105'; // Total current spending per pupil ($)
const AGG_ENROLLMENT = 'SS1903'; // Fall enrollment (students)

async function fetchCensusEducationFunding(stateCode: string): Promise<{
  perPupilExpenditure: number | null;
  totalFederalRevenue: number | null;
  enrollment: number | null;
}> {
  const unavailable = { perPupilExpenditure: null, totalFederalRevenue: null, enrollment: null };
  try {
    const stateFips = STATE_FIPS[stateCode];
    if (!stateFips) {
      throw new Error(`Invalid state code: ${stateCode}`);
    }

    const apiKey = process.env.CENSUS_API_KEY || '';
    const keyParam = apiKey && !apiKey.startsWith('your_') ? `&key=${apiKey}` : '';
    // Survey lags ~2 years; a 5-year window always contains the latest release
    const fromYear = new Date().getFullYear() - 5;
    const aggs = [AGG_FEDERAL_REVENUE, AGG_SPENDING_PER_PUPIL, AGG_ENROLLMENT]
      .map(code => `&AGG_DESC=${code}`)
      .join('');
    const url = `${SCHOOL_FINANCE_URL}?get=AMOUNT&for=state:${stateFips}&time=from+${fromYear}${aggs}${keyParam}`;

    logger.info('Fetching Census school system finances', { stateCode, stateFips });

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Census school finance API error: ${response.status}`);
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data) || data.length < 2) {
      logger.warn('Census school finance API returned no data', { stateCode });
      return unavailable;
    }

    const header = data[0] as string[];
    const amountIdx = header.indexOf('AMOUNT');
    const timeIdx = header.indexOf('time');
    const aggIdx = header.indexOf('AGG_DESC');
    // year -> aggregate code -> amount; NaN/unparseable -> absent, never 0
    const byYear = new Map<string, Map<string, number>>();
    for (const row of data.slice(1) as unknown[][]) {
      const amount = Number.parseInt(String(row[amountIdx]), 10);
      if (!Number.isFinite(amount)) continue;
      const year = String(row[timeIdx]);
      const yearAggs = byYear.get(year) ?? new Map<string, number>();
      yearAggs.set(String(row[aggIdx]), amount);
      byYear.set(year, yearAggs);
    }

    // Latest year that reports federal revenue (the headline metric)
    const latestYear = [...byYear.keys()]
      .filter(year => byYear.get(year)?.has(AGG_FEDERAL_REVENUE))
      .sort()
      .pop();
    const latest = latestYear ? byYear.get(latestYear) : undefined;
    if (!latest) {
      logger.warn('Census school finance API returned no federal revenue', { stateCode });
      return unavailable;
    }

    const federalThousands = latest.get(AGG_FEDERAL_REVENUE);
    const result = {
      perPupilExpenditure: latest.get(AGG_SPENDING_PER_PUPIL) ?? null,
      totalFederalRevenue: federalThousands != null ? federalThousands * 1000 : null,
      enrollment: latest.get(AGG_ENROLLMENT) ?? null,
    };

    logger.info('Census school finance data received', { stateCode, year: latestYear, ...result });
    return result;
  } catch (error) {
    logger.error('Error fetching Census school finance data', error as Error, { stateCode });
    return unavailable;
  }
}

function getUnavailableProfile(): ServicesHealthProfile {
  return {
    education: {
      schoolDistrictPerformance: null,
      graduationRate: null,
      collegeEnrollmentRate: null,
      federalEducationFunding: null,
      teacherToStudentRatio: null,
    },
    healthcare: getHealthcareData(),
    publicHealth: null,
  };
}

async function getServicesHealthProfile(districtId: string): Promise<ServicesHealthProfile> {
  const cacheKey = `${CACHE_KEY_PREFIX}:${districtId}`;
  const cached = await govCache.get<ServicesHealthProfile>(cacheKey);

  if (cached) {
    logger.info('Returning cached services health data', { districtId });
    return cached;
  }

  try {
    // Parse district ID to get state
    const stateCode = districtId.split('-')[0]?.toUpperCase();
    if (!stateCode || !STATE_FIPS[stateCode]) {
      throw new Error(`Invalid district ID format: ${districtId}`);
    }

    logger.info('Fetching services health profile for district', { districtId, stateCode });

    // Fetch data from real sources in parallel
    const [staffing, censusEducation, publicHealth] = await Promise.all([
      fetchDistrictStaffing(districtId, STATE_FIPS[stateCode]),
      fetchCensusEducationFunding(stateCode),
      fetchPublicHealthData(districtId),
    ]);

    // Combine data sources — null when unavailable, never 0 (no fake data)
    const servicesProfile: ServicesHealthProfile = {
      education: {
        schoolDistrictPerformance: null, // No real performance framework source
        // No current district-level source: EdFacts graduation rates on the
        // Education Data API end at 2019 and api.ed.gov no longer resolves.
        graduationRate: null,
        collegeEnrollmentRate: null, // No real source (previous formula was fabricated)
        // Federal revenue to the state's school systems (statewide, Census school finances)
        federalEducationFunding: censusEducation.totalFederalRevenue,
        // Students per FTE teacher across public schools in the district (NCES CCD)
        teacherToStudentRatio: staffing?.studentsPerTeacher ?? null,
      },
      healthcare: getHealthcareData(),
      publicHealth,
    };

    // Cache the result (Redis + memory fallback; shared across instances)
    await govCache.set(cacheKey, servicesProfile, {
      dataType: 'heavyEndpoints',
      source: 'district-services-health',
    });

    logger.info('Services health profile compiled successfully', {
      districtId,
      stateCode,
      graduationRate: servicesProfile.education.graduationRate,
      federalEducationFunding: servicesProfile.education.federalEducationFunding,
    });

    return servicesProfile;
  } catch (error) {
    logger.error('Error compiling services health profile', error as Error, { districtId });

    // Everything failed: all metrics honestly unavailable (never cached)
    return getUnavailableProfile();
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
) {
  try {
    const { districtId } = await params;

    logger.info('Services health profile API request', { districtId });

    const servicesProfile = await getServicesHealthProfile(districtId);

    return NextResponse.json(
      {
        districtId,
        services: servicesProfile,
        metadata: {
          timestamp: new Date().toISOString(),
          dataSources: {
            education: `NCES Common Core of Data ${CCD_YEAR} school directory, via Urban Institute Education Data API - https://educationdata.urban.org/documentation/schools.html`,
            censusAsfin:
              'Census Annual Survey of School System Finances - https://api.census.gov/data/timeseries/govsschfin',
            cdc: 'CDC PLACES County Data - https://data.cdc.gov/resource/swc5-untb',
            cdcTract:
              'CDC PLACES Census Tract Data - https://data.cdc.gov/resource/cwsq-ngmh (district estimate)',
            healthcare: 'Data unavailable - no real API source',
          },
          notes: [
            'null values mean data is unavailable from real government sources - never estimated',
            'Students per teacher sums enrollment and full-time-equivalent teachers over public schools located in this congressional district that report both (NCES CCD); graduation rate is unavailable because no current district-level source exists',
            'Federal education funding is the statewide federal revenue to school systems (Census Annual Survey of School System Finances, latest available year), not district-specific',
            'Public health county table shows CDC PLACES county-level model-based estimates (BRFSS, crude prevalence percentages) for the counties overlapping this district',
            'publicHealth.districtEstimate is a population-weighted district figure aggregated from CDC PLACES census-tract crude prevalence (weighted by tract adult population, Census CD-to-tract crosswalk); null when tract coverage is below 80% of district adult population',
            'Healthcare data unavailable - real government APIs needed',
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
    logger.error('Services health profile API error', error as Error, {
      districtId: resolvedParams.districtId,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch services health profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
