/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * The dates of a weekly digest issue (real-dates plan, PR 5).
 *
 * - Latest record: the newest dated fact in the issue, as its source dates
 *   it: a roll call's date, a bill's latest action date, a filing's receipt
 *   date. Shown on the page's Sources line.
 * - Checked: when the issue was assembled from those sources, saved with it
 *   (`generatedAt`). Shown on the Sources line.
 * - Modified: an issue covers a finished week, so its facts don't move. Its
 *   structured data carries `dateModified` only when the issue was assembled
 *   again with different content, and then it is that assembly's time. The
 *   sitemap lists the same date. Decided by Mark 2026-11-01: dateModified is
 *   never earlier than datePublished (the week's Sunday).
 *
 * A small key beside each cached issue remembers its content fingerprint and
 * modified time across re-assemblies, and lets the sitemap read 600+ issues'
 * dates in one batch instead of loading the issues.
 */

import { cache } from '@/lib/cache';
import { getRedisCache } from '@/lib/cache/redis-client';
import logger from '@/lib/logging/simple-logger';
import { dayOf } from '@/lib/questions/question-dates';
import type { DigestIssue } from './types';

export interface DigestIssueDates {
  /** YYYY-MM-DD of the newest fact in the issue, or null when it has none. */
  latestRecord: string | null;
  /** ISO time the issue was assembled (its generatedAt). */
  checkedAt: string;
  /** ISO time of the re-assembly that last changed the content, or null. */
  modifiedAt: string | null;
  /** Content fingerprint the modified time was decided against. */
  fingerprint: string;
}

/** Longest a key may live (agreed rule); well past the 30-day issue cache. */
const ISSUE_DATES_TTL = 90 * 24 * 60 * 60;

export function issueDatesKey(state: string, weekId: string): string {
  return `digest:issue-dates:v1:${state.toUpperCase()}:${weekId}`;
}

/** The newest source-dated fact in the issue: vote date, bill action date or filing receipt. */
export function issueLatestRecord(issue: DigestIssue): string | null {
  return [
    ...issue.votes.map(v => v.date),
    ...issue.bills.map(b => b.latestActionDate),
    ...issue.filings.map(f => f.receiptDate),
  ]
    .map(dayOf)
    .reduce<string | null>((a, b) => (b && (a === null || b > a) ? b : a), null);
}

/**
 * A stable fingerprint of what the issue says: which roll calls with which
 * results and delegation positions, which bills at which action, which
 * filings. AI summaries are attached at read time and don't count.
 */
export function issueFingerprint(issue: DigestIssue): string {
  const votes = [...issue.votes]
    .map(
      v =>
        `${v.voteId}|${v.result}|${v.yeas}-${v.nays}|` +
        [...v.delegationPositions]
          .map(p => `${p.bioguideId}:${p.position}`)
          .sort((a, b) => a.localeCompare(b))
          .join(',')
    )
    .sort((a, b) => a.localeCompare(b));
  const bills = [...issue.bills]
    .map(b => `${b.billId}|${b.latestActionDate}|${b.latestActionText}`)
    .sort((a, b) => a.localeCompare(b));
  const filings = [...issue.filings]
    .map(f => `${f.fileNumber}|${f.bioguideId}|${f.receiptDate}`)
    .sort((a, b) => a.localeCompare(b));
  return hash(
    [
      `votes:${votes.join(';')}`,
      `bills:${bills.join(';')}`,
      `filings:${filings.join(';')}`,
      `unavailable:${[...issue.unavailable].sort((a, b) => a.localeCompare(b)).join(',')}`,
    ].join('\n')
  );
}

/** FNV-1a, 32-bit, hex. Collisions only cost a missed dateModified. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * The issue's dates, remembered across re-assemblies. One read; a write only
 * when this assembly is new to the key. Never throws: on a cache failure the
 * dates come from the issue alone, with no modified time.
 */
export async function recordIssueDates(issue: DigestIssue): Promise<DigestIssueDates> {
  const fingerprint = issueFingerprint(issue);
  const fromIssue: DigestIssueDates = {
    latestRecord: issueLatestRecord(issue),
    checkedAt: issue.generatedAt,
    modifiedAt: null,
    fingerprint,
  };
  const key = issueDatesKey(issue.state, issue.weekId);
  try {
    const saved = await cache.get<DigestIssueDates>(key);
    if (saved && saved.checkedAt === issue.generatedAt) {
      // Same assembly as last time: nothing to decide.
      return { ...fromIssue, modifiedAt: saved.modifiedAt ?? null };
    }
    const dates: DigestIssueDates = {
      ...fromIssue,
      // A later assembly with different content is a modification; the same
      // content keeps whatever modified time it already had.
      modifiedAt: saved
        ? saved.fingerprint === fingerprint
          ? (saved.modifiedAt ?? null)
          : issue.generatedAt
        : null,
    };
    await cache.set(key, dates, ISSUE_DATES_TTL);
    return dates;
  } catch (error) {
    logger.warn('[DigestDates] Issue dates not saved', {
      state: issue.state,
      weekId: issue.weekId,
      error: (error as Error).message,
    });
    return fromIssue;
  }
}

/** Saved dates for many issues, keyed `${STATE}:${weekId}`; one batch read. */
export async function readIssueDates(
  issues: Array<{ state: string; weekId: string }>
): Promise<Map<string, DigestIssueDates>> {
  const result = new Map<string, DigestIssueDates>();
  if (issues.length === 0) return result;
  try {
    const values = await getRedisCache().mget<DigestIssueDates>(
      issues.map(i => issueDatesKey(i.state, i.weekId))
    );
    values.forEach((value, i) => {
      const issue = issues[i];
      if (issue && value && typeof value === 'object') {
        result.set(`${issue.state.toUpperCase()}:${issue.weekId}`, value);
      }
    });
  } catch (error) {
    logger.warn('[DigestDates] Saved issue dates unavailable', {
      error: (error as Error).message,
    });
  }
  return result;
}

/** The YYYY-MM-DD for structured data and the sitemap: the modified time's day, or null. */
export function issueModifiedOn(dates: Pick<DigestIssueDates, 'modifiedAt'> | null): string | null {
  return dayOf(dates?.modifiedAt);
}
