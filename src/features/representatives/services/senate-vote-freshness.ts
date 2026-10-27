/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Is our copy of the Senate's roll-call votes complete?
 *
 * senate.gov has blocked the vote mirror since 2026-10-23 (issue #300), so new
 * Senate votes can stop arriving without any error on the site. Twice a day
 * (cron /api/cron/senate-vote-freshness) we read the Congressional Record's
 * Daily Digest, which prints the Senate's running roll-call total on every day
 * it votes, and compare it with our newest stored roll. The result is a small
 * note in Redis; it can be rebuilt from GovInfo at any time.
 *
 * What pages show (Mark's decisions, 2026-10-27):
 * - Always: "Latest record" (newest stored vote date) and "Checked" (last
 *   successful check, or the last senate.gov sync if newer).
 * - The amber notice only when the Record lists a Senate roll call we don't
 *   have. An old or failed check never shows it: unknown is not missing, and
 *   recesses and pro forma days have no votes.
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import {
  congressStartYear,
  listRecordIssues,
  readSenateDigest,
  sessionForDate,
  type RecordIssue,
  type SenateDigestReading,
} from '@/lib/data-sources/congressional-record/senate-digest';
import { getSenateVoteMenu, type SenateVoteMenu } from './roll-call-corpus';

/** The Senate has voted past our newest stored roll. */
export interface SenateVotesMissing {
  session: number;
  /** Our newest stored roll in that session (0 when we have none). */
  ourLatestRoll: number;
  ourLatestDate: string | null;
  /** The Record's running total for the session. */
  recordTotal: number;
  /** The Record issue (YYYY-MM-DD) that printed it. */
  recordIssueDate: string;
}

export interface SenateVoteFreshnessNote {
  congress: number;
  lastAttemptAt: string;
  /** The last check that read the Record and our votes without error. */
  lastSuccessAt: string | null;
  lastError: string | null;
  /** Failed checks since the last success. */
  consecutiveFailures: number;
  /** First failure of the current failing streak (null after a success). */
  failingSince: string | null;
  /** Newest Record issue (YYYY-MM-DD) whose Daily Digest was read. */
  latestIssueRead: string | null;
  /** Newest Record total per session ("1", "2"), with the issue that printed it. */
  recordTotals: Record<string, { total: number; issueDate: string }>;
  /** Our newest stored Senate vote when the note was written. */
  latestVote: { session: number; roll: number; date: string } | null;
  /** When the senate.gov mirror last wrote the vote menu. */
  menuUpdatedAt: string | null;
  missing: SenateVotesMissing | null;
}

/** What pages, APIs and MCP tools show. */
export interface SenateVoteFreshness {
  /** Date (YYYY-MM-DD) of the newest Senate vote we hold. */
  latestVoteDate: string | null;
  /** When we last confirmed what the Senate has voted on (ISO). */
  checkedAt: string | null;
  /** True only when the Record lists Senate votes we don't have. */
  stale: boolean;
  missing: SenateVotesMissing | null;
}

/** Rebuildable from GovInfo, so a lapse only costs one wider scan. */
const FRESHNESS_TTL_SECONDS = 30 * 24 * 60 * 60;

/** The check runs twice a day; this long with no success opens a GitHub issue. */
export const FRESHNESS_DOWN_HOURS = 48;

/** Issues published late (GPO can post an issue days after a later one) are
 *  re-read for this many days after the newest issue read. */
const REREAD_DAYS = 7;

export function freshnessKey(congress: number): string {
  return `senate-votes:freshness:${congress}`;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Newest stored roll per session, from the vote menu. */
export function newestRollsBySession(
  menu: SenateVoteMenu
): Record<string, { roll: number; date: string }> {
  const out: Record<string, { roll: number; date: string }> = {};
  for (const [session, entries] of Object.entries(menu.sessions ?? {})) {
    for (const e of entries) {
      const current = out[session];
      if (!current || e.n > current.roll) out[session] = { roll: e.n, date: e.d };
    }
  }
  return out;
}

/** The newest session in which the Record shows more votes than we hold. */
export function findMissing(
  recordTotals: SenateVoteFreshnessNote['recordTotals'],
  menu: SenateVoteMenu
): SenateVotesMissing | null {
  const ours = newestRollsBySession(menu);
  const sessions = Object.keys(recordTotals).sort(
    (a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10)
  );
  for (const session of sessions) {
    const record = recordTotals[session];
    if (!record) continue;
    const our = ours[session];
    if (record.total > (our?.roll ?? 0)) {
      return {
        session: Number.parseInt(session, 10),
        ourLatestRoll: our?.roll ?? 0,
        ourLatestDate: our?.date ?? null,
        recordTotal: record.total,
        recordIssueDate: record.issueDate,
      };
    }
  }
  return null;
}

function latestVote(menu: SenateVoteMenu): SenateVoteFreshnessNote['latestVote'] {
  const ours = newestRollsBySession(menu);
  const session = Object.keys(ours).sort(
    (a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10)
  )[0];
  const newest = session ? ours[session] : undefined;
  return session && newest
    ? { session: Number.parseInt(session, 10), roll: newest.roll, date: newest.date }
    : null;
}

export interface FreshnessCheckDeps {
  listIssues: (from: string, to: string) => Promise<RecordIssue[]>;
  readDigest: (issue: RecordIssue) => Promise<SenateDigestReading>;
  readMenu: (congress: number) => Promise<SenateVoteMenu | null>;
  readNote: (congress: number) => Promise<SenateVoteFreshnessNote | null>;
  writeNote: (note: SenateVoteFreshnessNote) => Promise<boolean>;
  now: () => Date;
}

const defaultDeps: FreshnessCheckDeps = {
  listIssues: listRecordIssues,
  readDigest: readSenateDigest,
  readMenu: getSenateVoteMenu,
  readNote: congress => getRedisCache().get<SenateVoteFreshnessNote>(freshnessKey(congress)),
  writeNote: note => getRedisCache().set(freshnessKey(note.congress), note, FRESHNESS_TTL_SECONDS),
  now: () => new Date(),
};

/**
 * Read the Record issues since the last check and save a new note. Never
 * throws. Walks issues newest first and stops at the first with a Senate vote
 * total (the total is a running count, so older issues can't raise it). A
 * failed run updates only the attempt fields: it never moves "Checked" and
 * never sets `missing`.
 */
export async function checkSenateVoteFreshness(
  congress: number = getCurrentCongressNumber(),
  deps: FreshnessCheckDeps = defaultDeps
): Promise<SenateVoteFreshnessNote> {
  const now = deps.now();
  const attemptAt = now.toISOString();
  const today = attemptAt.slice(0, 10);
  const prev = await deps.readNote(congress).catch(() => null);

  try {
    const menu = await deps.readMenu(congress);
    if (!menu) throw new Error('Senate vote menu unavailable');

    const recordTotals = { ...(prev?.recordTotals ?? {}) };
    const congressStart = `${congressStartYear(congress)}-01-03`;
    // First run: walk back to the start of the Congress (stopping at the
    // first total). Later runs: re-read the last week of issues (GPO can
    // post an issue late), but nothing up to the newest known total, which
    // older issues can't raise.
    const newestKnownTotal = Object.values(recordTotals)
      .map(t => t.issueDate)
      .sort()
      .at(-1);
    const from = [
      newestKnownTotal ? addDays(newestKnownTotal, 1) : null,
      prev?.latestIssueRead ? addDays(prev.latestIssueRead, -REREAD_DAYS) : null,
    ]
      .filter((d): d is string => d !== null)
      .reduce((a, b) => (b > a ? b : a), congressStart);

    let latestIssueRead = prev?.latestIssueRead ?? null;
    if (from <= today) {
      const issues = await deps.listIssues(from, today);
      for (const issue of [...issues].reverse()) {
        const session = sessionForDate(congress, issue.dateIssued);
        if (session === null) continue;
        const reading = await deps.readDigest(issue);
        if (reading.digestFound && (!latestIssueRead || issue.dateIssued > latestIssueRead)) {
          latestIssueRead = issue.dateIssued;
        }
        if (reading.total === null) continue;
        const known = recordTotals[String(session)];
        if (!known || reading.total >= known.total) {
          recordTotals[String(session)] = { total: reading.total, issueDate: issue.dateIssued };
        }
        break;
      }
    }

    const note: SenateVoteFreshnessNote = {
      congress,
      lastAttemptAt: attemptAt,
      lastSuccessAt: attemptAt,
      lastError: null,
      consecutiveFailures: 0,
      failingSince: null,
      latestIssueRead,
      recordTotals,
      latestVote: latestVote(menu),
      menuUpdatedAt: menu.updatedAt ?? null,
      missing: findMissing(recordTotals, menu),
    };
    if (note.missing)
      logger.warn('[SenateFreshness] Record lists Senate votes we lack', { ...note.missing });
    if (!(await deps.writeNote(note)))
      logger.warn('[SenateFreshness] Note write refused', { congress });
    return note;
  } catch (error) {
    const note: SenateVoteFreshnessNote = {
      congress,
      lastSuccessAt: null,
      latestIssueRead: null,
      recordTotals: {},
      latestVote: null,
      menuUpdatedAt: null,
      missing: null,
      ...prev,
      lastAttemptAt: attemptAt,
      lastError: (error as Error).message,
      consecutiveFailures: (prev?.consecutiveFailures ?? 0) + 1,
      failingSince: prev?.failingSince ?? attemptAt,
    };
    logger.warn('[SenateFreshness] Check failed', {
      congress,
      error: note.lastError,
      consecutiveFailures: note.consecutiveFailures,
    });
    await deps.writeNote(note).catch(() => false);
    return note;
  }
}

/**
 * After the senate.gov mirror writes a new vote menu, recompute the note's
 * newest vote and `missing` from the Record totals already known (no GovInfo
 * fetch), so a notice clears as soon as the votes arrive.
 */
export async function refreshSenateFreshnessFromMenu(menu: SenateVoteMenu): Promise<void> {
  const redis = getRedisCache();
  const prev = await redis.get<SenateVoteFreshnessNote>(freshnessKey(menu.congress));
  if (!prev) return;
  await redis.set(
    freshnessKey(menu.congress),
    {
      ...prev,
      latestVote: latestVote(menu),
      menuUpdatedAt: menu.updatedAt ?? null,
      missing: findMissing(prev.recordTotals, menu),
    } satisfies SenateVoteFreshnessNote,
    FRESHNESS_TTL_SECONDS
  );
}

function newer(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

/** Page-facing view of a note. */
export function freshnessFromNote(note: SenateVoteFreshnessNote): SenateVoteFreshness {
  return {
    latestVoteDate: note.latestVote?.date ?? null,
    checkedAt: newer(note.lastSuccessAt, note.menuUpdatedAt),
    stale: note.missing !== null,
    missing: note.missing,
  };
}

/**
 * Freshness of the stored Senate votes, or null when nothing is known. One
 * small Redis read; before the first check (or after the note lapses) it
 * falls back to the vote menu, which never sets `stale`.
 */
export async function getSenateVoteFreshness(
  congress: number = getCurrentCongressNumber()
): Promise<SenateVoteFreshness | null> {
  try {
    const note = await getRedisCache().get<SenateVoteFreshnessNote>(freshnessKey(congress));
    if (note) return freshnessFromNote(note);
    const menu = await getSenateVoteMenu(congress);
    if (!menu) return null;
    return {
      latestVoteDate: latestVote(menu)?.date ?? null,
      checkedAt: menu.updatedAt ?? null,
      stale: false,
      missing: null,
    };
  } catch (error) {
    logger.warn('[SenateFreshness] Read failed', { congress, error: (error as Error).message });
    return null;
  }
}

/**
 * Health status for /api/health: `down` once no check has succeeded for 48
 * hours (a GitHub workflow opens an issue then), `stale` when there is no
 * note yet. A Record that lists votes we lack is not a check failure; it is
 * reported in `error` without changing the status.
 */
export function senateFreshnessHealth(
  note: SenateVoteFreshnessNote | null,
  now: Date = new Date()
): { status: 'ok' | 'down' | 'stale'; lastSuccessfulFetch: string | null; error: string | null } {
  if (!note) {
    return { status: 'stale', lastSuccessfulFetch: null, error: 'No freshness check has run yet' };
  }
  const since = note.lastSuccessAt ?? null;
  // Never succeeded: count from the first failure instead.
  const from = since ?? note.failingSince;
  const hours = from ? (now.getTime() - new Date(from).getTime()) / (1000 * 60 * 60) : Infinity;
  if (!(hours < FRESHNESS_DOWN_HOURS)) {
    return {
      status: 'down',
      lastSuccessfulFetch: since,
      error: `No successful check for ${FRESHNESS_DOWN_HOURS}+ hours (${note.consecutiveFailures} failed in a row). Last error: ${note.lastError ?? 'none'}`,
    };
  }
  const missing = note.missing
    ? `Record lists Senate votes through No. ${note.missing.recordTotal} (issue of ${note.missing.recordIssueDate}); we have through No. ${note.missing.ourLatestRoll}`
    : null;
  return {
    status: 'ok',
    lastSuccessfulFetch: since,
    error: note.lastError ? `Last attempt failed: ${note.lastError}` : missing,
  };
}

/** The three fields API and MCP responses carry for Senate votes. */
export interface VoteFreshnessFields {
  checkedAt: string | null;
  latestVoteDate: string | null;
  /** True only when the Congressional Record lists Senate votes we don't have. */
  stale: boolean;
}

/** VoteFreshnessFields for a Senate member or vote; null for the House or when unknown. */
export async function senateVoteFreshnessFields(
  chamber: string | null | undefined,
  congress?: number
): Promise<VoteFreshnessFields | null> {
  if (chamber?.toLowerCase() !== 'senate') return null;
  const freshness = await getSenateVoteFreshness(congress);
  return freshness
    ? {
        checkedAt: freshness.checkedAt,
        latestVoteDate: freshness.latestVoteDate,
        stale: freshness.stale,
      }
    : null;
}
