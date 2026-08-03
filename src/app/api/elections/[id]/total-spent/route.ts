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
import { reserveFecCall } from '@/lib/fec/fec-rate-limiter';
import logger from '@/lib/logging/simple-logger';
import type { ElectionTotalSpentPayload } from '@/types/elections';

export const dynamic = 'force-dynamic';
export const maxDuration = 12;

const FEC_API_BASE = 'https://api.open.fec.gov/v1';
const CANDIDATE_ID_RE = /^[HSP]\d[A-Z]{2}\d{5}$/;
// Page callers send 2 ids (D + R); 12 is a generous ceiling that still
// bounds the FEC fan-out (2 calls per candidate) under the shared key.
const MAX_CANDIDATE_IDS = 12;
// Candidates processed at a time → at most 8 concurrent FEC calls.
const CANDIDATE_CONCURRENCY = 4;

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
  // Account this request against the shared per-minute FEC budget (live
  // priority by default — see fec-rate-limiter; only cron contexts throttle).
  const reservation = await reserveFecCall();
  if (!reservation.allowed) {
    throw new Error(
      `FEC budget reserved for live traffic — call throttled (${reservation.count}/${reservation.ceiling} this minute)`
    );
  }
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

/** Returns the dollar amount, or null when the FEC lookup failed (≠ a real $0). */
async function loadDisbursements(
  candidateId: string,
  cycle: number,
  apiKey: string
): Promise<number | null> {
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
    return null;
  }
}

// schedule_e/by_candidate returns one row per spending committee per
// support/oppose position, so a contested race runs to several hundred rows.
// A single page silently truncates the sum, which is worse than saying so —
// page through, bounded, because each page spends the shared FEC budget.
const IE_PAGE_SIZE = 100;
const IE_MAX_PAGES = 4;

/**
 * Total independent expenditures for or against this candidate.
 *
 * `complete` is false when the page bound was hit before FEC ran out of rows:
 * the amount is then a floor, and the caller must not publish it as the total.
 * Returns null when the lookup failed outright (≠ a real $0).
 */
async function loadIndependentExpenditures(
  candidateId: string,
  cycle: number,
  apiKey: string
): Promise<{ amount: number; complete: boolean } | null> {
  try {
    let amount = 0;
    let complete = false;

    for (let page = 1; page <= IE_MAX_PAGES; page++) {
      const json = await fecGet<{
        results?: FecScheduleEByCandidateRow[];
        pagination?: { pages?: number };
      }>(
        `/schedules/schedule_e/by_candidate/?candidate_id=${candidateId}&cycle=${cycle}&per_page=${IE_PAGE_SIZE}&page=${page}`,
        apiKey
      );
      const rows = json.results ?? [];
      amount += rows.reduce((sum, r) => sum + (Number.isFinite(r.total) ? r.total : 0), 0);

      const pages = json.pagination?.pages ?? 1;
      if (page >= pages || rows.length < IE_PAGE_SIZE) {
        complete = true;
        break;
      }
    }

    if (!complete) {
      logger.warn(
        `[elections/total-spent] schedule_e page bound hit for ${candidateId} — IE total is a floor`
      );
    }
    return { amount, complete };
  } catch (error) {
    logger.warn(
      `[elections/total-spent] schedule_e lookup failed for ${candidateId}: ${(error as Error).message}`
    );
    return null;
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
  if (ids.length > MAX_CANDIDATE_IDS) {
    return NextResponse.json(
      { error: `Too many candidate ids (max ${MAX_CANDIDATE_IDS}).`, raceId },
      { status: 400 }
    );
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
    // Bounded concurrency: each candidate fires 2 FEC calls, so process
    // CANDIDATE_CONCURRENCY candidates at a time instead of all at once.
    const spends: Array<{
      disbursements: number | null;
      independentExpenditures: { amount: number; complete: boolean } | null;
    }> = [];
    for (let i = 0; i < ids.length; i += CANDIDATE_CONCURRENCY) {
      const chunk = ids.slice(i, i + CANDIDATE_CONCURRENCY);
      const chunkResults = await Promise.all(
        chunk.map(async cid => {
          const [disbursements, independentExpenditures] = await Promise.all([
            loadDisbursements(cid, cycle, apiKey),
            loadIndependentExpenditures(cid, cycle, apiKey),
          ]);
          return { disbursements, independentExpenditures };
        })
      );
      spends.push(...chunkResults);
    }

    // A candidate is "failed" when either FEC lookup errored — its share of
    // the total is unknown, which is different from a real $0.
    const failedCandidates = spends.filter(
      s => s.disbursements === null || s.independentExpenditures === null
    ).length;

    if (failedCandidates === ids.length) {
      return NextResponse.json(
        { error: 'FEC lookups failed for all candidates', raceId },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const candidateDisbursements = spends.reduce((a, s) => a + (s.disbursements ?? 0), 0);
    const independentExpenditures = spends.reduce(
      (a, s) => a + (s.independentExpenditures?.amount ?? 0),
      0
    );
    const total = candidateDisbursements + independentExpenditures;

    // A truncated IE walk is incomplete for the same reason a failed lookup is:
    // the published total is under the real one, and must not be cached as final.
    const truncatedCandidates = spends.filter(
      s => s.independentExpenditures !== null && !s.independentExpenditures.complete
    ).length;
    const incomplete = failedCandidates > 0 || truncatedCandidates > 0;

    const payload: ElectionTotalSpentPayload & {
      incomplete?: boolean;
      failedCandidates?: number;
      truncatedCandidates?: number;
    } = {
      raceId,
      cycle,
      totalSpent: total,
      breakdown: {
        candidateDisbursements,
        independentExpenditures,
        total,
      },
      dataAsOf: new Date().toISOString(),
      ...(incomplete ? { incomplete: true, failedCandidates, truncatedCandidates } : {}),
    };

    return NextResponse.json(payload, {
      headers: {
        // Incomplete totals get a short CDN-only TTL; complete totals keep the
        // long TTL but CDN-only (s-maxage) so wrong data stays purgeable.
        'Cache-Control': incomplete
          ? 'public, s-maxage=300'
          : 'public, s-maxage=86400, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    logger.error('[elections/total-spent] failed', error as Error, { raceId });
    return NextResponse.json(
      { error: 'Failed to fetch total spent', raceId },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
