/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Unified Vote Detail API - Individual Vote Analysis
 *
 * This endpoint fetches comprehensive vote details for both House and Senate votes.
 * It automatically determines the chamber from the vote ID format and routes appropriately.
 * Supports both numeric vote IDs and chamber-prefixed IDs like 'house-119-116'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import logger from '@/lib/logging/simple-logger';
import { getLegislatorInfoMap } from '@/lib/data/legislator-mappings';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

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

// Unified type definitions for both chambers
interface UnifiedVoteDetail {
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
  chamber: 'House' | 'Senate';
  yeas: number;
  nays: number;
  present: number;
  absent: number;
  totalVotes: number;
  requiredMajority?: string;
  members: MemberVote[];
  bill?: {
    number: string;
    title: string;
    type: string;
    url?: string;
    summary?: string; // Congressional Research Service summary
  };
  amendment?: {
    number: string;
    purpose: string;
  };
  metadata: {
    source: string;
    confidence: string;
    processingDate: string;
    xmlUrl?: string;
    apiUrl?: string;
  };
}

// Legacy Senate-specific interface for backward compatibility
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
  chamber: 'House' | 'Senate';
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
    source: string;
    confidence: 'high' | 'medium' | 'low';
    processingDate: string;
    xmlUrl: string;
  };
}

// Unified member vote interface for both chambers
interface MemberVote {
  id: string; // bioguideId for House, lisId for Senate
  bioguideId?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  state: string;
  party: 'D' | 'R' | 'I';
  position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  district?: string; // For House members
}

// Legacy Senate-specific interface for backward compatibility
interface SenatorVote {
  id: string; // Added for compatibility with MemberVote
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
  vote: UnifiedVoteDetail | null;
  success: boolean;
  error?: string;
  metadata: {
    timestamp: string;
    requestId: string;
    responseTime: number;
  };
}

/**
 * Bill data returned from Congress.gov API
 */
interface BillData {
  title: string | null;
  summary: string | null;
}

/**
 * Fetch bill data (title and summary) from Congress.gov API
 * Returns the official bill title and CRS summary if available
 */
async function fetchBillData(
  congress: string,
  billType: string,
  billNumber: string
): Promise<BillData> {
  try {
    // Convert bill type to lowercase for API (e.g., HCONRES -> hconres)
    const typeSlug = billType.toLowerCase();
    const apiUrl = `https://api.congress.gov/v3/bill/${congress}/${typeSlug}/${billNumber}?api_key=${process.env.CONGRESS_API_KEY || ''}`;

    const response = await fetch(apiUrl, {
      headers: { 'User-Agent': 'CivIQ-Hub/2.0 (civic-engagement-tool)' },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      logger.debug('Bill data fetch failed', {
        congress,
        billType,
        billNumber,
        status: response.status,
      });
      return { title: null, summary: null };
    }

    const data = await response.json();
    const title = data.bill?.title || null;

    // Extract summary text - Congress.gov returns summaries array
    // The first summary is usually the most recent/relevant
    let summary: string | null = null;
    if (data.bill?.summaries && Array.isArray(data.bill.summaries)) {
      const latestSummary = data.bill.summaries[0];
      if (latestSummary?.text) {
        // Strip HTML tags from summary text
        summary = latestSummary.text.replace(/<[^>]*>/g, '').trim();
      }
    }

    if (title || summary) {
      logger.debug('Fetched bill data', {
        congress,
        billType,
        billNumber,
        hasTitle: !!title,
        hasSummary: !!summary,
        summaryLength: summary?.length || 0,
      });
    }

    return { title, summary };
  } catch (error) {
    logger.debug('Error fetching bill data', {
      congress,
      billType,
      billNumber,
      error: (error as Error).message,
    });
    return { title: null, summary: null };
  }
}

// Parse vote ID and determine chamber and details
function parseVoteId(voteId: string): {
  chamber: 'House' | 'Senate';
  congress: string;
  rollNumber: string;
  numericId: string;
} {
  // Handle House format: "house-119-116"
  const houseMatch = voteId.match(/^house-(\d+)-(\d+)$/);
  if (houseMatch && houseMatch[1] && houseMatch[2]) {
    return {
      chamber: 'House',
      congress: houseMatch[1],
      rollNumber: houseMatch[2],
      numericId: houseMatch[2],
    };
  }

  // Handle Senate formats: "119-senate-00499" or just numeric "499"
  const senateMatch = voteId.match(/^(?:(\d+)-senate-)?(\d+)$/);
  if (senateMatch && senateMatch[2]) {
    return {
      chamber: 'Senate',
      congress: senateMatch[1] || '119',
      rollNumber: senateMatch[2],
      numericId: senateMatch[2],
    };
  }

  // Default to Senate for backward compatibility with numeric IDs
  const numericMatch = voteId.match(/(\d+)$/);
  return {
    chamber: 'Senate',
    congress: '119',
    rollNumber: numericMatch?.[1] || voteId,
    numericId: numericMatch?.[1] || voteId,
  };
}

/**
 * Parse House vote XML to extract ALL member positions
 * Adapted from existing parseHouseRollCallXML but returns all members
 */
async function parseHouseVoteXML(sourceDataURL: string): Promise<MemberVote[]> {
  try {
    logger.debug('Fetching House vote XML', { sourceDataURL });

    const response = await fetch(sourceDataURL);
    if (!response.ok) {
      throw new Error(`Failed to fetch XML: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();

    // Validate XML content
    if (!xmlText || xmlText.trim().length === 0) {
      logger.warn('Empty XML response from House vote source', { sourceDataURL });
      return [];
    }

    if (!xmlText.includes('<legislator') || !xmlText.includes('<vote>')) {
      logger.warn('Malformed House vote XML - missing expected elements', {
        sourceDataURL,
        hasLegislator: xmlText.includes('<legislator'),
        hasVote: xmlText.includes('<vote>'),
        xmlLength: xmlText.length,
      });
      return [];
    }

    // Parse all legislator entries from XML using regex
    // Actual structure: <recorded-vote><legislator name-id="A000370"...>Adams</legislator><vote>Present</vote></recorded-vote>
    const memberPattern =
      /<recorded-vote><legislator name-id="([^"]+)"[^>]*>([^<]*)<\/legislator><vote>([^<]+)<\/vote><\/recorded-vote>/gi;
    const members: MemberVote[] = [];
    const invalidEntries: Array<{ reason: string; data: unknown }> = [];
    let match;

    while ((match = memberPattern.exec(xmlText)) !== null) {
      const [fullMatch, bioguideId, memberInfo, votePosition] = match;

      // Enhanced validation for required fields
      if (!bioguideId || bioguideId.trim().length === 0) {
        invalidEntries.push({ reason: 'Missing or empty bioguide ID', data: fullMatch });
        continue;
      }

      if (!votePosition || votePosition.trim().length === 0) {
        invalidEntries.push({
          reason: 'Missing or empty vote position',
          data: { bioguideId, fullMatch },
        });
        continue;
      }

      // Validate bioguide ID format (should be letter + numbers)
      if (!/^[A-Z]\d{6}$/.test(bioguideId.trim())) {
        logger.debug('Unusual bioguide ID format', {
          bioguideId: bioguideId.trim(),
          expected: 'Format: A123456',
          sourceDataURL,
        });
        // Continue processing - some historical IDs might have different formats
      }

      // Parse member info from the legislator tag content
      // Format varies but typically includes name and sometimes party/state
      const nameMatch = memberInfo?.match(/([^,]+)(?:,\s*(.+))?/);
      const fullName = nameMatch?.[1]?.trim() || 'Unknown';

      // Split name into first/last - simple approach
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || 'Unknown';

      // Map XML vote values to our standard format with validation
      const cleanVotePosition = votePosition.trim();
      let position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';

      switch (cleanVotePosition) {
        case 'Yea':
          position = 'Yea';
          break;
        case 'Nay':
          position = 'Nay';
          break;
        case 'Present':
          position = 'Present';
          break;
        case 'Not Voting':
          position = 'Not Voting';
          break;
        default:
          // Log unexpected vote positions for monitoring
          logger.debug('Unexpected vote position in House XML', {
            bioguideId: bioguideId.trim(),
            votePosition: cleanVotePosition,
            sourceDataURL,
          });
          position = 'Not Voting'; // Default for safety
          break;
      }

      members.push({
        id: bioguideId,
        bioguideId,
        firstName,
        lastName,
        fullName,
        state: 'Unknown', // Need to get this from current terms data
        party: 'R' as 'D' | 'R' | 'I', // Default to R if unknown, will need terms data
        position,
        district: undefined, // Need to get this from current terms data
      });
    }

    // Report validation summary
    if (invalidEntries.length > 0) {
      logger.warn('Found invalid entries during House XML parsing', {
        sourceDataURL,
        invalidCount: invalidEntries.length,
        validCount: members.length,
        invalidEntries: invalidEntries.slice(0, 5), // Only log first 5 for brevity
      });
    }

    // Validate final result
    if (members.length === 0) {
      logger.warn('No valid members found in House vote XML', {
        sourceDataURL,
        xmlLength: xmlText.length,
        invalidEntriesCount: invalidEntries.length,
      });
    } else if (members.length < 400) {
      // House should have ~435 members, warn if significantly fewer
      logger.info('House vote has fewer members than expected', {
        sourceDataURL,
        memberCount: members.length,
        expected: '~435 House members',
      });
    }

    logger.debug('Parsed House vote XML members', {
      sourceDataURL,
      memberCount: members.length,
      invalidEntriesSkipped: invalidEntries.length,
      sampleMember: members[0],
    });

    return members;
  } catch (error) {
    logger.error('Failed to parse House vote XML', error as Error, { sourceDataURL });
    return []; // Return empty array on error rather than throwing
  }
}

/**
 * Parse House vote from Congress.gov API
 */
async function parseHouseVote(
  voteId: string,
  congress: string,
  rollNumber: string
): Promise<UnifiedVoteDetail | null> {
  try {
    // Calculate session number: 119th Congress started in 2025
    // Congressional sessions: odd years = Session 1, even years = Session 2
    const currentYear = new Date().getFullYear();
    const sessionNumber = currentYear % 2 === 1 ? 1 : 2;

    // Fetch House vote data from Congress.gov API
    // Format: /v3/house-vote/{congress}/{session}/{rollNumber} (available from May 2025)
    const apiUrl = `https://api.congress.gov/v3/house-vote/${congress}/${sessionNumber}/${rollNumber}?api_key=${process.env.CONGRESS_API_KEY || ''}`;

    logger.info('Fetching detailed House vote from Congress API', {
      voteId,
      congress,
      session: sessionNumber,
      rollNumber,
      apiUrl: apiUrl.replace(process.env.CONGRESS_API_KEY || '', '[REDACTED]'),
    });

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'CivIQ-Hub/2.0 (civic-engagement-tool)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      logger.warn('Failed to fetch House vote from Congress API', {
        voteId,
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const apiData = await response.json();

    // Enhanced API response validation
    if (!apiData || typeof apiData !== 'object') {
      logger.warn('Invalid JSON response from Congress API', { voteId, type: typeof apiData });
      return null;
    }

    const vote = apiData.houseRollCallVote;
    if (!vote || typeof vote !== 'object') {
      logger.warn('Missing or invalid vote data in API response', {
        voteId,
        hasVote: !!vote,
        apiKeys: Object.keys(apiData),
      });
      return null;
    }

    // Validate required vote fields (Congress API uses camelCase)
    const requiredFields = [
      'congress',
      'sessionNumber',
      'rollCallNumber',
      'voteQuestion',
      'result',
    ];
    const missingFields = requiredFields.filter(field => !vote[field]);

    if (missingFields.length > 0) {
      logger.warn('House vote missing required fields', {
        voteId,
        missingFields,
        availableFields: Object.keys(vote),
      });
    }

    // Parse vote counts from votePartyTotal array
    let yeas = 0;
    let nays = 0;
    let present = 0;
    let absent = 0;

    if (vote.votePartyTotal && Array.isArray(vote.votePartyTotal)) {
      for (const partyTotal of vote.votePartyTotal) {
        yeas += partyTotal.yeaTotal || 0;
        nays += partyTotal.nayTotal || 0;
        present += partyTotal.presentTotal || 0;
        absent += partyTotal.notVotingTotal || 0;
      }

      const totalVotes = yeas + nays + present + absent;
      if (totalVotes < 400 || totalVotes > 450) {
        logger.info('House vote totals outside expected range', {
          voteId,
          totalVotes,
          breakdown: { yeas, nays, present, absent },
        });
      }
    }

    // Extract bill information if available
    let bill:
      | { number: string; title: string; type: string; url?: string; summary?: string }
      | undefined = undefined;
    const hasBillInfo = vote.legislationType && vote.legislationNumber;

    // Run bill data fetch and member parsing in parallel for performance
    const [billData, membersResult] = await Promise.all([
      // Fetch bill title and summary from Congress.gov (runs in parallel)
      hasBillInfo
        ? fetchBillData(congress, vote.legislationType, vote.legislationNumber)
        : Promise.resolve({ title: null, summary: null }),

      // Process member votes from XML
      (async () => {
        let members: MemberVote[] = [];
        if (vote.sourceDataURL) {
          logger.info('Parsing House vote XML for individual member votes', {
            voteId,
            xmlUrl: vote.sourceDataURL,
          });

          try {
            members = await parseHouseVoteXML(vote.sourceDataURL);

            // Enrich members with full data from legislators-current.yaml
            const legislatorInfoMap = await getLegislatorInfoMap();
            members = members.map(member => {
              const info = member.bioguideId ? legislatorInfoMap.get(member.bioguideId) : null;
              if (info) {
                return {
                  ...member,
                  firstName: info.firstName,
                  lastName: info.lastName,
                  fullName: info.fullName,
                  state: info.state,
                  party: info.party,
                  district: info.district?.toString(),
                };
              }
              return member;
            });

            logger.info('Successfully parsed and enriched House vote XML', {
              voteId,
              memberCount: members.length,
              enrichedCount: members.filter(m => m.state !== 'Unknown').length,
            });
          } catch (error) {
            logger.warn('Failed to parse House vote XML', {
              voteId,
              xmlUrl: vote.sourceDataURL,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        return members;
      })(),
    ]);

    // Build bill object with fetched title and summary
    if (hasBillInfo) {
      bill = {
        number: vote.legislationNumber,
        title: billData.title || `${vote.legislationType} ${vote.legislationNumber}`,
        type: vote.legislationType,
        url: vote.legislationUrl || undefined,
        summary: billData.summary || undefined,
      };
    }

    const members = membersResult;

    const voteDetail: UnifiedVoteDetail = {
      voteId,
      congress: String(congress),
      session: String(vote.sessionNumber || sessionNumber),
      rollNumber: parseInt(rollNumber),
      date: String(vote.startDate || ''),
      title: String(vote.voteQuestion || 'House Vote'),
      question: String(vote.voteQuestion || ''),
      description: String(vote.voteQuestion || ''),
      result: String(vote.result || 'Unknown'),
      chamber: 'House',
      yeas,
      nays,
      present,
      absent,
      totalVotes: yeas + nays + present + absent,
      members,
      bill,
      metadata: {
        source: 'congress-api',
        confidence: 'high',
        processingDate: new Date().toISOString(),
        apiUrl,
        xmlUrl: String(vote.sourceDataURL || ''),
      },
    };

    logger.info('Successfully parsed House vote from API', {
      voteId,
      totalVotes: voteDetail.totalVotes,
      result: voteDetail.result,
      memberCount: members.length,
    });

    return voteDetail;
  } catch (error) {
    logger.error('Error parsing House vote from API', error as Error, { voteId });
    return null;
  }
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
          id: bioguideId || lisId, // Use bioguideId if available, otherwise lisId
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
      chamber: 'Senate',
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
 * Unified vote parsing function that handles both chambers
 */
async function parseUnifiedVote(voteId: string): Promise<UnifiedVoteDetail | null> {
  const parsed = parseVoteId(voteId);

  if (parsed.chamber === 'House') {
    return await parseHouseVote(voteId, parsed.congress, parsed.rollNumber);
  } else {
    // Convert Senate VoteDetail to UnifiedVoteDetail
    const senateVote = await parseDetailedVote(parsed.numericId);
    if (!senateVote) return null;

    // SenatorVote[] is compatible with MemberVote[] - no transformation needed
    const unifiedVote: UnifiedVoteDetail = {
      ...senateVote,
      members: senateVote.members as MemberVote[],
    };

    return unifiedVote;
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

    // Validate vote ID format (accepts numeric IDs and chamber-prefixed IDs)
    if (!voteId) {
      logger.warn('Missing vote ID', { voteId });
      const errorResponse: VoteResponse = {
        vote: null,
        success: false,
        error: 'Vote ID is required.',
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          responseTime: Date.now() - startTime,
        },
      };

      return NextResponse.json(errorResponse, { status: 400 });
    }

    logger.info('Detailed vote API called', { voteId });

    // Parse the unified vote information (handles both House and Senate)
    const voteDetail = await parseUnifiedVote(voteId);

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
