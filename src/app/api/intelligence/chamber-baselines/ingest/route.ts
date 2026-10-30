/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Senate Roll-Call Ingest (MR10)
 *
 * senate.gov roll-call XML is Akamai-blocked from cloud IPs, so production
 * cannot fetch it directly. The scheduled sync-senate-votes GitHub Actions
 * workflow (whose runner IPs are not blocked — verified 2026-07-07) fetches
 * the official XML and POSTs it here; this route parses it with the same
 * parser local dev uses (including LIS→bioguide mapping) and persists
 * compact rolls into the Redis corpus that buildChamberBaselines reads.
 * Provenance is preserved: every number on the card still originates from
 * senate.gov's official XML, relayed unmodified.
 *
 * POST { kind: 'menu', congress, sessions: { "1": SenateMenuEntry[], ... } }
 *   Mirrors the vote-menu inventory (the corpus' coverage denominator) and
 *   responds with the per-session roll numbers still missing, so the
 *   workflow only fetches gaps.
 *
 * POST { kind: 'rolls', congress, session, rolls: [{ voteNumber, xml }] }
 *   Parses and persists each roll call. Memberless shells and
 *   congress/vote-number mismatches are rejected per-roll.
 *
 * POST { kind: 'record-rolls', congress, session, rolls: CompactRollCall[],
 *        entries: SenateMenuEntry[] }
 *   Roll calls read from the Congressional Record by the
 *   sync-senate-votes-from-record workflow, already checked and matched to
 *   Bioguide IDs (senate.gov has blocked the mirror since 2026-10-23, issue
 *   #300). Every entry names its Record section; every roll needs an entry.
 *   Entries are merged into the stored menu, never replacing it.
 *
 * CRON_SECRET bearer auth. Never called by page rendering.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { verifyBearerToken } from '@/lib/security/verify-bearer-token';
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import {
  getRawSenateVoteMenu,
  listMissingSenateRolls,
  persistSenateRoll,
  setSenateCompactRoll,
  setSenateVoteMenu,
  withSenateMenuEntries,
  type CompactRollCall,
  type SenateMenuEntry,
  type SenateVoteMenu,
} from '@/features/representatives/services/roll-call-corpus';
import { loadSenateVotesSnapshot } from '@/features/representatives/services/senate-votes-snapshot';
import { refreshSenateFreshnessFromMenu } from '@/features/representatives/services/senate-vote-freshness';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** senate.gov roll-call XML runs ~30KB; anything past this is not a vote. */
const MAX_XML_BYTES = 300_000;

/** Rolls per POST — keeps request bodies well under Vercel's 4.5MB cap. */
const MAX_ROLLS_PER_BATCH = 25;

/** A Senate roll call lists every seated senator (~100; vacancies reduce
 *  it slightly). Far fewer means a memberless/partial shell — reject. */
const MIN_MEMBERS_PER_ROLL = 80;

interface MenuPayload {
  kind: 'menu';
  congress: number;
  sessions: Record<string, SenateMenuEntry[]>;
}

interface RollsPayload {
  kind: 'rolls';
  congress: number;
  session: number;
  rolls: Array<{ voteNumber: number; xml: string }>;
}

function isMenuEntry(value: unknown): value is SenateMenuEntry {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.n === 'number' &&
    typeof e.d === 'string' &&
    typeof e.q === 'string' &&
    typeof e.r === 'string' &&
    typeof e.i === 'string' &&
    typeof e.t === 'string'
  );
}

function parseMenuPayload(body: Record<string, unknown>): MenuPayload | null {
  if (typeof body.congress !== 'number' || !Number.isInteger(body.congress)) return null;
  if (typeof body.sessions !== 'object' || body.sessions === null) return null;

  const sessions: Record<string, SenateMenuEntry[]> = {};
  for (const [session, entries] of Object.entries(body.sessions)) {
    if (!/^[12]$/.test(session) || !Array.isArray(entries)) return null;
    if (!entries.every(isMenuEntry)) return null;
    sessions[session] = entries;
  }
  if (Object.keys(sessions).length === 0) return null;

  return { kind: 'menu', congress: body.congress, sessions };
}

function parseRollsPayload(body: Record<string, unknown>): RollsPayload | null {
  if (typeof body.congress !== 'number' || !Number.isInteger(body.congress)) return null;
  if (body.session !== 1 && body.session !== 2) return null;
  if (!Array.isArray(body.rolls) || body.rolls.length === 0) return null;
  if (body.rolls.length > MAX_ROLLS_PER_BATCH) return null;

  const rolls: RollsPayload['rolls'] = [];
  for (const item of body.rolls) {
    if (typeof item !== 'object' || item === null) return null;
    const r = item as Record<string, unknown>;
    if (typeof r.voteNumber !== 'number' || !Number.isInteger(r.voteNumber)) return null;
    if (typeof r.xml !== 'string' || r.xml.length === 0 || r.xml.length > MAX_XML_BYTES) {
      return null;
    }
    rolls.push({ voteNumber: r.voteNumber, xml: r.xml });
  }

  return { kind: 'rolls', congress: body.congress, session: body.session, rolls };
}

interface RecordRollsPayload {
  kind: 'record-rolls';
  congress: number;
  session: number;
  rolls: CompactRollCall[];
  entries: SenateMenuEntry[];
}

const BIOGUIDE_ID = /^[A-Z]\d{6}$/;
/** Congress.gov's close time, or the vote day at 12:00 UTC when it gives none. */
const RECORD_ROLL_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function isRecordRoll(value: unknown, session: number): value is CompactRollCall {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  if (!Number.isInteger(r.rollCallNumber) || r.session !== session) return false;
  if (typeof r.date !== 'string' || !RECORD_ROLL_DATE.test(r.date)) return false;
  if (!Array.isArray(r.votes) || r.votes.length < MIN_MEMBERS_PER_ROLL) return false;
  const seen = new Set<string>();
  for (const v of r.votes as unknown[]) {
    if (typeof v !== 'object' || v === null) return false;
    const vote = v as Record<string, unknown>;
    if (typeof vote.b !== 'string' || !BIOGUIDE_ID.test(vote.b) || seen.has(vote.b)) return false;
    if (vote.p !== 'R' && vote.p !== 'D' && vote.p !== 'I') return false;
    if (vote.v !== 'Y' && vote.v !== 'N' && vote.v !== 'P' && vote.v !== 'X') return false;
    seen.add(vote.b);
  }
  return true;
}

function isRecordEntry(value: unknown): value is SenateMenuEntry {
  if (!isMenuEntry(value)) return false;
  const record = (value as SenateMenuEntry).record;
  return (
    typeof record?.url === 'string' &&
    record.url.startsWith('https://www.govinfo.gov/') &&
    typeof record.readAt === 'string'
  );
}

function parseRecordRollsPayload(body: Record<string, unknown>): RecordRollsPayload | null {
  if (typeof body.congress !== 'number' || !Number.isInteger(body.congress)) return null;
  if (body.session !== 1 && body.session !== 2) return null;
  const session = body.session;
  if (!Array.isArray(body.rolls) || body.rolls.length > MAX_ROLLS_PER_BATCH) return null;
  if (!Array.isArray(body.entries)) return null;
  if (body.rolls.length === 0 && body.entries.length === 0) return null;
  if (!body.rolls.every(r => isRecordRoll(r, session))) return null;
  if (!body.entries.every(isRecordEntry)) return null;
  return {
    kind: 'record-rolls',
    congress: body.congress,
    session,
    rolls: body.rolls as CompactRollCall[],
    entries: body.entries as SenateMenuEntry[],
  };
}

/** Cross-check the XML's own identifiers against the claimed ones so a
 *  mis-mapped fetch can never land under the wrong corpus key. */
function xmlMatchesClaim(
  xml: string,
  congress: number,
  session: number,
  voteNumber: number
): boolean {
  const tag = (name: string): number =>
    parseInt(xml.match(new RegExp(`<${name}>\\s*(\\d+)\\s*</${name}>`))?.[1] ?? '', 10);
  return (
    tag('congress') === congress && tag('session') === session && tag('vote_number') === voteNumber
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !verifyBearerToken(request.headers.get('authorization'), cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const record = body as Record<string, unknown>;

  if (record.kind === 'menu') {
    const payload = parseMenuPayload(record);
    if (!payload) {
      return NextResponse.json({ error: 'Malformed menu payload' }, { status: 400 });
    }

    const menu: SenateVoteMenu = {
      congress: payload.congress,
      sessions: payload.sessions,
      updatedAt: new Date().toISOString(),
    };
    await setSenateVoteMenu(menu);
    // Clears a "votes not shown yet" notice as soon as the votes arrive.
    await refreshSenateFreshnessFromMenu(menu).catch(error =>
      logger.warn('Senate freshness refresh failed', { error: (error as Error).message })
    );
    const missing = await listMissingSenateRolls(payload.congress, menu);

    const stored = Object.fromEntries(
      Object.entries(payload.sessions).map(([s, entries]) => [s, entries.length])
    );
    logger.info('Senate vote menu mirrored', {
      congress: payload.congress,
      stored,
      missing: Object.fromEntries(Object.entries(missing).map(([s, nums]) => [s, nums.length])),
    });
    return NextResponse.json({ ok: true, stored, missing });
  }

  if (record.kind === 'rolls') {
    const payload = parseRollsPayload(record);
    if (!payload) {
      return NextResponse.json({ error: 'Malformed rolls payload' }, { status: 400 });
    }

    let persisted = 0;
    const rejected: Array<{ voteNumber: number; reason: string }> = [];

    for (const { voteNumber, xml } of payload.rolls) {
      if (!xmlMatchesClaim(xml, payload.congress, payload.session, voteNumber)) {
        rejected.push({ voteNumber, reason: 'XML identifiers do not match claimed roll' });
        continue;
      }

      const roll = await batchVotingService.parseSenateRollCallXML(
        xml,
        payload.congress,
        payload.session,
        voteNumber
      );
      if (!roll) {
        rejected.push({ voteNumber, reason: 'XML failed to parse' });
        continue;
      }
      if (roll.memberVotes.length < MIN_MEMBERS_PER_ROLL) {
        rejected.push({
          voteNumber,
          reason: `memberless shell (${roll.memberVotes.length} members parsed)`,
        });
        continue;
      }

      await persistSenateRoll(roll);
      persisted++;
    }

    logger.info('Senate roll calls ingested', {
      congress: payload.congress,
      session: payload.session,
      persisted,
      rejected: rejected.length,
    });
    return NextResponse.json({ ok: true, persisted, rejected });
  }

  if (record.kind === 'record-rolls') {
    const payload = parseRecordRollsPayload(record);
    if (!payload) {
      return NextResponse.json({ error: 'Malformed record-rolls payload' }, { status: 400 });
    }

    // Merge into the stored menu; if Redis has none, start from the
    // committed snapshot so no senate.gov entry is dropped.
    const base = (await getRawSenateVoteMenu(payload.congress)) ??
      (await loadSenateVotesSnapshot(payload.congress))?.menu ?? {
        congress: payload.congress,
        sessions: {},
        updatedAt: '',
      };
    const menu = withSenateMenuEntries(base, payload.session, payload.entries);
    // Readers list roll calls from the menu: a roll call it doesn't list
    // would be stored where nobody can find it.
    const listed = new Set((menu.sessions[String(payload.session)] ?? []).map(e => e.n));
    const unlisted = payload.rolls.filter(r => !listed.has(r.rollCallNumber));
    if (unlisted.length) {
      return NextResponse.json(
        {
          error: 'Roll calls without a menu entry',
          rolls: unlisted.map(r => r.rollCallNumber),
        },
        { status: 400 }
      );
    }

    let persisted = 0;
    for (const roll of payload.rolls) {
      if (await setSenateCompactRoll(payload.congress, roll)) persisted++;
    }
    await setSenateVoteMenu(menu);
    await refreshSenateFreshnessFromMenu(menu).catch(error =>
      logger.warn('Senate freshness refresh failed', { error: (error as Error).message })
    );

    logger.info('Senate roll calls ingested from the Congressional Record', {
      congress: payload.congress,
      session: payload.session,
      persisted,
      entries: payload.entries.length,
    });
    return NextResponse.json({
      ok: persisted === payload.rolls.length,
      persisted,
      entries: payload.entries.length,
    });
  }

  return NextResponse.json(
    { error: 'kind must be "menu", "rolls" or "record-rolls"' },
    { status: 400 }
  );
}
