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
 *
 * --max-pages caps pages per quarter (smoke tests). Auth is Django REST
 * framework token auth: `Authorization: Token <key>`.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildAggregates, parseRawFiling } from '../src/lib/data-sources/lda-corpus/index';
import type { CompactFiling, RawApiFiling } from '../src/lib/data-sources/lda-corpus/index';

const API_BASE = 'https://lda.senate.gov/api/v1/filings/';
const PAGE_SIZE = 25; // hard cap; larger values are ignored by the API
const CONCURRENCY = 3; // in-flight requests; the pace gate is the real throttle
const MIN_INTERVAL_MS = 550; // ~109 req/min — under the registered-key ceiling, no 429 backoff
const PERIODS = ['first_quarter', 'second_quarter', 'third_quarter', 'fourth_quarter'] as const;

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
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Token ${API_KEY}`,
        'User-Agent': 'CIV.IQ/1.0 (Civic Information Platform)',
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get('retry-after')) || 2 ** attempt;
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`LDA API ${res.status} for ${year} ${period} p${page}`);
    return (await res.json()) as ApiPage;
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

async function fetchQuarter(year: number, period: string): Promise<CompactFiling[]> {
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
  return filings;
}

async function main(): Promise<void> {
  if (!API_KEY) {
    console.error('LDA_API_KEY is required. Register at https://lda.senate.gov/api/register/');
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
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
