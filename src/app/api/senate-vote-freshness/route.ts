/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * GET /api/senate-vote-freshness
 *
 * How current the stored Senate votes are, for client-rendered vote lists:
 * { latestVoteDate, checkedAt, stale, missing }. `stale` is true only when the
 * Congressional Record lists Senate roll calls we don't have. One small Redis
 * read; the blanket /api CDN rule caches it for 5 minutes.
 */

import { NextResponse } from 'next/server';
import { getSenateVoteFreshness } from '@/features/representatives/services/senate-vote-freshness';

export const dynamic = 'force-dynamic';

export async function GET() {
  const freshness = await getSenateVoteFreshness();
  if (!freshness) {
    return NextResponse.json({ error: 'Senate vote freshness unavailable' }, { status: 503 });
  }
  return NextResponse.json(freshness);
}
