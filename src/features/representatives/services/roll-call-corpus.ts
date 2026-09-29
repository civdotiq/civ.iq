/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Roll-call corpus — compact, Redis-persisted roll calls for both chambers.
 *
 * House rolls are filled by the chamber-baselines builder from Congress.gov.
 * Senate rolls arrive through the MR10 mirror: senate.gov XML is
 * Akamai-blocked from cloud IPs and Congress.gov has no senate-vote JSON
 * endpoint, so the scheduled sync-senate-votes GitHub Actions workflow
 * relays the official XML to the ingest route, which persists it here.
 *
 * The mirrored Senate vote menu carries per-vote display metadata
 * (question / result / issue / title), so member-facing vote lists are
 * served from the corpus too — `getSenateCorpusRollCalls` returns fully
 * enriched StandardizedVotes without touching senate.gov.
 *
 * This module deliberately imports nothing from batch-voting-service at
 * runtime (types only) so the service can consume the corpus without an
 * import cycle.
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import type { StandardizedVote } from './batch-voting-service';
import {
  amendmentNumberFromText,
  amendmentSponsorLabel,
  cleanAmendmentPurpose,
  isNominationNumber,
  nominationDescriptionFromTitle,
  parseBillMeasure,
  splitMenuTitle,
  stripMeasureTags,
} from '@/lib/senate-vote-fields';

/** Roll calls are immutable once cast — keep them for the 90-day Redis TTL
 *  cap (MAX_TTL_SECONDS; longer values are clamped and logged as errors) and
 *  refresh TTL on rebuilds so an active Congress never ages out. */
export const ROLL_TTL_SECONDS = 90 * 24 * 60 * 60;

/** Batched Redis reads when assembling corpora. */
export const READ_BATCH = 25;

/**
 * Compact persisted form of one roll call — just what analysis needs.
 * (~30 bytes/member instead of the full StandardizedVote's ~80.)
 */
export type PositionCode = 'Y' | 'N' | 'P' | 'X';

export interface CompactRollCall {
  rollCallNumber: number;
  session: number;
  date: string;
  /** b = bioguide id ('' when unresolved); l = raw Senate LIS id, only when b is ''. */
  votes: Array<{ b: string; p: string; v: PositionCode; l?: string }>;
  /** Senate measure fields parsed from the roll-call XML. Absent on rolls
   *  ingested before 2026-09-29 — readers fall back to the vote menu. */
  meta?: Pick<StandardizedVote, 'amendment' | 'nomination' | 'majorityRequirement'>;
}

const POSITION_TO_CODE: Record<string, 'Y' | 'N' | 'P' | 'X'> = {
  Yea: 'Y',
  Nay: 'N',
  Present: 'P',
  'Not Voting': 'X',
};
const CODE_TO_POSITION: Record<
  'Y' | 'N' | 'P' | 'X',
  StandardizedVote['memberVotes'][number]['position']
> = {
  Y: 'Yea',
  N: 'Nay',
  P: 'Present',
  X: 'Not Voting',
};

export function compactRoll(roll: StandardizedVote): CompactRollCall {
  const meta: NonNullable<CompactRollCall['meta']> = {
    ...(roll.amendment ? { amendment: roll.amendment } : {}),
    ...(roll.nomination ? { nomination: roll.nomination } : {}),
    ...(roll.majorityRequirement ? { majorityRequirement: roll.majorityRequirement } : {}),
  };
  return {
    rollCallNumber: roll.rollCallNumber,
    session: roll.session,
    date: roll.date,
    votes: roll.memberVotes.map(mv => ({
      b: mv.bioguideId,
      p: mv.party,
      v: POSITION_TO_CODE[mv.position] ?? 'X',
      ...(mv.lisId ? { l: mv.lisId } : {}),
    })),
    ...(Object.keys(meta).length > 0 ? { meta } : {}),
  };
}

/** Rehydrate to the StandardizedVote shape the compute + party-line helpers
 *  consume. Totals are recomputed from the persisted positions; display
 *  fields we don't persist are left empty (Senate readers fill them from
 *  the mirrored menu). */
export function expandRoll(
  c: CompactRollCall,
  congress: number,
  chamber: 'House' | 'Senate'
): StandardizedVote {
  const totals = { yea: 0, nay: 0, present: 0, notVoting: 0 };
  for (const v of c.votes) {
    if (v.v === 'Y') totals.yea++;
    else if (v.v === 'N') totals.nay++;
    else if (v.v === 'P') totals.present++;
    else totals.notVoting++;
  }
  return {
    voteId: `${chamber.toLowerCase()}-${congress}-${c.session}-${c.rollCallNumber}`,
    congress,
    session: c.session,
    chamber,
    rollCallNumber: c.rollCallNumber,
    date: c.date,
    question: '',
    result: '',
    totals,
    memberVotes: c.votes.map(v => ({
      bioguideId: v.b,
      ...(v.l ? { lisId: v.l } : {}),
      name: '',
      party: v.p,
      state: '',
      position: CODE_TO_POSITION[v.v],
    })),
    sourceUrl: '',
    processedAt: c.date,
    ...c.meta,
  };
}

export function rollKey(
  chamber: 'house' | 'senate',
  congress: number,
  session: number,
  rollCallNumber: number
): string {
  return `record-card:roll:${chamber}:${congress}:${session}:${rollCallNumber}`;
}

// ── Senate vote menu (MR10 mirror) ───────────────────────────────────

/** One vote-menu entry, mirrored from senate.gov's vote_menu XML. Carries
 *  display metadata so member-facing vote lists can be served from the
 *  mirror, not just baselines. */
export interface SenateMenuEntry {
  /** Roll-call vote number. */
  n: number;
  /** ISO date (script derives it from vote_date + congress_year). */
  d: string;
  /** Question, e.g. "On the Nomination". */
  q: string;
  /** Result, e.g. "Confirmed". */
  r: string;
  /** Issue, e.g. "S.J.Res. 185" or "PN938-2". */
  i: string;
  /** Full vote title. */
  t: string;
}

export interface SenateVoteMenu {
  congress: number;
  /** Session number → menu entries ("1" = odd year, "2" = even year). */
  sessions: Record<string, SenateMenuEntry[]>;
  updatedAt: string;
}

function senateMenuKey(congress: number): string {
  return `record-card:roll:senate:${congress}:menu`;
}

/** Menus are mirrored verbatim, so questions keep senate.gov's markup
 *  ("On the Amendment <measure>S.Amdt. 6835</measure>"). Readers get the
 *  inner text ("On the Amendment S.Amdt. 6835"). */
function normalizeMenu(menu: SenateVoteMenu): SenateVoteMenu {
  const sessions: SenateVoteMenu['sessions'] = {};
  for (const [session, entries] of Object.entries(menu.sessions ?? {})) {
    sessions[session] = entries.map(e => ({ ...e, q: stripMeasureTags(e.q ?? '') }));
  }
  return { ...menu, sessions };
}

export async function getSenateVoteMenu(congress: number): Promise<SenateVoteMenu | null> {
  try {
    const menu = await getRedisCache().get<SenateVoteMenu>(senateMenuKey(congress));
    return menu ? normalizeMenu(menu) : null;
  } catch (error) {
    logger.warn('Senate vote menu read failed', { congress, error });
    return null;
  }
}

export async function setSenateVoteMenu(menu: SenateVoteMenu): Promise<void> {
  await getRedisCache().set(senateMenuKey(menu.congress), menu, ROLL_TTL_SECONDS);
}

/** Menu-listed roll calls not yet in the corpus, per session (batched). */
export async function listMissingSenateRolls(
  congress: number,
  menu: SenateVoteMenu
): Promise<Record<string, number[]>> {
  const redis = getRedisCache();
  const missing: Record<string, number[]> = {};

  for (const [session, entries] of Object.entries(menu.sessions)) {
    const sessionNum = parseInt(session, 10);
    const gaps: number[] = [];
    for (let i = 0; i < entries.length; i += READ_BATCH) {
      const batch = entries.slice(i, i + READ_BATCH);
      const present = await Promise.all(
        batch.map(e => redis.exists(rollKey('senate', congress, sessionNum, e.n)))
      );
      present.forEach((exists, j) => {
        const entry = batch[j];
        if (entry && !exists) gaps.push(entry.n);
      });
    }
    missing[session] = gaps;
  }

  return missing;
}

/** Persist one parsed Senate roll call into the corpus. The caller (ingest
 *  route) is responsible for the memberless-shell gate; dates are
 *  normalized to ISO so newest-roll comparisons stay lexicographic. */
export async function persistSenateRoll(roll: StandardizedVote): Promise<void> {
  const parsedDate = new Date(roll.date);
  const compact = compactRoll({
    ...roll,
    date: Number.isNaN(parsedDate.getTime()) ? roll.date : parsedDate.toISOString(),
  });
  await getRedisCache().set(
    rollKey('senate', roll.congress, roll.session, roll.rollCallNumber),
    compact,
    ROLL_TTL_SECONDS
  );
}

// ── Enriched Senate corpus reads ─────────────────────────────────────

/** Official measure titles by menu issue ("S. 4668" → "A bill to protect …"),
 *  taken from the menu's non-amendment votes on that measure. An amendment
 *  vote's own title tail is the amendment's purpose, not the measure's. */
export function measureTitlesFromMenu(menu: SenateVoteMenu): Map<string, string> {
  const titles = new Map<string, string>();
  for (const entries of Object.values(menu.sessions)) {
    for (const entry of entries) {
      const issue = entry.i.trim();
      if (titles.has(issue) || amendmentNumberFromText(entry.q) || !parseBillMeasure(issue)) {
        continue;
      }
      const { tail } = splitMenuTitle(entry.t);
      if (tail) titles.set(issue, tail);
    }
  }
  return titles;
}

/** Derive StandardizedVote.bill from a menu entry, or undefined for
 *  nominations/treaties. Type matches Congress.gov's ("HR", "SJRES").
 *  For an amendment vote the bill is the measure being amended; its title
 *  comes from `measureTitles` (see measureTitlesFromMenu), else the bill
 *  number — never the amendment's purpose. */
export function billFromMenuEntry(
  entry: SenateMenuEntry,
  congress: number,
  measureTitles?: ReadonlyMap<string, string>
): StandardizedVote['bill'] | undefined {
  const measure = parseBillMeasure(entry.i);
  if (!measure) return undefined;

  const issue = entry.i.trim();
  // Menu titles for measures read "Motion to …; <measure title>" — the
  // tail after the first "; " is the measure's own title.
  const { tail } = splitMenuTitle(entry.t);
  const title = amendmentNumberFromText(entry.q)
    ? (measureTitles?.get(issue) ?? issue)
    : (tail ?? entry.t.trim());

  return { congress, type: measure.type, number: measure.number, title };
}

/** Question, bill, amendment and nomination for one vote-menu entry. */
export function senateVoteFromMenu(
  entry: SenateMenuEntry,
  congress: number,
  measureTitles?: ReadonlyMap<string, string>
): Pick<StandardizedVote, 'question' | 'bill' | 'amendment' | 'nomination'> {
  const out: Pick<StandardizedVote, 'question' | 'bill' | 'amendment' | 'nomination'> = {
    question: stripMeasureTags(entry.q),
  };

  const bill = billFromMenuEntry(entry, congress, measureTitles);
  if (bill) out.bill = bill;

  const amendmentNumber = amendmentNumberFromText(entry.q);
  if (amendmentNumber) {
    const { head, tail } = splitMenuTitle(entry.t);
    const purpose = cleanAmendmentPurpose(tail);
    const sponsorLabel = amendmentSponsorLabel(head);
    out.amendment = {
      number: amendmentNumber,
      ...(purpose ? { purpose } : {}),
      ...(sponsorLabel ? { sponsorLabel } : {}),
    };
  }

  if (isNominationNumber(entry.i)) {
    out.nomination = {
      number: entry.i.trim(),
      description: nominationDescriptionFromTitle(entry.t),
    };
  }

  return out;
}

function senateSourceUrl(congress: number, session: number, rollCallNumber: number): string {
  const padded = String(rollCallNumber).padStart(5, '0');
  return `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${padded}.xml`;
}

/**
 * The most recent `limit` Senate roll calls from the mirrored corpus,
 * enriched with menu metadata (question, result, bill) — full member
 * positions included, newest first, across sessions. Returns [] when the
 * mirror hasn't run for this Congress (callers fall back or render their
 * designed empty states — never fake data).
 */
export async function getSenateCorpusRollCalls(
  congress: number,
  limit: number
): Promise<StandardizedVote[]> {
  const menu = await getSenateVoteMenu(congress);
  if (!menu) return [];

  const redis = getRedisCache();
  const measureTitles = measureTitlesFromMenu(menu);

  // Newest first across sessions: later session wins, then higher number.
  const flat = Object.entries(menu.sessions)
    .flatMap(([session, entries]) =>
      entries.map(e => ({ session: parseInt(session, 10), entry: e }))
    )
    .sort((a, b) => b.session - a.session || b.entry.n - a.entry.n)
    .slice(0, Math.max(0, limit));

  const rolls: StandardizedVote[] = [];
  for (let i = 0; i < flat.length; i += READ_BATCH) {
    const batch = flat.slice(i, i + READ_BATCH);
    const cached = await Promise.all(
      batch.map(item =>
        redis.get<CompactRollCall>(rollKey('senate', congress, item.session, item.entry.n))
      )
    );
    cached.forEach((c, j) => {
      const item = batch[j];
      if (!c || !item) return;
      const roll = expandRoll(c, congress, 'Senate');
      const fromMenu = senateVoteFromMenu(item.entry, congress, measureTitles);
      roll.question = fromMenu.question;
      roll.result = item.entry.r;
      roll.bill = fromMenu.bill;
      // Fields parsed from the roll-call XML (in `meta`) win; rolls ingested
      // before they were persisted fall back to the menu-derived ones.
      if (!roll.amendment && fromMenu.amendment) roll.amendment = fromMenu.amendment;
      if (!roll.nomination && fromMenu.nomination) roll.nomination = fromMenu.nomination;
      roll.sourceUrl = senateSourceUrl(congress, item.session, item.entry.n);
      rolls.push(roll);
    });
  }

  return rolls.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
