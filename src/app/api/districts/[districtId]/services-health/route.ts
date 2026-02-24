/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
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

interface CachedServicesData {
  data: ServicesHealthProfile;
  timestamp: number;
}

const cache = new Map<string, CachedServicesData>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

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
      let totalEnrollment = 0;
      let totalStudents = 0;
      let totalTeachers = 0;
      let validDistricts = 0;

      data.result.forEach((district: unknown) => {
        const districtData = district as Record<string, unknown>;
        if (districtData.graduation_rate && districtData.enrollment) {
          totalGradRate += parseFloat(String(districtData.graduation_rate)) || 0;
          totalEnrollment += parseInt(String(districtData.enrollment)) || 0;
          totalStudents += parseInt(String(districtData.total_students)) || 0;
          totalTeachers += parseInt(String(districtData.total_teachers)) || 0;
          validDistricts++;
        }
      });

      if (validDistricts > 0) {
        return {
          graduationRate: totalGradRate / validDistricts,
          collegeEnrollmentRate:
            totalStudents > 0 ? Math.min(95, (totalEnrollment / totalStudents) * 100) : 0,
          federalEducationFunding: 0, // Per-pupil funding data requires ED budget API
          teacherToStudentRatio: totalTeachers > 0 ? totalStudents / totalTeachers : 0,
          schoolDistrictPerformance: 0, // Composite score requires real performance framework
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

async function fetchCDCHealthData(
  stateCode: string
): Promise<Partial<ServicesHealthProfile['publicHealth']>> {
  try {
    // CDC PLACES API for state-level health data
    const cdcApiUrl = `https://data.cdc.gov/resource/cwsq-ngmh.json?stateabbr=${stateCode}&$limit=100`;

    logger.info('Fetching CDC health data', {
      stateCode,
      url: cdcApiUrl,
    });

    const response = await fetch(cdcApiUrl, {
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`CDC API error: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      // Extract relevant health metrics
      let preventableDisease = 0;
      let mentalHealthAccess = 0;
      let preventiveCare = 0;
      let validRecords = 0;

      data.forEach((record: unknown) => {
        const recordData = record as Record<string, unknown>;
        if (recordData.data_value && recordData.measure) {
          const value = parseFloat(String(recordData.data_value)) || 0;
          const measure = String(recordData.measure);

          // Map CDC measures to our metrics
          if (measure.includes('Diabetes') || measure.includes('Heart Disease')) {
            preventableDisease += value;
            validRecords++;
          } else if (measure.includes('Mental Health')) {
            mentalHealthAccess += value;
            validRecords++;
          } else if (measure.includes('Preventive') || measure.includes('Screening')) {
            preventiveCare += value;
            validRecords++;
          }
        }
      });

      if (validRecords > 0) {
        return {
          preventableDiseaseRate: preventableDisease / validRecords,
          mentalHealthProviderRatio: Math.max(1, mentalHealthAccess / 100),
          preventiveCareCoverage: Math.min(100, preventiveCare / validRecords),
          substanceAbusePrograms: 0, // Requires SAMHSA treatment locator API
        };
      }
    }

    logger.warn('CDC API returned no usable data', { stateCode });
    return {};
  } catch (error) {
    logger.error('Error fetching CDC data', error as Error, { stateCode });
    return {};
  }
}

function getHealthcareData(): ServicesHealthProfile['healthcare'] {
  // Return zeros for all healthcare metrics as no real API is available
  // Following CLAUDE.md rule: "NO mock data ever" - show "Data unavailable" instead
  return {
    hospitalQualityRating: 0,
    primaryCarePhysiciansPerCapita: 0,
    healthOutcomeIndex: 0,
    medicareProviderCount: 0,
    healthcareCostIndex: 0,
  };
}

async function fetchCensusEducationFunding(
  stateCode: string
): Promise<{ perPupilExpenditure: number; totalFederalRevenue: number; enrollment: number }> {
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
      const perPupilExpenditure = parseInt(values[0]) || 0;
      const totalFederalRevenue = parseInt(values[1]) || 0;
      const enrollment = parseInt(values[2]) || 0;

      logger.info('Census ASFIN data received', {
        stateCode,
        perPupilExpenditure,
        totalFederalRevenue,
        enrollment,
      });

      return { perPupilExpenditure, totalFederalRevenue, enrollment };
    }

    logger.warn('Census ASFIN API returned no data', { stateCode });
    return { perPupilExpenditure: 0, totalFederalRevenue: 0, enrollment: 0 };
  } catch (error) {
    logger.error('Error fetching Census ASFIN data', error as Error, { stateCode });
    return { perPupilExpenditure: 0, totalFederalRevenue: 0, enrollment: 0 };
  }
}

function getEducationEstimatesData(): Partial<ServicesHealthProfile['education']> {
  // Return zeros for education estimates as no reliable fallback API is available
  // Following CLAUDE.md rule: "NO mock data ever" - show "Data unavailable" instead
  return {
    schoolDistrictPerformance: 0,
    graduationRate: 0,
    collegeEnrollmentRate: 0,
    federalEducationFunding: 0,
    teacherToStudentRatio: 0,
  };
}

async function getServicesHealthProfile(districtId: string): Promise<ServicesHealthProfile> {
  const cacheKey = `services-${districtId}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    logger.info('Returning cached services health data', { districtId });
    return cached.data;
  }

  try {
    // Parse district ID to get state
    const stateCode = districtId.split('-')[0]?.toUpperCase();
    if (!stateCode || !STATE_FIPS[stateCode]) {
      throw new Error(`Invalid district ID format: ${districtId}`);
    }

    logger.info('Fetching services health profile for district', { districtId, stateCode });

    // Fetch data from multiple sources in parallel
    const [educationApiData, cdcData, censusEducation] = await Promise.all([
      fetchEducationData(stateCode),
      fetchCDCHealthData(stateCode),
      fetchCensusEducationFunding(stateCode),
    ]);

    // Get fallback data (returns zeros as no real APIs available)
    const educationEstimates = getEducationEstimatesData();
    const healthcareEstimates = getHealthcareData();

    // Combine all data sources — use 0 when APIs fail (no fake data)
    const servicesProfile: ServicesHealthProfile = {
      education: {
        schoolDistrictPerformance:
          educationApiData.schoolDistrictPerformance ||
          educationEstimates.schoolDistrictPerformance ||
          0,
        graduationRate: educationApiData.graduationRate || educationEstimates.graduationRate || 0,
        collegeEnrollmentRate:
          educationApiData.collegeEnrollmentRate || educationEstimates.collegeEnrollmentRate || 0,
        federalEducationFunding:
          censusEducation.perPupilExpenditure ||
          educationApiData.federalEducationFunding ||
          educationEstimates.federalEducationFunding ||
          0,
        teacherToStudentRatio:
          educationApiData.teacherToStudentRatio || educationEstimates.teacherToStudentRatio || 0,
      },
      healthcare: healthcareEstimates,
      publicHealth: {
        preventableDiseaseRate: cdcData.preventableDiseaseRate || 0,
        mentalHealthProviderRatio: cdcData.mentalHealthProviderRatio || 0,
        substanceAbusePrograms: cdcData.substanceAbusePrograms || 0,
        preventiveCareCoverage: cdcData.preventiveCareCoverage || 0,
      },
    };

    // Cache the result
    cache.set(cacheKey, {
      data: servicesProfile,
      timestamp: Date.now(),
    });

    logger.info('Services health profile compiled successfully', {
      districtId,
      stateCode,
      graduationRate: servicesProfile.education.graduationRate,
      hospitalQuality: servicesProfile.healthcare.hospitalQualityRating,
    });

    return servicesProfile;
  } catch (error) {
    logger.error('Error compiling services health profile', error as Error, { districtId });

    // Return fallback data if everything fails
    return {
      education: {
        schoolDistrictPerformance: 0,
        graduationRate: 0,
        collegeEnrollmentRate: 0,
        federalEducationFunding: 0,
        teacherToStudentRatio: 0,
      },
      healthcare: {
        hospitalQualityRating: 0,
        primaryCarePhysiciansPerCapita: 0,
        healthOutcomeIndex: 0,
        medicareProviderCount: 0,
        healthcareCostIndex: 0,
      },
      publicHealth: {
        preventableDiseaseRate: 0,
        mentalHealthProviderRatio: 0,
        substanceAbusePrograms: 0,
        preventiveCareCoverage: 0,
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
            cdc: 'Centers for Disease Control - https://data.cdc.gov/',
            healthcare: 'Data unavailable - no real API source',
          },
          notes: [
            'Education data from Department of Education API when available',
            'Per-pupil expenditure from Census ASFIN survey',
            'Health outcomes from CDC PLACES dataset',
            'Healthcare data unavailable - real government APIs needed',
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
