/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Election race header endpoint (PR 19, widened for 2026).
 *
 * Resolves all FEC-filed candidates for a federal race id, any party,
 * sorted by receipts. Race ids are uppercase, hyphen-separated:
 *   {year}-{office}-{state|NATIONAL}[-{district}]
 *
 * Returns 404 only when no candidate has filed with the FEC. An FEC
 * filing is NOT ballot access — copy downstream must say "filed",
 * never "on the ballot".
 *
 * Falls through MEDSL 2024 results when the year is 2024 and the
 * state is in coveredStates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { reserveFecCall } from '@/lib/fec/fec-rate-limiter';
import logger from '@/lib/logging/simple-logger';
import {
  ELECTION_2024_METADATA,
  getHouseResult2024,
  getStatewideResult2024,
} from '@/lib/services/election-results.service';
import type { ElectionOffice, ElectionRaceCandidate, ElectionRacePayload } from '@/types/elections';

export const dynamic = 'force-dynamic';
export const maxDuration = 12;

const FEC_API_BASE = 'https://api.open.fec.gov/v1';
const RACE_ID_RE =
  /^(\d{4})-(US_PRESIDENT|US_SENATE|US_HOUSE|GOVERNOR)-([A-Z]{2}|NATIONAL)(?:-(\d{2}|AL|00))?$/;

interface ParsedRaceId {
  year: number;
  office: ElectionOffice;
  state: string;
  district: string | null;
}

function parseRaceId(id: string): ParsedRaceId | null {
  const m = id.toUpperCase().match(RACE_ID_RE);
  if (!m) return null;
  const year = parseInt(m[1] ?? '', 10);
  const office = m[2] as ElectionOffice;
  const state = m[3] ?? '';
  const district = m[4] ?? null;
  if (!Number.isFinite(year) || year < 1980 || year > 2100) return null;
  if (office === 'STATE_SENATE' || office === 'STATE_HOUSE') return null;
  return { year, office, state, district };
}

function officeToFecCode(office: ElectionOffice): 'P' | 'S' | 'H' | null {
  if (office === 'US_PRESIDENT') return 'P';
  if (office === 'US_SENATE') return 'S';
  if (office === 'US_HOUSE') return 'H';
  return null;
}

/** Display names for common FEC party codes; falls back to the raw code. */
const PARTY_NAMES: Record<string, string> = {
  DEM: 'Democrat',
  DFL: 'Democrat (DFL)',
  REP: 'Republican',
  GOP: 'Republican',
  LIB: 'Libertarian',
  GRE: 'Green',
  GRN: 'Green',
  CON: 'Constitution',
  IND: 'Independent',
  NNE: 'None',
  NON: 'Nonpartisan',
  NPA: 'No party affiliation',
  OTH: 'Other',
  UNK: 'Unknown party',
  W: 'Write-in',
};

function partyLong(code: string): string {
  return PARTY_NAMES[code] ?? code;
}

function incumbencyFull(code: string | null): string | null {
  if (code === 'I') return 'Incumbent';
  if (code === 'C') return 'Challenger';
  if (code === 'O') return 'Open seat';
  return null;
}

function firstFileYear(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.getUTCFullYear();
}

interface FecCandidateRow {
  candidate_id: string;
  name: string;
  party: string | null;
  state: string | null;
  district: string | null;
  office: 'H' | 'S' | 'P';
  incumbent_challenge: string | null;
  first_file_date: string | null;
  receipts: number | null;
  candidate_election_year: number | null;
}

async function fecCandidatesTotals(params: URLSearchParams, apiKey: string) {
  // Account this request against the shared per-minute FEC budget (live
  // priority by default — see fec-rate-limiter; only cron contexts throttle).
  const reservation = await reserveFecCall();
  if (!reservation.allowed) {
    throw new Error(
      `FEC budget reserved for live traffic — call throttled (${reservation.count}/${reservation.ceiling} this minute)`
    );
  }
  const url = `${FEC_API_BASE}/candidates/totals/?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'CivicIntelHub/1.0',
      'X-API-Key': apiKey,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`FEC candidates/totals ${res.status}`);
  }
  const json = (await res.json()) as { results?: FecCandidateRow[] };
  return json.results ?? [];
}

// Finance and total-spent accept at most 12 ids; the payload matches.
const MAX_CANDIDATES = 12;

/**
 * All filed candidates, receipts descending. When at least one candidate
 * has raised funds (or is the incumbent), zero-money Form-2 filers are
 * trimmed — MI House alone has 100+ raw filers. When nobody has raised
 * funds yet, the raw filings ARE the story, so keep them all.
 */
function selectCandidates(rows: FecCandidateRow[]): FecCandidateRow[] {
  const sorted = [...rows].sort((a, b) => (b.receipts ?? 0) - (a.receipts ?? 0));
  const funded = sorted.filter(
    r => (r.receipts ?? 0) > 0 || (r.incumbent_challenge ?? '').toUpperCase() === 'I'
  );
  return (funded.length > 0 ? funded : sorted).slice(0, MAX_CANDIDATES);
}

function toCandidate(row: FecCandidateRow, parsed: ParsedRaceId): ElectionRaceCandidate {
  const partyCode = (row.party ?? 'UNK').toUpperCase();
  return {
    candidateId: row.candidate_id,
    name: row.name,
    party: partyCode,
    partyLong: partyLong(partyCode),
    office: parsed.office,
    state: parsed.state,
    district: parsed.district,
    incumbentChallenge: ((): 'I' | 'C' | 'O' | null => {
      const c = (row.incumbent_challenge ?? '').toUpperCase();
      if (c === 'I' || c === 'C' || c === 'O') return c;
      return null;
    })(),
    incumbentChallengeFull: incumbencyFull((row.incumbent_challenge ?? '').toUpperCase() || null),
    firstFileYear: firstFileYear(row.first_file_date),
    totalReceipts: Number.isFinite(row.receipts ?? NaN) ? row.receipts : null,
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raceId = (id ?? '').trim().toUpperCase();
  const parsed = parseRaceId(raceId);

  if (!parsed) {
    return NextResponse.json(
      { error: 'Invalid race id. Expected {year}-{office}-{state}[-{district}].', raceId },
      { status: 400 }
    );
  }

  const officeCode = officeToFecCode(parsed.office);
  if (!officeCode) {
    return NextResponse.json(
      { error: 'Unsupported office for /elections/[id].', raceId },
      { status: 400 }
    );
  }

  const apiKey = process.env.FEC_API_KEY;
  if (!apiKey) {
    logger.error('[elections/race] FEC_API_KEY missing');
    return NextResponse.json({ error: 'FEC API key not configured', raceId }, { status: 500 });
  }

  // FEC uses election_year for general-election candidate filtering.
  // House cycle = election year (2-year). Senate cycle = election year.
  // President cycle = election year. We pass both election_year (filter)
  // and cycle (totals scope) explicitly.
  const cycle = parsed.year;

  // election_full=true keys totals to the full election period. Without it,
  // Senate lookups return 2-year-window rows that pull in mid-cycle senators;
  // the candidate_election_year filter below completes that guard.
  const search = new URLSearchParams({
    office: officeCode,
    election_year: String(parsed.year),
    cycle: String(cycle),
    election_full: 'true',
    sort: '-receipts',
    per_page: '50',
  });
  if (parsed.state !== 'NATIONAL') {
    search.set('state', parsed.state);
  }
  if (parsed.office === 'US_HOUSE' && parsed.district) {
    const dist =
      parsed.district === 'AL' ? '00' : parsed.district === '00' ? '00' : parsed.district;
    search.set('district', dist);
  }

  let rows: FecCandidateRow[];
  try {
    rows = await fecCandidatesTotals(search, apiKey);
  } catch (error) {
    logger.error('[elections/race] FEC candidate search failed', error as Error, { raceId });
    return NextResponse.json({ error: 'Failed to fetch FEC candidates', raceId }, { status: 502 });
  }

  const inCycle = rows.filter(
    r => r.candidate_election_year === null || r.candidate_election_year === parsed.year
  );
  const selected = selectCandidates(inCycle);

  if (selected.length === 0) {
    return NextResponse.json(
      { error: 'No FEC-filed candidates found for this race', raceId },
      { status: 404 }
    );
  }

  const result2024 = (() => {
    if (parsed.year !== 2024) return null;
    if (!ELECTION_2024_METADATA.coveredStates.includes(parsed.state)) return null;
    if (parsed.office === 'US_HOUSE' && parsed.district) {
      const r = getHouseResult2024(parsed.state, parsed.district);
      return r.dataAvailable ? r : null;
    }
    if (
      parsed.office === 'US_PRESIDENT' ||
      parsed.office === 'US_SENATE' ||
      parsed.office === 'GOVERNOR'
    ) {
      const r = getStatewideResult2024(parsed.state, parsed.office);
      return r.dataAvailable ? r : null;
    }
    return null;
  })();

  const payload: ElectionRacePayload = {
    raceId,
    year: parsed.year,
    office: parsed.office,
    state: parsed.state,
    district: parsed.district,
    cycle,
    candidates: selected.map(row => toCandidate(row, parsed)),
    result2024,
    dataAsOf: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
    },
  });
}
