import logger from '@/lib/logging/simple-logger';

// District demographics interface for type safety
export interface DistrictDemographics {
  population: number;
  medianIncome: number;
  medianAge: number;
  white: number;
  black: number;
  asian: number;
  hispanic: number;
  housingUnits: number;
  educationBachelors: number;
  votingAgePopulation: number;
  diversityIndex: number;
  urbanPercentage: number | null; // Null when data unavailable (requires Census urban/rural classification)
}

// Census API variables for congressional districts
export const CENSUS_VARIABLES = {
  // Population
  TOTAL_POPULATION: 'B01003_001E',

  // Income
  MEDIAN_HOUSEHOLD_INCOME: 'B19013_001E',

  // Age
  MEDIAN_AGE: 'B01002_001E',

  // Race and Ethnicity for diversity calculations
  WHITE_ALONE: 'B02001_002E',
  BLACK_ALONE: 'B02001_003E',
  ASIAN_ALONE: 'B02001_005E',
  HISPANIC_LATINO: 'B03003_003E',

  // Urban/Rural (using housing density as proxy)
  TOTAL_HOUSING_UNITS: 'B25001_001E',

  // Education
  BACHELORS_DEGREE_OR_HIGHER: 'B15003_022E',

  // Voting Age Population
  VOTING_AGE_POPULATION: 'B29001_001E',
};

// State FIPS codes
export const STATE_FIPS: { [key: string]: string } = {
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

// Helper to calculate diversity index (Simpson's Diversity Index)
export function calculateDiversityIndex(demographics: {
  white: number;
  black: number;
  asian: number;
  hispanic: number;
  total: number;
}): number {
  const { white, black, asian, hispanic, total } = demographics;

  if (total === 0) return 0;

  // Calculate proportions
  const proportions = [
    white / total,
    black / total,
    asian / total,
    hispanic / total,
    (total - white - black - asian - hispanic) / total, // other
  ];

  // Simpson's Diversity Index
  const sumSquared = proportions.reduce((sum, p) => sum + p * p, 0);
  return (1 - sumSquared) * 100; // Convert to percentage
}

// Fetch demographic data for a specific state's congressional districts
export async function fetchStateDistrictDemographics(
  stateAbbr: string,
  censusApiKey: string
): Promise<Map<string, DistrictDemographics>> {
  const stateFips = STATE_FIPS[stateAbbr];
  if (!stateFips) {
    throw new Error(`Invalid state abbreviation: ${stateAbbr}`);
  }

  const variables = Object.values(CENSUS_VARIABLES).join(',');
  const url = `https://api.census.gov/data/2021/acs/acs5?get=${variables}&for=congressional%20district:*&in=state:${stateFips}&key=${censusApiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Census API error: ${response.status}`);
  }

  const data = await response.json();
  const headers = data[0];
  const rows = data.slice(1);

  const districtMap = new Map();

  // Find column indices
  const indices = {
    population: headers.indexOf(CENSUS_VARIABLES.TOTAL_POPULATION),
    income: headers.indexOf(CENSUS_VARIABLES.MEDIAN_HOUSEHOLD_INCOME),
    age: headers.indexOf(CENSUS_VARIABLES.MEDIAN_AGE),
    white: headers.indexOf(CENSUS_VARIABLES.WHITE_ALONE),
    black: headers.indexOf(CENSUS_VARIABLES.BLACK_ALONE),
    asian: headers.indexOf(CENSUS_VARIABLES.ASIAN_ALONE),
    hispanic: headers.indexOf(CENSUS_VARIABLES.HISPANIC_LATINO),
    housing: headers.indexOf(CENSUS_VARIABLES.TOTAL_HOUSING_UNITS),
    education: headers.indexOf(CENSUS_VARIABLES.BACHELORS_DEGREE_OR_HIGHER),
    votingAge: headers.indexOf(CENSUS_VARIABLES.VOTING_AGE_POPULATION),
    district: headers.indexOf('congressional district'),
  };

  for (const row of rows) {
    const districtNum = row[indices.district];

    // Skip at-large districts (00) for now
    if (districtNum === '00') continue;

    const demographics: DistrictDemographics = {
      population: parseInt(row[indices.population]) || 0,
      medianIncome: parseInt(row[indices.income]) || 0,
      medianAge: parseFloat(row[indices.age]) || 0,
      white: parseInt(row[indices.white]) || 0,
      black: parseInt(row[indices.black]) || 0,
      asian: parseInt(row[indices.asian]) || 0,
      hispanic: parseInt(row[indices.hispanic]) || 0,
      housingUnits: parseInt(row[indices.housing]) || 0,
      educationBachelors: parseInt(row[indices.education]) || 0,
      votingAgePopulation: parseInt(row[indices.votingAge]) || 0,
      diversityIndex: 0, // Will be calculated below
      urbanPercentage: 0, // Will be calculated below
    };

    // Calculate diversity index
    demographics.diversityIndex = calculateDiversityIndex({
      white: demographics.white,
      black: demographics.black,
      asian: demographics.asian,
      hispanic: demographics.hispanic,
      total: demographics.population,
    });

    // Urban percentage set to null - data unavailable from Census API
    // CLAUDE.md Compliant: No fake data - requires Census urban/rural classification (P2 table)
    // which is not available via the ACS 5-year API
    demographics.urbanPercentage = null;

    districtMap.set(districtNum.padStart(2, '0'), demographics);
  }

  return districtMap;
}

// In-memory cache for Census data (since we can't use filesystem in serverless)
const censusCache = new Map<
  string,
  { data: Map<string, DistrictDemographics & { state: string }>; timestamp: number }
>();

// Fetch all states' district demographics with in-memory caching
export async function fetchAllDistrictDemographics(
  censusApiKey: string
): Promise<Map<string, DistrictDemographics & { state: string }>> {
  const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
  const cacheKey = 'census-data';

  try {
    // Check in-memory cache
    const cached = censusCache.get(cacheKey);
    if (cached) {
      const cacheAge = Date.now() - cached.timestamp;

      if (cacheAge < CACHE_DURATION_MS) {
        logger.info('Census data: Loading from in-memory cache', {
          ageHours: Math.round(cacheAge / (60 * 60 * 1000)),
        });

        logger.info('Loaded districts from cache', { count: cached.data.size });
        return cached.data;
      } else {
        logger.info('Census data: Cache expired, fetching fresh data');
      }
    } else {
      logger.info('Census data: Cache miss, fetching from API');
    }

    // Fetch from Census API
    logger.info('Census data: Fetching new data from Census API');
    const startTime = Date.now();

    // Use improved API structure based on working individual district endpoint
    const variables = [
      'B01003_001E', // Total population
      'B02001_002E', // White alone
      'B02001_003E', // Black alone
      'B02001_005E', // Asian alone
      'B03003_003E', // Hispanic or Latino
      'B01002_001E', // Median age
      'B19013_001E', // Median household income
      'B25001_001E', // Total housing units
      'B15003_022E', // Bachelor's degree or higher
      'B29001_001E', // Voting age population
    ].join(',');

    // Build API URL without key first (some endpoints work without it)
    let url = `https://api.census.gov/data/2021/acs/acs5?get=${variables}&for=congressional%20district:*`;

    // Only add key if it exists and is not the known invalid one
    if (censusApiKey && censusApiKey !== 'e7e0aed5d4a2bfd121a8f00dcc4cb7104df903e1') {
      url += `&key=${censusApiKey}`;
    }

    logger.debug('Making Census API request', { urlPreview: url.substring(0, 100) + '...' });

    const response = await fetch(url, {
      signal: AbortSignal.timeout(45000), // 45 second timeout for bulk request
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Census API error', {
        status: response.status,
        error: errorText.substring(0, 500),
      });

      // Check for specific errors
      if (errorText.includes('Invalid Key') || errorText.includes('<title>Invalid Key</title>')) {
        throw new Error(
          'Census API key is invalid. Please get a valid API key from https://api.census.gov/data/key_signup.html'
        );
      }

      throw new Error(`Census API error: ${response.status} ${response.statusText}`);
    }

    const responseText = await response.text();
    logger.debug('Raw response received', { length: responseText.length });

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('Failed to parse Census API JSON', {
        responsePreview: responseText.substring(0, 1000),
      });
      throw new Error(`Census API returned invalid JSON: ${parseError}`);
    }

    if (!Array.isArray(data) || data.length < 2) {
      logger.error('Unexpected Census API response structure', { data });
      throw new Error('Census API returned unexpected data structure');
    }

    const headers = data[0];
    const rows = data.slice(1);

    const fetchTime = Date.now() - startTime;
    logger.info('Processed districts from Census API', {
      count: rows.length,
      fetchTimeMs: fetchTime,
    });

    const allDistricts = new Map();

    // Create reverse mapping for FIPS codes to state abbreviations
    const fipsToState: { [key: string]: string } = {};
    Object.entries(STATE_FIPS).forEach(([abbr, fips]) => {
      fipsToState[fips] = abbr;
    });

    // Get column indices
    const indices = {
      population: headers.indexOf('B01003_001E'),
      white: headers.indexOf('B02001_002E'),
      black: headers.indexOf('B02001_003E'),
      asian: headers.indexOf('B02001_005E'),
      hispanic: headers.indexOf('B03003_003E'),
      medianAge: headers.indexOf('B01002_001E'),
      medianIncome: headers.indexOf('B19013_001E'),
      housingUnits: headers.indexOf('B25001_001E'),
      education: headers.indexOf('B15003_022E'),
      votingAge: headers.indexOf('B29001_001E'),
      state: headers.indexOf('state'),
      district: headers.indexOf('congressional district'),
    };

    for (const row of rows) {
      const stateFips = row[indices.state];
      const districtNum = row[indices.district];
      const stateAbbr = fipsToState[stateFips];

      if (!stateAbbr) {
        logger.warn('Unknown state FIPS', { stateFips });
        continue;
      }

      // Skip at-large districts (00) - they should be normalized to 01
      if (districtNum === '00') {
        continue;
      }

      // Pad district number with leading zero if needed
      const paddedDistrictNum = districtNum.padStart(2, '0');
      const districtKey = `${stateAbbr}-${paddedDistrictNum}`;

      const demographics: DistrictDemographics = {
        population: parseInt(row[indices.population]) || 0,
        white: parseInt(row[indices.white]) || 0,
        black: parseInt(row[indices.black]) || 0,
        asian: parseInt(row[indices.asian]) || 0,
        hispanic: parseInt(row[indices.hispanic]) || 0,
        medianAge: parseFloat(row[indices.medianAge]) || 0,
        medianIncome: parseInt(row[indices.medianIncome]) || 0,
        housingUnits: parseInt(row[indices.housingUnits]) || 0,
        educationBachelors: parseInt(row[indices.education]) || 0,
        votingAgePopulation: parseInt(row[indices.votingAge]) || 0,
        diversityIndex: 0, // Will calculate below
        urbanPercentage: 0, // Will calculate below
      };

      // Calculate diversity index
      const totalPop = demographics.population;
      if (totalPop > 0) {
        const whitePercent = demographics.white / totalPop;
        const blackPercent = demographics.black / totalPop;
        const asianPercent = demographics.asian / totalPop;
        const hispanicPercent = demographics.hispanic / totalPop;
        const otherPercent = Math.max(
          0,
          1 - (whitePercent + blackPercent + asianPercent + hispanicPercent)
        );

        demographics.diversityIndex = Math.max(
          0,
          (1 -
            (whitePercent ** 2 +
              blackPercent ** 2 +
              asianPercent ** 2 +
              hispanicPercent ** 2 +
              otherPercent ** 2)) *
            100
        );
      }

      // Urban percentage set to null - data unavailable from Census API
      // CLAUDE.md Compliant: No fake data - requires Census urban/rural classification (P2 table)
      // The previous household size proxy was not accurate
      demographics.urbanPercentage = null;

      allDistricts.set(districtKey, { ...demographics, state: stateAbbr });
    }

    logger.info('Successfully processed districts', { count: allDistricts.size });

    // Cache the results in memory
    censusCache.set(cacheKey, {
      data: allDistricts,
      timestamp: Date.now(),
    });
    logger.info('Census data cached successfully in memory');

    return allDistricts;
  } catch (error) {
    logger.error('Error in fetchAllDistrictDemographics', error as Error);

    // Return empty Map instead of throwing to prevent cascade failures
    logger.warn('Returning empty demographics due to API failure');
    return new Map();
  }
}
