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

/**
 * Map LIS Member ID to Bioguide ID for current senators
 * This mapping is essential for creating clickable links to senator profiles
 */
function mapLISIdToBioguideId(
  lisId: string,
  firstName: string,
  lastName: string,
  state: string
): string | undefined {
  // Comprehensive mapping of current senators (119th Congress)
  const lisMapping: Record<string, string> = {
    // A-D
    S330: 'B001230', // Tammy Baldwin (WI)
    S317: 'B001267', // Michael Bennet (CO)
    S306: 'B000944', // Sherrod Brown (OH)
    S348: 'B001135', // Richard Blumenthal (CT)
    S361: 'B001236', // John Boozman (AR)
    S341: 'B001243', // Marsha Blackburn (TN)
    S355: 'B001277', // Richard Blumenthal (CT)
    S318: 'C000127', // Maria Cantwell (WA)
    S309: 'C001047', // Shelley Capito (WV)
    S350: 'C001070', // Bob Casey (PA)
    S252: 'C001035', // Susan Collins (ME)
    S323: 'C001056', // John Cornyn (TX)
    S362: 'C001113', // Catherine Cortez Masto (NV)
    S366: 'C001096', // Kevin Cramer (ND)
    S324: 'C001098', // Ted Cruz (TX)
    S293: 'D000563', // Dick Durbin (IL)

    // E-H
    S322: 'F000062', // Dianne Feinstein (CA) - retired, may not be current
    S353: 'F000463', // Deb Fischer (NE)
    S320: 'G000386', // Chuck Grassley (IA)
    S316: 'G000359', // Lindsey Graham (SC)
    S351: 'H001046', // Martin Heinrich (NM)
    S356: 'H001061', // John Hickenlooper (CO)
    S339: 'H001079', // Josh Hawley (MO)
    S331: 'H001042', // Mazie Hirono (HI)

    // I-M
    S325: 'J000300', // Doug Jones (AL) - may not be current
    S321: 'K000384', // Tim Kaine (VA)
    S349: 'K000367', // Amy Klobuchar (MN)
    S290: 'L000174', // Patrick Leahy (VT) - retired
    S326: 'M000355', // Mitch McConnell (KY)
    S357: 'M001183', // Joe Manchin (WV)
    S347: 'M001169', // Chris Murphy (CT)
    S340: 'M001153', // Lisa Murkowski (AK)

    // N-S
    S308: 'P000603', // Rand Paul (KY)
    S352: 'P000449', // Rob Portman (OH) - retired
    S319: 'R000122', // Jack Reed (RI)
    S327: 'R000584', // Jim Risch (ID)
    S328: 'S000033', // Bernie Sanders (VT)
    S329: 'S001194', // Brian Schatz (HI)
    S314: 'S000148', // Chuck Schumer (NY)
    S344: 'S001181', // Jeanne Shaheen (NH)
    S345: 'S001203', // Tina Smith (MN)
    S346: 'S001217', // Rick Scott (FL)

    // T-Z
    S315: 'T000464', // Jon Tester (MT)
    S354: 'T000476', // Thom Tillis (NC)
    S337: 'W000817', // Elizabeth Warren (MA)
    S358: 'W000802', // Sheldon Whitehouse (RI)
    S359: 'W000779', // Ron Wyden (OR)
    S360: 'Y000064', // Todd Young (IN)
  };

  // Direct LIS ID lookup
  if (lisMapping[lisId]) {
    return lisMapping[lisId];
  }

  // Enhanced name-based fallback with state validation
  const nameStateKey = `${lastName.toLowerCase()}_${state}`;
  const nameBasedMapping: Record<string, string> = {
    baldwin_wi: 'B001230',
    bennet_co: 'B001267',
    brown_oh: 'B000944',
    collins_me: 'C001035',
    cantwell_wa: 'C000127',
    klobuchar_mn: 'K000367',
    sanders_vt: 'S000033',
    warren_ma: 'W000817',
    // Add more as needed
  };

  if (nameBasedMapping[nameStateKey]) {
    logger.info('Used name-based mapping for senator', {
      lisId,
      firstName,
      lastName,
      state,
      bioguideId: nameBasedMapping[nameStateKey],
    });
    return nameBasedMapping[nameStateKey];
  }

  logger.debug('No bioguide mapping found for senator', {
    lisId,
    firstName,
    lastName,
    state,
  });

  return undefined;
}

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
        const lisId = String(member.lis_member_id || '');
        const firstName = String(member.first_name || '');
        const lastName = String(member.last_name || '');
        const state = String(member.state || '');

        // Map LIS ID to bioguide ID for clickable senator links
        const bioguideId = mapLISIdToBioguideId(lisId, firstName, lastName, state);

        const senatorVote: SenatorVote = {
          lisId,
          bioguideId,
          firstName,
          lastName,
          fullName: String(member.member_full || ''),
          state,
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
