import fs from 'fs/promises';
import path from 'path';

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
  urbanPercentage: number;
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

    // Estimate urban percentage (this is a rough estimate based on housing density)
    // Real implementation would use urban/rural classification data
    const area = 1000; // Placeholder - would need actual district area
    const density = demographics.housingUnits / area;
    demographics.urbanPercentage = Math.min(95, Math.max(5, density * 10));

    districtMap.set(districtNum.padStart(2, '0'), demographics);
  }

  return districtMap;
}

// Fetch all states' district demographics with file-based caching
export async function fetchAllDistrictDemographics(
  censusApiKey: string
): Promise<Map<string, DistrictDemographics & { state: string }>> {
  // Define cache file path
  const cacheDir = path.join(process.cwd(), '.cache');
  const cacheFile = path.join(cacheDir, 'census-cache.json');
  const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  try {
    // Ensure cache directory exists
    await fs.mkdir(cacheDir, { recursive: true });

    // Check if cache file exists and is recent
    try {
      const stats = await fs.stat(cacheFile);
      const cacheAge = Date.now() - stats.mtime.getTime();

      if (cacheAge < CACHE_DURATION_MS) {
        console.log(
          '📊 CENSUS DATA: FROM CACHE (age:',
          Math.round(cacheAge / (60 * 60 * 1000)),
          'hours)'
        );

        const cachedData = await fs.readFile(cacheFile, 'utf-8');
        let parsed;
        try {
          parsed = JSON.parse(cachedData);
        } catch (parseError) {
          console.warn('⚠️ Cache file corrupted, fetching fresh data');
          throw new Error('Cache corrupted');
        }

        // Convert back to Map from serialized array format
        const allDistricts = new Map();
        if (Array.isArray(parsed)) {
          parsed.forEach(([key, value]: [string, any]) => {
            allDistricts.set(key, value);
          });
        }

        console.log(`✅ Loaded ${allDistricts.size} districts from cache`);
        return allDistricts;
      }
    } catch (error) {
      // Cache file doesn't exist or can't be read, proceed with API fetch
      console.log('📊 CENSUS DATA: Cache miss, fetching from API');
    }

    // Fetch from Census API
    console.log('📊 CENSUS DATA: FROM CENSUS API (FETCHING NEW)');
    console.time('Census API Single Call');

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

    console.log('Making Census API request:', url.substring(0, 100) + '...');

    const response = await fetch(url, {
      signal: AbortSignal.timeout(45000), // 45 second timeout for bulk request
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Census API error ${response.status}:`, errorText.substring(0, 500));

      // Check for specific errors
      if (errorText.includes('Invalid Key') || errorText.includes('<title>Invalid Key</title>')) {
        throw new Error(
          'Census API key is invalid. Please get a valid API key from https://api.census.gov/data/key_signup.html'
        );
      }

      throw new Error(`Census API error: ${response.status} ${response.statusText}`);
    }

    const responseText = await response.text();
    console.log('Raw response length:', responseText.length, 'chars');

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Census API JSON:', responseText.substring(0, 1000));
      throw new Error(`Census API returned invalid JSON: ${parseError}`);
    }

    if (!Array.isArray(data) || data.length < 2) {
      console.error('Unexpected Census API response structure:', data);
      throw new Error('Census API returned unexpected data structure');
    }

    const headers = data[0];
    const rows = data.slice(1);

    console.timeEnd('Census API Single Call');
    console.log(`📊 Processed ${rows.length} districts from Census API`);

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
        console.warn(`Unknown state FIPS: ${stateFips}`);
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

      // Calculate urban percentage (housing density as proxy)
      if (demographics.housingUnits > 0 && totalPop > 0) {
        const householdSize = totalPop / demographics.housingUnits;
        demographics.urbanPercentage = Math.min(Math.max(householdSize * 25, 5), 95); // Bounded between 5-95%
      }

      allDistricts.set(districtKey, { ...demographics, state: stateAbbr });
    }

    console.log(`📊 Successfully processed ${allDistricts.size} districts`);

    // Cache the results
    try {
      // Convert Map to array format for JSON serialization
      const serializedData = Array.from(allDistricts.entries());
      await fs.writeFile(cacheFile, JSON.stringify(serializedData, null, 2));
      console.log('💾 Census data cached successfully');
    } catch (cacheError) {
      console.warn('⚠️ Failed to write cache file:', cacheError);
      // Don't throw - return the data anyway
    }

    return allDistricts;
  } catch (error) {
    console.error('❌ Error in fetchAllDistrictDemographics:', error);

    // Return empty Map instead of throwing to prevent cascade failures
    console.warn('📊 Returning empty demographics due to API failure');
    return new Map();
  }
}
