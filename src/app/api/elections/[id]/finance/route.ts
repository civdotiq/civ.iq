/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Election finance endpoint (PR 19).
 *
 * For each candidate id passed as `?ids=S0OH00133,S2OH00187`, returns a
 * normalized finance block: receipts, cash on hand, disbursements, and
 * percentage breakdown by donor type (individual, PAC, small <$200).
 *
 * Sources:
 *   /candidate/{id}/totals/?cycle=...      → headline aggregates
 *   /candidate/{id}/committees/             → resolve principal committee
 *   /schedules/schedule_a/by_size/...       → small-donor bucket
 *
 * The `?cycle=` query param defaults to current FEC cycle; the page
 * passes the race year explicitly. Any party assertion comes from the
 * separate /elections/[id] header endpoint — this route does not infer it.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import type {
  ElectionFinanceCandidateBlock,
  ElectionFinancePayload,
  ElectionRacePartyChair,
} from '@/types/elections';

export const dynamic = 'force-dynamic';
export const maxDuration = 12;

const FEC_API_BASE = 'https://api.open.fec.gov/v1';
const CANDIDATE_ID_RE = /^[HSP]\d[A-Z]{2}\d{5}$/;

interface FecTotalsRow {
  candidate_id: string;
  cycle: number;
  receipts: number | null;
  disbursements: number | null;
  last_cash_on_hand_end_period: number | null;
  individual_contributions: number | null;
  other_political_committee_contributions: number | null;
  coverage_end_date: string | null;
}

interface FecCommitteeRow {
  committee_id: string;
  designation: string | null;
}

interface FecBySizeRow {
  size: number;
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

function pct(num: number | null, denom: number | null): number | null {
  if (num === null || denom === null || !Number.isFinite(num) || !Number.isFinite(denom)) {
    return null;
  }
  if (denom <= 0) return null;
  const v = (num / denom) * 100;
  if (!Number.isFinite(v)) return null;
  return Math.round(v * 10) / 10;
}

async function loadCandidateBlock(
  candidateId: string,
  cycle: number,
  party: ElectionRacePartyChair,
  apiKey: string
): Promise<ElectionFinanceCandidateBlock | null> {
  const totalsPath = `/candidate/${candidateId}/totals/?cycle=${cycle}&per_page=1`;
  const committeesPath = `/candidate/${candidateId}/committees/?cycle=${cycle}&designation=P&per_page=5`;

  const [totalsResp, committeesResp] = await Promise.all([
    fecGet<{ results?: FecTotalsRow[] }>(totalsPath, apiKey).catch(() => null),
    fecGet<{ results?: FecCommitteeRow[] }>(committeesPath, apiKey).catch(() => null),
  ]);

  const totals = totalsResp?.results?.[0] ?? null;
  if (!totals) return null;

  const principal =
    committeesResp?.results?.find(c => c.designation === 'P') ??
    committeesResp?.results?.[0] ??
    null;

  let smallDonorTotal: number | null = null;
  if (principal?.committee_id) {
    try {
      const sizePath = `/schedules/schedule_a/by_size/?committee_id=${encodeURIComponent(
        principal.committee_id
      )}&cycle=${cycle}&per_page=20`;
      const bySize = await fecGet<{ results?: FecBySizeRow[] }>(sizePath, apiKey);
      const small = (bySize.results ?? []).filter(r => r.size === 0);
      smallDonorTotal = small.reduce((sum, r) => sum + (Number.isFinite(r.total) ? r.total : 0), 0);
      if (!Number.isFinite(smallDonorTotal)) smallDonorTotal = null;
    } catch (error) {
      logger.warn(
        `[elections/finance] by_size failed for ${candidateId}/${principal.committee_id}: ${(error as Error).message}`
      );
    }
  }

  const receipts = Number.isFinite(totals.receipts ?? NaN) ? (totals.receipts as number) : 0;
  const cashOnHand = Number.isFinite(totals.last_cash_on_hand_end_period ?? NaN)
    ? (totals.last_cash_on_hand_end_period as number)
    : 0;
  const disbursements = Number.isFinite(totals.disbursements ?? NaN)
    ? (totals.disbursements as number)
    : 0;

  return {
    candidateId,
    party,
    receipts,
    cashOnHand,
    disbursements,
    individualPct: pct(totals.individual_contributions, receipts),
    pacPct: pct(totals.other_political_committee_contributions, receipts),
    smallDonorPct: pct(smallDonorTotal, receipts),
    smallDonorTotal,
    coverageEndDate: totals.coverage_end_date ?? null,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raceId = (id ?? '').trim().toUpperCase();

  const idsParam = (request.nextUrl.searchParams.get('ids') ?? '').trim();
  const partiesParam = (request.nextUrl.searchParams.get('parties') ?? 'D,R').trim();
  const cycleParam = request.nextUrl.searchParams.get('cycle');
  const cycle = cycleParam ? parseInt(cycleParam, 10) : NaN;

  if (!Number.isFinite(cycle) || cycle < 1980 || cycle > 2100) {
    return NextResponse.json({ error: 'Invalid cycle.', raceId }, { status: 400 });
  }

  const ids = idsParam
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
  const parties = partiesParam
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean) as ElectionRacePartyChair[];

  if (ids.length === 0 || ids.length !== parties.length) {
    return NextResponse.json(
      { error: 'ids and parties must be matched, comma-separated lists.', raceId },
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
    logger.error('[elections/finance] FEC_API_KEY missing');
    return NextResponse.json({ error: 'FEC API key not configured', raceId }, { status: 500 });
  }

  try {
    const blocks = await Promise.all(
      ids.map((cid, i) =>
        loadCandidateBlock(cid, cycle, parties[i] ?? 'D', apiKey).catch(error => {
          logger.warn(
            `[elections/finance] candidate block failed for ${cid}: ${(error as Error).message}`
          );
          return null;
        })
      )
    );

    const candidates = blocks.filter((b): b is ElectionFinanceCandidateBlock => b !== null);

    const payload: ElectionFinancePayload = {
      raceId,
      cycle,
      candidates,
      dataAsOf: new Date().toISOString(),
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    logger.error('[elections/finance] failed', error as Error, { raceId });
    return NextResponse.json({ error: 'Failed to fetch finance', raceId }, { status: 502 });
  }
}
