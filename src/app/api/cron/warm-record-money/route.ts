/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Warm-Record-Money Cron Job
 *
 * Keeps a Redis copy of every sitting member's Record Card money section
 * (~6 FEC calls to build). The card serves that copy stale-while-revalidate
 * (fresh 24h, stale up to 30 days), so an ISR render reads Redis instead of
 * spending the 60/min FEC key — whose exhaustion used to show visitors a
 * false "No campaign finance filings found".
 *
 * Pacing: one slice of 20 members at "5,35 * * * *", run at cron FEC
 * priority so the limiter yields to live traffic. ~6 calls x 20 = ~240 FEC
 * calls/hr; 535 members cycle in ~13.5h, inside the 24h freshness window.
 * The slice stops at the first FEC failure. Shares the cron FEC ceiling with
 * warm-intelligence (:00/:30), hence the offset schedule.
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}` (rejected with 401 otherwise).
 */

import type { NextRequest } from 'next/server';
import { createWarmSliceHandler } from '@/lib/cron/warm-slice';
import { runWithFecPriority } from '@/lib/fec/fec-rate-limiter';
import { warmRecordCardMoney } from '@/features/record-card/record-card-data';

export const dynamic = 'force-dynamic';

export const POST = createWarmSliceHandler({
  logTag: 'WARM-RECORD-MONEY',
  operation: 'warm_record_money_cron',
  cursorKey: 'cron:warm-record-money:cursor',
  sliceSizeEnv: 'WARM_RECORD_MONEY_SLICE_SIZE',
  defaultSliceSize: 20,
  timeBudgetMs: 240_000,
  statuses: ['refreshed', 'fresh', 'locked', 'none', 'incomplete'] as const,
  warm: rep => warmRecordCardMoney(rep.bioguideId, rep.state),
  runSlice: fn => runWithFecPriority('cron', fn),
});

// Allow GET so Vercel cron (which uses GET) and manual `curl` triggers work.
export async function GET(request: NextRequest) {
  return POST(request);
}
