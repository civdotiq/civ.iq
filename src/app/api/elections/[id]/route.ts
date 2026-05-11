/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Election race header endpoint (PR 19).
 *
 * Resolves the two top filed candidates (one D, one R) for a federal
 * race id. Race ids are uppercase, hyphen-separated:
 *   {year}-{office}-{state|NATIONAL}[-{district}]
 *
 * Returns 404 when either party has no FEC-filed candidate. Honest
 * empty state on the page is preferred over a half-rendered hero.
 *
 * Falls through MEDSL 2024 results when the year is 2024 and the
 * state is in coveredStates.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import {
  ELECTION_2024_METADATA,
  getHouseResult2024,
  getStatewideResult2024,
} from '@/lib/services/election-results.service';
import type {
  ElectionOffice,
  ElectionRaceCandidate,
  ElectionRacePartyChair,
  ElectionRacePayload,
} from '@/types/elections';

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

function partyToChair(party: string | null | undefined): ElectionRacePartyChair | null {
  const p = (party ?? '').toUpperCase();
  if (p === 'DEM' || p === 'DFL') return 'D';
  if (p === 'REP' || p === 'GOP') return 'R';
  return null;
}

function partyLong(party: ElectionRacePartyChair): string {
  return party === 'D' ? 'Democrat' : 'Republican';
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
}

async function fecCandidatesTotals(params: URLSearchParams, apiKey: string) {
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

function pickTopByParty(
  rows: FecCandidateRow[],
  party: ElectionRacePartyChair
): FecCandidateRow | null {
  const filtered = rows
    .filter(r => partyToChair(r.party) === party)
    .filter(r => Number.isFinite(r.receipts ?? NaN))
    .sort((a, b) => (b.receipts ?? 0) - (a.receipts ?? 0));
  if (filtered.length > 0) return filtered[0]!;
  const any = rows.find(r => partyToChair(r.party) === party);
  return any ?? null;
}

function toCandidate(
  row: FecCandidateRow,
  parsed: ParsedRaceId,
  party: ElectionRacePartyChair
): ElectionRaceCandidate {
  return {
    candidateId: row.candidate_id,
    name: row.name,
    party,
    partyLong: partyLong(party),
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

  const search = new URLSearchParams({
    office: officeCode,
    election_year: String(parsed.year),
    cycle: String(cycle),
    sort: '-receipts',
    per_page: '20',
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

  const dem = pickTopByParty(rows, 'D');
  const rep = pickTopByParty(rows, 'R');

  if (!dem || !rep) {
    return NextResponse.json(
      {
        error: 'Race not contested two-way',
        raceId,
        democratFiled: !!dem,
        republicanFiled: !!rep,
      },
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
    democrat: toCandidate(dem, parsed, 'D'),
    republican: toCandidate(rep, parsed, 'R'),
    result2024,
    dataAsOf: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
    },
  });
}
