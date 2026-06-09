/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * PAC donors-by-size endpoint (PR 17).
 *
 * Direct call to FEC's /schedules/schedule_a/by_size/ aggregation —
 * fecApiService does not yet expose a committee-id-keyed wrapper for
 * this endpoint (the existing getContributionsBySize takes a candidate
 * id and resolves to a principal committee). Calling FEC directly here
 * keeps the PAC profile honest about its data source: tier buckets
 * are aggregate-by-gift-size, not named-donor rows.
 */

import { NextRequest, NextResponse } from 'next/server';
import { reserveFecCall } from '@/lib/fec/fec-rate-limiter';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 12;

const COMMITTEE_ID_RE = /^C\d{8}$/;
const FEC_API_BASE = 'https://api.open.fec.gov/v1';
const DEFAULT_CYCLE = 2026;

interface FECBySizeResult {
  size: number;
  total: number;
  count: number;
}

interface FECApiPayload<T> {
  results?: T[];
}

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

  const apiKey = process.env.FEC_API_KEY;
  if (!apiKey) {
    logger.error('[PAC API · donors-by-size] FEC_API_KEY missing');
    return NextResponse.json({ error: 'FEC API key not configured' }, { status: 500 });
  }

  const cycle = parseCycle(request.nextUrl.searchParams.get('cycle'));
  const url = `${FEC_API_BASE}/schedules/schedule_a/by_size/?committee_id=${id}&cycle=${cycle}&per_page=20`;

  try {
    // Account this request against the shared per-minute FEC budget (live
    // priority by default — see fec-rate-limiter; only cron contexts throttle).
    const reservation = await reserveFecCall();
    if (!reservation.allowed) {
      throw new Error(
        `FEC budget reserved for live traffic — call throttled (${reservation.count}/${reservation.ceiling} this minute)`
      );
    }
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivicIntelHub/1.0',
        'X-API-Key': apiKey,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      logger.warn(`[PAC API · donors-by-size] FEC returned ${res.status} for ${id} cycle ${cycle}`);
      return NextResponse.json(
        { error: `FEC API responded with ${res.status}`, committeeId: id, cycle, buckets: [] },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    const json = (await res.json()) as FECApiPayload<FECBySizeResult>;
    const results = (json.results ?? []).filter(
      r =>
        Number.isFinite(r.size) &&
        Number.isFinite(r.total) &&
        Number.isFinite(r.count) &&
        r.size >= 0
    );

    const buckets = results
      .map(r => ({ size: Number(r.size), total: Number(r.total), count: Number(r.count) }))
      .sort((a, b) => a.size - b.size);

    return NextResponse.json(
      {
        committeeId: id,
        cycle,
        buckets,
        dataAsOf: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    logger.error('[PAC API · donors-by-size] failed', error as Error, {
      committeeId: id,
      cycle,
    });
    return NextResponse.json(
      { error: 'Failed to fetch donor-size buckets', committeeId: id, cycle, buckets: [] },
      { status: 502 }
    );
  }
}
