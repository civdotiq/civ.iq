/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Build the per-state roll-call corpus (src/lib/data-sources/openstates-votes)
 * from OpenStates' per-session bulk CSV archives.
 *
 * Why a mirror: OpenStates v3 has no per-person votes endpoint, and reading
 * one member's record through the bills API means paging every bill of the
 * session against a 1,000/day cap. The bulk archives carry `votes.csv` and
 * `vote_people.csv` (one row per member per roll call, keyed by the same
 * `ocd-person/<uuid>` the roster corpus uses) under a public domain dedication.
 *
 * The archives are public S3 objects, but their filenames carry a random token
 * and the bucket has no listing, so the links are discovered from the
 * login-gated archive page (OPENSTATES_LOGIN / OPENSTATES_PASSWORD). Which
 * sessions are current comes from the v3 jurisdictions endpoint — one request
 * per state, once a month.
 *
 * Usage:
 *   npx tsx scripts/sync-openstates-votes.ts [--jurisdictions VT,CA]
 *       [--out DIR] [--upload release|none] [--release-tag TAG]
 *       [--zips a.zip,b.zip] [--keep-temp]
 *
 * --zips skips login and session discovery and builds from archives already on
 * disk (the state and session come from the README inside each zip). Unlike
 * the roster corpus the artifacts are one per state, so a partial run is safe:
 * the manifest keeps the states it does not rebuild.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { brotliCompressSync, brotliDecompressSync, constants as zlibConstants } from 'node:zlib';
import { basename, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { parse as parseCsv } from 'csv-parse/sync';
import { buildVotesCorpus } from '../src/lib/data-sources/openstates-votes/build-votes';
import type {
  RawBillRow,
  RawOrganizationRow,
  RawVotePersonRow,
  RawVoteRow,
  RosterMember,
  SessionInput,
} from '../src/lib/data-sources/openstates-votes/build-votes';
import type { RollCallChamber } from '../src/lib/data-sources/openstates-votes/votes-corpus';
import type { VotesManifest } from '../src/lib/data-sources/openstates-votes/load-votes';

const SITE = 'https://open.pluralpolicy.com';
const ARCHIVE_PAGE = `${SITE}/data/session-csv/`;
const API = 'https://v3.openstates.org';
const PEOPLE_CORPUS = 'data/openstates-people.json.br';
const MANIFEST_PATH = 'data/openstates-votes.meta.json';
const OUT_DIR_DEFAULT = 'data/openstates-votes';
const RELEASE_TAG_DEFAULT = 'openstates-votes';

/**
 * Upstream regenerates the archives monthly. Two missed months is where the
 * corpus stops being defensible as current. Absolute date, not a TTL — see the
 * roster script for why.
 */
const STALE_AFTER_DAYS = 70;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const ONLY = arg('--jurisdictions')
  ?.split(',')
  .map(s => s.trim().toUpperCase())
  .filter(Boolean);
const OUT_DIR = resolve(process.cwd(), arg('--out') ?? OUT_DIR_DEFAULT);
const UPLOAD = arg('--upload') ?? 'none';
const RELEASE_TAG = arg('--release-tag') ?? RELEASE_TAG_DEFAULT;
const ZIPS = arg('--zips')
  ?.split(',')
  .map(s => s.trim())
  .filter(Boolean);
const KEEP_TEMP = process.argv.includes('--keep-temp');

function staleAfterFrom(generatedAt: string): string {
  const d = new Date(generatedAt);
  d.setUTCDate(d.getUTCDate() + STALE_AFTER_DAYS);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Roster: party and chamber for every sitting member, read straight from the
// committed corpus so this script needs nothing from the app's runtime.
// ---------------------------------------------------------------------------

interface PeopleCorpusLite {
  parties: string[];
  chambers: RollCallChamber[];
  jurisdictions: Array<[string, number, number]>;
  rows: Array<[string, string, string, string, number, number, ...unknown[]]>;
}

function readRoster(): Map<string, RosterMember[]> {
  const file = JSON.parse(
    brotliDecompressSync(readFileSync(resolve(process.cwd(), PEOPLE_CORPUS))).toString('utf8')
  ) as PeopleCorpusLite;
  const byState = new Map<string, RosterMember[]>();
  for (const [state, offset, count] of file.jurisdictions) {
    const members: RosterMember[] = [];
    for (const row of file.rows.slice(offset, offset + count)) {
      members.push({
        uuid: row[0],
        party: file.parties[row[4]] ?? '',
        chamber: file.chambers[row[5]] ?? 'lower',
      });
    }
    byState.set(state, members);
  }
  return byState;
}

// ---------------------------------------------------------------------------
// Session discovery
// ---------------------------------------------------------------------------

interface ApiSession {
  identifier: string;
  name: string;
  classification?: string;
  start_date?: string;
  end_date?: string;
}

/**
 * The current biennium: the latest primary session that has started, plus
 * every session (special sessions) that started on or after it. California
 * files its special sessions separately and they belong to the same record.
 */
async function currentSessions(state: string): Promise<ApiSession[]> {
  const key = process.env.OPENSTATES_API_KEY;
  if (!key) throw new Error('OPENSTATES_API_KEY is required for session discovery');
  const url = `${API}/jurisdictions/ocd-jurisdiction/country:us/state:${state.toLowerCase()}/government?include=legislative_sessions`;
  const res = await fetch(url, {
    headers: { 'X-API-KEY': key },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`OpenStates API ${res.status} for ${state} sessions`);
  const body = (await res.json()) as { legislative_sessions?: ApiSession[] };
  const sessions = body.legislative_sessions ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const primary = sessions
    .filter(s => (s.classification ?? 'primary') === 'primary' && (s.start_date ?? '') <= today)
    .sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? ''))
    .pop();
  if (!primary) return [];
  return sessions.filter(s => (s.start_date ?? '') >= (primary.start_date ?? ''));
}

// ---------------------------------------------------------------------------
// Archive page: Django login, then the links
// ---------------------------------------------------------------------------

class CookieJar {
  private cookies = new Map<string, string>();
  absorb(res: Response): void {
    for (const header of res.headers.getSetCookie?.() ?? []) {
      const [pair] = header.split(';');
      const eq = pair?.indexOf('=') ?? -1;
      if (pair && eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }
  header(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  get(name: string): string | undefined {
    return this.cookies.get(name);
  }
}

async function loginAndFetchArchivePage(): Promise<string> {
  const login = process.env.OPENSTATES_LOGIN;
  const password = process.env.OPENSTATES_PASSWORD;
  if (!login || !password) {
    throw new Error('OPENSTATES_LOGIN and OPENSTATES_PASSWORD are required to list the archives');
  }

  const jar = new CookieJar();
  const loginUrl = `${SITE}/accounts/login/`;
  const form = await fetch(loginUrl, { signal: AbortSignal.timeout(30_000), redirect: 'manual' });
  jar.absorb(form);
  const html = await form.text();
  const token = /name="csrfmiddlewaretoken"\s+value="([^"]+)"/.exec(html)?.[1];
  if (!token) throw new Error('Login page carried no csrfmiddlewaretoken');

  const body = new URLSearchParams({
    csrfmiddlewaretoken: token,
    login,
    password,
    next: '/data/session-csv/',
  });
  const posted = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: jar.header(),
      Referer: loginUrl,
    },
    body,
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
  });
  jar.absorb(posted);
  if (!jar.get('sessionid')) {
    throw new Error(`Login did not establish a session (HTTP ${posted.status}); check credentials`);
  }

  const page = await fetch(ARCHIVE_PAGE, {
    headers: { Cookie: jar.header() },
    signal: AbortSignal.timeout(60_000),
  });
  if (!page.ok) throw new Error(`Archive page ${page.status}`);
  return page.text();
}

interface ArchiveLink {
  state: string;
  sessionIdentifier: string;
  url: string;
}

/**
 * Every archive link on the page. The filename is
 * `<ST>_<session identifier>_csv_<token>.zip`, spaces URL-encoded, which is the
 * only place the session identifier appears in machine-readable form.
 */
function parseArchiveLinks(html: string): ArchiveLink[] {
  const links: ArchiveLink[] = [];
  const re =
    /https:\/\/data\.openstates\.org\/csv\/latest\/([A-Z]{2})_(.+?)_csv_[A-Za-z0-9]+\.zip/g;
  for (const match of html.matchAll(re)) {
    const [url, state, encoded] = match;
    if (!state || encoded === undefined) continue;
    links.push({ state, sessionIdentifier: decodeURIComponent(encoded.replace(/\+/g, ' ')), url });
  }
  return links;
}

// ---------------------------------------------------------------------------
// Archives → session inputs
// ---------------------------------------------------------------------------

async function download(url: string, dir: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(600_000) });
  if (!res.ok) throw new Error(`Archive ${res.status} from ${url}`);
  const path = join(dir, basename(new URL(url).pathname));
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  return path;
}

function csv<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  return parseCsv(readFileSync(path, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as T[];
}

/** Unpack one archive and read the four tables the corpus needs. */
function readArchive(
  zipPath: string,
  dir: string,
  sessionName?: string
): { state: string; session: SessionInput } {
  const target = join(dir, basename(zipPath, '.zip'));
  mkdirSync(target, { recursive: true });
  execFileSync('unzip', ['-qo', zipPath, '-d', target]);

  const readme = readFileSync(join(target, 'README'), 'utf8');
  const state = /^State:\s*(\S+)/m.exec(readme)?.[1]?.toUpperCase();
  const identifier = /^Session:\s*(.+)$/m.exec(readme)?.[1]?.trim();
  const generated = /^Generated At:\s*(.+)$/m.exec(readme)?.[1]?.trim();
  if (!state || !identifier) throw new Error(`README in ${zipPath} names no state/session`);

  // Tables live at <ST>/<session>/<ST>_<session>_<table>.csv.
  const sessionDir = join(target, state, identifier);
  const table = (name: string): string => join(sessionDir, `${state}_${identifier}_${name}.csv`);

  return {
    state,
    session: {
      identifier,
      name: sessionName ?? identifier,
      upstreamGeneratedAt: generated
        ? new Date(generated.replace(' ', 'T') + 'Z').toISOString()
        : '',
      votes: csv<RawVoteRow>(table('votes')),
      votePeople: csv<RawVotePersonRow>(table('vote_people')),
      bills: csv<RawBillRow>(table('bills')),
      organizations: csv<RawOrganizationRow>(table('organizations')),
    },
  };
}

function brotli(json: string): Buffer {
  return brotliCompressSync(Buffer.from(json), {
    params: {
      [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
      [zlibConstants.BROTLI_PARAM_SIZE_HINT]: Buffer.byteLength(json),
    },
  });
}

function readManifest(): VotesManifest | null {
  const path = resolve(process.cwd(), MANIFEST_PATH);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as VotesManifest;
}

/** `gh release upload`, creating the release on first use. Public repo, so the
 *  download URLs need no token. */
function uploadToRelease(files: string[]): string {
  const repo = process.env.GITHUB_REPOSITORY ?? 'civdotiq/civ.iq';
  try {
    execFileSync('gh', ['release', 'view', RELEASE_TAG, '--repo', repo], { stdio: 'ignore' });
  } catch {
    execFileSync('gh', [
      'release',
      'create',
      RELEASE_TAG,
      '--repo',
      repo,
      '--title',
      'OpenStates roll-call corpus',
      '--notes',
      'Per-state roll-call artifacts built by scripts/sync-openstates-votes.ts. ' +
        'Rolling: each run replaces the files in place.',
    ]);
  }
  execFileSync('gh', ['release', 'upload', RELEASE_TAG, ...files, '--repo', repo, '--clobber'], {
    stdio: 'inherit',
  });
  return `https://github.com/${repo}/releases/download/${RELEASE_TAG}`;
}

async function main(): Promise<void> {
  if (!['release', 'none'].includes(UPLOAD)) throw new Error(`--upload must be release or none`);

  const roster = readRoster();
  const temp = mkdtempSync(join(tmpdir(), 'openstates-votes-'));
  const generatedAt = new Date().toISOString();

  try {
    // state → its session inputs
    const byState = new Map<string, SessionInput[]>();

    if (ZIPS) {
      for (const zip of ZIPS) {
        const { state, session } = readArchive(resolve(zip), temp);
        if (ONLY && !ONLY.includes(state)) continue;
        (byState.get(state) ?? byState.set(state, []).get(state))?.push(session);
      }
    } else {
      const links = parseArchiveLinks(await loginAndFetchArchivePage());
      if (links.length === 0) throw new Error('Archive page listed no CSV links');
      const states = [...new Set(links.map(l => l.state))].filter(s => !ONLY || ONLY.includes(s));
      console.log(`${links.length} archives listed across ${states.length} states`);

      for (const state of states.sort()) {
        const sessions = await currentSessions(state);
        const wanted = links.filter(
          l => l.state === state && sessions.some(s => s.identifier === l.sessionIdentifier)
        );
        if (wanted.length === 0) {
          console.warn(
            `${state}: no archive matches a current session (${sessions.map(s => s.identifier).join(', ') || 'none'})`
          );
          continue;
        }
        const inputs: SessionInput[] = [];
        for (const link of wanted) {
          const zip = await download(link.url, temp);
          const name = sessions.find(s => s.identifier === link.sessionIdentifier)?.name;
          inputs.push(readArchive(zip, temp, name).session);
          rmSync(zip, { force: true });
        }
        byState.set(state, inputs);
      }
    }

    if (byState.size === 0) throw new Error('No states to build');
    mkdirSync(OUT_DIR, { recursive: true });

    const manifest: VotesManifest = readManifest() ?? {
      generatedAt,
      staleAfter: staleAfterFrom(generatedAt),
      baseUrl: '',
      jurisdictions: {},
    };
    const written: string[] = [];

    for (const [state, sessions] of [...byState.entries()].sort()) {
      const members = roster.get(state);
      if (!members) {
        console.warn(`${state}: not in the roster corpus; skipped`);
        continue;
      }
      const corpus = buildVotesCorpus({
        jurisdiction: state,
        generatedAt,
        sessions,
        roster: members,
      });
      const bytes = brotli(JSON.stringify(corpus));
      const path = join(OUT_DIR, `${state}.json.br`);
      writeFileSync(path, bytes);
      written.push(path);
      manifest.jurisdictions[state] = {
        bytes: bytes.length,
        rollCalls: corpus.meta.rollCalls,
        memberVotes: corpus.meta.memberVotes,
        members: corpus.meta.members,
        unresolvedVotes: corpus.meta.unresolvedVotes,
        sessions: corpus.sessions,
        generatedAt,
      };
      console.log(
        `${state}: ${corpus.meta.rollCalls} roll calls · ${corpus.meta.memberVotes} member-votes · ` +
          `${corpus.meta.members} members · ${corpus.meta.unresolvedVotes} unresolved · ` +
          `${corpus.sessions.map(s => s.identifier).join(' + ')} · ${(bytes.length / 1e6).toFixed(2)} MB`
      );
    }

    if (UPLOAD === 'release') manifest.baseUrl = uploadToRelease(written);
    manifest.generatedAt = generatedAt;
    manifest.staleAfter = staleAfterFrom(generatedAt);
    manifest.jurisdictions = Object.fromEntries(
      Object.entries(manifest.jurisdictions).sort(([a], [b]) => a.localeCompare(b))
    );
    writeFileSync(resolve(process.cwd(), MANIFEST_PATH), JSON.stringify(manifest, null, 2) + '\n');
    console.log(
      `Manifest: ${Object.keys(manifest.jurisdictions).length} states, base ${manifest.baseUrl || '(local only)'}, stale after ${manifest.staleAfter}`
    );
  } finally {
    if (!KEEP_TEMP) rmSync(temp, { recursive: true, force: true });
    else console.log(`Kept ${temp}`);
    // The unzipped working set is tens of MB per state; never leave it behind.
    for (const entry of readdirSync(OUT_DIR, { withFileTypes: true })) {
      if (entry.isDirectory()) rmSync(join(OUT_DIR, entry.name), { recursive: true, force: true });
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
