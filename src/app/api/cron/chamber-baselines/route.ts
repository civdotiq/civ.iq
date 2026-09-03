/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Chamber Baselines Cron
 *
 * Daily rebuild of the Record Card's chamber-wide voting baselines (votes
 * cast/missed + party-alignment medians for every member). Roll calls are
 * immutable, so each run only fetches votes not already in cache; the full
 * cold build is ~600 upstream fetches (~2 min), warm runs are seconds.
 *
 * House builds from the Congress.gov-backed corpus. Senate builds from the
 * mirrored corpus that the sync-senate-votes GitHub Actions workflow pushes
 * through the ingest route (senate.gov XML is Akamai-blocked from Vercel
 * IPs — MR10 — so production never fetches it directly). Until the mirror's
 * first run, the Senate build returns null and the card renders its
 * designed unavailable state.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { buildChamberBaselines } from '@/lib/intelligence/analyzers/chamber-baselines';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Mirrors the analyzer's default per-run fetch budget (200s of the 300s). */
const HOUSE_FETCH_BUDGET_MS = 200_000;
const HOUSE_RETRY_IF_FAILED_WITHIN_MS = 60_000;
const HOUSE_RETRY_DELAY_MS = 3_000;

async function runBuilds() {
  const startTime = Date.now();

  let house = await buildChamberBaselines('House');
  // A fast null is a vote-list fetch failure (Congress.gov timeout), not a
  // budget exhaustion — one retry inside the remaining window usually lands.
  const firstAttemptMs = Date.now() - startTime;
  if (!house && firstAttemptMs < HOUSE_RETRY_IF_FAILED_WITHIN_MS) {
    logger.warn('House baselines build failed fast — retrying once', { firstAttemptMs });
    await new Promise(r => setTimeout(r, HOUSE_RETRY_DELAY_MS));
    house = await buildChamberBaselines('House', undefined, {
      fetchBudgetMs: HOUSE_FETCH_BUDGET_MS - (Date.now() - startTime),
    });
  }
  let senate = null;
  try {
    senate = await buildChamberBaselines('Senate');
  } catch (error) {
    logger.warn('Senate baselines build failed', { error });
  }

  const summary = {
    house: house
      ? {
          rollCallsAnalyzed: house.rollCallsAnalyzed,
          members: Object.keys(house.members).length,
          medianMissedPct: house.medianMissedPct,
          dataAsOf: house.dataAsOf,
        }
      : null,
    senate: senate
      ? {
          rollCallsAnalyzed: senate.rollCallsAnalyzed,
          members: Object.keys(senate.members).length,
          dataAsOf: senate.dataAsOf,
        }
      : null,
    processingTimeMs: Date.now() - startTime,
  };

  logger.info('Chamber baselines cron complete', summary);
  return summary;
}

function authorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
}

// Vercel cron invokes GET; POST kept for manual/scripted runs.
export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(await runBuilds());
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(await runBuilds());
}
