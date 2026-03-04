/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * 2024 Election Results Dataset Generator
 *
 * Flattens all four election data files into CSV rows for bulk download
 * on the /open page. Static data — no network calls needed.
 *
 * Source: MIT Election Data and Science Lab (MEDSL)
 */

import { HOUSE_RESULTS_2024 } from '@/data/election-results-house';
import { STATEWIDE_RESULTS_2024 } from '@/data/election-results-statewide';
import { STATE_LEG_RESULTS_2024 } from '@/data/election-results-state-leg';
import { ELECTION_2024_METADATA } from '@/data/election-results-metadata';
import type { DatasetResult, DatasetColumn } from '@/types/dataset';
import type { RaceResult } from '@/types/elections';

const COLUMNS: DatasetColumn[] = [
  {
    key: 'districtId',
    label: 'District ID',
    description: 'Race identifier (e.g., PA-07, GA-SENATE)',
    type: 'string',
  },
  {
    key: 'office',
    label: 'Office',
    description:
      'Office type: US_HOUSE, US_PRESIDENT, US_SENATE, GOVERNOR, STATE_SENATE, STATE_HOUSE',
    type: 'string',
  },
  { key: 'dem', label: 'Democratic Votes', description: 'Total Democratic votes', type: 'number' },
  { key: 'rep', label: 'Republican Votes', description: 'Total Republican votes', type: 'number' },
  { key: 'other', label: 'Other Votes', description: 'Total other party votes', type: 'number' },
  { key: 'total', label: 'Total Votes', description: 'Total votes cast', type: 'number' },
  { key: 'winner', label: 'Winner', description: 'Winning party (D, R, OTHER)', type: 'string' },
  {
    key: 'margin',
    label: 'Margin',
    description: 'Victory margin in percentage points',
    type: 'number',
  },
  {
    key: 'demPct',
    label: 'Dem %',
    description: 'Democratic vote share percentage',
    type: 'number',
  },
  {
    key: 'repPct',
    label: 'Rep %',
    description: 'Republican vote share percentage',
    type: 'number',
  },
];

interface ElectionRow {
  districtId: string;
  office: string;
  dem: number;
  rep: number;
  other: number;
  total: number;
  winner: string;
  margin: number;
  demPct: number;
  repPct: number;
}

function classifyOffice(key: string): string {
  if (key.includes('-PRESIDENT')) return 'US_PRESIDENT';
  if (key.includes('-SENATE')) return 'US_SENATE';
  if (key.includes('-GOVERNOR')) return 'GOVERNOR';
  if (key.includes('-upper-')) return 'STATE_SENATE';
  if (key.includes('-lower-')) return 'STATE_HOUSE';
  return 'US_HOUSE';
}

function toRow(key: string, result: RaceResult): ElectionRow {
  return {
    districtId: key,
    office: classifyOffice(key),
    dem: result.dem,
    rep: result.rep,
    other: result.other,
    total: result.total,
    winner: result.winner,
    margin: result.margin,
    demPct: result.demPct,
    repPct: result.repPct,
  };
}

export async function generateElectionResults2024(): Promise<DatasetResult | null> {
  const data: ElectionRow[] = [];

  // House results
  for (const [key, result] of Object.entries(HOUSE_RESULTS_2024)) {
    data.push(toRow(key, result));
  }

  // Statewide results
  for (const [key, result] of Object.entries(STATEWIDE_RESULTS_2024)) {
    data.push(toRow(key, result));
  }

  // State legislature results
  for (const [key, result] of Object.entries(STATE_LEG_RESULTS_2024)) {
    data.push(toRow(key, result));
  }

  if (data.length === 0) {
    return null;
  }

  // Sort by district ID for consistent output
  data.sort((a, b) => a.districtId.localeCompare(b.districtId));

  return {
    metadata: {
      name: '2024 Election Results',
      slug: 'election-results-2024',
      description: `Precinct-aggregated election results for 2024 covering ${ELECTION_2024_METADATA.coveredStates.length} states. Includes US House, President, Senate, Governor, and state legislature races.`,
      source: ELECTION_2024_METADATA.source,
      sourceUrl: 'https://github.com/MEDSL/2024-elections-official',
      generated: new Date().toISOString(),
      recordCount: data.length,
      license: 'CC BY 4.0',
      columns: COLUMNS,
    },
    data,
  };
}
