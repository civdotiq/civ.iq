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
 *
 * Removed 2026-09-17: chicago, austin, portland, minneapolis, philacity.
 * Legistar's web API answers HTTP 500 for those clients
 * ("LegistarConnectionString setting is not set up in InSite"), so the
 * council route had been returning success:true with an empty roster.
 * Re-add a city only after `webapi.legistar.com/v1/<client>/OfficeRecords`
 * returns a roster.
 */

import type { LegistarCityConfig } from '@/types/legistar';

export const CITY_CONFIGS: Record<string, LegistarCityConfig> = {
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
  oakland: {
    id: 'oakland',
    name: 'Oakland',
    state: 'CA',
    apiClient: 'oakland',
    population: 433031,
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
