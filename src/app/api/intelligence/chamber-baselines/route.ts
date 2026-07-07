/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Chamber Baselines API
 *
 * GET /api/intelligence/chamber-baselines?chamber=house|senate
 *   Returns the cached baselines summary (medians + coverage, without the
 *   full per-member map). 404 with a designed reason when no build exists.
 *
 * GET /api/intelligence/chamber-baselines?chamber=house&build=true
 *   Triggers a full build. Expensive (~one upstream fetch per roll call),
 *   so it requires CRON_SECRET bearer auth — invoked by cron/warmup, never
 *   by page rendering. Page code reads via getChamberBaselines() only.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import {
  buildChamberBaselines,
  getChamberBaselines,
} from '@/lib/intelligence/analyzers/chamber-baselines';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const chamberParam = (searchParams.get('chamber') || 'house').toLowerCase();

  if (chamberParam !== 'house' && chamberParam !== 'senate') {
    return NextResponse.json({ error: 'chamber must be "house" or "senate"' }, { status: 400 });
  }
  const chamber = chamberParam === 'house' ? 'House' : 'Senate';

  if (searchParams.get('build') === 'true') {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional fetch-budget override (seconds) for local/manual cold fills;
    // the Vercel cron uses the default, which fits its 300s window.
    const budgetSeconds = parseInt(searchParams.get('budget') || '', 10);
    const built = await buildChamberBaselines(chamber, undefined, {
      fetchBudgetMs: Number.isFinite(budgetSeconds) ? budgetSeconds * 1000 : undefined,
    });
    if (!built) {
      return NextResponse.json(
        { error: 'Build produced no roll calls — see logs' },
        { status: 502 }
      );
    }

    logger.info('Chamber baselines build triggered via API', { chamber });
    return NextResponse.json({
      built: true,
      chamber: built.chamber,
      congress: built.congress,
      rollCallsAnalyzed: built.rollCallsAnalyzed,
      members: Object.keys(built.members).length,
      dataAsOf: built.dataAsOf,
    });
  }

  const baselines = await getChamberBaselines(chamber);
  if (!baselines) {
    return NextResponse.json(
      {
        available: false,
        reason: 'Baselines have not been built for this chamber yet.',
      },
      { status: 404 }
    );
  }

  // Summary only — the per-member map is served to pages via the service.
  const { members, ...summary } = baselines;
  return NextResponse.json(
    { available: true, ...summary, memberCount: Object.keys(members).length },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
  );
}
