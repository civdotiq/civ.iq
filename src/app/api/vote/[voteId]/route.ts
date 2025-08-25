/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Detailed Senate Vote API - Individual Vote Analysis
 *
 * This endpoint fetches comprehensive vote details for a specific Senate roll call vote.
 * It provides complete member voting records, vote counts, and metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import logger from '@/lib/logging/simple-logger';

// Type definitions for detailed vote data
interface VoteDetail {
  voteId: string;
  congress: string;
  session: string;
  rollNumber: number;
  date: string;
  time?: string;
  title: string;
  question: string;
  description: string;
  result: string;
  yeas: number;
  nays: number;
  present: number;
  absent: number;
  totalVotes: number;
  requiredMajority?: string;
  members: SenatorVote[];
  bill?: {
    number: string;
    title: string;
    type: string;
  };
  amendment?: {
    number: string;
    purpose: string;
  };
  metadata: {
    source: 'senate-xml-feed';
    confidence: 'high' | 'medium' | 'low';
    processingDate: string;
    xmlUrl: string;
  };
}

interface SenatorVote {
  lisId: string;
  bioguideId?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  state: string;
  party: 'D' | 'R' | 'I';
  position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
}

interface VoteResponse {
  vote: VoteDetail | null;
  success: boolean;
  error?: string;
  metadata: {
    timestamp: string;
    requestId: string;
    responseTime: number;
  };
}

/**
 * Parse Senate XML vote file and extract all details
 */
async function parseDetailedVote(voteId: string): Promise<VoteDetail | null> {
  try {
    // Construct XML URL for the specific vote
    const paddedVoteId = voteId.padStart(5, '0');
    const xmlUrl = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_${paddedVoteId}.xml`;

    logger.info('Fetching detailed Senate vote XML', { voteId, xmlUrl });

    // Fetch the XML file
    const response = await fetch(xmlUrl, {
      headers: {
        'User-Agent': 'CivIQ-Hub/2.0 (civic-engagement-tool)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      logger.warn('Failed to fetch Senate vote XML', {
        voteId,
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const xmlText = await response.text();

    // Parse XML with comprehensive configuration
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
    });

    const xmlData = parser.parse(xmlText);
    const rollCallVote = xmlData.roll_call_vote;

    if (!rollCallVote) {
      logger.warn('Invalid XML structure in Senate vote file', { voteId });
      return null;
    }

    // Extract vote metadata
    const congress = String(rollCallVote.congress || '119');
    const session = String(rollCallVote.session || '1');
    const rollNumber = parseInt(String(rollCallVote.vote_number || voteId));

    // Parse date and time
    const voteDate = String(rollCallVote.vote_date || '');
    const voteTime = String(rollCallVote.vote_time || '');

    // Parse vote counts
    const countData = rollCallVote.count || {};
    const yeas = parseInt(String(countData.yeas || '0'));
    const nays = parseInt(String(countData.nays || '0'));
    const present = parseInt(String(countData.present || '0'));
    const absent = parseInt(String(countData.absent || '0'));

    // Process all senators' votes
    const members: SenatorVote[] = [];
    if (rollCallVote.members?.member) {
      const memberList = Array.isArray(rollCallVote.members.member)
        ? rollCallVote.members.member
        : [rollCallVote.members.member];

      for (const member of memberList) {
        const senatorVote: SenatorVote = {
          lisId: String(member.lis_member_id || ''),
          firstName: String(member.first_name || ''),
          lastName: String(member.last_name || ''),
          fullName: String(member.member_full || ''),
          state: String(member.state || ''),
          party: String(member.party || '') as 'D' | 'R' | 'I',
          position: String(member.vote_cast || 'Not Voting') as SenatorVote['position'],
        };

        members.push(senatorVote);
      }
    }

    // Sort members by state then last name for consistent display
    members.sort((a, b) => {
      if (a.state !== b.state) {
        return a.state.localeCompare(b.state);
      }
      return a.lastName.localeCompare(b.lastName);
    });

    // Extract bill information if present
    let bill = undefined;
    if (rollCallVote.document?.document_name) {
      bill = {
        number: String(rollCallVote.document.document_name),
        title: String(rollCallVote.document.document_title || ''),
        type: String(rollCallVote.document.document_type || 'Bill'),
      };
    }

    // Extract amendment information if present
    let amendment = undefined;
    if (rollCallVote.amendment) {
      amendment = {
        number: String(rollCallVote.amendment.amendment_number || ''),
        purpose: String(rollCallVote.amendment.amendment_purpose || ''),
      };
    }

    // Construct the detailed vote object
    const voteDetail: VoteDetail = {
      voteId: paddedVoteId,
      congress,
      session,
      rollNumber,
      date: voteDate,
      time: voteTime,
      title: String(rollCallVote.vote_title || rollCallVote.question || 'Senate Vote'),
      question: String(rollCallVote.question || rollCallVote.vote_title || ''),
      description: String(rollCallVote.vote_description || rollCallVote.question || ''),
      result: String(rollCallVote.vote_result || 'Unknown'),
      yeas,
      nays,
      present,
      absent,
      totalVotes: yeas + nays + present + absent,
      requiredMajority: String(rollCallVote.majority_requirement || ''),
      members,
      bill,
      amendment,
      metadata: {
        source: 'senate-xml-feed',
        confidence: 'high',
        processingDate: new Date().toISOString(),
        xmlUrl,
      },
    };

    logger.info('Successfully parsed detailed Senate vote', {
      voteId,
      memberCount: members.length,
      totalVotes: voteDetail.totalVotes,
      result: voteDetail.result,
    });

    return voteDetail;
  } catch (error) {
    logger.error('Error parsing detailed Senate vote', error as Error, { voteId });
    return null;
  }
}

/**
 * API Route Handler - GET /api/vote/[voteId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ voteId: string }> }
) {
  const startTime = Date.now();
  let voteId = '';

  try {
    // Extract and validate vote ID
    const resolvedParams = await params;
    voteId = resolvedParams?.voteId?.toString() || '';

    // Validate vote ID format (should be numeric)
    if (!voteId || !/^\d+$/.test(voteId)) {
      logger.warn('Invalid vote ID format', { voteId });
      const errorResponse: VoteResponse = {
        vote: null,
        success: false,
        error: 'Invalid vote ID format. Vote ID must be numeric.',
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          responseTime: Date.now() - startTime,
        },
      };

      return NextResponse.json(errorResponse, { status: 400 });
    }

    logger.info('Detailed vote API called', { voteId });

    // Parse the detailed vote information
    const voteDetail = await parseDetailedVote(voteId);

    if (!voteDetail) {
      logger.warn('Vote not found or failed to parse', { voteId });
      const notFoundResponse: VoteResponse = {
        vote: null,
        success: false,
        error: `Vote ${voteId} not found or could not be parsed`,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          responseTime: Date.now() - startTime,
        },
      };

      return NextResponse.json(notFoundResponse, { status: 404 });
    }

    // Successful response
    const successResponse: VoteResponse = {
      vote: voteDetail,
      success: true,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        responseTime: Date.now() - startTime,
      },
    };

    logger.info('Detailed vote API completed successfully', {
      voteId,
      responseTime: Date.now() - startTime,
      memberCount: voteDetail.members.length,
    });

    return NextResponse.json(successResponse, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    // Ultimate error handling
    logger.error('Unexpected error in detailed vote API', error as Error, { voteId });

    const errorResponse: VoteResponse = {
      vote: null,
      success: false,
      error: 'Internal server error while fetching vote details',
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        responseTime: Date.now() - startTime,
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
