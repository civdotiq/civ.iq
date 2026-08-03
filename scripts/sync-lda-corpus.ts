/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Mirror the complete Senate LDA quarterly-report corpus into a committed
 * aggregate file (data/lda-aggregates.json). See PLAN-lobbying-corpus-2026-07.md.
 *
 * Why a mirror: the app's request-time code fetches only the first API page
 * (~25 of ~28,000 filings/quarter, a ~0.1% sample), so its dollar totals are
 * meaningless. There is no live bulk dump for recent quarters (soprweb.senate.gov
 * stops at 2022 Q1), so this pages the REST API in full — feasible only off the
 * serverless request path and with a registered key that lifts the rate limit.
 *
 * Usage:
 *   LDA_API_KEY=... npx tsx scripts/sync-lda-corpus.ts [--quarters 8] [--max-pages N] [--out PATH]
 *                                                     [--filings] [--filings-out PATH]
 *                                                     [--cache-dir PATH]
 *
 * --max-pages caps pages per quarter (smoke tests). --cache-dir checkpoints each
 * finished quarter so a failed run resumes instead of re-paging from scratch;
 * leave it off for scheduled refreshes, where a cached quarter would be stale.
 * --filings additionally emits
 * the brotli-compressed filing-level corpus the analyzers read (Phase 3); it is
 * opt-in so the weekly Action can adopt it separately from the aggregates. Auth
 * is Django REST framework token auth: `Authorization: Token <key>`.
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import {
  buildAggregates,
  buildFilingCorpus,
  parseRawFiling,
} from '../src/lib/data-sources/lda-corpus/index';
import type { CompactFiling, RawApiFiling } from '../src/lib/data-sources/lda-corpus/index';

// The LDA moved off senate.gov in 2026: lda.senate.gov now 301s every path to
// the lda.gov root, dropping the path and query, so the old base silently
// returned the homepage HTML instead of JSON.
const API_BASE = 'https://lda.gov/api/v1/filings/';
const PAGE_SIZE = 25; // hard cap; larger values are ignored by the API
const CONCURRENCY = 3; // in-flight requests; the pace gate is the real throttle
const MIN_INTERVAL_MS = 550; // ~109 req/min — under the registered-key ceiling, no 429 backoff
const PERIODS = ['first_quarter', 'second_quarter', 'third_quarter', 'fourth_quarter'] as const;

// The mirror refreshes weekly. Three consecutive misses is the point where the
// corpus stops being defensible as current, so that is the staleness horizon.
const STALE_AFTER_DAYS = 21;

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

/** Global pace gate: dispatch at most one request per MIN_INTERVAL_MS. */
let nextSlot = 0;
async function pace(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_INTERVAL_MS;
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const API_KEY = process.env.LDA_API_KEY;
const QUARTERS = Number(arg('--quarters') ?? 8);
const MAX_PAGES = arg('--max-pages') ? Number(arg('--max-pages')) : Infinity;
const OUT_PATH = resolve(arg('--out') ?? 'data/lda-aggregates.json');
const CACHE_DIR = arg('--cache-dir');
const EMIT_FILINGS = process.argv.includes('--filings') || arg('--filings-out') !== undefined;
const FILINGS_OUT_PATH = resolve(arg('--filings-out') ?? 'data/lda-filings.json.br');

/** The N most recent completed quarters, oldest first, as {year, period}. */
function quarterWindow(now: Date, count: number): Array<{ year: number; period: string }> {
  // Most recent completed quarter = the quarter before the current one.
  let year = now.getUTCFullYear();
  let qIdx = Math.floor(now.getUTCMonth() / 3) - 1; // 0-based; -1 => Q4 of prior year
  if (qIdx < 0) {
    qIdx = 3;
    year -= 1;
  }
  const out: Array<{ year: number; period: string }> = [];
  for (let i = 0; i < count; i++) {
    out.unshift({ year, period: PERIODS[qIdx]! });
    qIdx -= 1;
    if (qIdx < 0) {
      qIdx = 3;
      year -= 1;
    }
  }
  return out;
}

interface ApiPage {
  count: number;
  results: RawApiFiling[];
}

async function fetchPage(year: number, period: string, page: number): Promise<ApiPage> {
  const url = `${API_BASE}?filing_year=${year}&filing_period=${period}&page=${page}&page_size=${PAGE_SIZE}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    await pace();
    // A full run makes ~9,000 requests, so a single dropped connection or slow
    // response is close to certain. Retry thrown network errors and timeouts the
    // same way as 429/5xx — before this, one DOMException from AbortSignal
    // discarded the whole multi-hour run.
    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Token ${API_KEY}`,
          'User-Agent': 'CIV.IQ/1.0 (Civic Information Platform)',
        },
        signal: AbortSignal.timeout(60_000),
      });
    } catch (error) {
      console.warn(
        `  retrying ${year} ${period} p${page} after ${(error as Error).name}: ${(error as Error).message}`
      );
      await new Promise(r => setTimeout(r, 2 ** attempt * 1000));
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get('retry-after')) || 2 ** attempt;
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`LDA API ${res.status} for ${year} ${period} p${page}`);
    try {
      return (await res.json()) as ApiPage;
    } catch (error) {
      console.warn(
        `  retrying ${year} ${period} p${page} after body error: ${(error as Error).message}`
      );
      await new Promise(r => setTimeout(r, 2 ** attempt * 1000));
    }
  }
  throw new Error(`LDA API exhausted retries for ${year} ${period} p${page}`);
}

/** Run tasks with bounded concurrency, preserving order-independent collection. */
async function pool<T>(tasks: Array<() => Promise<T>>, size: number): Promise<T[]> {
  const results: T[] = [];
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < tasks.length) {
      const idx = cursor++;
      results[idx] = await tasks[idx]!();
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, tasks.length) }, worker));
  return results;
}

/**
 * Optional per-quarter checkpoint. A full run takes ~100 minutes; without this
 * any failure discards all of it. Opt-in (`--cache-dir`) rather than automatic
 * because quarters keep receiving amendments — a cached quarter is a snapshot,
 * fine for re-running a build locally, wrong for a scheduled refresh.
 */
function cachePathFor(year: number, period: string): string | null {
  return CACHE_DIR ? resolve(CACHE_DIR, `${year}-${period}.json`) : null;
}

function readQuarterCache(year: number, period: string): CompactFiling[] | null {
  const path = cachePathFor(year, period);
  if (!path || !existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as CompactFiling[];
  } catch {
    return null;
  }
}

function writeQuarterCache(year: number, period: string, filings: CompactFiling[]): void {
  const path = cachePathFor(year, period);
  if (!path) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(filings));
}

async function fetchQuarter(year: number, period: string): Promise<CompactFiling[]> {
  const cached = readQuarterCache(year, period);
  if (cached) {
    console.log(`  ${year} ${period}: ${cached.length} reports (cached)`);
    return cached;
  }

  const first = await fetchPage(year, period, 1);
  const totalPages = Math.min(Math.ceil(first.count / PAGE_SIZE), MAX_PAGES);
  const filings: CompactFiling[] = [];
  const collect = (results: RawApiFiling[]): void => {
    for (const raw of results) {
      const parsed = parseRawFiling(raw);
      if (parsed) filings.push(parsed);
    }
  };
  collect(first.results);

  const rest = [];
  for (let p = 2; p <= totalPages; p++) {
    const page = p;
    rest.push(() => fetchPage(year, period, page).then(pg => collect(pg.results)));
  }
  await pool(rest, CONCURRENCY);
  console.log(
    `  ${year} ${period}: ${first.count} filings, ${totalPages} pages -> ${filings.length} reports`
  );
  writeQuarterCache(year, period, filings);
  return filings;
}

async function main(): Promise<void> {
  if (!API_KEY) {
    console.error('LDA_API_KEY is required. Register at https://lda.gov/api/register/');
    process.exit(1);
  }
  const window = quarterWindow(new Date(), QUARTERS);
  console.log(
    `Mirroring ${QUARTERS} quarters: ${window.map(w => `${w.year} ${w.period}`).join(', ')}` +
      (MAX_PAGES !== Infinity ? ` (capped ${MAX_PAGES} pages/quarter)` : '')
  );

  const all: CompactFiling[] = [];
  for (const { year, period } of window) {
    all.push(...(await fetchQuarter(year, period)));
  }

  const aggregates = buildAggregates(all, new Date().toISOString());
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  const serialized = JSON.stringify(aggregates);
  writeFileSync(OUT_PATH, serialized);

  // Lightweight sidecar for the status route + health freshness canary, so
  // neither has to load the multi-MB corpus just to read freshness metadata.
  const metaPath = OUT_PATH.replace(/\.json$/, '.meta.json');
  writeFileSync(
    metaPath,
    JSON.stringify({
      generatedAt: aggregates.generatedAt,
      staleAfter: staleAfterFrom(aggregates.generatedAt),
      latestFilingPosted: aggregates.latestFilingPosted,
      quarters: aggregates.quarters,
      committeeQuarters: aggregates.committees.length,
      issueQuarters: aggregates.issues.length,
      meta: aggregates.meta,
    })
  );

  const bytes = Buffer.byteLength(serialized);
  console.log(
    `Wrote ${OUT_PATH} — ${(bytes / 1_000_000).toFixed(2)}MB · ` +
      `${aggregates.committees.length} committee-quarters · ${aggregates.issues.length} issue-quarters · ` +
      `${aggregates.meta.reportFilingsUsed} reports (${aggregates.meta.gatedFilingCount} gated) · ` +
      `latest ${aggregates.latestFilingPosted}`
  );

  if (EMIT_FILINGS) writeFilingCorpus(all, aggregates.generatedAt);
}

/**
 * Emit the filing-level corpus the analyzers read. Dictionary-encoded and
 * brotli-compressed, it is small enough to commit alongside the aggregates —
 * an array of filing objects would not have been.
 */
function writeFilingCorpus(all: CompactFiling[], generatedAt: string): void {
  const corpus = buildFilingCorpus(all, generatedAt);
  const json = JSON.stringify(corpus);
  const compressed = brotliCompressSync(Buffer.from(json), {
    params: {
      [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
      [zlibConstants.BROTLI_PARAM_SIZE_HINT]: Buffer.byteLength(json),
    },
  });
  mkdirSync(dirname(FILINGS_OUT_PATH), { recursive: true });
  writeFileSync(FILINGS_OUT_PATH, compressed);

  // Sidecar so the status route and health canary can check freshness — and
  // whether this artifact and the aggregates came from the same run — without
  // decompressing the corpus.
  writeFileSync(
    FILINGS_OUT_PATH.replace(/\.json\.br$/, '.meta.json'),
    JSON.stringify({
      generatedAt: corpus.generatedAt,
      staleAfter: staleAfterFrom(corpus.generatedAt),
      latestFilingPosted: corpus.latestFilingPosted,
      quarters: corpus.quarters,
      rows: corpus.rows.length,
      compressedBytes: compressed.length,
      meta: corpus.meta,
    })
  );

  console.log(
    `Wrote ${FILINGS_OUT_PATH} — ${(compressed.length / 1_000_000).toFixed(2)}MB brotli ` +
      `(${(Buffer.byteLength(json) / 1_000_000).toFixed(2)}MB raw) · ` +
      `${corpus.rows.length} rows · ${corpus.clients.length} clients · ` +
      `${corpus.committees.length} committees · ${corpus.entities.length} entities`
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
