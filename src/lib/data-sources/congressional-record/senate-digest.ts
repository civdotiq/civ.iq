/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Senate vote totals from the Congressional Record's Daily Digest (GovInfo, GPO).
 *
 * Each day the Senate holds roll-call votes, the "Daily Digest/Senate" section
 * of that day's Record says so:
 *
 *   Record Votes: Four record votes were taken today. (Total--256)
 *
 * The total is the session's running count of roll calls (odd year = session
 * 1). Days with no votes (pro forma sessions, recesses) have no such line, so
 * the newest issue that has one gives the Senate's roll-call count to date.
 * Comparing it with our newest stored roll tells us whether the Senate has
 * voted on something we don't have (senate.gov has blocked our mirror since
 * 2026-10-23, issue #300).
 *
 * Checked against all 162 Record issues of 2026 (scripts/backtest-senate-digest.ts):
 * on every day with a total, it equals the number of Senate roll calls we hold
 * through that date.
 */

const GOVINFO_API = 'https://api.govinfo.gov';
const FETCH_TIMEOUT_MS = 20_000;

export interface RecordIssue {
  /** e.g. "CREC-2026-09-30" */
  packageId: string;
  /** YYYY-MM-DD */
  dateIssued: string;
}

export interface SenateDigestReading {
  packageId: string;
  dateIssued: string;
  /** Whether the issue has any Daily Digest section yet. Until it does, the
   *  issue isn't fully published and says nothing either way. */
  digestFound: boolean;
  /** The session's roll-call total, or null when the Senate held no votes. */
  total: number | null;
}

interface GovInfoGranule {
  granuleId: string;
  title?: string;
  granuleClass?: string;
}

function apiKey(): string {
  return process.env.GOVINFO_API_KEY ?? 'DEMO_KEY';
}

async function govinfoFetch(url: string): Promise<Response> {
  const response = await fetch(url, {
    headers: { 'X-API-Key': apiKey() },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`GovInfo ${response.status} for ${url.replace(GOVINFO_API, '')}`);
  }
  return response;
}

/** The roll-call total in a Senate Daily Digest's text, or null when the
 *  Senate took no record votes that day. GPO text can carry NUL bytes. */
export function parseSenateRecordVoteTotal(text: string): number | null {
  const clean = text.replace(/\0/g, '');
  let total: number | null = null;
  for (const match of clean.matchAll(/Record\s+Votes?:[^()]{0,300}\(Total--\s*(\d+)\s*\)/gi)) {
    const n = Number.parseInt(match[1] ?? '', 10);
    if (Number.isFinite(n) && (total === null || n > total)) total = n;
  }
  return total;
}

/** "Daily Digest/Senate" or a combined title such as
 *  "Daily Digest/Highlights + Senate". Not "Senate Committee Meetings". */
export function isSenateDigestTitle(title: string | undefined): boolean {
  if (!title?.startsWith('Daily Digest/')) return false;
  return title
    .slice('Daily Digest/'.length)
    .split('+')
    .some(part => part.trim().toLowerCase() === 'senate');
}

/** A Digest granule with no usable title might still be the Senate section. */
function isUntitledDigest(title: string | undefined): boolean {
  const rest = title?.startsWith('Daily Digest/') ? title.slice('Daily Digest/'.length) : title;
  return !rest?.trim();
}

/** Record issues dated from `from` to `to` (YYYY-MM-DD), oldest first. */
export async function listRecordIssues(from: string, to: string): Promise<RecordIssue[]> {
  const issues: RecordIssue[] = [];
  let url: string | null =
    `${GOVINFO_API}/published/${from}/${to}?collection=CREC&pageSize=100&offsetMark=*`;
  while (url) {
    const page = (await (await govinfoFetch(url)).json()) as {
      packages?: { packageId: string; dateIssued: string }[];
      nextPage?: string | null;
    };
    for (const p of page.packages ?? []) {
      issues.push({ packageId: p.packageId, dateIssued: p.dateIssued.slice(0, 10) });
    }
    url = page.nextPage ?? null;
  }
  return issues.sort((a, b) => a.dateIssued.localeCompare(b.dateIssued));
}

/** Read one Record issue's Senate Daily Digest. Throws on any fetch failure:
 *  an unreadable issue is unknown, never "no votes". */
export async function readSenateDigest(issue: RecordIssue): Promise<SenateDigestReading> {
  const granules: GovInfoGranule[] = [];
  let url: string | null =
    `${GOVINFO_API}/packages/${issue.packageId}/granules?pageSize=1000&offsetMark=*`;
  while (url) {
    const page = (await (await govinfoFetch(url)).json()) as {
      granules?: GovInfoGranule[];
      nextPage?: string | null;
    };
    granules.push(...(page.granules ?? []));
    url = page.nextPage ?? null;
  }

  const digest = granules.filter(g => g.granuleClass === 'DAILYDIGEST');
  const senate = digest.filter(g => isSenateDigestTitle(g.title));
  const candidates = senate.length > 0 ? senate : digest.filter(g => isUntitledDigest(g.title));

  let total: number | null = null;
  for (const granule of candidates) {
    const text = await (
      await govinfoFetch(
        `${GOVINFO_API}/packages/${issue.packageId}/granules/${granule.granuleId}/htm`
      )
    ).text();
    const found = parseSenateRecordVoteTotal(text);
    if (found !== null && (total === null || found > total)) total = found;
  }

  return { ...issue, digestFound: digest.length > 0, total };
}

/** First calendar year of a Congress (the 119th began in 2025). */
export function congressStartYear(congress: number): number {
  return 1789 + 2 * (congress - 1);
}

/**
 * Session of a Congress for a Record date (YYYY-MM-DD): a session starts on
 * January 3. Null when the date falls outside the Congress.
 */
export function sessionForDate(congress: number, date: string): number | null {
  const year = Number.parseInt(date.slice(0, 4), 10);
  const monthDay = date.slice(5, 10);
  const sessionYear = monthDay < '01-03' ? year - 1 : year;
  const session = sessionYear - congressStartYear(congress) + 1;
  return session >= 1 && session <= 2 ? session : null;
}
