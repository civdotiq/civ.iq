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
 * House first (full-Congress coverage), then Senate best-effort — Senate.gov
 * XML is Akamai-blocked from Vercel IPs (MR10), so the Senate build is
 * expected to no-op in prod until the Congress.gov senate-vote endpoints are
 * adopted; the card renders its designed unavailable state meanwhile.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { buildChamberBaselines } from '@/lib/intelligence/analyzers/chamber-baselines';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function runBuilds() {
  const startTime = Date.now();

  const house = await buildChamberBaselines('House');
  let senate = null;
  try {
    senate = await buildChamberBaselines('Senate');
  } catch (error) {
    logger.warn('Senate baselines build failed (expected on Vercel — MR10)', { error });
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
