/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Thin wrapper around fecApiService.getCommitteeDisbursementsByRecipient
 * for the redesigned PAC profile (PR 17). Returns the top recipients
 * for a given cycle so the page can render an 8-row ranked panel.
 *
 * The disbursements payload does not carry candidate party — the page
 * renders amounts in ink and only links to /representative/[bioguideId]
 * when the recipient resolves to a known FEC committee with linked
 * candidate ids. Resolution is best-effort and fail-soft.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { fecApiService } from '@/lib/fec/fec-api-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 12;

const COMMITTEE_ID_RE = /^C\d{8}$/;
const DEFAULT_CYCLE = 2026;
const DEFAULT_LIMIT = 12;

function parseCycle(raw: string | null): number {
  if (!raw) return DEFAULT_CYCLE;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1980 || n > 2100) return DEFAULT_CYCLE;
  return n;
}

function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || n > 50) return DEFAULT_LIMIT;
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
  const limit = parseLimit(request.nextUrl.searchParams.get('limit'));

  try {
    const page = await fecApiService.getCommitteeDisbursementsByRecipient(id, cycle, 1, limit);
    const recipients = (page.results ?? []).slice(0, limit).map(r => ({
      recipientId: r.recipient_id,
      recipientName: r.recipient_name,
      total: r.total,
      count: r.count,
    }));

    return NextResponse.json(
      {
        committeeId: id,
        cycle,
        recipients,
        dataAsOf: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    logger.error('[PAC API · recipients] failed', error as Error, { committeeId: id, cycle });
    return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 502 });
  }
}
