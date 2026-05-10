/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Thin wrapper around fecApiService.getCommitteeTotals for the redesigned
 * PAC profile (PR 17). ?cycle=N (default 2026). Returns null body with
 * 404 when no totals exist for the cycle (real-data-or-empty pattern).
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { fecApiService } from '@/lib/fec/fec-api-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 12;

const COMMITTEE_ID_RE = /^C\d{8}$/;
const DEFAULT_CYCLE = 2026;

function parseCycle(raw: string | null): number {
  if (!raw) return DEFAULT_CYCLE;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1980 || n > 2100) return DEFAULT_CYCLE;
  return n;
}

export async function GET(
  request: NextRequest,
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

  const cycle = parseCycle(request.nextUrl.searchParams.get('cycle'));

  try {
    const totals = await fecApiService.getCommitteeTotals(id, cycle);
    if (!totals) {
      return NextResponse.json(
        { error: 'No totals available for this committee and cycle', cycle },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        cycle: totals.cycle,
        receipts: totals.receipts ?? 0,
        disbursements: totals.disbursements ?? 0,
        cashOnHand: totals.last_cash_on_hand_end_period ?? 0,
        individualContributions: totals.individual_contributions ?? 0,
        otherCommitteeContributions: totals.other_political_committee_contributions ?? 0,
        independentExpenditures: totals.independent_expenditures ?? 0,
        coverageStartDate: totals.coverage_start_date,
        coverageEndDate: totals.coverage_end_date,
        dataAsOf: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    logger.error('[PAC API · totals] failed', error as Error, { committeeId: id, cycle });
    return NextResponse.json({ error: 'Failed to fetch committee totals' }, { status: 502 });
  }
}
