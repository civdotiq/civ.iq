/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Pilot cities supported via Legistar.
 *
 * This is the canonical list of local jurisdictions CIV.IQ has wired
 * council data for. It is referenced by:
 *  - /api/city/[cityId]/council route (data fetch)
 *  - /api/local-government/[location] route (honest unavailable signaling)
 *  - docs/COVERAGE.md (public-facing matrix)
 *
 * When a city is added here, update docs/COVERAGE.md in the same change.
 */

import type { LegistarCityConfig } from '@/types/legistar';

export const CITY_CONFIGS: Record<string, LegistarCityConfig> = {
  chicago: {
    id: 'chicago',
    name: 'Chicago',
    state: 'IL',
    apiClient: 'chicago',
    population: 2746388,
  },
  seattle: {
    id: 'seattle',
    name: 'Seattle',
    state: 'WA',
    apiClient: 'seattle',
    population: 749256,
  },
  boston: {
    id: 'boston',
    name: 'Boston',
    state: 'MA',
    apiClient: 'boston',
    population: 675647,
  },
  denver: {
    id: 'denver',
    name: 'Denver',
    state: 'CO',
    apiClient: 'denver',
    population: 715522,
  },
  austin: {
    id: 'austin',
    name: 'Austin',
    state: 'TX',
    apiClient: 'austin',
    population: 978908,
  },
  portland: {
    id: 'portland',
    name: 'Portland',
    state: 'OR',
    apiClient: 'portland',
    population: 641162,
  },
  oakland: {
    id: 'oakland',
    name: 'Oakland',
    state: 'CA',
    apiClient: 'oakland',
    population: 433031,
  },
  minneapolis: {
    id: 'minneapolis',
    name: 'Minneapolis',
    state: 'MN',
    apiClient: 'minneapolis',
    population: 429954,
  },
  philadelphia: {
    id: 'philadelphia',
    name: 'Philadelphia',
    state: 'PA',
    apiClient: 'philacity',
    population: 1603797,
  },
  detroit: {
    id: 'detroit',
    name: 'Detroit',
    state: 'MI',
    apiClient: 'detroitmi',
    population: 639111,
  },
};

export interface PilotCitySummary {
  id: string;
  name: string;
  state: string;
}

export function getPilotCitySummaries(): PilotCitySummary[] {
  return Object.values(CITY_CONFIGS)
    .map(({ id, name, state }) => ({ id, name, state }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
