/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Voter-registration corpus builder (2026 general election).
 *
 * Why a corpus: there is NO maintained machine-readable source for
 * registration deadlines. vote.gov's data repos froze in Aug 2024 (links
 * only, no deadlines) and state SOS pages sit behind WAFs and change
 * shape constantly. So we seed links from the frozen vote.gov
 * states.json and hand-verify every deadline against official state
 * sources, recording the citation per row. This script only MERGES the
 * seed with verification result files — the verification itself is
 * human/agent work, captured as JSON.
 *
 * Usage:
 *   npx tsx scripts/build-voter-registration-2026.ts \
 *     --seed <path/to/vote-gov-states.json> \
 *     --results <dir with reg-result-group*.json> \
 *     --verified-at 2026-08-08
 *
 * Refuses to write unless all 51 jurisdictions (50 states + DC) are
 * present, so a partial merge can never be committed.
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const STATES_AND_DC = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'DC',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
];

const OUT_PATH = 'src/data/voter-registration-2026.ts';

interface SeedRow {
  state_name: string;
  registration_type?: string;
  hp_link?: string;
  registration_link?: string;
  more_info_link?: string;
  confirm_registration_link?: string;
}

interface ResultRow {
  sameDayRegistration: boolean;
  sameDayNotes: string | null;
  onlineRegistrationAvailable: boolean;
  onlineDeadline: string | null;
  mailDeadline: string | null;
  mailDeadlineType: 'postmarked' | 'received' | null;
  inPersonDeadline: string | null;
  rule: string;
  deadlineSource: string;
  sourceKind: 'state-official' | 'federal-official' | 'unverified';
  linkChecks: Record<string, string>;
  notes: string | null;
}

function arg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

// Same-day scope cannot be derived from deadline shape alone: NC's
// same-day ends with early voting while WI's clerk cutoff coexists with
// registration at the polls on Election Day. Any same-day state whose
// in-person deadline is NOT Election Day must be classified here by hand
// (from the row's sameDayNotes + cited source) or the build fails.
const SAME_DAY_EARLY_VOTING_ONLY = new Set(['NC']);
// CA: conditional registration "during the 14 days prior to and including
// Election Day". VA: same-day registration with a provisional ballot
// through Election Day. WI: registration at the polls on Election Day.
const SAME_DAY_POLLS_DESPITE_EARLIER_CUTOFF = new Set(['CA', 'VA', 'WI']);

function sameDayScope(
  state: string,
  r: ResultRow
): 'through-election-day' | 'early-voting-only' | null {
  if (!r.sameDayRegistration) return null;
  if (r.inPersonDeadline === '2026-11-03') return 'through-election-day';
  if (SAME_DAY_EARLY_VOTING_ONLY.has(state)) return 'early-voting-only';
  if (SAME_DAY_POLLS_DESPITE_EARLIER_CUTOFF.has(state)) return 'through-election-day';
  console.error(
    `${state}: same-day registration with pre-Election-Day in-person deadline ` +
      `(${r.inPersonDeadline}) — classify it in the same-day scope sets before building.`
  );
  process.exit(1);
}

function keepLink(url: string | undefined, check: string | undefined): string | null {
  if (!url) return null;
  // Dead links are dropped; WAF-blocked links usually work in a real
  // browser, and redirects still land the citizen somewhere official.
  if (check === 'dead') return null;
  return url;
}

const seedPath = arg('--seed');
const resultsDir = arg('--results');
const verifiedAt = arg('--verified-at');
if (!seedPath || !resultsDir || !verifiedAt) {
  console.error('Usage: --seed <states.json> --results <dir> --verified-at YYYY-MM-DD');
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(verifiedAt)) {
  console.error(`--verified-at must be YYYY-MM-DD, got: ${verifiedAt}`);
  process.exit(1);
}

const seed: Record<string, SeedRow> = JSON.parse(readFileSync(seedPath, 'utf-8'));
const results: Record<string, ResultRow> = {};
for (const file of readdirSync(resultsDir).filter(f => /^reg-result-group\d+\.json$/.test(f))) {
  Object.assign(results, JSON.parse(readFileSync(join(resultsDir, file), 'utf-8')));
}

const missing = STATES_AND_DC.filter(s => !results[s] || !seed[s.toLowerCase()]);
if (missing.length > 0) {
  console.error(`Refusing to write a partial corpus. Missing: ${missing.join(', ')}`);
  process.exit(1);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const rows: string[] = [];
const unverified: string[] = [];
for (const state of [...STATES_AND_DC].sort()) {
  const s = seed[state.toLowerCase()];
  const r = results[state];
  for (const [field, value] of Object.entries({
    onlineDeadline: r.onlineDeadline,
    mailDeadline: r.mailDeadline,
    inPersonDeadline: r.inPersonDeadline,
  })) {
    if (value !== null && !ISO_DATE.test(value)) {
      console.error(`${state}: ${field} is not an ISO date: ${value}`);
      process.exit(1);
    }
  }
  if (r.sourceKind === 'unverified') unverified.push(state);
  const row = {
    state,
    stateName: s.state_name,
    registrationRequired: state !== 'ND',
    sameDayRegistration: r.sameDayRegistration,
    sameDayScope: sameDayScope(state, r),
    sameDayNotes: r.sameDayNotes,
    onlineRegistrationAvailable: r.onlineRegistrationAvailable,
    // HI's official page says "register online at any time" — the only
    // state whose null online deadline means "none" rather than
    // "unverified".
    onlineNoDeadline: state === 'HI',
    onlineDeadline: r.onlineDeadline,
    mailDeadline: r.mailDeadline,
    mailDeadlineType: r.mailDeadlineType,
    inPersonDeadline: r.inPersonDeadline,
    rule: r.rule,
    registrationUrl: keepLink(s.registration_link, r.linkChecks?.registration_link),
    checkRegistrationUrl: keepLink(
      s.confirm_registration_link,
      r.linkChecks?.confirm_registration_link
    ),
    infoUrl: keepLink(s.more_info_link, r.linkChecks?.more_info_link),
    electionOfficeUrl: keepLink(s.hp_link, r.linkChecks?.hp_link),
    deadlineSource: r.sourceKind === 'unverified' ? null : r.deadlineSource,
    sourceKind: r.sourceKind,
    verifiedAt: r.sourceKind === 'unverified' ? null : verifiedAt,
    notes: r.notes,
  };
  rows.push(`  ${state}: ${JSON.stringify(row, null, 2).split('\n').join('\n  ')},`);
}

const header = readFileSync(OUT_PATH, 'utf-8').split(
  'export const VOTER_REGISTRATION_2026_META'
)[0];
const meta = `export const VOTER_REGISTRATION_2026_META = {
  electionDay: '2026-11-03',
  jurisdictions: ${STATES_AND_DC.length},
  seedSource:
    'vote.gov states.json (usagov/vote-gov, frozen Aug 2024) — registration links only',
  methodology:
    'Links seeded from the frozen vote.gov dataset, then every link checked and every ' +
    'deadline verified against the official state election-office page cited in each ' +
    'row (deadlineSource). Rows that could not be verified against an official source ' +
    'carry null deadlines and sourceKind "unverified" — the UI degrades to the official ' +
    'link, never a guessed date. Dates are for the Nov 3, 2026 general election.',
  verifiedAt: '${verifiedAt}' as string | null,
} as const;

export const VOTER_REGISTRATION_2026: Record<string, StateVoterRegistration2026> = {
${rows.join('\n')}
};
`;

writeFileSync(OUT_PATH, header + meta);
console.log(`Wrote ${OUT_PATH}: ${STATES_AND_DC.length} jurisdictions.`);
if (unverified.length > 0) {
  console.log(`UNVERIFIED (null deadlines, needs follow-up): ${unverified.join(', ')}`);
}
