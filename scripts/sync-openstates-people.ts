/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Mirror the openstates/people legislator rosters into a committed corpus
 * (data/openstates-people.json.br). See PLAN-openstates-corpus-2026-08.md.
 *
 * Why a mirror: OpenStates enforces 40 requests/minute *and* 1,000/day. The
 * `/people` endpoint pages at 50, so one roster costs 3-9 requests and all 50
 * states once costs ~169 — about 17% of the daily allowance before a single
 * bill, committee or crawler. Production exhausted the cap on deploy day.
 *
 * Why this source rather than the bulk CSV: the per-session CSV zips carry
 * bills, votes and organizations but no people file. Rosters live only in the
 * openstates/people repo, one YAML per official, under CC0-1.0 — and its `id`
 * is the same `ocd-person/<uuid>` the v3 API returns, which is what makes the
 * swap safe for existing URLs and cache keys.
 *
 * Usage:
 *   npx tsx scripts/sync-openstates-people.ts [--out PATH] [--ref BRANCH]
 *                                             [--jurisdictions MI,CA] [--keep-temp]
 *
 * --jurisdictions limits the build for smoke tests; a partial corpus must never
 * be committed, so the script refuses to write the default path when it is set.
 * No API key is involved — this is a tarball download, not an API call.
 */

import { writeFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { load as parseYaml } from 'js-yaml';
import { buildPeopleCorpus } from '../src/lib/data-sources/openstates-people/index';
import type { RawPersonYaml } from '../src/lib/data-sources/openstates-people/index';

const REPO = 'openstates/people';
const OUT_PATH_DEFAULT = 'data/openstates-people.json.br';

/**
 * Upstream is a roster: it moves when members change, which is on election
 * cycles rather than daily. The mirror runs weekly, so three consecutive misses
 * is the point where the corpus stops being defensible as current.
 */
const STALE_AFTER_DAYS = 21;

/**
 * Federal legislators live in the same repo under `data/us/`. They are not
 * state data and the app already sources Congress elsewhere.
 */
const SKIP_JURISDICTIONS = new Set(['us']);

/**
 * Absolute date (YYYY-MM-DD) after which consumers should treat the corpus as
 * stale. Deliberately an absolute date rather than a relative TTL: a date
 * comparison cannot be wrong about its own units or about when it was read,
 * which is exactly how the cache-TTL milliseconds bug froze keys for 250 days.
 */
function staleAfterFrom(generatedAt: string): string {
  const d = new Date(generatedAt);
  d.setUTCDate(d.getUTCDate() + STALE_AFTER_DAYS);
  return d.toISOString().slice(0, 10);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const REF = arg('--ref') ?? 'main';
const ONLY = arg('--jurisdictions')
  ?.split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);
const OUT_PATH = resolve(process.cwd(), arg('--out') ?? OUT_PATH_DEFAULT);
const KEEP_TEMP = process.argv.includes('--keep-temp');

/** Head commit of the ref, so the artifact records exactly what it mirrors. */
async function fetchHead(): Promise<{ sha: string; committedAt: string }> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/commits/${REF}`, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} resolving ${REPO}@${REF}`);
  const body = (await res.json()) as {
    sha: string;
    commit: { committer: { date: string } };
  };
  return { sha: body.sha, committedAt: body.commit.committer.date };
}

/**
 * Download and unpack the repo tarball. The whole repo is 5.3 MB compressed —
 * cheaper than a sparse checkout, and it needs no git in CI. It expands to
 * ~100 MB because of `retired/` (13,917 files we never read), so the temp
 * directory is removed on the way out.
 */
async function fetchTree(dir: string): Promise<string> {
  const url = `https://codeload.github.com/${REPO}/tar.gz/refs/heads/${REF}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`Tarball ${res.status} from ${url}`);

  const archive = join(dir, 'people.tar.gz');
  writeFileSync(archive, Buffer.from(await res.arrayBuffer()));
  execFileSync('tar', ['-xzf', archive, '-C', dir]);

  // GitHub names the root after the ref, not the sha, for a branch tarball.
  const root = readdirSync(dir).find(entry => entry.startsWith('people-'));
  if (!root) throw new Error(`No people-* directory in ${url}`);
  return join(dir, root, 'data');
}

function readJurisdictions(dataDir: string): Map<string, RawPersonYaml[]> {
  const byJurisdiction = new Map<string, RawPersonYaml[]>();

  for (const jurisdiction of readdirSync(dataDir).sort()) {
    if (SKIP_JURISDICTIONS.has(jurisdiction)) continue;
    if (ONLY && !ONLY.includes(jurisdiction)) continue;

    const legislature = join(dataDir, jurisdiction, 'legislature');
    let files: string[];
    try {
      files = readdirSync(legislature).filter(f => f.endsWith('.yml'));
    } catch {
      // Not every directory under data/ has a legislature (municipalities-only
      // jurisdictions do not), which is expected rather than an error.
      continue;
    }

    const people = files.map(
      file => parseYaml(readFileSync(join(legislature, file), 'utf8')) as RawPersonYaml
    );
    byJurisdiction.set(jurisdiction.toUpperCase(), people);
  }

  return byJurisdiction;
}

async function main(): Promise<void> {
  if (ONLY && OUT_PATH === resolve(process.cwd(), OUT_PATH_DEFAULT)) {
    throw new Error('--jurisdictions builds a partial corpus; pass --out to a scratch path');
  }

  const head = await fetchHead();
  const temp = mkdtempSync(join(tmpdir(), 'openstates-people-'));

  try {
    const dataDir = await fetchTree(temp);
    const byJurisdiction = readJurisdictions(dataDir);
    if (byJurisdiction.size === 0) throw new Error('No jurisdictions parsed');

    const corpus = buildPeopleCorpus({
      byJurisdiction,
      generatedAt: new Date().toISOString(),
      upstreamCommit: head.sha,
      upstreamCommittedAt: head.committedAt,
    });

    const json = JSON.stringify(corpus);
    const compressed = brotliCompressSync(Buffer.from(json), {
      params: {
        [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
        [zlibConstants.BROTLI_PARAM_SIZE_HINT]: Buffer.byteLength(json),
      },
    });

    mkdirSync(dirname(OUT_PATH), { recursive: true });
    writeFileSync(OUT_PATH, compressed);

    // Sidecar so a status route or health canary can check freshness without
    // decompressing the corpus.
    writeFileSync(
      OUT_PATH.replace(/\.json\.br$/, '.meta.json'),
      JSON.stringify({
        generatedAt: corpus.generatedAt,
        staleAfter: staleAfterFrom(corpus.generatedAt),
        upstreamCommit: corpus.upstreamCommit,
        upstreamCommittedAt: corpus.upstreamCommittedAt,
        jurisdictions: corpus.jurisdictions.length,
        people: corpus.rows.length,
        departed: corpus.meta.departed,
        compressedBytes: compressed.length,
        meta: corpus.meta,
      })
    );

    console.log(
      `Wrote ${OUT_PATH} — ${(compressed.length / 1_000_000).toFixed(2)}MB brotli ` +
        `(${(Buffer.byteLength(json) / 1_000_000).toFixed(2)}MB raw) · ` +
        `${corpus.rows.length} members · ${corpus.jurisdictions.length} jurisdictions · ` +
        `${corpus.parties.length} parties · ${corpus.meta.departed} departed skipped · ` +
        `upstream ${corpus.upstreamCommit.slice(0, 8)} (${corpus.upstreamCommittedAt})`
    );
  } finally {
    if (!KEEP_TEMP) rmSync(temp, { recursive: true, force: true });
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
