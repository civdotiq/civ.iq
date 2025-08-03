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

// Fetch all states' district demographics
export async function fetchAllDistrictDemographics(
  censusApiKey: string
): Promise<Map<string, DistrictDemographics & { state: string }>> {
  const allDistricts = new Map();

  // Process states in batches to avoid rate limiting
  const states = Object.keys(STATE_FIPS);
  const batchSize = 5;

  for (let i = 0; i < states.length; i += batchSize) {
    const batch = states.slice(i, i + batchSize);

    const promises = batch.map(async state => {
      try {
        const stateDistricts = await fetchStateDistrictDemographics(state, censusApiKey);
        return { state, districts: stateDistricts };
      } catch {
        // Silently fail for individual states to avoid blocking the entire process
        // Error will be logged by the calling code if needed
        return { state, districts: new Map() };
      }
    });

    const results = await Promise.all(promises);

    for (const { state, districts } of results) {
      districts.forEach((data, districtNum) => {
        allDistricts.set(`${state}-${districtNum}`, { ...data, state });
      });
    }

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < states.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return allDistricts;
}
