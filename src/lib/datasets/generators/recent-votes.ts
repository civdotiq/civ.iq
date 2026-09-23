/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Recent Votes Dataset Generator
 *
 * Generates two datasets:
 * 1. Vote summaries — the most recent roll-call votes (10 per chamber)
 * 2. Vote positions — individual member votes for those roll calls (~10K rows)
 *
 * Both generators share a single cached fetch to avoid duplicate API calls.
 *
 * Sources: Congress.gov house-vote API + House Clerk XML (House);
 * mirrored senate.gov vote menu + roll calls (Senate).
 */

import logger from '@/lib/logging/simple-logger';
import { getVoteDetailsService, UnifiedVoteDetail } from '@/lib/services/vote.service';
import { getSenateVoteMenu } from '@/features/representatives/services/roll-call-corpus';
import type { DatasetResult, DatasetColumn } from '@/types/dataset';

// --- Vote Summaries ---

const SUMMARY_COLUMNS: DatasetColumn[] = [
  { key: 'voteId', label: 'Vote ID', description: 'Unique vote identifier', type: 'string' },
  { key: 'chamber', label: 'Chamber', description: 'House or Senate', type: 'string' },
  { key: 'date', label: 'Date', description: 'Date of the vote', type: 'date' },
  { key: 'question', label: 'Question', description: 'What was being voted on', type: 'string' },
  {
    key: 'description',
    label: 'Description',
    description: 'Additional context for the vote',
    type: 'string',
  },
  { key: 'result', label: 'Result', description: 'Outcome (Passed, Failed, etc.)', type: 'string' },
  { key: 'yeas', label: 'Yeas', description: 'Number of yea votes', type: 'number' },
  { key: 'nays', label: 'Nays', description: 'Number of nay votes', type: 'number' },
  {
    key: 'present',
    label: 'Present',
    description: 'Number of present/abstain votes',
    type: 'number',
  },
  { key: 'absent', label: 'Not Voting', description: 'Number not voting', type: 'number' },
  {
    key: 'billNumber',
    label: 'Bill Number',
    description: 'Associated bill number if applicable',
    type: 'string',
  },
  {
    key: 'billTitle',
    label: 'Bill Title',
    description: 'Associated bill title if applicable',
    type: 'string',
  },
];

// --- Vote Positions ---

const POSITION_COLUMNS: DatasetColumn[] = [
  {
    key: 'voteId',
    label: 'Vote ID',
    description: 'Vote identifier this position belongs to',
    type: 'string',
  },
  { key: 'voteDate', label: 'Vote Date', description: 'Date of the vote', type: 'date' },
  { key: 'chamber', label: 'Chamber', description: 'House or Senate', type: 'string' },
  {
    key: 'bioguideId',
    label: 'Bioguide ID',
    description: 'Member bioguide identifier',
    type: 'string',
  },
  {
    key: 'memberName',
    label: 'Member Name',
    description: 'Full name of the member',
    type: 'string',
  },
  { key: 'state', label: 'State', description: 'Member state', type: 'string' },
  { key: 'party', label: 'Party', description: 'Member party affiliation', type: 'string' },
  {
    key: 'position',
    label: 'Position',
    description: 'Vote position (Yea, Nay, Present, Not Voting)',
    type: 'string',
  },
  {
    key: 'question',
    label: 'Vote Question',
    description: 'What was being voted on',
    type: 'string',
  },
];

/** Roll calls taken per chamber. Both chambers together make ~20 rows. */
export const VOTES_PER_CHAMBER = 10;

const CONGRESS_API = 'https://api.congress.gov/v3';

interface HouseVoteListResponse {
  pagination?: { count?: number };
}

/** Congress number for a date: the 119th began Jan 2025. */
export function congressForDate(now: Date): number {
  return Math.floor((now.getUTCFullYear() - 1789) / 2) + 1;
}

/** House sessions map to calendar years: odd year = session 1, even = 2. */
export function sessionForDate(now: Date): number {
  return now.getUTCFullYear() % 2 === 0 ? 2 : 1;
}

/**
 * Latest House roll number in a session. The house-vote list endpoint ignores
 * sort parameters, but roll numbers are sequential per session, so
 * pagination.count IS the latest roll number (same approach as the Nostr
 * vote detector).
 */
async function fetchLatestHouseRoll(
  apiKey: string,
  congress: number,
  session: number
): Promise<number> {
  const url = `${CONGRESS_API}/house-vote/${congress}/${session}?limit=1&format=json`;
  const response = await fetch(url, {
    headers: { 'X-API-Key': apiKey },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    logger.error('Failed to fetch House vote list', new Error(`HTTP ${response.status}`), {
      congress,
      session,
    });
    return 0;
  }
  const json = (await response.json()) as HouseVoteListResponse;
  return json.pagination?.count ?? 0;
}

/**
 * Vote IDs for the most recent House roll calls. Early in a second session
 * there may be fewer than `limit` rolls, so the tail of session 1 fills in.
 */
export async function listRecentHouseVoteIds(
  apiKey: string,
  now: Date,
  limit: number = VOTES_PER_CHAMBER
): Promise<string[]> {
  const congress = congressForDate(now);
  const ids: string[] = [];
  for (let session = sessionForDate(now); session >= 1 && ids.length < limit; session--) {
    const latest = await fetchLatestHouseRoll(apiKey, congress, session);
    for (let roll = latest; roll >= 1 && ids.length < limit; roll--) {
      ids.push(`house-${congress}-${session}-${roll}`);
    }
  }
  return ids;
}

/**
 * Vote IDs for the most recent Senate roll calls, read from the mirrored
 * senate.gov vote menu (senate.gov is Akamai-blocked from Vercel, MR10).
 * Returns [] when the mirror has not run.
 */
export async function listRecentSenateVoteIds(
  now: Date,
  limit: number = VOTES_PER_CHAMBER
): Promise<string[]> {
  const congress = congressForDate(now);
  const menu = await getSenateVoteMenu(congress);
  if (!menu) {
    logger.warn('Senate vote menu absent — recent-votes dataset has no Senate rows', {
      congress,
    });
    return [];
  }
  return Object.entries(menu.sessions)
    .flatMap(([session, entries]) =>
      entries.map(entry => ({ session: parseInt(session, 10), n: entry.n }))
    )
    .filter(({ session, n }) => Number.isFinite(session) && Number.isFinite(n))
    .sort((a, b) => b.session - a.session || b.n - a.n)
    .slice(0, limit)
    .map(({ session, n }) => `senate-${congress}-${session}-${n}`);
}

// --- Shared fetch with module-level cache ---
// Within a single request lifecycle (ISR), both generators
// share the same resolved promise to avoid duplicate API calls.

let cachedVoteDetails: Promise<UnifiedVoteDetail[]> | null = null;

export async function fetchVoteDetails(now: Date = new Date()): Promise<UnifiedVoteDetail[]> {
  const congressApiKey = process.env.CONGRESS_API_KEY;
  if (!congressApiKey) return [];

  const [houseIds, senateIds] = await Promise.all([
    listRecentHouseVoteIds(congressApiKey, now).catch(error => {
      logger.error('Failed to list recent House votes', error as Error);
      return [] as string[];
    }),
    listRecentSenateVoteIds(now),
  ]);

  const details = await Promise.all(
    [...houseIds, ...senateIds].map(async voteId => {
      try {
        const detail = await getVoteDetailsService(voteId);
        // The service returns Senate IDs as a bare padded roll ("00238"),
        // which collides across sessions. Keep the session-qualified ID.
        return detail ? { ...detail, voteId } : null;
      } catch (error) {
        logger.warn('Failed to fetch vote details', { voteId, error });
        return null;
      }
    })
  );

  return details
    .filter((v): v is UnifiedVoteDetail => v !== null)
    .sort((a, b) => voteTime(b) - voteTime(a));
}

/** Sortable timestamp; unparseable dates sort last. */
function voteTime(vote: UnifiedVoteDetail): number {
  const t = new Date(vote.date).getTime();
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
}

function getSharedVoteDetails(): Promise<UnifiedVoteDetail[]> {
  if (!cachedVoteDetails) {
    cachedVoteDetails = fetchVoteDetails().finally(() => {
      // Clear after resolution so next ISR cycle gets fresh data
      setTimeout(() => {
        cachedVoteDetails = null;
      }, 60000);
    });
  }
  return cachedVoteDetails;
}

export async function generateRecentVotes(): Promise<DatasetResult> {
  const validVotes = await getSharedVoteDetails();

  const summaryData = validVotes.map(vote => ({
    voteId: vote.voteId,
    chamber: vote.chamber,
    date: vote.date,
    question: vote.question,
    description: vote.description,
    result: vote.result,
    yeas: vote.yeas,
    nays: vote.nays,
    present: vote.present,
    absent: vote.absent,
    billNumber: vote.bill?.number ?? '',
    billTitle: vote.bill?.title ?? '',
  }));

  return {
    metadata: {
      name: 'Recent Votes (119th Congress)',
      slug: 'recent-votes',
      description: 'The 10 most recent roll-call vote summaries from each chamber of Congress.',
      source: 'Congress.gov API + Senate.gov XML',
      sourceUrl: 'https://api.congress.gov',
      generated: new Date().toISOString(),
      recordCount: summaryData.length,
      license: 'Public Domain',
      columns: SUMMARY_COLUMNS,
    },
    data: summaryData,
  };
}

export async function generateVotePositions(): Promise<DatasetResult> {
  const validVotes = await getSharedVoteDetails();

  const positionData: Record<string, unknown>[] = [];
  for (const vote of validVotes) {
    for (const member of vote.members) {
      positionData.push({
        voteId: vote.voteId,
        voteDate: vote.date,
        chamber: vote.chamber,
        bioguideId: member.bioguideId ?? member.id,
        memberName: member.fullName,
        state: member.state,
        party: member.party,
        position: member.position,
        question: vote.question,
      });
    }
  }

  return {
    metadata: {
      name: 'Recent Vote Positions (119th Congress)',
      slug: 'vote-positions',
      description:
        'Individual member voting positions for the 10 most recent roll-call votes in each chamber. One row per member per vote.',
      source: 'Congress.gov API + Senate.gov XML + House Clerk XML',
      sourceUrl: 'https://api.congress.gov',
      generated: new Date().toISOString(),
      recordCount: positionData.length,
      license: 'Public Domain',
      columns: POSITION_COLUMNS,
    },
    data: positionData,
  };
}
