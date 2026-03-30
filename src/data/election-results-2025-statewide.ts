/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * 2025 Statewide Election Results
 *
 * Only NJ and VA held statewide elections in 2025 (odd-year states).
 * Generated: 2026-03-30
 * Sources: Ballotpedia (citing official state certified results)
 */

import type { RaceResult } from '@/types/elections';

export const STATEWIDE_RESULTS_2025: Record<string, RaceResult> = {
  'NJ-GOVERNOR': {
    dem: 1896610,
    rep: 1417705,
    other: 20044, // Libertarian (11880) + Socialist Workers (8164)
    total: 3334359,
    winner: 'D',
    margin: 14.37,
    demPct: 56.89,
    repPct: 42.52,
  },
  'VA-GOVERNOR': {
    dem: 1976857,
    rep: 1449586,
    other: 6897,
    total: 3433340,
    winner: 'D',
    margin: 15.36,
    demPct: 57.58,
    repPct: 42.22,
  },
};

export const ELECTION_2025_METADATA = {
  year: 2025,
  source: 'Ballotpedia (official state certified results)',
  generatedAt: '2026-03-30T00:00:00Z',
  coveredStates: ['NJ', 'VA'],
  // MS and LA are odd-year states but their next gubernatorial elections are 2027
  missingStates: ['MS', 'LA'],
};
