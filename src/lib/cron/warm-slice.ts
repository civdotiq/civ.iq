/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Shared route handler for the rotating per-member warming crons.
 *
 * Each invocation warms one slice of sitting members, one at a time:
 *   - The slice stops at the first thrown error (usually an upstream 429) so
 *     the remaining upstream budget stays with live traffic.
 *   - It stops starting new members once the time budget is spent.
 *   - The cursor advances only past the members actually attempted.
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}` (401 otherwise).
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { isAuthorizedCron } from '@/lib/cron/auth';
import { readCronCursor, writeCronCursor } from '@/lib/cron/cursor';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import type { EnhancedRepresentative } from '@/types/representative';

export interface WarmSliceConfig<S extends string> {
  /** Log tag and operation name, e.g. 'WARM-BILLS' / 'warm_member_bills_cron'. */
  logTag: string;
  operation: string;
  cursorKey: string;
  /** Env var that overrides the slice size. */
  sliceSizeEnv: string;
  defaultSliceSize: number;
  timeBudgetMs: number;
  /** Non-error outcomes, each counted in the response summary. */
  statuses: readonly S[];
  /** Warm one member. Throwing stops the slice. */
  warm: (rep: EnhancedRepresentative) => Promise<S>;
  /** Wraps the whole slice, e.g. to run it at cron FEC priority. */
  runSlice?: <T>(fn: () => Promise<T>) => Promise<T>;
}

interface MemberOutcome {
  bioguideId: string;
  status: string;
  elapsedMs: number;
  error?: string;
}

function getSliceSize(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function warmSlice<S extends string>(
  config: WarmSliceConfig<S>,
  reps: EnhancedRepresentative[],
  start: number,
  startTime: number
): Promise<MemberOutcome[]> {
  const sliceSize = Math.min(
    getSliceSize(config.sliceSizeEnv, config.defaultSliceSize),
    reps.length
  );
  const outcomes: MemberOutcome[] = [];
  for (let i = 0; i < sliceSize; i++) {
    if (Date.now() - startTime > config.timeBudgetMs) break;
    const rep = reps[(start + i) % reps.length]!;
    const memberStart = Date.now();
    try {
      const status = await config.warm(rep);
      outcomes.push({ bioguideId: rep.bioguideId, status, elapsedMs: Date.now() - memberStart });
    } catch (error) {
      outcomes.push({
        bioguideId: rep.bioguideId,
        status: 'error',
        elapsedMs: Date.now() - memberStart,
        error: error instanceof Error ? error.message : String(error),
      });
      // Leave the rest of the upstream budget to live traffic.
      break;
    }
  }
  return outcomes;
}

export function createWarmSliceHandler<S extends string>(
  config: WarmSliceConfig<S>
): (request: NextRequest) => Promise<NextResponse> {
  const { logTag, operation } = config;

  return async function handler(request: NextRequest) {
    const startTime = Date.now();

    if (!isAuthorizedCron(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const reps = await getAllEnhancedRepresentatives();
      if (reps.length === 0) {
        logger.warn(`[${logTag}] no representatives returned — skipping slice`, { operation });
        return NextResponse.json({ success: true, warmed: 0, nextCursor: 0, totalReps: 0 });
      }

      const start = await readCronCursor(config.cursorKey, reps.length);
      const run = () => warmSlice(config, reps, start, startTime);
      const outcomes = await (config.runSlice ? config.runSlice(run) : run());

      const nextCursor = (start + outcomes.length) % reps.length;
      await writeCronCursor(config.cursorKey, nextCursor);

      const summary: Record<string, number> = {};
      for (const status of config.statuses) {
        summary[status] = outcomes.filter(o => o.status === status).length;
      }
      summary.errors = outcomes.filter(o => o.status === 'error').length;
      const totalTimeMs = Date.now() - startTime;

      logger.info(`[${logTag}] slice complete`, {
        operation,
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
      logger.error(`[${logTag}] slice failed`, error as Error, { operation, totalTimeMs });
      return NextResponse.json(
        {
          success: false,
          error: `${logTag} cron failed`,
          message: (error as Error).message,
          totalTimeMs,
        },
        { status: 500 }
      );
    }
  };
}
