/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Federal award detail endpoint (PR 18).
 *
 * Direct call to USASpending GET /awards/{id}/ — no FPDS-NG inference,
 * no derived fields. Pulls hero, both parties, period of performance,
 * obligated/ceiling, and contract type data. Empty arrays / null
 * fields when USASpending omits a value (e.g., recipient.location on
 * foreign vendors) — the client renders "—" rather than guessing.
 *
 * Example URL:
 *   /api/spending/awards/CONT_AWD_NAS1510000_8000_-NONE-_-NONE-/
 *
 * USASpending docs:
 *   https://api.usaspending.gov/docs/endpoints#award-id
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import type { USASpendingAwardDetailResponse } from '@/types/spending';

export const dynamic = 'force-dynamic';
export const maxDuration = 12;

const USASPENDING_API = 'https://api.usaspending.gov/api/v2';
const AWARD_ID_RE = /^[A-Z0-9_\-]{8,200}$/i;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const awardId = (id ?? '').trim();

  if (!AWARD_ID_RE.test(awardId)) {
    return NextResponse.json({ error: 'Invalid award ID format.' }, { status: 400 });
  }

  try {
    const url = `${USASPENDING_API}/awards/${encodeURIComponent(awardId)}/`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 404) {
      return NextResponse.json({ error: 'Award not found', awardId }, { status: 404 });
    }

    if (!res.ok) {
      logger.warn(`[spending/awards] USASpending returned ${res.status} for ${awardId}`);
      return NextResponse.json(
        { error: `USASpending API responded with ${res.status}`, awardId },
        { status: 502 }
      );
    }

    const detail = (await res.json()) as USASpendingAwardDetailResponse;

    return NextResponse.json(
      { award: detail, dataAsOf: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    logger.error('[spending/awards] failed', error as Error, { awardId });
    return NextResponse.json({ error: 'Failed to fetch award detail', awardId }, { status: 502 });
  }
}
