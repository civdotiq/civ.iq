/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Election total-spent endpoint (PR 19).
 *
 * Sum of:
 *   1. Each candidate's committee disbursements (from /candidate/{id}/totals/)
 *   2. Schedule E independent expenditures targeting either candidate
 *      (from /schedules/schedule_e/by_candidate/?candidate_id=...)
 *
 * IE totals are the support+oppose sum across both candidates — the
 * money is in the race even when it opposes one side. We do NOT
 * deduplicate cross-candidate IE rows because by_candidate already
 * partitions by candidate target.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import type { ElectionTotalSpentPayload } from '@/types/elections';

export const dynamic = 'force-dynamic';
export const maxDuration = 12;

const FEC_API_BASE = 'https://api.open.fec.gov/v1';
const CANDIDATE_ID_RE = /^[HSP]\d[A-Z]{2}\d{5}$/;

interface FecTotalsRow {
  disbursements: number | null;
}

interface FecScheduleEByCandidateRow {
  candidate_id: string;
  cycle: number;
  total: number;
  count: number;
}

async function fecGet<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`${FEC_API_BASE}${path}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'CivicIntelHub/1.0',
      'X-API-Key': apiKey,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`FEC ${path} ${res.status}`);
  }
  return (await res.json()) as T;
}

async function loadDisbursements(
  candidateId: string,
  cycle: number,
  apiKey: string
): Promise<number> {
  try {
    const json = await fecGet<{ results?: FecTotalsRow[] }>(
      `/candidate/${candidateId}/totals/?cycle=${cycle}&per_page=1`,
      apiKey
    );
    const row = json.results?.[0];
    const value = row?.disbursements ?? 0;
    return Number.isFinite(value) ? value : 0;
  } catch (error) {
    logger.warn(
      `[elections/total-spent] disbursements lookup failed for ${candidateId}: ${(error as Error).message}`
    );
    return 0;
  }
}

async function loadIndependentExpenditures(
  candidateId: string,
  cycle: number,
  apiKey: string
): Promise<number> {
  try {
    const json = await fecGet<{ results?: FecScheduleEByCandidateRow[] }>(
      `/schedules/schedule_e/by_candidate/?candidate_id=${candidateId}&cycle=${cycle}&per_page=100`,
      apiKey
    );
    const rows = json.results ?? [];
    return rows.reduce((sum, r) => sum + (Number.isFinite(r.total) ? r.total : 0), 0);
  } catch (error) {
    logger.warn(
      `[elections/total-spent] schedule_e lookup failed for ${candidateId}: ${(error as Error).message}`
    );
    return 0;
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raceId = (id ?? '').trim().toUpperCase();

  const idsParam = (request.nextUrl.searchParams.get('ids') ?? '').trim();
  const cycleParam = request.nextUrl.searchParams.get('cycle');
  const cycle = cycleParam ? parseInt(cycleParam, 10) : NaN;

  if (!Number.isFinite(cycle) || cycle < 1980 || cycle > 2100) {
    return NextResponse.json({ error: 'Invalid cycle.', raceId }, { status: 400 });
  }

  const ids = idsParam
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ error: 'ids query param required.', raceId }, { status: 400 });
  }
  for (const cid of ids) {
    if (!CANDIDATE_ID_RE.test(cid)) {
      return NextResponse.json({ error: `Invalid candidate id: ${cid}`, raceId }, { status: 400 });
    }
  }

  const apiKey = process.env.FEC_API_KEY;
  if (!apiKey) {
    logger.error('[elections/total-spent] FEC_API_KEY missing');
    return NextResponse.json({ error: 'FEC API key not configured', raceId }, { status: 500 });
  }

  try {
    const [disbArr, ieArr] = await Promise.all([
      Promise.all(ids.map(cid => loadDisbursements(cid, cycle, apiKey))),
      Promise.all(ids.map(cid => loadIndependentExpenditures(cid, cycle, apiKey))),
    ]);

    const candidateDisbursements = disbArr.reduce((a, b) => a + b, 0);
    const independentExpenditures = ieArr.reduce((a, b) => a + b, 0);
    const total = candidateDisbursements + independentExpenditures;

    const payload: ElectionTotalSpentPayload = {
      raceId,
      cycle,
      totalSpent: total,
      breakdown: {
        candidateDisbursements,
        independentExpenditures,
        total,
      },
      dataAsOf: new Date().toISOString(),
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    logger.error('[elections/total-spent] failed', error as Error, { raceId });
    return NextResponse.json({ error: 'Failed to fetch total spent', raceId }, { status: 502 });
  }
}
