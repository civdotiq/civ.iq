/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import logger from '@/lib/logging/simple-logger';
import { cachedFetch } from '@/lib/cache';
import { districtBoundaryService } from '@/lib/helpers/district-boundary-utils';
import { getStateFromWikidata, getDistrictFromWikidata } from '@/lib/api/wikidata';
import districtGeography from '@/data/district-geography.json';
import gazetteerData from '@/data/district-gazetteer.json';
import { US_STATES } from '@/lib/data/us-states';

// Type for Census Gazetteer data
interface GazetteerDistrict {
  landAreaSqMi: number;
  waterAreaSqMi: number;
  centroid: { lat: number; lng: number };
}

interface GazetteerDataType {
  source: string;
  sourceUrl: string;
  generatedAt: string;
  totalDistricts: number;
  districts: Record<string, GazetteerDistrict>;
}

const typedGazetteerData = gazetteerData as GazetteerDataType;

// ISR: Revalidate every 1 day
export const revalidate = 86400;

// State names mapping - using centralized US_STATES from @/lib/data/us-states

interface DistrictDetails {
  id: string;
  state: string;
  number: string;
  name: string;
  representative: {
    name: string;
    party: string;
    bioguideId: string;
    imageUrl?: string;
    yearsInOffice?: number;
  };
  demographics?: {
    population: number;
    medianIncome: number;
    medianAge: number;
    diversityIndex: number;
    urbanPercentage: number;
    white_percent: number;
    black_percent: number;
    hispanic_percent: number;
    asian_percent: number;
    poverty_rate: number;
    bachelor_degree_percent: number;
  };
  political: {
    cookPVI: string;
    lastElection: {
      winner: string;
      margin: number;
      turnout: number;
    };
    registeredVoters: number;
  };
  geography: {
    area: number;
    counties: string[];
    majorCities: string[];
  };
  wikidata?: {
    established?: string;
    area?: number;
    previousRepresentatives?: string[];
    wikipediaUrl?: string;
    capital?: string;
    governor?: string;
    motto?: string;
    nickname?: string;
  } | null;
}

/**
 * Calculate economic health index based on multiple factors
 */
function _calculateEconomicHealthIndex(
  medianIncome: number,
  povertyRate: number,
  unemploymentRate: number
): number {
  // Normalize income score (0-100, with 100k+ = 100)
  const incomeScore = Math.min((medianIncome / 100000) * 100, 100);

  // Normalize poverty score (inverted - lower poverty = higher score)
  const povertyScore = Math.max(0, 100 - povertyRate * 5);

  // Normalize unemployment score (inverted - lower unemployment = higher score)
  const unemploymentScore = Math.max(0, 100 - unemploymentRate * 10);

  // Weighted average: income 40%, poverty 30%, unemployment 30%
  return incomeScore * 0.4 + povertyScore * 0.3 + unemploymentScore * 0.3;
}

/**
 * Calculate industry diversity index based on state and district characteristics
 */
function _calculateIndustryDiversityIndex(state: string, district: string): number {
  // State-specific industry diversity patterns
  const stateIndustryProfile: Record<string, number> = {
    CA: 85, // High tech diversity
    NY: 90, // Financial services diversity
    TX: 80, // Oil, tech, agriculture
    FL: 75, // Tourism, aerospace, agriculture
    IL: 85, // Manufacturing, finance, agriculture
    PA: 80, // Manufacturing, healthcare, education
    OH: 75, // Manufacturing, healthcare
    MI: 70, // Auto manufacturing concentrated
    WA: 85, // Tech, aerospace
    MA: 90, // Biotech, finance, education
    NC: 80, // Finance, tech, textiles
    GA: 75, // Agriculture, manufacturing, services
    NJ: 85, // Pharmaceuticals, finance
    VA: 80, // Government, tech, defense
    TN: 70, // Manufacturing, agriculture, music
    IN: 75, // Manufacturing, agriculture
    AZ: 75, // Tech, mining, tourism
    MO: 75, // Agriculture, manufacturing, services
    WI: 70, // Manufacturing, agriculture
    MN: 80, // Finance, manufacturing, agriculture
    CO: 85, // Tech, energy, tourism
    AL: 65, // Manufacturing, agriculture
    LA: 60, // Oil, agriculture, tourism
    SC: 65, // Manufacturing, agriculture, tourism
    KY: 65, // Coal, agriculture, manufacturing
    OR: 80, // Tech, forestry, agriculture
    OK: 60, // Energy, agriculture
    CT: 85, // Finance, manufacturing, insurance
    IA: 70, // Agriculture, manufacturing
    MS: 60, // Agriculture, manufacturing
    AR: 65, // Agriculture, manufacturing
    KS: 70, // Agriculture, manufacturing, aerospace
    UT: 80, // Tech, mining, finance
    NV: 70, // Tourism, mining
    NM: 65, // Energy, technology, tourism
    WV: 50, // Coal, limited diversity
    NE: 70, // Agriculture, manufacturing
    ID: 65, // Agriculture, manufacturing, technology
    HI: 60, // Tourism, military, agriculture
    NH: 80, // Manufacturing, tourism, technology
    ME: 70, // Manufacturing, fishing, tourism
    RI: 75, // Manufacturing, services
    MT: 60, // Agriculture, mining, tourism
    DE: 80, // Finance, chemicals
    SD: 65, // Agriculture, manufacturing, services
    ND: 60, // Energy, agriculture
    AK: 55, // Oil, fishing, tourism
    VT: 70, // Manufacturing, tourism, agriculture
    WY: 50, // Energy, mining, agriculture
    DC: 95, // Government, services, extremely diverse
  };

  const baseScore = stateIndustryProfile[state] || 70;

  // Adjust based on district number (urban districts tend to be more diverse)
  const districtNum = parseInt(district);
  const districtAdjustment = districtNum <= 5 ? 5 : districtNum <= 10 ? 0 : -5;

  return Math.max(0, Math.min(100, baseScore + districtAdjustment));
}

/**
 * Calculate job growth potential based on education, demographics, and remote work
 */
function _calculateJobGrowthPotential(
  educationLevel: number,
  medianAge: number,
  remoteWorkPercent: number
): number {
  // Education score (higher education = better job growth potential)
  const educationScore = Math.min(educationLevel * 2, 100);

  // Age score (younger workforce = better growth potential)
  const ageScore = Math.max(0, 100 - (medianAge - 25) * 2);

  // Remote work score (higher remote work = more modern economy)
  const remoteScore = Math.min(remoteWorkPercent * 5, 100);

  // Weighted average: education 50%, age 30%, remote work 20%
  return educationScore * 0.5 + ageScore * 0.3 + remoteScore * 0.2;
}

/**
 * Fetch demographic data from Census API for a specific district
 */
async function getDistrictDemographics(
  state: string,
  district: string
): Promise<DistrictDetails['demographics']> {
  try {
    // Census API works without a key for basic public data
    const apiKey = process.env.CENSUS_API_KEY || '';

    // Get comprehensive data from Census American Community Survey 5-Year estimates
    const acsUrl = 'https://api.census.gov/data/2022/acs/acs5';
    const variables = [
      // Demographics
      'B01003_001E', // Total population
      'B02001_002E', // White alone
      'B02001_003E', // Black alone
      'B02001_005E', // Asian alone
      'B03003_003E', // Hispanic or Latino
      'B01002_001E', // Median age
      'B08301_001E', // Total workers 16+

      // Economics
      'B19013_001E', // Median household income
      'B17001_002E', // Below poverty level
      'B17001_001E', // Total for poverty determination
      'B25077_001E', // Median home value
      'B25064_001E', // Median gross rent
      'B23025_002E', // Labor force
      'B23025_005E', // Unemployed

      // Education
      'B15003_022E', // Bachelor's degree
      'B15003_023E', // Master's degree
      'B15003_024E', // Professional degree
      'B15003_025E', // Doctorate degree
      'B15003_001E', // Total education universe

      // Housing
      'B25003_001E', // Total housing units
      'B25003_002E', // Owner-occupied housing
      'B25003_003E', // Renter-occupied housing
      'B25002_001E', // Total housing units (occupied + vacant)
      'B25002_003E', // Vacant housing units

      // Transportation
      'B08301_010E', // Public transportation to work
      'B08301_021E', // Worked at home
      'B08303_001E', // Total travel time to work

      // Additional Demographics
      'B25010_001E', // Average household size
      'B08013_001E', // Aggregate travel time to work
      'B25058_001E', // Median contract rent
      'B25026_001E', // Total population in housing units

      // Veterans
      'B21001_002E', // Veterans
      'B21001_001E', // Total civilian population 18+

      // Disability
      'B18101_001E', // Total civilian noninstitutionalized population
      'B18101_002E', // With a disability

      // Language
      'B16001_001E', // Total 5 years and over
      'B16001_002E', // Speak only English
      'B16001_003E', // Speak language other than English
    ].join(',');

    // Determine if this is a statewide query (for Senators)
    const isStatewideQuery = district === '00' || district === 'STATE' || district === 'Statewide';

    // Build params - use state-level for statewide, congressional district for House
    const params = new URLSearchParams({
      get: variables,
    });

    if (isStatewideQuery) {
      // For statewide (Senator) queries, get state-level data
      params.append('for', `state:${getStateFipsCode(state)}`);
      logger.info('Using state-level Census query for statewide district', {
        state,
        stateFips: getStateFipsCode(state),
      });
    } else {
      // For House district queries, get congressional district data
      params.append('for', `congressional district:${district.padStart(2, '0')}`);
      params.append('in', `state:${getStateFipsCode(state)}`);
    }

    // Only add key if it exists and is not a placeholder
    if (apiKey && !apiKey.startsWith('your_')) {
      params.append('key', apiKey);
    }

    const censusUrl = `${acsUrl}?${params}`;
    logger.info('Making Census API request', {
      url: censusUrl,
      state,
      district,
      stateFips: getStateFipsCode(state),
    });

    const response = await fetch(censusUrl, {
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    logger.info('Census API response received', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      state,
      district,
    });

    if (response.ok) {
      const responseText = await response.text();
      logger.info('Census API raw response', {
        responseText: responseText.substring(0, 500), // Log first 500 chars
        responseLength: responseText.length,
        state,
        district,
      });

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        // Check if this is the "Invalid Key" HTML page
        if (responseText.includes('<title>Invalid Key</title>')) {
          logger.error('Census API key is invalid', parseError as Error, {
            apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'undefined',
            responseSnippet: responseText.substring(0, 200),
            state,
            district,
          });
          throw new Error(
            'Census API key is invalid. Please get a valid API key from https://api.census.gov/data/key_signup.html'
          );
        }

        logger.error('Failed to parse Census API JSON response', parseError as Error, {
          responseText: responseText.substring(0, 1000),
          state,
          district,
        });
        throw new Error(`Census API returned invalid JSON: ${parseError}`);
      }

      if (data.length > 1) {
        const [, values] = data;

        // Parse all the demographic values
        const totalPop = parseInt(values[0]) || 0;
        const white = parseInt(values[1]) || 0;
        const black = parseInt(values[2]) || 0;
        const asian = parseInt(values[3]) || 0;
        const hispanic = parseInt(values[4]) || 0;
        const medianAge = parseFloat(values[5]) || 0;
        const totalWorkers = parseInt(values[6]) || 0;

        // Economic indicators
        const medianIncome = parseInt(values[7]) || 0;
        const belowPoverty = parseInt(values[8]) || 0;
        const totalPovertyUniverse = parseInt(values[9]) || 0;
        const _medianHomeValue = parseInt(values[10]) || 0;
        const _medianGrossRent = parseInt(values[11]) || 0;
        const _laborForce = parseInt(values[12]) || 0;
        const _unemployed = parseInt(values[13]) || 0;

        // Education
        const bachelors = parseInt(values[14]) || 0;
        const _masters = parseInt(values[15]) || 0;
        const _professional = parseInt(values[16]) || 0;
        const _doctorate = parseInt(values[17]) || 0;
        const totalEducationUniverse = parseInt(values[18]) || 0;

        // Housing
        const _totalHousing = parseInt(values[19]) || 0;
        const _ownerOccupied = parseInt(values[20]) || 0;
        const _renterOccupied = parseInt(values[21]) || 0;
        const _totalHousingUnits = parseInt(values[22]) || 0;
        const _vacantHousing = parseInt(values[23]) || 0;

        // Transportation
        const publicTransport = parseInt(values[24]) || 0;
        const _workedAtHome = parseInt(values[25]) || 0;
        const _totalTravelTime = parseInt(values[26]) || 0;

        // Additional demographics
        const _avgHouseholdSize = parseFloat(values[27]) || 0;
        const _aggregateTravelTime = parseInt(values[28]) || 0;
        const _medianContractRent = parseInt(values[29]) || 0;
        const totalPopInHousing = parseInt(values[30]) || 0;

        // Veterans
        const _veterans = parseInt(values[31]) || 0;
        const _totalCivilianAdults = parseInt(values[32]) || 0;

        // Disability
        const _totalCivilianPop = parseInt(values[33]) || 0;
        const _withDisability = parseInt(values[34]) || 0;

        // Language
        // const totalLanguageUniverse = parseInt(values[35]) || 0;
        // const speakOnlyEnglish = parseInt(values[36]) || 0;
        // const speakOtherLanguage = parseInt(values[37]) || 0;

        // Calculate diversity index (1 - sum of squares of racial percentages)
        const whitePercent = totalPop > 0 ? white / totalPop : 0;
        const blackPercent = totalPop > 0 ? black / totalPop : 0;
        const hispanicPercent = totalPop > 0 ? hispanic / totalPop : 0;
        const asianPercent = totalPop > 0 ? asian / totalPop : 0;
        const otherPercent = 1 - (whitePercent + blackPercent + hispanicPercent + asianPercent);

        const diversityIndex =
          (1 -
            (Math.pow(whitePercent, 2) +
              Math.pow(blackPercent, 2) +
              Math.pow(hispanicPercent, 2) +
              Math.pow(asianPercent, 2) +
              Math.pow(otherPercent, 2))) *
          100;

        // Enhanced urban percentage calculation
        const urbanPercentage =
          totalWorkers > 0
            ? Math.min(
                (publicTransport / totalWorkers) * 100 * 8 +
                  (totalPopInHousing / totalPop) * 100 * 0.5,
                100
              )
            : 50;

        return {
          population: totalPop,
          medianIncome,
          medianAge,
          diversityIndex,
          urbanPercentage,
          white_percent: whitePercent * 100,
          black_percent: blackPercent * 100,
          hispanic_percent: hispanicPercent * 100,
          asian_percent: asianPercent * 100,
          poverty_rate: totalPovertyUniverse > 0 ? (belowPoverty / totalPovertyUniverse) * 100 : 0,
          bachelor_degree_percent:
            totalEducationUniverse > 0 ? (bachelors / totalEducationUniverse) * 100 : 0,

          // Additional comprehensive demographics - temporarily disabled for MVP
          // economic: {
          //   medianHomeValue,
          //   medianGrossRent,
          //   medianContractRent,
          //   unemploymentRate: laborForce > 0 ? (unemployed / laborForce) * 100 : 0,
          //   laborForceParticipation: totalCivilianAdults > 0 ? (laborForce / totalCivilianAdults) * 100 : 0,
          //   // Economic health indicators
          //   economicHealthIndex: calculateEconomicHealthIndex(medianIncome, totalPovertyUniverse > 0 ? (belowPoverty / totalPovertyUniverse) * 100 : 0, laborForce > 0 ? (unemployed / laborForce) * 100 : 0),
          //   housingAffordabilityRatio: medianIncome > 0 ? (medianHomeValue / medianIncome) : 0,
          //   rentBurdenRatio: medianIncome > 0 ? (medianGrossRent * 12 / medianIncome) : 0,
          //   // Industry diversity metrics
          //   industryDiversityIndex: calculateIndustryDiversityIndex(state, district),
          //   // Economic opportunity metrics
          //   jobGrowthPotential: calculateJobGrowthPotential(totalEducationUniverse > 0 ? (bachelors / totalEducationUniverse) * 100 : 0, medianAge, totalWorkers > 0 ? (workedAtHome / totalWorkers) * 100 : 0)
          // },

          // Extended demographics temporarily disabled for MVP
          // education: {
          //   highSchoolGraduatePercent: totalEducationUniverse > 0 ?
          //     ((totalEducationUniverse - bachelors - masters - professional - doctorate) / totalEducationUniverse) * 100 : 0,
          //   mastersDegreePercent: totalEducationUniverse > 0 ? (masters / totalEducationUniverse) * 100 : 0,
          //   professionalDegreePercent: totalEducationUniverse > 0 ? (professional / totalEducationUniverse) * 100 : 0,
          //   doctoratePercent: totalEducationUniverse > 0 ? (doctorate / totalEducationUniverse) * 100 : 0,
          //   advancedDegreePercent: totalEducationUniverse > 0 ?
          //     ((masters + professional + doctorate) / totalEducationUniverse) * 100 : 0
          // },

          // housing: {
          //   homeOwnershipRate: totalHousing > 0 ? (ownerOccupied / totalHousing) * 100 : 0,
          //   rentalRate: totalHousing > 0 ? (renterOccupied / totalHousing) * 100 : 0,
          //   vacancyRate: totalHousingUnits > 0 ? (vacantHousing / totalHousingUnits) * 100 : 0,
          //   avgHouseholdSize,
          //   housingUnitDensity: totalHousingUnits
          // },

          // transportation: {
          //   publicTransportPercent: totalWorkers > 0 ? (publicTransport / totalWorkers) * 100 : 0,
          //   workFromHomePercent: totalWorkers > 0 ? (workedAtHome / totalWorkers) * 100 : 0,
          //   avgCommuteTime: totalWorkers > 0 ? (aggregateTravelTime / totalWorkers) : 0
          // },

          // social: {
          //   veteransPercent: totalCivilianAdults > 0 ? (veterans / totalCivilianAdults) * 100 : 0,
          //   disabilityPercent: totalCivilianPop > 0 ? (withDisability / totalCivilianPop) * 100 : 0,
          //   englishOnlyPercent: totalLanguageUniverse > 0 ? (speakOnlyEnglish / totalLanguageUniverse) * 100 : 0,
          //   otherLanguagePercent: totalLanguageUniverse > 0 ? (speakOtherLanguage / totalLanguageUniverse) * 100 : 0
          // }
        };
      } else {
        logger.warn('Census API returned no data', {
          dataLength: data ? data.length : 0,
          data: data,
          state,
          district,
        });
      }
    } else {
      // Handle non-200 responses
      const errorText = await response.text();
      logger.error(
        'Census API request failed',
        new Error(`HTTP ${response.status}: ${response.statusText}`),
        {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 1000),
          url: censusUrl,
          state,
          district,
        }
      );
      throw new Error(`Census API request failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching Census demographics', error as Error, {
      state,
      district,
      errorMessage,
    });

    // If it's an API key error, include that in the response metadata
    if (errorMessage.includes('invalid') || errorMessage.includes('Invalid Key')) {
      logger.warn('Census API unavailable due to invalid key', {
        state,
        district,
        suggestion: 'Get a valid Census API key from https://api.census.gov/data/key_signup.html',
      });
    }
  }

  // Return unavailable indicators when Census API fails
  return {
    population: 0,
    medianIncome: 0,
    medianAge: 0,
    white_percent: 0,
    black_percent: 0,
    asian_percent: 0,
    hispanic_percent: 0,
    diversityIndex: 0,
    urbanPercentage: 0,
    poverty_rate: 0,
    bachelor_degree_percent: 0,
  };
}

// VIOLATION: This function generated fake data and has been disabled.
// function generatePlaceholderDemographics(
//   _state: string,
//   _district: string
// ): DistrictDetails['demographics'] {
//   return {
//     population: 0,
//     medianIncome: 0,
//     medianAge: 0,
//     diversityIndex: 0,
//     urbanPercentage: 0,
//     white_percent: 0,
//     black_percent: 0,
//     hispanic_percent: 0,
//     asian_percent: 0,
//     poverty_rate: 0,
//     bachelor_degree_percent: 0,
//   };
// }

/**
 * Convert state abbreviation to FIPS code for Census API
 */
function getStateFipsCode(stateAbbr: string): string {
  const fipsCodes: Record<string, string> = {
    AL: '01',
    AK: '02',
    AZ: '04',
    AR: '05',
    CA: '06',
    CO: '08',
    CT: '09',
    DE: '10',
    DC: '11',
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
  return fipsCodes[stateAbbr] || '01';
}

/**
 * Get geography information for a district using 2023+ redistricting data
 */
async function getDistrictGeography(
  state: string,
  district: string
): Promise<DistrictDetails['geography']> {
  try {
    // Try to get real boundary data first
    await districtBoundaryService.initialize();
    const stateFips = getStateFipsCode(state);
    const districtId = `${stateFips}${district.padStart(2, '0')}`;
    const boundaryData = districtBoundaryService.getDistrictById(districtId);

    if (boundaryData) {
      // Use real Census TIGER/Line boundary data from 2023 (119th Congress)
      logger.info('Using real district boundary data', {
        districtId,
        state,
        district,
        area: boundaryData.area_sqm,
        dataSource: 'Census TIGER/Line 2023',
      });

      // Get county and city data based on 2023+ redistricting
      const { counties, cities } = getPost2023DistrictData(state, district);

      return {
        area: Math.round(boundaryData.area_sqm / 1000000), // Convert sq meters to sq km
        counties,
        majorCities: cities,
      };
    }
  } catch (error) {
    logger.warn('Failed to load real boundary data, using fallback', {
      error: error instanceof Error ? error.message : 'Unknown error',
      state,
      district,
    });
  }

  // Fallback to Gazetteer data if boundary service fails
  const { counties, cities } = getPost2023DistrictData(state, district);

  // Get area from Census Gazetteer (real data)
  const normalizedDistrict =
    district === '00' || district === 'AL' ? '01' : district.padStart(2, '0');
  const gazetteerKey = `${state}-${normalizedDistrict}`;
  const gazetteerDistrict = typedGazetteerData.districts[gazetteerKey];
  const area = gazetteerDistrict ? Math.round(gazetteerDistrict.landAreaSqMi) : 0;

  return {
    area,
    counties,
    majorCities: cities,
  };
}

/**
 * Get district county and city data based on 2023+ redistricting
 * This reflects actual post-redistricting boundaries, especially for Michigan
 */
function getPost2023DistrictData(
  state: string,
  district: string
): { counties: string[]; cities: string[] } {
  logger.info('getPost2023DistrictData called', { state, district });

  // Handle statewide districts (for Senators)
  if (district === '00' || district === 'STATE' || district === 'Statewide') {
    return getStatewideGeographicData(state);
  }

  const districtNum = parseInt(district) || 1;

  // Load geographic data from JSON file
  type DistrictGeographyData = Record<
    string,
    Record<string, { counties: string[]; cities: string[] }>
  >;
  const geographyData = districtGeography as DistrictGeographyData;

  // Look up state data
  const stateData = geographyData[state];
  if (!stateData) {
    logger.warn('No geographic data available for state', { state, district });
    return { counties: [], cities: [] };
  }

  // Look up district data
  const districtData = stateData[districtNum.toString()];
  if (!districtData) {
    logger.warn('No geographic data available for district', {
      state,
      district,
      districtNum,
      message: 'Returning empty arrays instead of fake data',
    });
    return { counties: [], cities: [] };
  }

  return districtData;
}

/**
 * Get statewide geographic data for Senator districts
 * Returns all counties and major cities for a state
 */
function getStatewideGeographicData(state: string): { counties: string[]; cities: string[] } {
  // Major cities and county counts by state (real data)
  const stateGeography: Record<string, { counties: string[]; cities: string[] }> = {
    AL: {
      counties: ['Jefferson', 'Mobile', 'Madison', 'Montgomery', 'Baldwin', 'Tuscaloosa', 'Shelby'],
      cities: ['Birmingham', 'Montgomery', 'Huntsville', 'Mobile', 'Tuscaloosa'],
    },
    AK: {
      counties: [
        'Anchorage',
        'Fairbanks North Star',
        'Matanuska-Susitna',
        'Kenai Peninsula',
        'Juneau',
      ],
      cities: ['Anchorage', 'Fairbanks', 'Juneau', 'Sitka', 'Ketchikan'],
    },
    AZ: {
      counties: ['Maricopa', 'Pima', 'Pinal', 'Yavapai', 'Yuma', 'Mohave', 'Coconino'],
      cities: ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale', 'Glendale', 'Tempe'],
    },
    AR: {
      counties: ['Pulaski', 'Washington', 'Benton', 'Sebastian', 'Faulkner', 'Saline', 'Craighead'],
      cities: ['Little Rock', 'Fort Smith', 'Fayetteville', 'Springdale', 'Jonesboro'],
    },
    CA: {
      counties: [
        'Los Angeles',
        'San Diego',
        'Orange',
        'Riverside',
        'San Bernardino',
        'Santa Clara',
        'Alameda',
        'Sacramento',
        'San Francisco',
      ],
      cities: [
        'Los Angeles',
        'San Diego',
        'San Jose',
        'San Francisco',
        'Fresno',
        'Sacramento',
        'Oakland',
        'Long Beach',
      ],
    },
    CO: {
      counties: [
        'Denver',
        'El Paso',
        'Arapahoe',
        'Jefferson',
        'Adams',
        'Douglas',
        'Larimer',
        'Boulder',
      ],
      cities: ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood', 'Boulder'],
    },
    CT: {
      counties: [
        'Fairfield',
        'Hartford',
        'New Haven',
        'New London',
        'Litchfield',
        'Middlesex',
        'Tolland',
        'Windham',
      ],
      cities: ['Bridgeport', 'New Haven', 'Hartford', 'Stamford', 'Waterbury', 'Norwalk'],
    },
    DE: {
      counties: ['New Castle', 'Sussex', 'Kent'],
      cities: ['Wilmington', 'Dover', 'Newark', 'Middletown', 'Smyrna'],
    },
    FL: {
      counties: [
        'Miami-Dade',
        'Broward',
        'Palm Beach',
        'Hillsborough',
        'Orange',
        'Pinellas',
        'Duval',
        'Lee',
      ],
      cities: [
        'Jacksonville',
        'Miami',
        'Tampa',
        'Orlando',
        'St. Petersburg',
        'Fort Lauderdale',
        'Tallahassee',
      ],
    },
    GA: {
      counties: ['Fulton', 'Gwinnett', 'Cobb', 'DeKalb', 'Chatham', 'Clayton', 'Cherokee', 'Henry'],
      cities: ['Atlanta', 'Augusta', 'Columbus', 'Savannah', 'Athens', 'Macon', 'Sandy Springs'],
    },
    HI: {
      counties: ['Honolulu', 'Hawaii', 'Maui', 'Kauai'],
      cities: ['Honolulu', 'Hilo', 'Kailua', 'Pearl City', 'Kapolei'],
    },
    ID: {
      counties: ['Ada', 'Canyon', 'Kootenai', 'Bonneville', 'Bannock', 'Twin Falls', 'Bingham'],
      cities: ['Boise', 'Meridian', 'Nampa', 'Idaho Falls', 'Pocatello', 'Caldwell'],
    },
    IL: {
      counties: [
        'Cook',
        'DuPage',
        'Lake',
        'Will',
        'Kane',
        'McHenry',
        'Winnebago',
        'Madison',
        'St. Clair',
      ],
      cities: ['Chicago', 'Aurora', 'Rockford', 'Joliet', 'Naperville', 'Springfield', 'Peoria'],
    },
    IN: {
      counties: [
        'Marion',
        'Lake',
        'Allen',
        'Hamilton',
        'St. Joseph',
        'Elkhart',
        'Tippecanoe',
        'Vanderburgh',
      ],
      cities: [
        'Indianapolis',
        'Fort Wayne',
        'Evansville',
        'South Bend',
        'Carmel',
        'Fishers',
        'Bloomington',
      ],
    },
    IA: {
      counties: ['Polk', 'Linn', 'Scott', 'Johnson', 'Black Hawk', 'Woodbury', 'Dubuque', 'Story'],
      cities: ['Des Moines', 'Cedar Rapids', 'Davenport', 'Sioux City', 'Iowa City', 'Waterloo'],
    },
    KS: {
      counties: ['Johnson', 'Sedgwick', 'Shawnee', 'Wyandotte', 'Douglas', 'Leavenworth', 'Riley'],
      cities: ['Wichita', 'Overland Park', 'Kansas City', 'Olathe', 'Topeka', 'Lawrence'],
    },
    KY: {
      counties: [
        'Jefferson',
        'Fayette',
        'Kenton',
        'Boone',
        'Warren',
        'Hardin',
        'Daviess',
        'Campbell',
      ],
      cities: ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington', 'Richmond'],
    },
    LA: {
      counties: [
        'Orleans',
        'Jefferson',
        'East Baton Rouge',
        'Caddo',
        'St. Tammany',
        'Lafayette',
        'Calcasieu',
      ],
      cities: ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette', 'Lake Charles', 'Metairie'],
    },
    ME: {
      counties: [
        'Cumberland',
        'York',
        'Penobscot',
        'Kennebec',
        'Androscoggin',
        'Aroostook',
        'Oxford',
      ],
      cities: ['Portland', 'Lewiston', 'Bangor', 'South Portland', 'Auburn', 'Augusta'],
    },
    MD: {
      counties: [
        'Montgomery',
        "Prince George's",
        'Baltimore',
        'Anne Arundel',
        'Howard',
        'Baltimore City',
        'Frederick',
      ],
      cities: [
        'Baltimore',
        'Columbia',
        'Germantown',
        'Silver Spring',
        'Waldorf',
        'Frederick',
        'Annapolis',
      ],
    },
    MA: {
      counties: [
        'Middlesex',
        'Worcester',
        'Suffolk',
        'Essex',
        'Norfolk',
        'Bristol',
        'Plymouth',
        'Hampden',
      ],
      cities: [
        'Boston',
        'Worcester',
        'Springfield',
        'Cambridge',
        'Lowell',
        'New Bedford',
        'Brockton',
      ],
    },
    MI: {
      counties: [
        'Wayne',
        'Oakland',
        'Macomb',
        'Kent',
        'Genesee',
        'Washtenaw',
        'Ingham',
        'Ottawa',
        'Kalamazoo',
      ],
      cities: [
        'Detroit',
        'Grand Rapids',
        'Warren',
        'Sterling Heights',
        'Ann Arbor',
        'Lansing',
        'Flint',
        'Dearborn',
      ],
    },
    MN: {
      counties: [
        'Hennepin',
        'Ramsey',
        'Dakota',
        'Anoka',
        'Washington',
        'St. Louis',
        'Olmsted',
        'Stearns',
      ],
      cities: [
        'Minneapolis',
        'St. Paul',
        'Rochester',
        'Duluth',
        'Bloomington',
        'Brooklyn Park',
        'Plymouth',
      ],
    },
    MS: {
      counties: ['Hinds', 'Harrison', 'DeSoto', 'Rankin', 'Jackson', 'Madison', 'Lee', 'Forrest'],
      cities: ['Jackson', 'Gulfport', 'Southaven', 'Hattiesburg', 'Biloxi', 'Meridian', 'Tupelo'],
    },
    MO: {
      counties: [
        'St. Louis',
        'Jackson',
        'St. Charles',
        'St. Louis City',
        'Greene',
        'Clay',
        'Jefferson',
        'Boone',
      ],
      cities: [
        'Kansas City',
        'St. Louis',
        'Springfield',
        'Columbia',
        'Independence',
        "Lee's Summit",
      ],
    },
    MT: {
      counties: [
        'Yellowstone',
        'Missoula',
        'Gallatin',
        'Flathead',
        'Cascade',
        'Lewis and Clark',
        'Ravalli',
      ],
      cities: ['Billings', 'Missoula', 'Great Falls', 'Bozeman', 'Butte', 'Helena'],
    },
    NE: {
      counties: ['Douglas', 'Lancaster', 'Sarpy', 'Hall', 'Buffalo', 'Lincoln', 'Scotts Bluff'],
      cities: ['Omaha', 'Lincoln', 'Bellevue', 'Grand Island', 'Kearney', 'Fremont'],
    },
    NV: {
      counties: ['Clark', 'Washoe', 'Carson City', 'Lyon', 'Elko', 'Douglas', 'Nye'],
      cities: ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks', 'Carson City'],
    },
    NH: {
      counties: [
        'Hillsborough',
        'Rockingham',
        'Merrimack',
        'Strafford',
        'Grafton',
        'Cheshire',
        'Belknap',
        'Sullivan',
        'Carroll',
        'Coos',
      ],
      cities: ['Manchester', 'Nashua', 'Concord', 'Derry', 'Rochester', 'Salem', 'Dover'],
    },
    NJ: {
      counties: [
        'Bergen',
        'Middlesex',
        'Essex',
        'Hudson',
        'Monmouth',
        'Ocean',
        'Union',
        'Passaic',
        'Camden',
      ],
      cities: ['Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Trenton', 'Clifton', 'Camden'],
    },
    NM: {
      counties: ['Bernalillo', 'Doña Ana', 'Santa Fe', 'Sandoval', 'San Juan', 'McKinley', 'Lea'],
      cities: ['Albuquerque', 'Las Cruces', 'Rio Rancho', 'Santa Fe', 'Roswell', 'Farmington'],
    },
    NY: {
      counties: [
        'Kings',
        'Queens',
        'New York',
        'Suffolk',
        'Bronx',
        'Nassau',
        'Westchester',
        'Erie',
        'Monroe',
      ],
      cities: [
        'New York City',
        'Buffalo',
        'Rochester',
        'Yonkers',
        'Syracuse',
        'Albany',
        'New Rochelle',
      ],
    },
    NC: {
      counties: [
        'Mecklenburg',
        'Wake',
        'Guilford',
        'Forsyth',
        'Cumberland',
        'Durham',
        'Buncombe',
        'Gaston',
      ],
      cities: [
        'Charlotte',
        'Raleigh',
        'Greensboro',
        'Durham',
        'Winston-Salem',
        'Fayetteville',
        'Cary',
        'Wilmington',
      ],
    },
    ND: {
      counties: ['Cass', 'Burleigh', 'Grand Forks', 'Ward', 'Williams', 'Stark', 'Morton'],
      cities: ['Fargo', 'Bismarck', 'Grand Forks', 'Minot', 'West Fargo', 'Williston'],
    },
    OH: {
      counties: [
        'Franklin',
        'Cuyahoga',
        'Hamilton',
        'Summit',
        'Montgomery',
        'Lucas',
        'Butler',
        'Stark',
      ],
      cities: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Parma'],
    },
    OK: {
      counties: ['Oklahoma', 'Tulsa', 'Cleveland', 'Canadian', 'Comanche', 'Rogers', 'Wagoner'],
      cities: ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Edmond', 'Lawton', 'Moore'],
    },
    OR: {
      counties: ['Multnomah', 'Washington', 'Clackamas', 'Lane', 'Marion', 'Jackson', 'Deschutes'],
      cities: ['Portland', 'Salem', 'Eugene', 'Gresham', 'Hillsboro', 'Beaverton', 'Bend'],
    },
    PA: {
      counties: [
        'Philadelphia',
        'Allegheny',
        'Montgomery',
        'Bucks',
        'Delaware',
        'Lancaster',
        'Chester',
        'York',
      ],
      cities: [
        'Philadelphia',
        'Pittsburgh',
        'Allentown',
        'Reading',
        'Scranton',
        'Bethlehem',
        'Lancaster',
        'Harrisburg',
      ],
    },
    RI: {
      counties: ['Providence', 'Kent', 'Washington', 'Newport', 'Bristol'],
      cities: ['Providence', 'Warwick', 'Cranston', 'Pawtucket', 'East Providence', 'Newport'],
    },
    SC: {
      counties: [
        'Greenville',
        'Richland',
        'Charleston',
        'Horry',
        'Spartanburg',
        'Lexington',
        'York',
      ],
      cities: [
        'Charleston',
        'Columbia',
        'North Charleston',
        'Mount Pleasant',
        'Rock Hill',
        'Greenville',
        'Summerville',
      ],
    },
    SD: {
      counties: ['Minnehaha', 'Pennington', 'Lincoln', 'Brown', 'Brookings', 'Codington', 'Meade'],
      cities: ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Brookings', 'Watertown', 'Mitchell'],
    },
    TN: {
      counties: [
        'Shelby',
        'Davidson',
        'Knox',
        'Hamilton',
        'Rutherford',
        'Williamson',
        'Sumner',
        'Montgomery',
      ],
      cities: [
        'Nashville',
        'Memphis',
        'Knoxville',
        'Chattanooga',
        'Clarksville',
        'Murfreesboro',
        'Franklin',
      ],
    },
    TX: {
      counties: [
        'Harris',
        'Dallas',
        'Tarrant',
        'Bexar',
        'Travis',
        'Collin',
        'Hidalgo',
        'El Paso',
        'Denton',
        'Fort Bend',
      ],
      cities: [
        'Houston',
        'San Antonio',
        'Dallas',
        'Austin',
        'Fort Worth',
        'El Paso',
        'Arlington',
        'Corpus Christi',
        'Plano',
      ],
    },
    UT: {
      counties: ['Salt Lake', 'Utah', 'Davis', 'Weber', 'Washington', 'Cache', 'Tooele'],
      cities: [
        'Salt Lake City',
        'West Valley City',
        'Provo',
        'West Jordan',
        'Orem',
        'Sandy',
        'Ogden',
        'St. George',
      ],
    },
    VT: {
      counties: [
        'Chittenden',
        'Rutland',
        'Washington',
        'Windsor',
        'Franklin',
        'Bennington',
        'Windham',
        'Caledonia',
        'Addison',
        'Orleans',
        'Orange',
        'Lamoille',
        'Grand Isle',
        'Essex',
      ],
      cities: [
        'Burlington',
        'South Burlington',
        'Rutland',
        'Barre',
        'Montpelier',
        'St. Albans',
        'Winooski',
      ],
    },
    VA: {
      counties: [
        'Fairfax',
        'Prince William',
        'Loudoun',
        'Virginia Beach',
        'Chesterfield',
        'Henrico',
        'Norfolk',
        'Arlington',
      ],
      cities: [
        'Virginia Beach',
        'Norfolk',
        'Chesapeake',
        'Richmond',
        'Newport News',
        'Alexandria',
        'Hampton',
        'Roanoke',
      ],
    },
    WA: {
      counties: ['King', 'Pierce', 'Snohomish', 'Spokane', 'Clark', 'Thurston', 'Kitsap', 'Yakima'],
      cities: [
        'Seattle',
        'Spokane',
        'Tacoma',
        'Vancouver',
        'Bellevue',
        'Kent',
        'Everett',
        'Renton',
      ],
    },
    WV: {
      counties: [
        'Kanawha',
        'Berkeley',
        'Cabell',
        'Wood',
        'Monongalia',
        'Raleigh',
        'Putnam',
        'Harrison',
      ],
      cities: [
        'Charleston',
        'Huntington',
        'Morgantown',
        'Parkersburg',
        'Wheeling',
        'Martinsburg',
        'Fairmont',
      ],
    },
    WI: {
      counties: [
        'Milwaukee',
        'Dane',
        'Waukesha',
        'Brown',
        'Racine',
        'Outagamie',
        'Winnebago',
        'Kenosha',
      ],
      cities: [
        'Milwaukee',
        'Madison',
        'Green Bay',
        'Kenosha',
        'Racine',
        'Appleton',
        'Waukesha',
        'Oshkosh',
      ],
    },
    WY: {
      counties: [
        'Laramie',
        'Natrona',
        'Campbell',
        'Sweetwater',
        'Fremont',
        'Albany',
        'Sheridan',
        'Park',
        'Teton',
        'Uinta',
      ],
      cities: [
        'Cheyenne',
        'Casper',
        'Laramie',
        'Gillette',
        'Rock Springs',
        'Sheridan',
        'Green River',
      ],
    },
    DC: { counties: ['District of Columbia'], cities: ['Washington'] },
    // Territories
    PR: {
      counties: [
        'San Juan',
        'Bayamón',
        'Carolina',
        'Ponce',
        'Caguas',
        'Guaynabo',
        'Mayagüez',
        'Arecibo',
      ],
      cities: ['San Juan', 'Bayamón', 'Carolina', 'Ponce', 'Caguas', 'Guaynabo', 'Mayagüez'],
    },
    VI: {
      counties: ['St. Croix', 'St. Thomas', 'St. John'],
      cities: ['Charlotte Amalie', 'Christiansted', 'Frederiksted', 'Cruz Bay'],
    },
    GU: {
      counties: ['Dededo', 'Yigo', 'Tamuning', 'Mangilao', 'Barrigada'],
      cities: ['Hagåtña', 'Dededo', 'Tamuning', 'Yigo', 'Mangilao'],
    },
    AS: {
      counties: ['Eastern District', 'Western District', "Manu'a District"],
      cities: ['Pago Pago', 'Tafuna', "Nu'uuli", "Ili'ili", "Pava'ia'i"],
    },
    MP: {
      counties: ['Saipan', 'Tinian', 'Rota', 'Northern Islands'],
      cities: ['Saipan', 'Garapan', 'San Jose', 'Chalan Kanoa'],
    },
  };

  const stateData = stateGeography[state];
  if (!stateData) {
    logger.warn('No statewide geographic data available', { state });
    return { counties: [], cities: [] };
  }

  logger.info('Returning statewide geographic data', {
    state,
    countyCount: stateData.counties.length,
    cityCount: stateData.cities.length,
  });

  return stateData;
}

// State name to code mapping - placed at module level for reuse
const STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  'district-of-columbia': 'DC',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new-hampshire': 'NH',
  'new-jersey': 'NJ',
  'new-mexico': 'NM',
  'new-york': 'NY',
  'north-carolina': 'NC',
  'north-dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode-island': 'RI',
  'south-carolina': 'SC',
  'south-dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west-virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  // Add territories
  'puerto-rico': 'PR',
  'virgin-islands': 'VI',
  guam: 'GU',
  'american-samoa': 'AS',
  'northern-mariana-islands': 'MP',
};

async function getDistrictDetails(districtId: string): Promise<DistrictDetails | null> {
  try {
    // Parse district ID - support multiple formats:
    // 1. State abbreviation with hyphen: "MI-12", "CA-04" (canonical)
    // 2. State abbreviation without hyphen: "MI12", "CA04" (legacy/backwards compatibility)
    // 3. Full state name: "Michigan-12", "North-Carolina-04"
    // 4. State-level for senators: "VT-STATE", "CA-STATE"
    // 5. At-large districts: "AK-AL", "AKAL"

    // First, check for non-hyphenated format (e.g., MI12, CA04, AKAL)
    const nonHyphenatedMatch = districtId.match(/^([A-Z]{2})(\d{1,2}|AL)$/i);
    if (nonHyphenatedMatch?.[1] && nonHyphenatedMatch[2]) {
      // Convert to hyphenated format for consistent processing
      const state = nonHyphenatedMatch[1].toUpperCase();
      const district = nonHyphenatedMatch[2].toUpperCase();
      districtId = `${state}-${district}`;
    }

    const parts = districtId.split('-');

    if (parts.length < 2) {
      throw new Error('Invalid district ID format');
    }

    let stateCode: string;
    let district: string;
    let isStateLevelDistrict = false;

    // Check if first part is a 2-letter state abbreviation
    if (parts[0] && parts[0].length === 2 && parts[0] === parts[0].toUpperCase()) {
      // Format: "MI-12", "CA-04", or "VT-STATE"
      stateCode = parts[0];
      district = parts[1] || '01';

      // Check if this is a state-level district for senators
      if (parts[1] === 'STATE') {
        isStateLevelDistrict = true;
        district = 'STATE';
      }

      // Verify it's a valid state code
      if (!US_STATES[stateCode as keyof typeof US_STATES]) {
        throw new Error(`Invalid state abbreviation: ${stateCode}`);
      }
    } else {
      // Format: "Michigan-12" or "North-Carolina-04"
      district = parts[parts.length - 1] || '01'; // Last part is always the district number
      const stateParts = parts.slice(0, -1); // All parts except the last are state name
      const stateNameFromUrl = stateParts.join('-').toLowerCase();

      // Convert state name to state code
      const resolvedStateCode = STATE_NAME_TO_CODE[stateNameFromUrl];

      if (!resolvedStateCode) {
        logger.error('Invalid state name in district ID', {
          districtId,
          stateNameFromUrl,
          availableStates: Object.keys(STATE_NAME_TO_CODE).slice(0, 5), // Log first 5 for debugging
        });
        throw new Error(`Invalid state name: ${stateNameFromUrl}`);
      }
      stateCode = resolvedStateCode;
    }

    // Normalize district number (remove leading zeros for comparison, but preserve format)
    const normalizedDistrict = district?.replace(/^0+/, '') || '0';

    logger.info('Parsing district details', {
      districtId,
      stateCode,
      district,
      normalizedDistrict,
    });

    const representatives = await getAllEnhancedRepresentatives();

    if (!representatives || representatives.length === 0) {
      throw new Error('No representatives data available');
    }

    let representative;

    if (isStateLevelDistrict) {
      // For state-level districts, find a senator from that state
      representative = representatives.find(rep => {
        const matches = rep.chamber === 'Senate' && rep.state === stateCode;

        if (rep.state === stateCode && rep.chamber === 'Senate') {
          logger.info('Found senator for state district', {
            repName: rep.name,
            repState: rep.state,
            repChamber: rep.chamber,
            matches,
          });
        }

        return matches;
      });
    } else {
      // Find the representative for this House district
      representative = representatives.find(rep => {
        const repState = rep.state;
        const repDistrict = rep.district;
        const repDistrictNormalized = repDistrict ? repDistrict.replace(/^0+/, '') || '0' : '0';

        const matches =
          rep.chamber === 'House' &&
          repState === stateCode &&
          (repDistrictNormalized === normalizedDistrict ||
            repDistrict === district ||
            (normalizedDistrict === '0' && (repDistrict === 'At Large' || repDistrict === '01')));

        if (repState === stateCode) {
          logger.info('Found representative in state', {
            repName: rep.name,
            repState,
            repDistrict,
            repDistrictNormalized,
            targetDistrict: district,
            targetNormalized: normalizedDistrict,
            matches,
          });
        }

        return matches;
      });
    }

    if (!representative) {
      // Enhanced error logging to help debug the mismatch
      const stateReps = representatives.filter(
        rep => rep.state === stateCode && rep.chamber === 'House'
      );
      logger.error('Representative not found', {
        districtId,
        stateCode,
        district,
        normalizedDistrict,
        availableDistricts: stateReps.map(rep => ({
          name: rep.name,
          district: rep.district,
          normalized: rep.district ? rep.district.replace(/^0+/, '') || '0' : '0',
        })),
      });
      return null;
    }

    // Calculate years in office
    const currentYear = new Date().getFullYear();
    const firstTerm =
      representative.terms && representative.terms.length > 0
        ? representative.terms[0]
        : { startYear: currentYear.toString() };
    const yearsInOffice = currentYear - parseInt(firstTerm?.startYear || currentYear.toString());

    // Cook PVI data requires specialized political analysis
    const cookPVI = 'Data unavailable';

    let geography, demographics, wikidata;

    if (isStateLevelDistrict) {
      // For state-level districts, get state-wide information
      const [stateGeography, stateDemographics, stateWikidata] = await Promise.all([
        getDistrictGeography(representative.state, '00'), // Use '00' for statewide
        getDistrictDemographics(representative.state, '00'),
        getStateFromWikidata(representative.state),
      ]);

      geography = stateGeography;
      demographics = stateDemographics;
      wikidata = stateWikidata
        ? {
            established: stateWikidata.statehood,
            area: stateWikidata.area,
            wikipediaUrl: stateWikidata.wikipediaUrl,
            capital: stateWikidata.capital,
            governor: stateWikidata.governor,
            motto: stateWikidata.motto,
            nickname: stateWikidata.nickname,
          }
        : null;
    } else {
      // Run geography, demographics, and wikidata calls in parallel for House districts
      const [houseGeography, houseDemographics, districtWikidata] = await Promise.all([
        getDistrictGeography(representative.state, representative.district || '01'),
        getDistrictDemographics(representative.state, representative.district || '01'),
        getDistrictFromWikidata(representative.state, representative.district || '01'),
      ]);
      geography = houseGeography;
      demographics = houseDemographics;
      wikidata = districtWikidata
        ? {
            established: districtWikidata.established,
            area: districtWikidata.area,
            wikipediaUrl: districtWikidata.wikipediaUrl,
          }
        : null;
    }

    const districtDetails: DistrictDetails = {
      id: districtId.toLowerCase(),
      state: representative.state,
      number: isStateLevelDistrict ? 'STATE' : representative.district || '1',
      name: isStateLevelDistrict
        ? `${US_STATES[representative.state as keyof typeof US_STATES]} (Statewide)`
        : `${representative.state} District ${representative.district}`,
      representative: {
        name: representative.name,
        party: representative.party || 'Unknown',
        bioguideId: representative.bioguideId,
        imageUrl: representative.imageUrl,
        yearsInOffice,
      },
      demographics,
      political: {
        cookPVI,
        lastElection: {
          winner: 'Data unavailable',
          margin: 0,
          turnout: 0,
        },
        registeredVoters: 0,
      },
      geography,
      wikidata,
    };

    return districtDetails;
  } catch (error) {
    logger.error('Error fetching district details', error as Error, { districtId });
    throw error;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
) {
  try {
    const { districtId } = await params;

    // Special case: redirect /api/districts/all to correct endpoint
    if (districtId === 'all') {
      logger.info('Redirecting districts/all request to correct endpoint');
      return NextResponse.redirect(new URL('/api/districts/all', request.url));
    }

    logger.info('District details API request', { districtId });

    const district = await cachedFetch(
      `district-details-${districtId}`,
      () => getDistrictDetails(districtId),
      15552000000 // 6 months - demographics change annually, districts rarely change
    );

    if (!district) {
      return NextResponse.json({ error: 'District not found' }, { status: 404 });
    }

    return NextResponse.json({
      district,
      metadata: {
        timestamp: new Date().toISOString(),
        dataSource: 'congress-legislators + census-api + census-tiger-2023',
        note: 'Political data unavailable. Demographic data from Census API when available, otherwise marked as unavailable.',
        districtBoundaries: {
          congress: '119th Congress (2023-2025)',
          redistrictingYear: '2023',
          source: 'Census TIGER/Line 2023',
          note: 'Geographic data reflects post-2023 redistricting boundaries',
        },
      },
    });
  } catch (error) {
    const resolvedParams = await params;
    logger.error('District details API error', error as Error, {
      districtId: resolvedParams.districtId,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch district details',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
