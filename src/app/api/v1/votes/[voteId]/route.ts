/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Public API v1 — Vote Detail
 *
 * Returns vote data for a specific roll-call vote.
 * Supports formats: "house-119-116", "senate-119-42", or numeric IDs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { v1Success, v1Error } from '@/lib/api/v1-response';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

interface VotePosition {
  name: string;
  party: string;
  state: string;
  vote: string;
  bioguideId?: string;
}

function parseVoteId(voteId: string): {
  chamber: 'house' | 'senate';
  congress: string;
  rollNumber: string;
} | null {
  // Format: "house-119-116" or "senate-119-42"
  const match = voteId.match(/^(house|senate)-(\d+)-(\d+)$/i);
  if (match?.[1] && match[2] && match[3]) {
    return {
      chamber: match[1].toLowerCase() as 'house' | 'senate',
      congress: match[2],
      rollNumber: match[3],
    };
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ voteId: string }> }
): Promise<NextResponse> {
  try {
    const { voteId } = await params;

    if (!voteId) {
      return NextResponse.json(v1Error(400, 'Vote ID is required'), { status: 400 });
    }

    const parsed = parseVoteId(voteId);
    if (!parsed) {
      return NextResponse.json(
        v1Error(400, 'Invalid vote ID format. Expected: house-119-116 or senate-119-42'),
        { status: 400 }
      );
    }

    const { chamber, congress, rollNumber } = parsed;
    const session = '1'; // Default to first session

    let voteUrl: string;
    if (chamber === 'house') {
      voteUrl = `https://clerk.house.gov/evs/${getYearFromCongress(parseInt(congress))}/roll${rollNumber.padStart(3, '0')}.xml`;
    } else {
      voteUrl = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${rollNumber.padStart(5, '0')}.xml`;
    }

    const response = await fetch(voteUrl, {
      headers: { 'User-Agent': 'CIV.IQ/1.0 (Democratic Platform)' },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(v1Error(404, 'Vote not found'), { status: 404 });
      }
      return NextResponse.json(v1Error(502, 'Failed to fetch vote data'), { status: 502 });
    }

    const xmlText = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const xmlData = parser.parse(xmlText);

    // Parse based on chamber
    let data;
    if (chamber === 'house') {
      data = parseHouseVote(xmlData, voteId, congress, rollNumber);
    } else {
      data = parseSenateVote(xmlData, voteId, congress, rollNumber);
    }

    if (!data) {
      return NextResponse.json(v1Error(500, 'Failed to parse vote data'), { status: 500 });
    }

    logger.info('v1 vote detail', { voteId, chamber });

    return NextResponse.json(v1Success(data, `${chamber}.gov`), {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    logger.error('v1 vote detail error', error as Error);
    return NextResponse.json(v1Error(500, 'Internal server error'), { status: 500 });
  }
}

function getYearFromCongress(congress: number): number {
  // 119th Congress starts in 2025
  return 2025 + (congress - 119) * 2;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseHouseVote(
  xmlData: Record<string, any>,
  voteId: string,
  congress: string,
  rollNumber: string
) {
  const rollcall = xmlData['rollcall-vote'];
  if (!rollcall) return null;

  const metadata = rollcall['vote-metadata'] ?? {};
  const voteData = rollcall['vote-data'] ?? {};

  const totals = metadata['vote-totals']?.['totals-by-vote'] ?? {};
  const positions: VotePosition[] = [];

  const voters = Array.isArray(voteData['recorded-vote'])
    ? voteData['recorded-vote']
    : voteData['recorded-vote']
      ? [voteData['recorded-vote']]
      : [];

  for (const voter of voters) {
    const legislator = voter.legislator ?? {};
    positions.push({
      name: `${legislator['@_unaccented-name'] || legislator['@_name-id'] || 'Unknown'}`,
      party: legislator['@_party'] ?? '',
      state: legislator['@_state'] ?? '',
      vote: voter.vote ?? '',
      bioguideId: legislator['@_name-id'] ?? undefined,
    });
  }

  return {
    voteId,
    chamber: 'House',
    congress: parseInt(congress),
    rollNumber: parseInt(rollNumber),
    question: metadata['vote-question'] ?? null,
    description: metadata['vote-desc'] ?? null,
    result: metadata['vote-result'] ?? null,
    date: metadata['action-date'] ?? null,
    time: metadata['action-time']?.['#text'] ?? null,
    totals: {
      yea: parseInt(totals['yea-total'] ?? '0'),
      nay: parseInt(totals['nay-total'] ?? '0'),
      present: parseInt(totals['present-total'] ?? '0'),
      notVoting: parseInt(totals['not-voting-total'] ?? '0'),
    },
    positions,
    url: `https://civdotiq.org/vote/${voteId}`,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSenateVote(
  xmlData: Record<string, any>,
  voteId: string,
  congress: string,
  rollNumber: string
) {
  const rollcall = xmlData['roll_call_vote'];
  if (!rollcall) return null;

  const positions: VotePosition[] = [];
  const members = rollcall.members?.member;
  const memberList = Array.isArray(members) ? members : members ? [members] : [];

  for (const member of memberList) {
    positions.push({
      name: `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim(),
      party: member.party ?? '',
      state: member.state ?? '',
      vote: member.vote_cast ?? '',
      bioguideId: member.lis_member_id ?? undefined,
    });
  }

  const count = rollcall.count ?? {};

  return {
    voteId,
    chamber: 'Senate',
    congress: parseInt(congress),
    rollNumber: parseInt(rollNumber),
    question: rollcall.vote_question_text ?? rollcall.question ?? null,
    description: rollcall.vote_document_text ?? rollcall.title ?? null,
    result: rollcall.vote_result_text ?? rollcall.vote_result ?? null,
    date: rollcall.vote_date ?? null,
    totals: {
      yea: parseInt(count.yeas ?? '0'),
      nay: parseInt(count.nays ?? '0'),
      present: parseInt(count.present ?? '0'),
      notVoting: parseInt(count.absent ?? '0'),
    },
    positions,
    url: `https://civdotiq.org/vote/${voteId}`,
  };
}
