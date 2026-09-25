/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { STATE_FIPS_TO_CODE, isDelegateJurisdiction } from '@/lib/data/us-states';

/**
 * Census ACS 5-year congressional-district demographics for one House seat.
 *
 * Every field is either a value the Census Bureau published for the district
 * or null. Nothing is estimated, proportioned or defaulted.
 */

/** 2024 ACS 5-year is tabulated on 119th Congress district lines. */
export const ACS_DISTRICT_VINTAGE = 2024;

const CODE_TO_FIPS: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_FIPS_TO_CODE).map(([fips, code]) => [code, fips])
);

const VARS = {
  totalPop: 'B01003_001E',
  white: 'B02001_002E',
  black: 'B02001_003E',
  asian: 'B02001_005E',
  hispanic: 'B03003_003E',
  medianIncome: 'B19013_001E',
  povertyUniverse: 'B17001_001E',
  belowPoverty: 'B17001_002E',
  civilianLaborForce: 'B23025_003E',
  unemployed: 'B23025_005E',
  eduUniverse: 'B15003_001E',
  medianHomeValue: 'B25077_001E',
  occupiedUnits: 'B25003_001E',
  ownerOccupied: 'B25003_002E',
  medianRent: 'B25064_001E',
} as const;

/** B15003_017E (regular HS diploma) through B15003_025E (doctorate). */
const HS_OR_HIGHER = Array.from({ length: 9 }, (_, i) => `B15003_0${17 + i}E`);
/** B15003_022E (bachelor's) through B15003_025E (doctorate). */
const BACHELORS_OR_HIGHER = HS_OR_HIGHER.slice(5);

export const ACS_DISTRICT_VARIABLES: string[] = [...Object.values(VARS), ...HS_OR_HIGHER];

export interface RepDistrictDemographics {
  population: { total: number | null };
  race_ethnicity: {
    white: number | null;
    black: number | null;
    asian: number | null;
    hispanic: number | null;
  };
  economics: {
    median_household_income: number | null;
    poverty_rate: number | null;
    unemployment_rate: number | null;
    education: {
      high_school_or_higher: number | null;
      bachelors_or_higher: number | null;
    };
  };
  housing: {
    median_home_value: number | null;
    homeownership_rate: number | null;
    median_rent: number | null;
  };
  source: string;
}

/**
 * Census geography code for a member's seat, or null for senators and
 * unknown states. Delegate seats (DC, territories) are district 98; at-large
 * states are 00.
 */
export function censusDistrictFor(
  state: string | undefined,
  district: string | null | undefined
): { stateFips: string; districtCode: string } | null {
  if (!state || district === undefined || district === null || district === '') return null;
  const stateFips = CODE_TO_FIPS[state.toUpperCase()];
  if (!stateFips) return null;
  if (isDelegateJurisdiction(state)) return { stateFips, districtCode: '98' };
  const n = parseInt(district, 10);
  if (Number.isNaN(n))
    return /^at-?large$/i.test(district) ? { stateFips, districtCode: '00' } : null;
  return { stateFips, districtCode: String(n).padStart(2, '0') };
}

/** ACS publishes negative sentinels (e.g. -666666666) for suppressed cells. */
function num(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function pct(part: number | null, whole: number | null): number | null {
  if (part === null || whole === null || whole === 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

function sum(values: Array<number | null>): number | null {
  return values.some(v => v === null) ? null : values.reduce<number>((a, v) => a + (v ?? 0), 0);
}

/** Parse the Census API's [headers, row] array into demographics. */
export function parseAcsDistrictRow(table: unknown): RepDistrictDemographics | null {
  if (!Array.isArray(table) || table.length < 2) return null;
  const [headers, row] = table as [string[], string[]];
  const get = (v: string) => num(row[headers.indexOf(v)]);

  const eduUniverse = get(VARS.eduUniverse);
  return {
    population: { total: get(VARS.totalPop) },
    race_ethnicity: {
      white: get(VARS.white),
      black: get(VARS.black),
      asian: get(VARS.asian),
      hispanic: get(VARS.hispanic),
    },
    economics: {
      median_household_income: get(VARS.medianIncome),
      poverty_rate: pct(get(VARS.belowPoverty), get(VARS.povertyUniverse)),
      unemployment_rate: pct(get(VARS.unemployed), get(VARS.civilianLaborForce)),
      education: {
        high_school_or_higher: pct(sum(HS_OR_HIGHER.map(get)), eduUniverse),
        bachelors_or_higher: pct(sum(BACHELORS_OR_HIGHER.map(get)), eduUniverse),
      },
    },
    housing: {
      median_home_value: get(VARS.medianHomeValue),
      homeownership_rate: pct(get(VARS.ownerOccupied), get(VARS.occupiedUnits)),
      median_rent: get(VARS.medianRent),
    },
    source: `U.S. Census Bureau, ACS ${ACS_DISTRICT_VINTAGE} 5-year estimates`,
  };
}

export function acsDistrictUrl(stateFips: string, districtCode: string, apiKey?: string): string {
  const key = apiKey && !apiKey.startsWith('your_') ? `&key=${apiKey}` : '';
  return (
    `https://api.census.gov/data/${ACS_DISTRICT_VINTAGE}/acs/acs5` +
    `?get=${ACS_DISTRICT_VARIABLES.join(',')}` +
    `&for=congressional%20district:${districtCode}&in=state:${stateFips}${key}`
  );
}
