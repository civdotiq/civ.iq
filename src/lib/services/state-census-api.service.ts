/**
 * State Legislative District Census API Service
 * Fetches demographic data from Census ACS 5-Year API for state legislative districts
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import logger from '@/lib/logging/simple-logger';

export interface StateDistrictDemographics {
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
}

// State FIPS codes mapping
const STATE_FIPS_CODES: Record<string, string> = {
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

// Rate limiter for Census API
interface RateLimiter {
  requests: number[];
  maxRequestsPerSecond: number;
  waitIfNeeded(): Promise<void>;
}

const createRateLimiter = (): RateLimiter => ({
  requests: [],
  maxRequestsPerSecond: 5,
  async waitIfNeeded() {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    this.requests = this.requests.filter(time => time > oneSecondAgo);

    if (this.requests.length >= this.maxRequestsPerSecond) {
      const firstRequest = this.requests[0];
      if (!firstRequest) return;
      const waitTime = 1000 - (now - firstRequest);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.requests.push(now);
  },
});

const rateLimiter = createRateLimiter();

/**
 * Fetch demographic data from Census ACS 5-Year API for state legislative districts
 * @param stateCode Two-letter state abbreviation (e.g., 'MI', 'CA')
 * @param district District number (e.g., '01', '13')
 * @param chamber 'upper' for Senate (SLDU) or 'lower' for House (SLDL)
 */
export async function getStateDistrictDemographics(
  stateCode: string,
  district: string,
  chamber: 'upper' | 'lower'
): Promise<StateDistrictDemographics | null> {
  try {
    await rateLimiter.waitIfNeeded();

    const apiKey = process.env.CENSUS_API_KEY;
    if (!apiKey || apiKey === 'e7e0aed5d4a2bfd121a8f00dcc4cb7104df903e1') {
      logger.warn('Census API key not configured, returning null demographics', {
        stateCode,
        district,
        chamber,
      });
      return null;
    }

    const stateFips = STATE_FIPS_CODES[stateCode.toUpperCase()];
    if (!stateFips) {
      logger.error('Invalid state code for Census API', { stateCode });
      return null;
    }

    // Census ACS 5-Year API variables (same as federal districts)
    const acsUrl = 'https://api.census.gov/data/2022/acs/acs5';
    const variables = [
      'B01003_001E', // Total population
      'B02001_002E', // White alone
      'B02001_003E', // Black alone
      'B02001_005E', // Asian alone
      'B03003_003E', // Hispanic or Latino
      'B01002_001E', // Median age
      'B08301_001E', // Total workers 16+
      'B19013_001E', // Median household income
      'B17001_002E', // Below poverty level
      'B17001_001E', // Total for poverty determination
      'B15003_022E', // Bachelor's degree
      'B15003_001E', // Total education universe
      'B08301_010E', // Public transportation to work
      'B25026_001E', // Total population in housing units
    ].join(',');

    // Format district number (pad to 3 digits for Census API)
    const districtCode = district.padStart(3, '0');

    // Build query params
    const params = new URLSearchParams({
      get: variables,
      for: `state legislative district (${chamber} chamber):${districtCode}`,
      in: `state:${stateFips}`,
      key: apiKey,
    });

    const censusUrl = `${acsUrl}?${params}`;

    logger.info('Fetching state district demographics from Census API', {
      stateCode,
      stateFips,
      district,
      districtCode,
      chamber,
      url: censusUrl.replace(apiKey, 'REDACTED'),
    });

    const response = await fetch(censusUrl, {
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Census API request failed for state district', new Error(errorText), {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500),
        stateCode,
        district,
        chamber,
      });
      return null;
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length < 2) {
      logger.warn('Census API returned no data for state district', {
        stateCode,
        district,
        chamber,
        dataLength: data?.length || 0,
      });
      return null;
    }

    const [, values] = data;

    // Parse demographic values
    const totalPop = parseInt(values[0]) || 0;
    const white = parseInt(values[1]) || 0;
    const black = parseInt(values[2]) || 0;
    const asian = parseInt(values[3]) || 0;
    const hispanic = parseInt(values[4]) || 0;
    const medianAge = parseFloat(values[5]) || 0;
    const totalWorkers = parseInt(values[6]) || 0;
    const medianIncome = parseInt(values[7]) || 0;
    const belowPoverty = parseInt(values[8]) || 0;
    const totalPovertyUniverse = parseInt(values[9]) || 0;
    const bachelors = parseInt(values[10]) || 0;
    const totalEducationUniverse = parseInt(values[11]) || 0;
    const publicTransport = parseInt(values[12]) || 0;
    const totalPopInHousing = parseInt(values[13]) || 0;

    // Calculate diversity index (Simpson's Diversity Index)
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

    // Calculate urban percentage estimate
    const urbanPercentage =
      totalWorkers > 0
        ? Math.min(
            (publicTransport / totalWorkers) * 100 * 8 + (totalPopInHousing / totalPop) * 100 * 0.5,
            100
          )
        : 50;

    logger.info('Successfully fetched state district demographics', {
      stateCode,
      district,
      chamber,
      population: totalPop,
      medianIncome,
    });

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
    };
  } catch (error) {
    logger.error('Error fetching state district demographics', error as Error, {
      stateCode,
      district,
      chamber,
    });
    return null;
  }
}
