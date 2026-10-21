/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Process MEDSL 2024 US House Results (district level)
 *
 * Reads MEDSL's "U.S. House 1976–2024" constituency file and writes
 * src/data/election-results-house.ts with one record per 2024 seat, including
 * every named candidate.
 *
 * Why not the precinct files (scripts/process-election-data.ts)? Several of
 * them have no usable district code (MT, RI, parts of NJ) or mix vote modes
 * (CT, DE, OK, UT doubled; IN, LA undercounted), which merged districts and
 * flipped winners. This file is MEDSL's certified district-level release.
 *
 * Usage: npm run process-house-results
 *
 * Input: scripts/data/medsl-history/1976-2024-house.tab (comma-separated
 * despite the extension), downloaded from
 * https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/IG0UN2
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse';

const INPUT_PATH = path.join(
  process.cwd(),
  'scripts',
  'data',
  'medsl-history',
  '1976-2024-house.tab'
);
const OUTPUT_PATH = path.join(process.cwd(), 'src', 'data', 'election-results-house.ts');
const YEAR = '2024';

type PartyCode = 'D' | 'R' | 'L' | 'OTHER';

interface MedslHouseRow {
  year: string;
  state_po: string;
  district: string;
  stage: string;
  runoff: string;
  special: string;
  candidate: string;
  party: string;
  writein: string;
  candidatevotes: string;
  version: string;
}

interface Candidate {
  name: string;
  parties: string[];
  votes: number;
}

interface Race {
  candidates: Map<string, Candidate>;
  /** Votes MEDSL reports without a candidate: scattering, write-in totals, unattributed fusion lines. */
  unattributed: number;
}

/** Rows that are not votes for anyone. */
const NON_VOTES = new Set(['BLANK', 'BLANKS', 'BLANK VOTES', 'VOID', 'OVER VOTES', 'UNDER VOTES']);

function partyCode(party: string): PartyCode {
  if (party.startsWith('DEMOCRAT')) return 'D'; // incl. DEMOCRATIC-FARMER-LABOR, -NONPARTISAN LEAGUE
  if (party.startsWith('REPUBLICAN')) return 'R';
  if (party.startsWith('LIBERTARIAN')) return 'L';
  return 'OTHER';
}

/** A fusion candidate counts toward the first major party on any of their lines. */
function candidatePartyCode(parties: string[]): PartyCode {
  const codes = new Set(parties.map(partyCode));
  for (const code of ['D', 'R', 'L'] as const) {
    if (codes.has(code)) return code;
  }
  return 'OTHER';
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 10000) / 100 : 0;
}

function seatKey(state: string, district: string): string {
  return `${state}-${String(Number.parseInt(district, 10) || 0).padStart(2, '0')}`;
}

/** Adds one MEDSL row's votes to its race. */
function addRow(race: Race, key: string, row: MedslHouseRow): void {
  const votes = Number.parseInt(row.candidatevotes, 10);
  if (Number.isNaN(votes) || votes < 0) {
    throw new Error(`Bad vote count in ${key}: ${row.candidatevotes}`);
  }

  const name = row.candidate.replace(/\\"/g, '"').trim();
  if (NON_VOTES.has(name)) return;

  const hasParty = row.party !== 'NA' && row.party !== '';
  const namedWriteIn = row.writein === 'TRUE' && name !== 'WRITEIN';
  if (!hasParty && !namedWriteIn) {
    // SCATTERING, ALL OTHERS, write-in totals, and CT fusion lines MEDSL
    // left without a candidate. Real votes, but not anyone's we can name.
    race.unattributed += votes;
    return;
  }

  const party = hasParty ? row.party : 'WRITE-IN';
  const existing = race.candidates.get(name);
  if (existing) {
    existing.votes += votes; // NY fusion: one row per ballot line
    if (!existing.parties.includes(party)) existing.parties.push(party);
  } else {
    race.candidates.set(name, { name, parties: [party], votes });
  }
}

async function readRaces(): Promise<{ races: Map<string, Race>; version: string }> {
  const races = new Map<string, Race>();
  const versions = new Set<string>();

  const parser = fs
    .createReadStream(INPUT_PATH)
    .pipe(parse({ columns: true, skip_empty_lines: true, relax_quotes: true }));

  for await (const raw of parser) {
    const row = raw as MedslHouseRow;
    if (row.year !== YEAR) continue;
    if (row.stage !== 'GEN' || row.special !== 'FALSE' || row.runoff === 'TRUE') {
      throw new Error(
        `Unexpected ${row.state_po}-${row.district} row: stage=${row.stage} special=${row.special} runoff=${row.runoff}`
      );
    }
    versions.add(row.version);

    const key = seatKey(row.state_po, row.district);
    let race = races.get(key);
    if (!race) {
      race = { candidates: new Map(), unattributed: 0 };
      races.set(key, race);
    }
    addRow(race, key, row);
  }

  if (versions.size !== 1) throw new Error(`Expected one MEDSL version, got ${[...versions]}`);
  return { races, version: [...versions][0] };
}

function raceLiteral(key: string, race: Race): string {
  const candidates = [...race.candidates.values()].sort((a, b) => b.votes - a.votes);
  if (candidates.length === 0) throw new Error(`${key} has no candidates`);

  // MEDSL records 1 vote for an unopposed candidate whose race was not on the
  // ballot (FL, OK). That is a placeholder, not a tally.
  const notOnBallot = candidates.length === 1 && candidates[0].votes <= 1;
  if (notOnBallot) candidates[0].votes = 0;

  const total = candidates.reduce((sum, c) => sum + c.votes, 0) + race.unattributed;
  let dem = 0;
  let rep = 0;
  for (const c of candidates) {
    const code = candidatePartyCode(c.parties);
    if (code === 'D') dem += c.votes;
    else if (code === 'R') rep += c.votes;
  }

  const first = candidates[0];
  const second = candidates[1];
  const margin =
    second === undefined
      ? 100
      : Math.round((pct(first.votes, total) - pct(second.votes, total)) * 100) / 100;

  const candidateLines = candidates
    .map(
      c =>
        `      { name: ${JSON.stringify(c.name)}, party: ${JSON.stringify(c.parties.join(', '))}, partyCode: '${candidatePartyCode(c.parties)}', votes: ${c.votes}, pct: ${pct(c.votes, total)} },`
    )
    .join('\n');

  return `  '${key}': {
    dem: ${dem},
    rep: ${rep},
    other: ${total - dem - rep},
    total: ${total},
    winner: '${candidatePartyCode(first.parties)}',
    margin: ${margin},
    demPct: ${pct(dem, total)},
    repPct: ${pct(rep, total)},
    candidates: [
${candidateLines}
    ],
  },`;
}

async function main(): Promise<void> {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(
      `Missing ${INPUT_PATH}. Download it from the Dataverse link in this file's header.`
    );
  }

  const { races, version } = await readRaces();
  const keys = [...races.keys()].sort((a, b) => a.localeCompare(b));
  const entries = keys.map(key => raceLiteral(key, races.get(key)!)).join('\n');
  const generatedAt = new Date().toISOString();

  const content = `/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * 2024 House Election Results
 *
 * US House race results keyed by 'STATE-DD' (e.g., 'PA-07'), with every named
 * candidate. Generated by scripts/process-house-results-2024.ts — do not edit.
 * Generated: ${generatedAt}
 * Source: MIT Election Data and Science Lab (MEDSL), U.S. House 1976–2024
 * DOI: 10.7910/DVN/IG0UN2 (version ${version})
 */

import type { ElectionMetadata, RaceResult } from '@/types/elections';

export const HOUSE_RESULTS_2024: Record<string, RaceResult> = {
${entries}
};

export const HOUSE_2024_METADATA: ElectionMetadata = {
  year: 2024,
  source: 'MIT Election Data and Science Lab (MEDSL), U.S. House 1976–2024',
  doi: '10.7910/DVN/IG0UN2',
  generatedAt: '${generatedAt}',
  coveredStates: ${JSON.stringify([...new Set(keys.map(k => k.slice(0, 2)))])},
  missingStates: [],
};
`;

  fs.writeFileSync(OUTPUT_PATH, content);
  console.log(`${OUTPUT_PATH} — ${keys.length} seats (MEDSL version ${version})`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
