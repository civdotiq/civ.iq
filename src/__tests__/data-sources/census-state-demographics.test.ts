/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  hasStateDemographics,
  parseStateDemographics,
  STATE_DEMOGRAPHICS_VARIABLES,
} from '@/lib/data-sources/census-state-demographics';

jest.mock('@/lib/cache/redis-client', () => ({ getRedisCache: jest.fn() }));

// Real response: api.census.gov/data/2024/acs/acs5, state:26 (Michigan), fetched 2026-10-01.
const HEADERS = [...STATE_DEMOGRAPHICS_VARIABLES, 'state'];
const MI_2024 = [
  '10077761',
  '40.2',
  '72875',
  '40735',
  '9869514',
  '1303527',
  '7291631',
  '1321347',
  '30921',
  '343096',
  '2554',
  '45693',
  '450474',
  '592045',
  '7008507',
  '1682877',
  '276614',
  '537139',
  '996497',
  '685597',
  '1382352',
  '658779',
  '137202',
  '95639',
  '4622236',
  '4076369',
  '2984190',
  '231600',
  '1129',
  '8197132',
  '5024003',
  '5018449',
  '286296',
  '26',
];

describe('parseStateDemographics', () => {
  const mi = parseStateDemographics(HEADERS, MI_2024, 'MI');

  it('reports education as a percent of people 25+, not a raw count', () => {
    expect(mi.education.high_school_or_higher).toBeCloseTo(92.07, 1);
    expect(mi.education.bachelors_or_higher).toBeCloseTo(32.45, 1);
    expect(mi.education.graduate_or_professional).toBeCloseTo(12.69, 1);
  });

  it('computes homeownership from tenure, not occupancy', () => {
    expect(mi.housing.homeownership_rate).toBeCloseTo(73.21, 1);
  });

  it('divides labor rates by their own universes', () => {
    expect(mi.employment.labor_force_participation_rate).toBeCloseTo(61.29, 1);
    expect(mi.employment.unemployment_rate).toBeCloseTo(5.7, 1);
    expect(mi.poverty_rate).toBeCloseTo(13.21, 1);
  });

  it('uses race groups that partition the population', () => {
    const total = Object.values(mi.demographics).reduce((s, v) => s + v, 0);
    expect(total).toBe(mi.population);
    expect(mi.diversity_index).toBeGreaterThan(0);
    expect(mi.diversity_index).toBeLessThan(100);
  });

  it('carries the survey year and source', () => {
    expect(mi.survey_year).toBe(2024);
    expect(mi.data_source).toBe('Census Bureau ACS 2024 (5-Year Estimates)');
    expect(mi.median_household_income).toBe(72875);
  });

  it('treats ACS negative sentinels as unavailable', () => {
    const row = [...MI_2024];
    row[HEADERS.indexOf('B25077_001E')] = '-666666666';
    expect(parseStateDemographics(HEADERS, row, 'MI').housing.median_home_value).toBe(0);
  });
});

describe('hasStateDemographics', () => {
  it('covers the states, DC and Puerto Rico but not the Island Areas', () => {
    expect(['MI', 'WY', 'DC', 'PR'].every(hasStateDemographics)).toBe(true);
    expect(['GU', 'AS', 'VI', 'MP', 'XX'].some(hasStateDemographics)).toBe(false);
  });
});
