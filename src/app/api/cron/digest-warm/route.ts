/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Digest warming cron.
 *
 * Pre-assembles the latest complete week for the pilot set of states so a
 * real visitor never eats the cold ~40s build. getDigestIssue caches issues
 * for 30 days, so this is idempotent: an already-warm state returns from
 * cache instantly. Michigan is warmed first because it populates the
 * national vote/bill/meaning caches every other state reuses — after that
 * the rest only pay their delegation + FEC lookups.
 *
 * FEC filing lookups run through the shared 60/min limiter, so states are
 * warmed serially, not in parallel. A time budget stops the run short of
 * the function limit and reports which states were deferred rather than
 * silently dropping them; the next run (or ?states=) picks them up.
 *
 * Overrides: ?week=YYYY-Www to backfill, ?states=CA,TX to target a set.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDigestIssue, DIGEST_WARM_STATES } from '@/lib/digest/assemble';
import { latestCompleteWeekId } from '@/lib/digest/week';
import { isValidStateCode } from '@/lib/data/us-states';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Stop before the 300s function limit so the summary always returns. */
const TIME_BUDGET_MS = 270_000;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  const weekId = request.nextUrl.searchParams.get('week') ?? latestCompleteWeekId();

  const statesParam = request.nextUrl.searchParams.get('states');
  const states = statesParam
    ? statesParam
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(isValidStateCode)
    : [...DIGEST_WARM_STATES];

  const warmed: string[] = [];
  const failed: string[] = [];
  const deferred: string[] = [];

  for (const state of states) {
    if (Date.now() - started > TIME_BUDGET_MS) {
      deferred.push(state);
      continue;
    }
    try {
      const issue = await getDigestIssue(state, weekId);
      if (issue) warmed.push(state);
      else failed.push(state);
    } catch (error) {
      failed.push(state);
      logger.warn('[DigestWarm] state assembly threw', {
        state,
        weekId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const summary = {
    ok: true,
    weekId,
    warmed,
    failed,
    deferred,
    elapsedMs: Date.now() - started,
  };
  logger.info('[DigestWarm] complete', summary);
  return NextResponse.json(summary);
}
