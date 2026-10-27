/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Public API v1 — Vote Detail
 *
 * Returns vote data for a specific roll-call vote.
 * Supports formats: "house-119-116", "senate-119-42", and the same with a
 * session ("senate-119-2-42"). Without a session, the likeliest one is tried
 * first.
 *
 * Senate votes come from the stored copy of senate.gov's roll-call XML (the
 * same one the vote pages read), because senate.gov blocks requests from
 * Vercel. House votes are still fetched from clerk.house.gov.
 */

import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { v1Success, v1Error } from '@/lib/api/v1-response';
import { lookupVote, sessionsToTry, type UnifiedVoteDetail } from '@/lib/services/vote.service';
import { isServedCongress } from '@/lib/data/congressional-constants';
import logger from '@/lib/logging/simple-logger';
import type { HouseXmlVoteData } from '@/types/xml-vote-data';

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
  session?: string;
  rollNumber: string;
} | null {
  // Format: "house-119-116" or "senate-119-42", optionally with a session
  // ("senate-119-2-42")
  const match = voteId.match(/^(house|senate)-(\d+)(?:-([12]))?-(\d+)$/i);
  if (match?.[1] && match[2] && match[4]) {
    return {
      chamber: match[1].toLowerCase() as 'house' | 'senate',
      congress: match[2],
      session: match[3],
      rollNumber: match[4],
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
        v1Error(
          400,
          'Invalid vote ID format. Expected: house-119-116, senate-119-42 or senate-119-2-42'
        ),
        { status: 400 }
      );
    }

    const { chamber, congress, session, rollNumber } = parsed;

    // Older Congresses are out of scope: no vote page, no API answer.
    if (!isServedCongress(Number(congress))) {
      return NextResponse.json(v1Error(404, 'Vote not found'), { status: 404 });
    }

    if (chamber === 'senate') {
      const lookup = await lookupVote(
        `senate-${congress}-${session ? `${session}-` : ''}${rollNumber}`
      );
      if (lookup.status === 'not_found') {
        return NextResponse.json(v1Error(404, 'Vote not found'), { status: 404 });
      }
      if (lookup.status === 'unavailable') {
        return NextResponse.json(v1Error(502, 'Failed to fetch vote data'), { status: 502 });
      }
      logger.info('v1 vote detail', { voteId, chamber });
      return NextResponse.json(v1Success(senateVoteToV1(lookup.vote, voteId), 'senate.gov'), {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      });
    }

    // Roll-call numbers restart each session; the vote ID carries no session,
    // so try the likeliest session first and fall back to the other.
    let xmlText: string | null = null;
    let lastStatus = 404;
    for (const trySession of sessionsToTry(congress, session)) {
      const voteUrl = `https://clerk.house.gov/evs/${getYearFromCongress(parseInt(congress)) + (trySession - 1)}/roll${rollNumber.padStart(3, '0')}.xml`;

      const response = await fetch(voteUrl, {
        headers: { 'User-Agent': 'CIV.IQ/1.0 (Democratic Platform)' },
      });

      if (!response.ok) {
        lastStatus = response.status;
        continue;
      }

      const body = await response.text();
      // The Clerk can serve a 200 HTML error page for missing votes
      if (body.includes('rollcall-vote')) {
        xmlText = body;
        break;
      }
      lastStatus = 404;
    }

    if (!xmlText) {
      if (lastStatus === 404) {
        return NextResponse.json(v1Error(404, 'Vote not found'), { status: 404 });
      }
      return NextResponse.json(v1Error(502, 'Failed to fetch vote data'), { status: 502 });
    }
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const xmlData = parser.parse(xmlText);
    const data = parseHouseVote(xmlData as HouseXmlVoteData, voteId, congress, rollNumber);

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

function parseHouseVote(
  xmlData: HouseXmlVoteData,
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

/** Map a stored Senate roll call to the v1 vote shape. */
function senateVoteToV1(vote: UnifiedVoteDetail, voteId: string) {
  const session = Number.parseInt(vote.session, 10);
  return {
    voteId,
    chamber: 'Senate',
    congress: Number.parseInt(vote.congress, 10),
    session,
    rollNumber: vote.rollNumber,
    question: vote.question || null,
    description: vote.description || null,
    result: vote.result || null,
    date: vote.date || null,
    totals: {
      yea: vote.yeas,
      nay: vote.nays,
      present: vote.present,
      notVoting: vote.absent,
    },
    positions: vote.members.map((m): VotePosition => ({
      name: m.fullName,
      party: m.party,
      state: m.state,
      vote: m.position,
      bioguideId: m.bioguideId,
    })),
    url: `https://civdotiq.org/vote/senate-${vote.congress}-${session}-${vote.rollNumber}`,
  };
}
