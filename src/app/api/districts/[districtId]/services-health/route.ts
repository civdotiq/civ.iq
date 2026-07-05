/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache';
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

const CACHE_KEY_PREFIX = 'district-services-health';

async function fetchEducationData(
  stateCode: string
): Promise<Partial<ServicesHealthProfile['education']>> {
  try {
    // Department of Education API for state-level data
    const edApiUrl = `https://api.ed.gov/data/school-districts?state=${stateCode}&format=json&limit=50`;

    logger.info('Fetching Department of Education data', {
      stateCode,
      url: edApiUrl,
    });

    const response = await fetch(edApiUrl, {
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Education API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.result && data.result.length > 0) {
      // Calculate averages from district data
      let totalGradRate = 0;
      let totalStudents = 0;
      let totalTeachers = 0;
      let validDistricts = 0;

      data.result.forEach((district: unknown) => {
        const districtData = district as Record<string, unknown>;
        if (districtData.graduation_rate && districtData.enrollment) {
          totalGradRate += parseFloat(String(districtData.graduation_rate)) || 0;
          totalStudents += parseInt(String(districtData.total_students)) || 0;
          totalTeachers += parseInt(String(districtData.total_teachers)) || 0;
          validDistricts++;
        }
      });

      if (validDistricts > 0) {
        // Only emit metrics this API genuinely provides. collegeEnrollmentRate
        // (previously derived as enrollment/students capped at 95) and
        // schoolDistrictPerformance have no real source here — stay null.
        return {
          graduationRate: totalGradRate / validDistricts,
          teacherToStudentRatio: totalTeachers > 0 ? totalStudents / totalTeachers : null,
        };
      }
    }

    logger.warn('Education API returned no usable data', { stateCode });
    return {};
  } catch (error) {
    logger.error('Error fetching education data', error as Error, { stateCode });
    return {};
  }
}

function getPublicHealthData(): ServicesHealthProfile['publicHealth'] {
  // Public health metrics are unavailable until a correct CDC PLACES measure
  // mapping exists. The previous integration misrepresented PLACES data:
  // prevalence percentages were summed with a divisor shared across
  // categories, presented as "per 100,000" rates, and a prevalence measure
  // was passed off as a provider ratio. Following CLAUDE.md "NO mock data
  // ever": emit null (= unavailable), never a miscomputed number.
  return {
    preventableDiseaseRate: null,
    mentalHealthProviderRatio: null,
    substanceAbusePrograms: null, // Requires SAMHSA treatment locator API
    preventiveCareCoverage: null,
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

async function fetchCensusEducationFunding(stateCode: string): Promise<{
  perPupilExpenditure: number | null;
  totalFederalRevenue: number | null;
  enrollment: number | null;
}> {
  try {
    const stateFips = STATE_FIPS[stateCode];
    if (!stateFips) {
      throw new Error(`Invalid state code: ${stateCode}`);
    }

    const apiKey = process.env.CENSUS_API_KEY || '';
    const keyParam = apiKey && !apiKey.startsWith('your_') ? `&key=${apiKey}` : '';
    const url = `https://api.census.gov/data/2022/asfin?get=PPEXPGN,TFEDREV,ENROLLM&for=state:${stateFips}${keyParam}`;

    logger.info('Fetching Census ASFIN education funding', { stateCode, stateFips });

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Census ASFIN API error: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 1) {
      const [, values] = data;
      // NaN/unparseable → null (unavailable), never 0
      const parseValue = (raw: unknown): number | null => {
        const parsed = parseInt(String(raw));
        return Number.isFinite(parsed) ? parsed : null;
      };
      const perPupilExpenditure = parseValue(values[0]);
      const totalFederalRevenue = parseValue(values[1]);
      const enrollment = parseValue(values[2]);

      logger.info('Census ASFIN data received', {
        stateCode,
        perPupilExpenditure,
        totalFederalRevenue,
        enrollment,
      });

      return { perPupilExpenditure, totalFederalRevenue, enrollment };
    }

    logger.warn('Census ASFIN API returned no data', { stateCode });
    return { perPupilExpenditure: null, totalFederalRevenue: null, enrollment: null };
  } catch (error) {
    logger.error('Error fetching Census ASFIN data', error as Error, { stateCode });
    return { perPupilExpenditure: null, totalFederalRevenue: null, enrollment: null };
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
    publicHealth: getPublicHealthData(),
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
    const [educationApiData, censusEducation] = await Promise.all([
      fetchEducationData(stateCode),
      fetchCensusEducationFunding(stateCode),
    ]);

    // Combine data sources — null when unavailable, never 0 (no fake data)
    const servicesProfile: ServicesHealthProfile = {
      education: {
        schoolDistrictPerformance: null, // No real performance framework source
        graduationRate: educationApiData.graduationRate ?? null,
        collegeEnrollmentRate: null, // No real source (previous formula was fabricated)
        // Federal revenue to the state's school systems (statewide, Census ASFIN)
        federalEducationFunding: censusEducation.totalFederalRevenue,
        teacherToStudentRatio: educationApiData.teacherToStudentRatio ?? null,
      },
      healthcare: getHealthcareData(),
      publicHealth: getPublicHealthData(),
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
            education: 'Department of Education - https://api.ed.gov/',
            censusAsfin:
              'Census Annual Survey of School System Finances - https://api.census.gov/data/2022/asfin',
            cdc: 'Data unavailable - CDC PLACES integration disabled pending correct measure mapping',
            healthcare: 'Data unavailable - no real API source',
          },
          notes: [
            'null values mean data is unavailable from real government sources - never estimated',
            'Education data from Department of Education API when available',
            'Federal education funding is the statewide federal revenue to school systems (Census ASFIN survey), not district-specific',
            'Public health data unavailable - CDC PLACES integration disabled pending correct measure mapping',
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
