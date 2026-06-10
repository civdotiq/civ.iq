/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Recent Votes Dataset Generator
 *
 * Generates two datasets:
 * 1. Vote summaries — the 20 most recent roll-call votes
 * 2. Vote positions — individual member votes for those roll calls (~10K rows)
 *
 * Both generators share a single cached fetch to avoid duplicate API calls.
 *
 * Sources: Congress.gov API v3 + Senate XML + House Clerk XML
 */

import logger from '@/lib/logging/simple-logger';
import { getVoteDetailsService, UnifiedVoteDetail } from '@/lib/services/vote.service';
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

interface CongressVoteListItem {
  congress: number;
  chamber: string;
  rollNumber: number;
  date: string;
  question: string;
  result: string;
  url: string;
}

// --- Shared fetch with module-level cache ---
// Within a single request lifecycle (ISR), both generators
// share the same resolved promise to avoid duplicate API calls.

let cachedVoteDetails: Promise<UnifiedVoteDetail[]> | null = null;

async function fetchVoteDetails(): Promise<UnifiedVoteDetail[]> {
  const congressApiKey = process.env.CONGRESS_API_KEY;
  if (!congressApiKey) return [];

  const url = `https://api.congress.gov/v3/vote?limit=20&sort=date+desc&format=json`;
  const response = await fetch(url, {
    headers: { 'X-API-Key': congressApiKey },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    logger.error('Failed to fetch vote list', new Error(`${response.status}`));
    return [];
  }

  const json = await response.json();
  const voteList = (json.votes || []) as CongressVoteListItem[];

  const details = await Promise.all(
    voteList.map(async vote => {
      const voteId =
        vote.chamber === 'House'
          ? `house-${vote.congress}-${vote.rollNumber}`
          : `senate-${vote.congress}-${vote.rollNumber}`;
      try {
        return await getVoteDetailsService(voteId);
      } catch (error) {
        logger.warn('Failed to fetch vote details', { voteId, error });
        return null;
      }
    })
  );

  return details.filter((v): v is UnifiedVoteDetail => v !== null);
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
      description: 'The 20 most recent roll-call vote summaries from both chambers of Congress.',
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
        'Individual member voting positions for the 20 most recent roll-call votes. One row per member per vote.',
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
