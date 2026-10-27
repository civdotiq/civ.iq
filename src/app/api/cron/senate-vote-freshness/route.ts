/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Senate Vote Freshness Cron
 *
 * Twice a day (14:17 and 22:17 UTC; the Congressional Record comes out the
 * morning after each session day) reads the Record's Daily Digest and checks
 * whether the Senate has held roll-call votes we don't have. Saves a note in
 * Redis that vote pages, APIs and /api/health read. See senate-vote-freshness.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkSenateVoteFreshness } from '@/features/representatives/services/senate-vote-freshness';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function authorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
}

// Vercel cron invokes GET; POST kept for manual/scripted runs.
async function handle(request: NextRequest): Promise<NextResponse> {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(await checkSenateVoteFreshness());
}

export const GET = handle;
export const POST = handle;
