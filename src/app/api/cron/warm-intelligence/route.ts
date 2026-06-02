/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Warm-Intelligence Cron Job
 *
 * Pre-computes and caches the four heavy intelligence analyzers
 * (finance-jurisdiction, vote-finance, vote-prediction, influence-chain)
 * for every current member of Congress so cold-path compute never hits a real user.
 *
 * Chunking strategy:
 *   - One slice of SLICE_SIZE reps per invocation, processed in inner batches
 *     of REP_CONCURRENCY to bound peak load on Congress/FEC APIs.
 *   - A Redis cursor tracks the next slice. After each invocation the cursor
 *     advances by SLICE_SIZE, wrapping at the end of the chamber.
 *   - At "every 30 min" (*\/30 * * * *) a 535-member chamber completes one cycle in ~13.5h.
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}` (rejected with 401 otherwise).
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { analyzeFinanceJurisdiction } from '@/lib/intelligence/analyzers/finance-jurisdiction-analyzer';
import { analyzeVoteFinance } from '@/lib/intelligence/analyzers/vote-finance-analyzer';
import { analyzeVotePrediction } from '@/lib/intelligence/analyzers/vote-prediction-analyzer';
import { analyzeInfluenceChains } from '@/lib/intelligence/analyzers/influence-chain-analyzer';
import { runWithFecPriority } from '@/lib/fec/fec-rate-limiter';

export const dynamic = 'force-dynamic';

const DEFAULT_SLICE_SIZE = 20;
// Concurrent reps per inner batch. Each rep fans out ~8-12 FEC calls across the
// four analyzers, so we keep this low and let the shared FEC rate limiter
// (cron priority) do the real pacing against live traffic.
const DEFAULT_REP_CONCURRENCY = 3;
const PER_ANALYZER_TIMEOUT_MS = 55_000;
const CURSOR_KEY = 'cron:warm-intel:cursor';

function getSliceSize(): number {
  const raw = process.env.WARM_INTEL_SLICE_SIZE;
  if (!raw) return DEFAULT_SLICE_SIZE;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SLICE_SIZE;
}

function getRepConcurrency(): number {
  const raw = process.env.WARM_INTEL_REP_CONCURRENCY;
  if (!raw) return DEFAULT_REP_CONCURRENCY;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REP_CONCURRENCY;
}

type AnalyzerName = 'finance_jurisdiction' | 'vote_finance' | 'vote_prediction' | 'influence_chain';

interface AnalyzerOutcome {
  name: AnalyzerName;
  status: 'ok' | 'error' | 'timeout';
  elapsedMs: number;
  error?: string;
}

interface RepOutcome {
  bioguideId: string;
  elapsedMs: number;
  results: AnalyzerOutcome[];
}

const ANALYZERS: { name: AnalyzerName; run: (id: string) => Promise<unknown> }[] = [
  { name: 'finance_jurisdiction', run: analyzeFinanceJurisdiction },
  { name: 'vote_finance', run: analyzeVoteFinance },
  { name: 'vote_prediction', run: analyzeVotePrediction },
  { name: 'influence_chain', run: analyzeInfluenceChains },
];

function withTimeoutLabel<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<{ ok: true; value: T } | { ok: false; reason: 'timeout' | 'error'; error: string }> {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      resolve({ ok: false, reason: 'timeout', error: `${label} timed out after ${ms}ms` });
    }, ms);

    promise.then(
      value => {
        clearTimeout(timer);
        resolve({ ok: true, value });
      },
      err => {
        clearTimeout(timer);
        const message = err instanceof Error ? err.message : String(err);
        resolve({ ok: false, reason: 'error', error: message });
      }
    );
  });
}

async function warmRep(bioguideId: string): Promise<RepOutcome> {
  const repStart = Date.now();
  const results = await Promise.all(
    ANALYZERS.map(async ({ name, run }): Promise<AnalyzerOutcome> => {
      const start = Date.now();
      const outcome = await withTimeoutLabel(run(bioguideId), PER_ANALYZER_TIMEOUT_MS, name);
      const elapsedMs = Date.now() - start;
      if (outcome.ok) {
        return { name, status: 'ok', elapsedMs };
      }
      return {
        name,
        status: outcome.reason === 'timeout' ? 'timeout' : 'error',
        elapsedMs,
        error: outcome.error,
      };
    })
  );
  return { bioguideId, elapsedMs: Date.now() - repStart, results };
}

async function processSlice(reps: { bioguideId: string }[]): Promise<RepOutcome[]> {
  const outcomes: RepOutcome[] = [];
  const concurrency = getRepConcurrency();
  for (let i = 0; i < reps.length; i += concurrency) {
    const batch = reps.slice(i, i + concurrency);
    const batchOutcomes = await Promise.all(batch.map(rep => warmRep(rep.bioguideId)));
    outcomes.push(...batchOutcomes);
  }
  return outcomes;
}

function summarize(outcomes: RepOutcome[]) {
  const counts: Record<AnalyzerName, { ok: number; error: number; timeout: number }> = {
    finance_jurisdiction: { ok: 0, error: 0, timeout: 0 },
    vote_finance: { ok: 0, error: 0, timeout: 0 },
    vote_prediction: { ok: 0, error: 0, timeout: 0 },
    influence_chain: { ok: 0, error: 0, timeout: 0 },
  };
  for (const rep of outcomes) {
    for (const r of rep.results) {
      counts[r.name][r.status] += 1;
    }
  }
  return counts;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const redis = getRedisCache();

  try {
    const reps = await getAllEnhancedRepresentatives();
    if (reps.length === 0) {
      logger.warn('[WARM-INTEL] no representatives returned — skipping slice', {
        operation: 'warm_intelligence_cron',
      });
      return NextResponse.json({
        success: true,
        warmed: 0,
        slice: [0, 0],
        nextCursor: 0,
        totalReps: 0,
      });
    }

    const cursorRaw = await redis.get<number | string>(CURSOR_KEY);
    const cursor =
      typeof cursorRaw === 'number'
        ? cursorRaw
        : typeof cursorRaw === 'string'
          ? Number.parseInt(cursorRaw, 10) || 0
          : 0;
    const sliceSize = Math.min(getSliceSize(), reps.length);
    const start = ((cursor % reps.length) + reps.length) % reps.length;
    // Wrap within a single slice so each invocation does the same amount of work,
    // even when the cursor sits near the end of the chamber.
    const slice: { bioguideId: string }[] = [];
    for (let i = 0; i < sliceSize; i++) {
      slice.push(reps[(start + i) % reps.length]!);
    }
    const end = (start + slice.length) % reps.length;

    logger.info('[WARM-INTEL] slice begin', {
      operation: 'warm_intelligence_cron',
      sliceStart: start,
      sliceEnd: end,
      sliceSize: slice.length,
      totalReps: reps.length,
    });

    // Run under cron priority so every nested FEC call yields to live traffic.
    const outcomes = await runWithFecPriority('cron', () => processSlice(slice));
    const totalsByAnalyzer = summarize(outcomes);
    const errorCount = outcomes.reduce(
      (acc, rep) => acc + rep.results.filter(r => r.status !== 'ok').length,
      0
    );
    const okCount = outcomes.reduce(
      (acc, rep) => acc + rep.results.filter(r => r.status === 'ok').length,
      0
    );

    const nextCursor = end;
    await redis.set(CURSOR_KEY, nextCursor, 7 * 24 * 60 * 60);

    const totalTime = Date.now() - startTime;
    logger.info('[WARM-INTEL] slice complete', {
      operation: 'warm_intelligence_cron',
      sliceStart: start,
      sliceEnd: end,
      reps: outcomes.length,
      analyzerCalls: outcomes.length * ANALYZERS.length,
      ok: okCount,
      errors: errorCount,
      totalTimeMs: totalTime,
      nextCursor,
      perAnalyzer: totalsByAnalyzer,
    });

    return NextResponse.json({
      success: true,
      warmed: outcomes.length,
      analyzerCalls: outcomes.length * ANALYZERS.length,
      ok: okCount,
      errors: errorCount,
      slice: [start, end],
      nextCursor,
      totalReps: reps.length,
      totalTimeMs: totalTime,
      perAnalyzer: totalsByAnalyzer,
      reps: outcomes.map(o => ({
        bioguideId: o.bioguideId,
        elapsedMs: o.elapsedMs,
        results: o.results,
      })),
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error('[WARM-INTEL] slice failed', error as Error, {
      operation: 'warm_intelligence_cron',
      totalTimeMs: totalTime,
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Warm-intelligence cron failed',
        message: (error as Error).message,
        totalTimeMs: totalTime,
      },
      { status: 500 }
    );
  }
}

// Allow GET so Vercel cron (which uses GET) and manual `curl` triggers work.
export async function GET(request: NextRequest) {
  return POST(request);
}
