/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Phase 3: Unified Data Models - Consistent House & Senate Voting Records
 *
 * This endpoint fetches real voting data with unified JSON structure.
 * - House: Uses Congress.gov API with standardized Vote interface
 * - Senate: Parses official Senate XML feed with bioguide mapping
 * - Both: Return identical Vote objects with consistent field structure
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { XMLParser } from 'fast-xml-parser';

// Phase 3: Bioguide ID to Senate member mapping
// This ensures accurate member identification in Senate XML files
const BIOGUIDE_TO_SENATE_MAPPING: Record<
  string,
  {
    firstName: string;
    lastName: string;
    state: string;
    party?: string;
  }
> = {
  C001035: { firstName: 'Susan', lastName: 'Collins', state: 'ME', party: 'R' },
  S000033: { firstName: 'Bernard', lastName: 'Sanders', state: 'VT', party: 'I' },
  W000817: { firstName: 'Elizabeth', lastName: 'Warren', state: 'MA', party: 'D' },
  S001194: { firstName: 'Brian', lastName: 'Schatz', state: 'HI', party: 'D' },
  M000133: { firstName: 'Edward', lastName: 'Markey', state: 'MA', party: 'D' },
  // Add more mappings as needed for comprehensive coverage
};

interface VoteResponse {
  votes: Vote[];
  totalResults: number;
  member: {
    bioguideId: string;
    name: string;
    chamber: string;
  };
  dataSource: string;
  success: boolean;
  error?: string;
  metadata: {
    timestamp: string;
    phase: string;
    crashProof: boolean;
  };
}

// Phase 3: Standardized Vote interface for both House and Senate
interface Vote {
  voteId: string;
  bill: {
    number: string;
    title: string;
    congress: string;
    type: string;
    url?: string;
  };
  question: string;
  result: string;
  date: string;
  position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  chamber: 'House' | 'Senate';
  rollNumber: number;
  description: string;
  // Phase 3: Additional standardized fields for consistency
  category?: 'Budget' | 'Healthcare' | 'Defense' | 'Judiciary' | 'Foreign Affairs' | 'Other';
  isKeyVote?: boolean;
  metadata: {
    source: 'house-congress-api' | 'senate-xml-feed';
    confidence: 'high' | 'medium' | 'low';
    processingDate: string;
  };
}

/**
 * Phase 3: Standardized vote categorization for both House and Senate
 */
function categorizeVote(question: string): Vote['category'] {
  const text = question.toLowerCase();

  if (text.includes('budget') || text.includes('appropriation') || text.includes('spending')) {
    return 'Budget';
  }
  if (text.includes('health') || text.includes('medicare') || text.includes('medicaid')) {
    return 'Healthcare';
  }
  if (text.includes('defense') || text.includes('military') || text.includes('armed forces')) {
    return 'Defense';
  }
  if (
    text.includes('court') ||
    text.includes('judge') ||
    text.includes('confirmation') ||
    text.includes('nomination')
  ) {
    return 'Judiciary';
  }
  if (text.includes('foreign') || text.includes('treaty') || text.includes('ambassador')) {
    return 'Foreign Affairs';
  }

  return 'Other';
}

/**
 * Phase 3: Standardized key vote determination for both House and Senate
 */
function determineKeyVote(question: string, result: string): boolean {
  const text = `${question} ${result}`.toLowerCase();

  const keyIndicators = [
    'final passage',
    'override',
    'veto',
    'impeachment',
    'confirmation',
    'budget resolution',
    'debt ceiling',
    'continuing resolution',
    'supreme court',
    'cabinet',
  ];

  return keyIndicators.some(indicator => text.includes(indicator));
}

/**
 * Safely determine member chamber with fallback logic
 */
async function getMemberInfo(bioguideId: string): Promise<{
  chamber: 'House' | 'Senate';
  name: string;
} | null> {
  try {
    // Method 1: Use enhanced representative service
    const enhancedRep = await getEnhancedRepresentative(bioguideId);
    if (enhancedRep?.chamber && enhancedRep?.name) {
      logger.info('Chamber determined from enhanced representative', {
        bioguideId,
        chamber: enhancedRep.chamber,
        name: enhancedRep.name,
      });
      return {
        chamber: enhancedRep.chamber as 'House' | 'Senate',
        name: enhancedRep.name,
      };
    }

    // Method 2: Heuristic fallback based on bioguide ID pattern
    // Senate IDs often start with specific patterns
    const chamber = bioguideId.match(/^[A-Z]\d{6}$/) ? 'House' : 'Senate';

    logger.warn('Using heuristic chamber determination', {
      bioguideId,
      chamber,
      method: 'pattern-matching',
    });

    return {
      chamber,
      name: 'Unknown Representative',
    };
  } catch (error) {
    logger.error('Error determining member info', error as Error, { bioguideId });

    // Ultimate fallback: assume House if we can't determine
    return {
      chamber: 'House',
      name: 'Unknown Representative',
    };
  }
}

/**
 * Safely fetch Senate votes from XML feed with member position lookup
 */
async function getSenateVotes(bioguideId: string, limit: number = 20): Promise<Vote[]> {
  try {
    logger.info('Fetching Senate votes from XML feed', { bioguideId, limit });

    // Step 1: Fetch the Senate vote menu XML
    const menuUrl = 'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.xml';
    const menuResponse = await fetch(menuUrl, {
      headers: {
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!menuResponse.ok) {
      logger.warn('Failed to fetch Senate vote menu', {
        status: menuResponse.status,
        statusText: menuResponse.statusText,
      });
      return [];
    }

    const menuXml = await menuResponse.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
    });

    const menuData = parser.parse(menuXml);
    const voteSummary = menuData.vote_summary;

    if (!voteSummary?.votes?.vote) {
      logger.warn('No votes found in Senate XML menu');
      return [];
    }

    // Step 2: Get recent votes (limited)
    const votes = Array.isArray(voteSummary.votes.vote)
      ? voteSummary.votes.vote
      : [voteSummary.votes.vote];

    const recentVotes = votes.slice(0, Math.min(limit, 10)); // Limit for Phase 2

    // Step 3: For each vote, fetch individual XML and find member position
    const senateVotes: Vote[] = [];

    for (const vote of recentVotes) {
      try {
        const voteNumber = String(vote.vote_number || '').padStart(5, '0');
        const individualUrl = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_${voteNumber}.xml`;

        const voteResponse = await fetch(individualUrl, {
          headers: {
            'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
          },
          signal: AbortSignal.timeout(8000),
        });

        if (voteResponse.ok) {
          const voteXml = await voteResponse.text();
          const voteData = parser.parse(voteXml);
          const rollCallVote = voteData.roll_call_vote;

          if (rollCallVote?.members?.member) {
            const members = Array.isArray(rollCallVote.members.member)
              ? rollCallVote.members.member
              : [rollCallVote.members.member];

            // COMPREHENSIVE LOGGING: Log raw XML structure for debugging
            logger.info('Senate XML vote structure analysis', {
              bioguideId,
              voteNumber: vote.vote_number,
              totalMembers: members.length,
              sampleMemberFields: members[0] ? Object.keys(members[0]) : [],
              rollCallVoteKeys: rollCallVote ? Object.keys(rollCallVote) : [],
            });

            // Log first few members to understand structure
            if (members.length > 0) {
              logger.info('Sample Senate XML members', {
                bioguideId,
                first3Members: members.slice(0, 3).map((member: Record<string, unknown>) => ({
                  lis_member_id: member.lis_member_id,
                  first_name: member.first_name,
                  last_name: member.last_name,
                  member_full: member.member_full,
                  state: member.state,
                  party: member.party,
                  vote_cast: member.vote_cast,
                  allKeys: Object.keys(member),
                })),
              });
            }

            // Phase 3: Find this specific member using bioguide mapping
            const targetMember = BIOGUIDE_TO_SENATE_MAPPING[bioguideId];

            if (!targetMember) {
              logger.warn('No bioguide mapping found for Senator', {
                bioguideId,
                availableMappings: Object.keys(BIOGUIDE_TO_SENATE_MAPPING),
              });
            } else {
              logger.info('Looking for Senator in XML', {
                bioguideId,
                targetMember,
                totalMembersInXML: members.length,
              });
            }

            const memberVote = targetMember
              ? members.find((member: Record<string, unknown>) => {
                  const memberFirstName = String(member.first_name || '').toLowerCase();
                  const memberLastName = String(member.last_name || '').toLowerCase();
                  const memberState = String(member.state || '');
                  const memberFull = String(member.member_full || '').toLowerCase();

                  // DETAILED LOGGING: Log each comparison attempt
                  logger.debug('Comparing member against target', {
                    bioguideId,
                    memberFromXML: {
                      first_name: memberFirstName,
                      last_name: memberLastName,
                      state: memberState,
                      member_full: memberFull,
                      lis_member_id: member.lis_member_id,
                    },
                    targetMember,
                    comparisons: {
                      firstNameMatch: memberFirstName.includes(
                        targetMember.firstName.toLowerCase()
                      ),
                      lastNameMatch: memberLastName.includes(targetMember.lastName.toLowerCase()),
                      stateMatch: memberState === targetMember.state,
                      fullNameIncludes: memberFull.includes(targetMember.lastName.toLowerCase()),
                    },
                  });

                  // IMPROVED MATCHING: Try multiple matching strategies
                  const nameMatch =
                    (memberFirstName.includes(targetMember.firstName.toLowerCase()) ||
                      targetMember.firstName.toLowerCase().includes(memberFirstName)) &&
                    (memberLastName.includes(targetMember.lastName.toLowerCase()) ||
                      targetMember.lastName.toLowerCase().includes(memberLastName));

                  const fullNameMatch = memberFull.includes(targetMember.lastName.toLowerCase());
                  const stateMatch = memberState === targetMember.state;

                  const isMatch = (nameMatch || fullNameMatch) && stateMatch;

                  if (isMatch) {
                    logger.info('MATCH FOUND for Senator', {
                      bioguideId,
                      memberFromXML: {
                        lis_member_id: member.lis_member_id,
                        first_name: memberFirstName,
                        last_name: memberLastName,
                        state: memberState,
                        vote_cast: member.vote_cast,
                      },
                      targetMember,
                    });
                  }

                  return isMatch;
                })
              : null;

            if (memberVote) {
              // Format date from Senate format
              const year = voteSummary.congress_year || 2025;
              const dateStr = String(vote.vote_date || '');
              const [day, monthStr] = dateStr.split('-');
              const monthMap: Record<string, string> = {
                Jan: '01',
                Feb: '02',
                Mar: '03',
                Apr: '04',
                May: '05',
                Jun: '06',
                Jul: '07',
                Aug: '08',
                Sep: '09',
                Oct: '10',
                Nov: '11',
                Dec: '12',
              };
              const month = monthStr ? monthMap[monthStr] || '01' : '01';
              const formattedDate = `${year}-${month}-${day?.padStart(2, '0') || '01'}`;

              // Phase 3: Categorize vote for consistency
              const question = String(vote.question || vote.title || 'Unknown Question');
              const category = categorizeVote(question);
              const isKeyVote = determineKeyVote(question, String(vote.result || ''));

              senateVotes.push({
                voteId: `119-senate-${voteNumber}`,
                bill: {
                  number: String(vote.issue || 'N/A'),
                  title: String(vote.title || 'Senate Vote'),
                  congress: '119',
                  type: 'Senate Vote',
                },
                question,
                result: String(vote.result || 'Unknown'),
                date: formattedDate,
                position: String(memberVote.vote_cast || 'Not Voting') as Vote['position'],
                chamber: 'Senate',
                rollNumber: parseInt(voteNumber) || 0,
                description: String(vote.title || 'Senate vote'),
                category,
                isKeyVote,
                metadata: {
                  source: 'senate-xml-feed',
                  confidence: 'high',
                  processingDate: new Date().toISOString(),
                },
              });
            }
          }
        }
      } catch (voteError) {
        logger.debug('Error processing individual Senate vote', {
          error: (voteError as Error).message,
          voteNumber: vote.vote_number,
        });
        // Continue processing other votes
      }
    }

    logger.info('Senate votes processing complete', {
      bioguideId,
      totalVotesProcessed: recentVotes.length,
      memberVotesFound: senateVotes.length,
    });

    return senateVotes;
  } catch (error) {
    logger.error('Error fetching Senate votes', error as Error, { bioguideId });
    return [];
  }
}

/**
 * Safely fetch House votes with comprehensive error handling
 */
async function getHouseVotes(bioguideId: string, limit: number = 20): Promise<Vote[]> {
  try {
    if (!process.env.CONGRESS_API_KEY) {
      logger.warn('Congress API key not configured');
      return [];
    }

    const apiUrl = `https://api.congress.gov/v3/house-vote?format=json&api_key=${process.env.CONGRESS_API_KEY}&limit=${limit}`;

    logger.info('Fetching House votes', {
      bioguideId,
      apiUrl: apiUrl.replace(process.env.CONGRESS_API_KEY, '***'),
    });

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      logger.warn('House votes API returned non-OK status', {
        status: response.status,
        statusText: response.statusText,
        bioguideId,
      });
      return [];
    }

    const data = await response.json();
    const votes = data.houseRollCallVotes || [];

    logger.info('House votes API response', {
      bioguideId,
      totalVotes: votes.length,
      success: true,
    });

    // Phase 3: Standardized vote structure for House votes
    const transformedVotes: Vote[] = votes
      .filter((vote: Record<string, unknown>) => vote.congress === 119) // Only 119th Congress
      .slice(0, limit)
      .map((vote: Record<string, unknown>, index: number) => {
        const question = String(vote.voteQuestion || 'Unknown Question');
        const result = String(vote.result || 'Unknown');
        const category = categorizeVote(question);
        const isKeyVote = determineKeyVote(question, result);

        return {
          voteId: `119-house-${String(vote.rollCallNumber) || index}`,
          bill: {
            number: String(vote.legislationNumber || 'N/A'),
            title: String(vote.legislationType || 'House Vote'),
            congress: String(vote.congress || 119),
            type: String(vote.legislationType || 'Unknown'),
            url: vote.legislationUrl ? String(vote.legislationUrl) : undefined,
          },
          question,
          result,
          date: vote.startDate ? String(vote.startDate).split('T')[0] : '2025-01-01',
          position: 'Not Voting' as const, // Phase 3: Individual member positions require additional API calls
          chamber: 'House' as const,
          rollNumber: vote.rollCallNumber ? Number(vote.rollCallNumber) : 0,
          description: String(vote.voteQuestion || 'House vote'),
          category,
          isKeyVote,
          metadata: {
            source: 'house-congress-api',
            confidence: 'medium', // Medium because we don't extract individual member position yet
            processingDate: new Date().toISOString(),
          },
        };
      });

    return transformedVotes;
  } catch (error) {
    logger.error('Error fetching House votes', error as Error, { bioguideId });
    return [];
  }
}

/**
 * Main API route handler with crash prevention
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const startTime = Date.now();
  let bioguideId = '';

  try {
    // Safely extract parameters
    const resolvedParams = await params;
    bioguideId = resolvedParams?.bioguideId?.toUpperCase() || '';

    // Validate bioguide ID
    if (!bioguideId || typeof bioguideId !== 'string') {
      logger.warn('Invalid bioguide ID provided', { bioguideId });
      return NextResponse.json(
        {
          votes: [],
          totalResults: 0,
          member: {
            bioguideId: bioguideId || 'UNKNOWN',
            name: 'Unknown',
            chamber: 'Unknown',
          },
          dataSource: 'validation-error',
          success: false,
          error: 'Invalid bioguide ID',
          metadata: {
            timestamp: new Date().toISOString(),
            phase: 'Phase 2 - Senate XML Integrated',
            crashProof: true,
          },
        } satisfies VoteResponse,
        { status: 400 }
      );
    }

    logger.info('Votes API called (Phase 1)', { bioguideId });

    // Get member info safely
    const memberInfo = await getMemberInfo(bioguideId);
    if (!memberInfo) {
      logger.warn('Could not determine member info', { bioguideId });
      return NextResponse.json(
        {
          votes: [],
          totalResults: 0,
          member: {
            bioguideId,
            name: 'Unknown Representative',
            chamber: 'Unknown',
          },
          dataSource: 'member-info-error',
          success: false,
          error: 'Could not determine member information',
          metadata: {
            timestamp: new Date().toISOString(),
            phase: 'Phase 2 - Senate XML Integrated',
            crashProof: true,
          },
        } satisfies VoteResponse,
        { status: 200 }
      );
    }

    const { chamber, name } = memberInfo;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    let votes: Vote[] = [];
    let dataSource = '';

    if (chamber === 'Senate') {
      // Phase 2: For Senators, fetch real votes from XML feed
      logger.info('Senator detected - fetching real votes from XML feed (Phase 2)', {
        bioguideId,
        name,
      });
      votes = await getSenateVotes(bioguideId, limit);
      dataSource = 'senate-xml-feed';
    } else {
      // Phase 2: For House members, attempt to fetch with robust error handling
      logger.info('House member detected - attempting to fetch votes', { bioguideId, name });
      votes = await getHouseVotes(bioguideId, limit);
      dataSource = 'house-congress-api';
    }

    const response: VoteResponse = {
      votes,
      totalResults: votes.length,
      member: {
        bioguideId,
        name,
        chamber,
      },
      dataSource,
      success: true,
      metadata: {
        timestamp: new Date().toISOString(),
        phase: 'Phase 2 - Senate XML Integrated',
        crashProof: true,
      },
    };

    logger.info('Votes API completed successfully', {
      bioguideId,
      chamber,
      votesCount: votes.length,
      responseTime: Date.now() - startTime,
      phase: 1,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    // Ultimate crash prevention - this should never throw
    logger.error('Unexpected error in votes API (Phase 1)', error as Error, { bioguideId });

    const errorResponse: VoteResponse = {
      votes: [],
      totalResults: 0,
      member: {
        bioguideId: bioguideId || 'UNKNOWN',
        name: 'Unknown Representative',
        chamber: 'Unknown',
      },
      dataSource: 'error-fallback',
      success: false,
      error: 'Internal server error - safely handled',
      metadata: {
        timestamp: new Date().toISOString(),
        phase: 'Phase 2 - Senate XML Integrated',
        crashProof: true,
      },
    };

    return NextResponse.json(errorResponse, { status: 200 }); // Return 200 to prevent crashes
  }
}
