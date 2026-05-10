/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Cycle-by-cycle raise + disburse for the PAC profile chart (PR 17).
 *
 * Five parallel calls to fecApiService.getCommitteeTotals for cycles
 * [2018, 2020, 2022, 2024, 2026], returning the shape consumed by
 * <CycleSpendChart />. The reference design draws quarterly bars; we
 * cannot render quarterly without parsing Form 3X filings, so the
 * honest substitution is per-cycle aggregates from /committee/totals/.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { fecApiService } from '@/lib/fec/fec-api-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const COMMITTEE_ID_RE = /^C\d{8}$/;
const CYCLES: readonly number[] = [2018, 2020, 2022, 2024, 2026];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ committeeId: string }> }
) {
  const { committeeId } = await params;
  const id = (committeeId ?? '').toUpperCase();

  if (!COMMITTEE_ID_RE.test(id)) {
    return NextResponse.json(
      { error: 'Invalid committee ID format. Expected C followed by 8 digits.' },
      { status: 400 }
    );
  }

  try {
    const results = await Promise.all(
      CYCLES.map(async cycle => {
        try {
          const t = await fecApiService.getCommitteeTotals(id, cycle);
          if (!t) return { cycle, raised: 0, disbursed: 0, hasData: false };
          return {
            cycle,
            raised: t.receipts ?? 0,
            disbursed: t.disbursements ?? 0,
            hasData: true,
          };
        } catch (err) {
          logger.warn(`[PAC API · cycles] cycle ${cycle} failed for ${id}: ${String(err)}`);
          return { cycle, raised: 0, disbursed: 0, hasData: false };
        }
      })
    );

    return NextResponse.json(
      {
        committeeId: id,
        cycles: results,
        dataAsOf: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    logger.error('[PAC API · cycles] failed', error as Error, { committeeId: id });
    return NextResponse.json({ error: 'Failed to fetch cycle history' }, { status: 502 });
  }
}
