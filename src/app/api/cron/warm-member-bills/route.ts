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

import type { NextRequest } from 'next/server';
import { createWarmSliceHandler } from '@/lib/cron/warm-slice';
import { warmComprehensiveBillsByMember } from '@/services/congress/optimized-congress.service';

export const dynamic = 'force-dynamic';

export const POST = createWarmSliceHandler({
  logTag: 'WARM-BILLS',
  operation: 'warm_member_bills_cron',
  cursorKey: 'cron:warm-member-bills:cursor',
  sliceSizeEnv: 'WARM_MEMBER_BILLS_SLICE_SIZE',
  defaultSliceSize: 20,
  timeBudgetMs: 240_000,
  statuses: ['refreshed', 'fresh', 'locked'] as const,
  warm: rep => warmComprehensiveBillsByMember(rep.bioguideId),
});

// Allow GET so Vercel cron (which uses GET) and manual `curl` triggers work.
export async function GET(request: NextRequest) {
  return POST(request);
}
