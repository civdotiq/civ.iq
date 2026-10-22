/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Process MEDSL 2024 Statewide Results (President, Senate, Governor)
 *
 * Writes src/data/election-results-statewide.ts with one record per 2024
 * statewide race, including every named candidate.
 *
 * - President: MEDSL "U.S. President 1976–2024" (state level, DOI 10.7910/DVN/42MVDX)
 * - Senate: MEDSL "U.S. Senate statewide 1976–2024" (DOI 10.7910/DVN/PEJ5QU).
 *   Special elections (CA, NE) are keyed 'STATE-SENATE-SPECIAL'.
 * - Governor: MEDSL has no state-level governor file, so these are summed from
 *   its precinct files (DOI 10.7910/DVN/NYTPDU) and checked against each
 *   state's certified results (CERTIFIED_GOVERNOR_2024). A state whose sum does
 *   not match is left out, so it reads "Data unavailable".
 *
 * Why not scripts/process-election-data.ts? Its precinct aggregation counted
 * summary rows ("BALLOTS CAST", "TOTAL VOTES CAST") as candidates, merged
 * Lieutenant Governor into Governor, matched Nebraska's community-college
 * "Board of Governors" races as a governor race, merged NE's two Senate races,
 * and double-counted vote modes in several states.
 *
 * Usage: npm run process-statewide-results
 *
 * Inputs (gitignored, under scripts/data/):
 *   medsl-history/1976-2024-president.csv
 *     https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/42MVDX
 *   medsl-history/1976-2024-senate-state.csv (the "original format" download)
 *     https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/PEJ5QU
 *   medsl-2024/{state}24.csv (precinct files, from npm run process-election-data)
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse';

const DATA_DIR = path.join(process.cwd(), 'scripts', 'data');
const PRESIDENT_PATH = path.join(DATA_DIR, 'medsl-history', '1976-2024-president.csv');
const SENATE_PATH = path.join(DATA_DIR, 'medsl-history', '1976-2024-senate-state.csv');
const PRECINCT_DIR = path.join(DATA_DIR, 'medsl-2024');
const OUTPUT_PATH = path.join(process.cwd(), 'src', 'data', 'election-results-statewide.ts');
const YEAR = '2024';

type PartyCode = 'D' | 'R' | 'L' | 'OTHER';

interface Candidate {
  name: string;
  parties: string[];
  codes: PartyCode[];
  votes: number;
}

interface Race {
  candidates: Map<string, Candidate>;
  /** Real votes MEDSL reports without a candidate: scattering, unnamed write-ins, "None of these candidates". */
  unattributed: number;
}

/**
 * Certified 2024 governor results: the top two candidates' votes, read off
 * each state's official results. Each precinct sum must be within
 * GOVERNOR_TOLERANCE of these. IN and ND precinct files undercount (by 28% and
 * 15%) and WA's by up to 0.25%, so those three are left out.
 */
const CERTIFIED_GOVERNOR_2024: Record<string, { votes: [number, number]; source: string }> = {
  DE: { votes: [279585, 219050], source: 'https://elections.delaware.gov/reports/GE2024.html' },
  IN: {
    votes: [1566081, 1183741],
    source: 'https://enr.indianavoters.in.gov/archive/2024General/index.html',
  },
  MO: {
    votes: [1750802, 1146173],
    source: 'https://sos.mo.gov/CMSImages/ElectionResultsStatistics/2024GeneralElection.pdf',
  },
  MT: {
    votes: [354569, 232644],
    source:
      'https://sosmt.gov/docs/31/post-election/66775/2024-general-election-report-state-canvass',
  },
  NH: { votes: [436122, 360149], source: 'https://www.sos.nh.gov/2024-general-election-results' },
  NC: { votes: [3069496, 2241309], source: 'https://er.ncsbe.gov/enr/20241105/data/results_0.txt' },
  ND: {
    votes: [247056, 94043],
    source: 'https://results.sos.nd.gov/ResultsSW.aspx?text=All&type=SW&map=CTY',
  },
  UT: {
    votes: [781431, 420514],
    source:
      'https://vote.utah.gov/wp-content/uploads/2025/02/2024-General-Election-Statewide-Canvass-2.pdf',
  },
  VT: {
    votes: [266439, 79217],
    source:
      'https://outside.vermont.gov/dept/sos/Elections_Division/election_info_resources/elections_results_data/2024_general_election_official_report_canvassing_committee_united_states_vermont_statewide_offices.pdf',
  },
  WA: {
    votes: [2143368, 1709818],
    source: 'https://results.vote.wa.gov/results/20241105/governor.html',
  },
  WV: {
    votes: [459300, 233976],
    source: 'https://results.enr.clarityelections.com/WV/122766/web.345435/#/summary',
  },
};

/**
 * Largest relative gap allowed between a precinct sum and the certified
 * figure. MEDSL's state-level President and Senate files differ from the House
 * Clerk's statistics by up to this much (ME, NY, VA), never enough to move a
 * margin by a tenth of a point.
 */
const GOVERNOR_TOLERANCE = 0.001;

/** Rows that are not votes for anyone, or are summary rows. */
const NON_VOTES = new Set([
  'BLANK',
  'BLANKS',
  'BLANK VOTES',
  'VOID',
  'OVERVOTES',
  'OVER VOTES',
  'UNDERVOTES',
  'UNDER VOTES',
  'BALLOTS CAST',
  'TOTAL VOTES CAST',
  'SPOILED', // VT: over votes
  'INVALID', // UT: invalid write-ins
]);

/** Rows that are real votes but name no candidate. */
const UNNAMED = new Set(['WRITE-IN', 'WRITEIN', 'OTHER', 'SCATTERING', 'ALL OTHERS']);

function partyCode(simplified: string): PartyCode {
  const p = simplified.toUpperCase();
  if (p.startsWith('DEMOCRAT')) return 'D';
  if (p.startsWith('REPUBLICAN')) return 'R';
  if (p.startsWith('LIBERTARIAN')) return 'L';
  return 'OTHER';
}

/** A fusion candidate counts toward the first major party on any of their lines. */
function candidatePartyCode(codes: PartyCode[]): PartyCode {
  for (const code of ['D', 'R', 'L'] as const) {
    if (codes.includes(code)) return code;
  }
  return 'OTHER';
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 10000) / 100 : 0;
}

function newRace(): Race {
  return { candidates: new Map(), unattributed: 0 };
}

/** Adds one row's votes to its race. */
function addVotes(
  race: Race,
  key: string,
  row: { candidate: string; detailed: string; simplified: string; votes: string }
): void {
  const votes = Math.round(Number(row.votes));
  if (!Number.isFinite(votes) || votes < 0) {
    throw new Error(`Bad vote count in ${key}: ${row.votes}`);
  }

  const name = row.candidate.replace(/\\"/g, '"').trim().toUpperCase();
  if (NON_VOTES.has(name)) return;
  if (name === '' || UNNAMED.has(name)) {
    race.unattributed += votes;
    return;
  }

  const party = row.detailed.trim() || row.simplified.trim() || 'NONE';
  const code = partyCode(row.simplified);
  const existing = race.candidates.get(name);
  if (existing) {
    existing.votes += votes; // fusion: one row per ballot line
    if (!existing.parties.includes(party)) existing.parties.push(party);
    if (!existing.codes.includes(code)) existing.codes.push(code);
  } else {
    race.candidates.set(name, { name, parties: [party], codes: [code], votes });
  }
}

async function* readCsv(file: string): AsyncGenerator<Record<string, string>> {
  const parser = fs
    .createReadStream(file)
    .pipe(parse({ columns: true, skip_empty_lines: true, relax_quotes: true }));
  for await (const row of parser) yield row as Record<string, string>;
}

function getRace(races: Map<string, Race>, key: string): Race {
  let race = races.get(key);
  if (!race) {
    race = newRace();
    races.set(key, race);
  }
  return race;
}

async function readPresident(races: Map<string, Race>): Promise<string> {
  const versions = new Set<string>();
  for await (const row of readCsv(PRESIDENT_PATH)) {
    if (row.year !== YEAR) continue;
    versions.add(row.version);
    addVotes(getRace(races, `${row.state_po}-PRESIDENT`), `${row.state_po}-PRESIDENT`, {
      candidate: row.candidate,
      detailed: row.party_detailed,
      simplified: row.party_simplified,
      votes: row.candidatevotes,
    });
  }
  return [...versions].join(', ');
}

async function readSenate(races: Map<string, Race>): Promise<string> {
  const versions = new Set<string>();
  for await (const row of readCsv(SENATE_PATH)) {
    if (row.year !== YEAR) continue;
    if (row.stage.toUpperCase() !== 'GEN' || row.mode.toUpperCase() !== 'TOTAL') {
      throw new Error(`Unexpected ${row.state_po} Senate row: stage=${row.stage} mode=${row.mode}`);
    }
    versions.add(row.version);
    const key = `${row.state_po}-SENATE${row.special.toUpperCase() === 'TRUE' ? '-SPECIAL' : ''}`;
    addVotes(getRace(races, key), key, {
      candidate: row.candidate,
      detailed: row.party_detailed,
      simplified: row.party_simplified,
      votes: row.candidatevotes,
    });
  }
  return [...versions].join(', ');
}

/** Governor offices as each state's precinct file names them. */
const GOVERNOR_OFFICES = new Set(['GOVERNOR', 'GOVERNOR AND LT. GOVERNOR']);

async function readGovernor(state: string): Promise<Race> {
  const file = path.join(PRECINCT_DIR, `${state.toLowerCase()}24.csv`);
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}. Run npm run process-election-data.`);

  const rows: Record<string, string>[] = [];
  for await (const row of readCsv(file)) {
    if (!GOVERNOR_OFFICES.has(row.office.toUpperCase())) continue;
    if (row.stage.toUpperCase() !== 'GEN' || row.special.toUpperCase() === 'TRUE') continue;
    rows.push(row);
  }
  if (rows.length === 0) throw new Error(`${state} precinct file has no governor rows`);

  // Some files give each vote mode plus a TOTAL row; others give modes only.
  const hasTotal = rows.some(r => r.mode.toUpperCase() === 'TOTAL');
  const race = newRace();
  for (const row of rows) {
    if (hasTotal && row.mode.toUpperCase() !== 'TOTAL') continue;
    if (row.votes === '' || row.votes === 'NA') continue;
    // Precinct files sometimes simplify a nominee's party to OTHER (VT's
    // DEMOCRAT/PROGRESSIVE nominee), so fall back to the full party name.
    // Only here: the state-level files list write-ins by self-declared party.
    const simplified =
      partyCode(row.party_simplified) === 'OTHER' ? row.party_detailed : row.party_simplified;
    addVotes(race, `${state}-GOVERNOR`, {
      candidate: row.candidate,
      detailed: row.party_detailed,
      simplified,
      votes: row.votes,
    });
  }
  return race;
}

function sortedCandidates(race: Race): Candidate[] {
  return [...race.candidates.values()].sort((a, b) => b.votes - a.votes);
}

function raceLiteral(key: string, race: Race): string {
  const candidates = sortedCandidates(race);
  if (candidates.length === 0) throw new Error(`${key} has no candidates`);

  const total = candidates.reduce((sum, c) => sum + c.votes, 0) + race.unattributed;
  let dem = 0;
  let rep = 0;
  for (const c of candidates) {
    const code = candidatePartyCode(c.codes);
    if (code === 'D') dem += c.votes;
    else if (code === 'R') rep += c.votes;
  }

  const [first, second] = candidates;
  const margin =
    second === undefined
      ? 100
      : Math.round((pct(first.votes, total) - pct(second.votes, total)) * 100) / 100;

  const candidateLines = candidates
    .map(
      c =>
        `      { name: ${JSON.stringify(c.name)}, party: ${JSON.stringify(c.parties.join(', '))}, partyCode: '${candidatePartyCode(c.codes)}', votes: ${c.votes}, pct: ${pct(c.votes, total)} },`
    )
    .join('\n');

  return `  '${key}': {
    dem: ${dem},
    rep: ${rep},
    other: ${total - dem - rep},
    total: ${total},
    winner: '${candidatePartyCode(first.codes)}',
    margin: ${margin},
    demPct: ${pct(dem, total)},
    repPct: ${pct(rep, total)},
    candidates: [
${candidateLines}
    ],
  },`;
}

async function main(): Promise<void> {
  for (const file of [PRESIDENT_PATH, SENATE_PATH]) {
    if (!fs.existsSync(file)) {
      throw new Error(
        `Missing ${file}. Download it from the Dataverse link in this file's header.`
      );
    }
  }

  const races = new Map<string, Race>();
  const presidentVersion = await readPresident(races);
  const senateVersion = await readSenate(races);

  const governorStates: string[] = [];
  const governorUnavailable: string[] = [];
  for (const [state, certified] of Object.entries(CERTIFIED_GOVERNOR_2024)) {
    const race = await readGovernor(state);
    const top = sortedCandidates(race)
      .slice(0, 2)
      .map(c => c.votes);
    const within = certified.votes.every(
      (v, i) => Math.abs((top[i] ?? 0) - v) <= v * GOVERNOR_TOLERANCE
    );
    if (!within) {
      console.warn(
        `  ${state}-GOVERNOR skipped: precinct sum ${top.join('/')} != certified ${certified.votes.join('/')} (${certified.source})`
      );
      governorUnavailable.push(state);
      continue;
    }
    races.set(`${state}-GOVERNOR`, race);
    governorStates.push(state);
  }

  const keys = [...races.keys()].sort((a, b) => a.localeCompare(b));
  const entries = keys.map(key => raceLiteral(key, races.get(key)!)).join('\n');
  const generatedAt = new Date().toISOString();

  const content = `/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * 2024 Statewide Election Results
 *
 * President, Senate, and Governor results keyed by 'STATE-OFFICE' (e.g.,
 * 'GA-SENATE'; special Senate elections are 'NE-SENATE-SPECIAL'), with every
 * named candidate. Generated by scripts/process-statewide-results-2024.ts — do
 * not edit.
 * Generated: ${generatedAt}
 * Sources: MIT Election Data and Science Lab (MEDSL)
 *   President: U.S. President 1976–2024, DOI 10.7910/DVN/42MVDX (version ${presidentVersion})
 *   Senate: U.S. Senate statewide 1976–2024, DOI 10.7910/DVN/PEJ5QU (version ${senateVersion})
 *   Governor: precinct returns, DOI 10.7910/DVN/NYTPDU, checked against state certified canvasses
 */

import type { RaceResult } from '@/types/elections';

export const STATEWIDE_RESULTS_2024: Record<string, RaceResult> = {
${entries}
};

/** Where each office's results come from. A missing key means no such 2024 race, except the states in governor.unavailable. */
export const STATEWIDE_2024_SOURCES = {
  president: { source: 'MEDSL, U.S. President 1976–2024', doi: '10.7910/DVN/42MVDX' },
  senate: { source: 'MEDSL, U.S. Senate statewide 1976–2024', doi: '10.7910/DVN/PEJ5QU' },
  governor: {
    source: 'MEDSL, Precinct-Level Returns 2024, checked against state certified results',
    doi: '10.7910/DVN/NYTPDU',
    states: ${JSON.stringify(governorStates.sort((a, b) => a.localeCompare(b)))},
    /** Held a 2024 governor race, but the precinct sum did not match the certified result. */
    unavailable: ${JSON.stringify(governorUnavailable.sort((a, b) => a.localeCompare(b)))},
  },
  generatedAt: '${generatedAt}',
} as const;
`;

  fs.writeFileSync(OUTPUT_PATH, content);
  const count = (suffix: string): number => keys.filter(k => k.endsWith(suffix)).length;
  console.log(
    `${OUTPUT_PATH} — ${count('-PRESIDENT')} president, ${count('-SENATE') + count('-SENATE-SPECIAL')} senate, ${count('-GOVERNOR')} governor`
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
