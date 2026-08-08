/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Build the 2026 federal race-skeleton corpus (src/data/elections-2026-races.ts).
 * See PLAN-elections-2026-08.md, Phase 1.
 *
 * Why a corpus: the set of 2026 federal races (every House seat + the ~35
 * Senate seats up, including specials) and each state's primary/general
 * dates are fixed, small (~475 rows), and needed by statically-rendered
 * surfaces (race index page, sitemap) where live FEC calls would burn the
 * shared 60/min key budget on data that never changes mid-cycle.
 *
 * Sources (both verified live 2026-08-07):
 *   /elections/search/?cycle=2026   → race enumeration (incl. Senate specials)
 *   /election-dates/?election_year=2026 → per-state primary/general dates
 *
 * Candidate data is NOT in this corpus — it changes weekly and stays live
 * via /api/elections/[id].
 *
 * Usage: FEC_API_KEY=... npx tsx scripts/sync-races-2026.ts
 */

import { writeFileSync } from 'node:fs';
import { getAllStateCodes } from '../src/lib/data/us-states';

const FEC_API_BASE = 'https://api.open.fec.gov/v1';
const OUT_PATH = 'src/data/elections-2026-races.ts';
const CYCLE = 2026;

interface FecElectionRow {
  cycle: number;
  district: string | null;
  office: 'S' | 'H' | 'P';
  state: string;
}

interface FecDateRow {
  election_date: string | null;
  election_district: string | null;
  election_state: string | null;
  election_type_id: string | null;
  office_sought: string | null;
}

async function fecPaged<T>(path: string, params: Record<string, string>, apiKey: string) {
  const rows: T[] = [];
  let page = 1;
  for (;;) {
    const search = new URLSearchParams({ ...params, per_page: '100', page: String(page) });
    search.set('api_key', apiKey);
    const res = await fetch(`${FEC_API_BASE}${path}?${search.toString()}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'CivicIntelHub/1.0' },
    });
    if (!res.ok) throw new Error(`FEC ${path} page ${page}: ${res.status}`);
    const json = (await res.json()) as { results?: T[]; pagination?: { pages?: number } };
    rows.push(...(json.results ?? []));
    const pages = json.pagination?.pages ?? 1;
    if (page >= pages) break;
    page += 1;
  }
  return rows;
}

function toRaceId(row: FecElectionRow): string {
  if (row.office === 'S') return `${CYCLE}-US_SENATE-${row.state}`;
  const district = !row.district || row.district === '00' ? 'AL' : row.district;
  return `${CYCLE}-US_HOUSE-${row.state}-${district}`;
}

async function main() {
  const apiKey = process.env.FEC_API_KEY;
  if (!apiKey) {
    console.error('FEC_API_KEY is required (read it from .env.local).');
    process.exit(1);
  }

  // Per-state fetch: the national /elections/search enumeration paginates
  // with an unstable sort — verified 2026-08-08 to duplicate 11 rows at page
  // boundaries and silently drop 11 others. One state = one page, no ambiguity.
  console.log('Fetching /elections/search per state …');
  const electionRows: FecElectionRow[] = [];
  for (const state of getAllStateCodes()) {
    const rows = await fecPaged<FecElectionRow>(
      '/elections/search/',
      { cycle: String(CYCLE), state },
      apiKey
    );
    electionRows.push(...rows.filter(r => r.state === state));
    await new Promise(resolve => setTimeout(resolve, 1100)); // stay under 60/min
  }
  const federal = electionRows.filter(r => r.office === 'S' || r.office === 'H');

  const races = federal
    .map(r => ({
      state: r.state,
      office: r.office as 'S' | 'H',
      district: r.office === 'S' ? null : !r.district || r.district === '00' ? 'AL' : r.district,
      raceId: toRaceId(r),
    }))
    .sort((a, b) =>
      a.state === b.state
        ? a.office === b.office
          ? (a.district ?? '').localeCompare(b.district ?? '')
          : a.office === 'S'
            ? -1
            : 1
        : a.state.localeCompare(b.state)
    );

  // FEC lists a district twice when it has both a special and a regular 2026
  // election (11 House seats as of 2026-08). Same seat → one race page.
  const seen = new Set<string>();
  const deduped = races.filter(r => {
    if (seen.has(r.raceId)) return false;
    seen.add(r.raceId);
    return true;
  });
  if (deduped.length !== races.length) {
    console.log(`Deduplicated ${races.length - deduped.length} special+regular double listings.`);
  }
  races.length = 0;
  races.push(...deduped);

  console.log('Fetching /election-dates …');
  const dateRows = await fecPaged<FecDateRow>(
    '/election-dates/',
    { election_year: String(CYCLE) },
    apiKey
  );

  // Statewide H/S rows only — district-specific special-election rows keep
  // their own dates and are out of scope for the per-state summary.
  const dates: Record<string, { generalDate: string | null; primaryDate: string | null }> = {};
  for (const row of dateRows) {
    const state = (row.election_state ?? '').trim().toUpperCase();
    const office = (row.office_sought ?? '').trim().toUpperCase();
    const district = (row.election_district ?? '').trim();
    const type = (row.election_type_id ?? '').trim().toUpperCase();
    const date = row.election_date ?? null;
    if (!state || !date) continue;
    if (office !== 'H' && office !== 'S') continue;
    if (district !== '') continue;
    const entry = (dates[state] ??= { generalDate: null, primaryDate: null });
    if (type === 'G' && (entry.generalDate === null || date < entry.generalDate)) {
      entry.generalDate = date;
    }
    if (type === 'P' && (entry.primaryDate === null || date < entry.primaryDate)) {
      entry.primaryDate = date;
    }
  }

  const generatedAt = new Date().toISOString();
  const senate = races.filter(r => r.office === 'S').length;
  const house = races.filter(r => r.office === 'H').length;

  const out = `/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * 2026 federal race skeleton — GENERATED by scripts/sync-races-2026.ts.
 * Do not edit by hand; re-run the script to refresh.
 *
 * Source: FEC /elections/search/?cycle=2026 and /election-dates/?election_year=2026.
 * Generated: ${generatedAt} (${senate} Senate + ${house} House races).
 * Candidate data is deliberately NOT here — it stays live via /api/elections/[id].
 */

export interface Race2026 {
  state: string;
  office: 'S' | 'H';
  /** House district ('01'…, 'AL' for at-large/delegate seats); null for Senate. */
  district: string | null;
  raceId: string;
}

export interface StateElectionDates2026 {
  generalDate: string | null;
  primaryDate: string | null;
}

export const RACES_2026_METADATA = {
  cycle: ${CYCLE},
  source: 'FEC /elections/search + /election-dates',
  generatedAt: '${generatedAt}',
  senateRaces: ${senate},
  houseRaces: ${house},
} as const;

export const RACES_2026: Race2026[] = ${JSON.stringify(races, null, 2)};

export const ELECTION_DATES_2026: Record<string, StateElectionDates2026> = ${JSON.stringify(
    dates,
    null,
    2
  )};
`;

  writeFileSync(OUT_PATH, out);
  console.log(
    `Wrote ${OUT_PATH}: ${senate} Senate + ${house} House races, dates for ${Object.keys(dates).length} states.`
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
