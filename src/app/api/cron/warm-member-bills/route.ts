/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Warm-Member-Bills Cron Job
 *
 * Keeps a Redis copy of every sitting member's bill walk (sponsored +
 * cosponsored legislation, the ~12s cold path behind /ask/bills-sponsored and
 * the profile bills tab). getComprehensiveBillsByMember serves that copy
 * stale-while-revalidate for up to 7 days, so a cold ISR render after a
 * deploy reads Redis instead of walking Congress.gov.
 *
 * Pacing against the shared Congress.gov key (5,000 req/hr with live traffic):
 *   - One slice of SLICE_SIZE members per invocation, warmed one at a time.
 *     A walk is 3-9 requests, so a 20-member slice is at most ~180 requests.
 *   - At "15,45 * * * *" that is <= 360 req/hr; 535 members cycle in ~13.5h.
 *   - Members whose copy is still fresh are skipped at no upstream cost.
 *   - The slice stops at the first upstream failure (usually a 429) so the
 *     remaining hourly budget stays with live traffic, and stops starting new
 *     walks once TIME_BUDGET_MS is spent. The cursor advances only past the
 *     members actually attempted.
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}` (rejected with 401 otherwise).
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { isAuthorizedCron } from '@/lib/cron/auth';
import { readCronCursor, writeCronCursor } from '@/lib/cron/cursor';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { warmComprehensiveBillsByMember } from '@/services/congress/optimized-congress.service';

export const dynamic = 'force-dynamic';

const DEFAULT_SLICE_SIZE = 20;
const TIME_BUDGET_MS = 240_000;
const CURSOR_KEY = 'cron:warm-member-bills:cursor';

function getSliceSize(): number {
  const raw = process.env.WARM_MEMBER_BILLS_SLICE_SIZE;
  if (!raw) return DEFAULT_SLICE_SIZE;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SLICE_SIZE;
}

interface MemberOutcome {
  bioguideId: string;
  status: 'fresh' | 'refreshed' | 'locked' | 'error';
  elapsedMs: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const reps = await getAllEnhancedRepresentatives();
    if (reps.length === 0) {
      logger.warn('[WARM-BILLS] no representatives returned — skipping slice', {
        operation: 'warm_member_bills_cron',
      });
      return NextResponse.json({ success: true, warmed: 0, nextCursor: 0, totalReps: 0 });
    }

    const start = await readCronCursor(CURSOR_KEY, reps.length);
    const sliceSize = Math.min(getSliceSize(), reps.length);

    const outcomes: MemberOutcome[] = [];
    for (let i = 0; i < sliceSize; i++) {
      if (Date.now() - startTime > TIME_BUDGET_MS) break;
      const bioguideId = reps[(start + i) % reps.length]!.bioguideId;
      const memberStart = Date.now();
      try {
        const status = await warmComprehensiveBillsByMember(bioguideId);
        outcomes.push({ bioguideId, status, elapsedMs: Date.now() - memberStart });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        outcomes.push({
          bioguideId,
          status: 'error',
          elapsedMs: Date.now() - memberStart,
          error: message,
        });
        // Leave the rest of the hourly Congress.gov budget to live traffic.
        break;
      }
    }

    const nextCursor = (start + outcomes.length) % reps.length;
    await writeCronCursor(CURSOR_KEY, nextCursor);

    const count = (status: MemberOutcome['status']) =>
      outcomes.filter(o => o.status === status).length;
    const summary = {
      refreshed: count('refreshed'),
      fresh: count('fresh'),
      locked: count('locked'),
      errors: count('error'),
    };
    const totalTimeMs = Date.now() - startTime;

    logger.info('[WARM-BILLS] slice complete', {
      operation: 'warm_member_bills_cron',
      sliceStart: start,
      attempted: outcomes.length,
      ...summary,
      nextCursor,
      totalReps: reps.length,
      totalTimeMs,
    });

    return NextResponse.json({
      success: true,
      attempted: outcomes.length,
      ...summary,
      slice: [start, nextCursor],
      nextCursor,
      totalReps: reps.length,
      totalTimeMs,
      members: outcomes,
    });
  } catch (error) {
    const totalTimeMs = Date.now() - startTime;
    logger.error('[WARM-BILLS] slice failed', error as Error, {
      operation: 'warm_member_bills_cron',
      totalTimeMs,
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Warm-member-bills cron failed',
        message: (error as Error).message,
        totalTimeMs,
      },
      { status: 500 }
    );
  }
}

// Allow GET so Vercel cron (which uses GET) and manual `curl` triggers work.
export async function GET(request: NextRequest) {
  return POST(request);
}
