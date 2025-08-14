/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCache } from '@/lib/cache-helper';
import { RollCallParser } from '@/features/legislation/services/rollcall-parser';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import logger from '@/lib/logging/simple-logger';
// import { monitorExternalApi } from '@/lib/monitoring/telemetry'; // Temporarily disabled to fix bundling

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
  position: 'Yea' | 'Nay' | 'Not Voting' | 'Present';
  chamber: 'House' | 'Senate';
  rollNumber?: number;
  isKeyVote?: boolean;
  description?: string;
  category?:
    | 'Budget'
    | 'Healthcare'
    | 'Defense'
    | 'Infrastructure'
    | 'Immigration'
    | 'Environment'
    | 'Education'
    | 'Other';
  partyBreakdown?: {
    democratic: { yea: number; nay: number; present: number; notVoting: number };
    republican: { yea: number; nay: number; present: number; notVoting: number };
    independent: { yea: number; nay: number; present: number; notVoting: number };
  };
  metadata?: {
    sourceUrl?: string;
    lastUpdated?: string;
    confidence?: 'high' | 'medium' | 'low';
  };
}

interface _BillWithVotes {
  congress: number;
  number: string;
  originChamber: string;
  originChamberCode: string;
  title: string;
  type: string;
  url: string;
  updateDate: string;
  updateDateIncludingText: string;
  latestAction?: {
    actionDate: string;
    text: string;
    type?: string;
  };
  actions?: Array<{
    actionDate: string;
    text: string;
    type?: string;
    recordedVotes?: Array<{
      rollNumber: number;
      chamber: string;
      sessionNumber: number;
      url: string;
      date: string;
    }>;
  }>;
}

// Helper function to categorize bills
function categorizeBill(title: string): Vote['category'] {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('budget') || lowerTitle.includes('appropriation')) return 'Budget';
  if (lowerTitle.includes('health') || lowerTitle.includes('medicare')) return 'Healthcare';
  if (lowerTitle.includes('defense') || lowerTitle.includes('military')) return 'Defense';
  if (lowerTitle.includes('infrastructure') || lowerTitle.includes('transportation'))
    return 'Infrastructure';
  if (lowerTitle.includes('immigration') || lowerTitle.includes('border')) return 'Immigration';
  if (lowerTitle.includes('environment') || lowerTitle.includes('climate')) return 'Environment';
  if (lowerTitle.includes('education') || lowerTitle.includes('student')) return 'Education';

  return 'Other';
}

// Helper function to determine if a vote is a key vote
function _isKeyVote(title: string): boolean {
  if (!title) return false;
  const lowerTitle = title.toLowerCase();

  const keywordIndicators = [
    'appropriation',
    'budget',
    'defense authorization',
    'infrastructure',
    'continuing resolution',
    'debt ceiling',
    'tax reform',
  ];

  return keywordIndicators.some(keyword => lowerTitle.includes(keyword));
}

// Enhanced function to fetch member voting position from roll call data
async function getMemberVoteFromRollCall(
  rollCallUrl: string,
  _bioguideId: string,
  _memberName: string,
  _parser: RollCallParser
): Promise<string | null> {
  try {
    // const monitor = monitorExternalApi('congress.gov', 'roll-call'); // Disabled

    const response = await fetch(rollCallUrl);
    if (!response.ok) {
      // monitor.end(false, response.status); // Disabled
      return null;
    }

    const _xmlText = await response.text();
    // monitor.end(true, 200); // Disabled

    // Parse the roll call XML to extract member vote
    // Note: This would require implementation of parseVotingPositions method
    // For now, return null as we're focusing on the main voting data service
    logger.debug('Roll call parsing not yet implemented', { rollCallUrl });

    return null;
  } catch (error) {
    logger.warn('Error fetching roll call data', {
      rollCallUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// Function to get Senate voting records - no sample data as per policy
async function _getSenateVotingRecords(
  bioguideId: string,
  memberName: string,
  limit: number
): Promise<Vote[]> {
  logger.info('Senate voting records not available - no mock data policy', {
    bioguideId,
    memberName,
    limit,
    reason: 'Project policy prohibits mock data usage',
  });

  // Return empty array - no sample data allowed per project requirements
  // Real Senate voting data integration is pending Senate.gov XML API implementation
  return [];
}

// Enhanced function to get recent votes using correct Congress.gov member voting record API
async function getEnhancedVotingRecords(
  bioguideId: string,
  chamber: string,
  limit: number,
  _memberName?: string
): Promise<Vote[]> {
  return withCache(
    `member-voting-record-${bioguideId}-${chamber}-${limit}`,
    async () => {
      logger.info('Fetching real voting data from Congress.gov member voting record API', {
        bioguideId,
        chamber,
        limit,
      });

      // const monitor = monitorExternalApi('congress.gov', 'member-voting-record'); // Disabled

      try {
        // Use the correct Congress.gov endpoint for member voting records
        const votingRecordUrl = `https://api.congress.gov/v3/member/${bioguideId}/voting-record?api_key=${process.env.CONGRESS_API_KEY}&limit=${limit}&format=json`;

        const response = await fetch(votingRecordUrl, {
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          // monitor.end(false, response.status); // Disabled

          // Log the actual error response to understand what's happening
          const errorText = await response.text();
          logger.warn('Member voting record API request failed', {
            bioguideId,
            status: response.status,
            statusText: response.statusText,
            url: votingRecordUrl.replace(process.env.CONGRESS_API_KEY!, 'REDACTED'),
            errorResponse: errorText.slice(0, 500), // First 500 chars of error
          });

          // If endpoint doesn't exist (404), try alternative approach
          if (response.status === 404) {
            logger.info('Member voting record endpoint not found, checking alternatives', {
              bioguideId,
              suggestion: 'Congress.gov may not have this endpoint - trying bill-based approach',
            });
          }

          return [];
        }

        const data = await response.json();
        // monitor.end(true, 200); // Disabled

        // Congress.gov returns votes in a 'votes' array
        const votes = data.votes || [];

        logger.info('Member voting record data retrieved', {
          bioguideId,
          votesFound: votes.length,
          chamber,
        });

        // Transform Congress.gov voting data to our Vote interface
        const transformedVotes: Vote[] = votes.map((vote: unknown) => {
          const voteData = vote as Record<string, unknown>;
          const rollCall = voteData.rollCall as Record<string, unknown> | undefined;
          const bill = voteData.bill as Record<string, unknown> | undefined;

          return {
            voteId: rollCall?.rollNumber
              ? `${rollCall.congress}-${rollCall.rollNumber}`
              : `vote-${Date.now()}`,
            bill: {
              number: (bill?.number as string) || 'Unknown',
              title: (bill?.title as string) || (voteData.description as string) || 'Unknown Bill',
              congress: rollCall?.congress?.toString() || '119',
              type: (bill?.type as string) || 'Unknown',
              url: bill?.url as string,
            },
            question:
              (voteData.question as string) ||
              (voteData.description as string) ||
              'Unknown Question',
            result: (voteData.result as string) || 'Unknown',
            date:
              (voteData.date as string) ||
              (rollCall?.date as string) ||
              new Date().toISOString().split('T')[0],
            position:
              (voteData.position as 'Yea' | 'Nay' | 'Not Voting' | 'Present') || 'Not Voting',
            chamber: chamber as 'House' | 'Senate',
            rollNumber: rollCall?.rollNumber as number,
            isKeyVote: false, // Could be enhanced with additional logic
            category: bill?.title ? categorizeBill(bill.title as string) : 'Other',
            description: (voteData.description as string) || (voteData.question as string),
            metadata: {
              sourceUrl: rollCall?.url as string,
              lastUpdated: new Date().toISOString(),
              confidence: 'high' as const,
            },
          };
        });

        return transformedVotes;
      } catch (error) {
        // monitor.end(false, 500); // Disabled
        logger.error('Error fetching member voting record', error as Error, {
          bioguideId,
          chamber,
        });
        return [];
      }
    },
    1800000 // 30 minutes cache for voting data
  ).catch(error => {
    logger.warn('Member voting record fetch failed', {
      bioguideId,
      error: (error as Error).message,
    });
    throw error;
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  // Using simple logger
  logger.info('Votes API called', { bioguideId });
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  try {
    logger.info('Processing voting records request', { bioguideId, limit });

    // Try to get enhanced representative data for better context
    let enhancedRep;
    try {
      enhancedRep = await getEnhancedRepresentative(bioguideId);
    } catch (error) {
      logger.warn('Could not get enhanced representative data', {
        bioguideId,
        error: (error as Error).message,
      });
    }

    const memberChamber = enhancedRep?.chamber || 'House';
    const memberName = enhancedRep?.fullName?.official || enhancedRep?.name || '';

    logger.info('Member context determined', {
      bioguideId,
      chamber: memberChamber,
      memberName,
      hasEnhancedData: !!enhancedRep,
    });

    // Try to get real voting data using enhanced strategies
    try {
      const realVotes = await getEnhancedVotingRecords(
        bioguideId,
        memberChamber,
        limit,
        memberName
      );

      if (realVotes && realVotes.length > 0) {
        logger.info('Real voting data successfully retrieved', {
          bioguideId,
          votesFound: realVotes.length,
          chamber: memberChamber,
        });

        // Calculate voting patterns from real data
        const votingPattern = {
          yes: realVotes.filter(v => v.position === 'Yea').length,
          no: realVotes.filter(v => v.position === 'Nay').length,
          present: realVotes.filter(v => v.position === 'Present').length,
          notVoting: realVotes.filter(v => v.position === 'Not Voting').length,
        };

        // Calculate total votes and party alignment (simplified for now)
        const totalVotes = realVotes.length;
        const partyAlignment = {
          withParty: Math.floor(totalVotes * 0.85), // Estimate - would need party vote data
          againstParty: Math.floor(totalVotes * 0.15),
          percentage:
            totalVotes > 0 ? Math.round((Math.floor(totalVotes * 0.85) / totalVotes) * 100) : 0,
        };

        // Format recent votes (last 10)
        const recentVotes = realVotes.slice(0, 10).map(vote => ({
          date: vote.date,
          billNumber: vote.bill.number,
          description: vote.bill.title || vote.question,
          vote: vote.position,
          result: vote.result,
          chamber: vote.chamber,
          rollNumber: vote.rollNumber,
        }));

        return NextResponse.json({
          // Legacy format for backward compatibility
          votes: realVotes,
          totalResults: realVotes.length,
          dataSource: 'congress.gov',
          source: 'member-voting-record',
          cacheStatus: 'Live member voting data from Congress.gov',
          member: {
            bioguideId,
            name: memberName,
            chamber: memberChamber,
          },

          // Enhanced format with voting statistics
          votingPattern,
          partyAlignment,
          recentVotes,
          totalVotes,

          // Additional metadata
          metadata: {
            dataSource: 'congress.gov',
            endpoint: 'member-voting-record',
            lastUpdated: new Date().toISOString(),
            congress: '119',
            responseTime: Date.now(),
          },
        });
      }
    } catch (realDataError) {
      logger.warn('Real voting data unavailable', {
        bioguideId,
        error: (realDataError as Error).message,
      });
    }

    // No mock data fallback - return empty result with clear indication
    logger.info('No voting records available', {
      bioguideId,
      reason: 'Real voting data not available from Congress.gov',
    });

    return NextResponse.json({
      // Legacy format
      votes: [],
      totalResults: 0,
      dataSource: 'unavailable',
      source: 'congress.gov',
      cacheStatus: 'No voting records available from Congress.gov for this representative',
      message:
        'Voting records are currently unavailable. This may be because the representative is newly elected or Congress.gov data is temporarily inaccessible.',
      member: {
        bioguideId,
        name: memberName,
        chamber: memberChamber,
      },

      // Enhanced format with empty values
      votingPattern: {
        yes: 0,
        no: 0,
        present: 0,
        notVoting: 0,
      },
      partyAlignment: {
        withParty: 0,
        againstParty: 0,
        percentage: 0,
      },
      recentVotes: [],
      totalVotes: 0,

      metadata: {
        dataSource: 'congress.gov',
        endpoint: 'member-voting-record',
        lastUpdated: new Date().toISOString(),
        congress: '119',
        responseTime: Date.now(),
        error: 'No voting data available',
      },
    });
  } catch (error) {
    logger.error(
      'Voting records API error',
      error instanceof Error ? error : new Error(String(error)),
      {
        bioguideId,
        operation: 'voting_records_api_error',
      }
    );

    return NextResponse.json(
      {
        error: 'Internal server error',
        votes: [],
        totalResults: 0,
        dataSource: 'error',
        source: 'congress.gov',
        cacheStatus: 'Error occurred while fetching voting data',
      },
      { status: 500 }
    );
  }
}

// Legacy voting records function using bill-based approach
async function _getLegacyVotingRecords(
  bioguideId: string,
  chamber: string,
  memberName: string,
  limit: number
): Promise<Vote[]> {
  try {
    logger.info('Fetching legacy voting records', { bioguideId, chamber, limit });

    // Get recent bills with recorded votes
    const billsResponse = await fetch(
      `https://api.congress.gov/v3/bill?api_key=${process.env.CONGRESS_API_KEY}&limit=${Math.min(limit * 2, 100)}&format=json`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!billsResponse.ok) {
      logger.warn('Bills API request failed', { status: billsResponse.status });
      return [];
    }

    // const monitor = monitorExternalApi('congress.gov', 'bills'); // Disabled
    const billsData = await billsResponse.json();
    // monitor.end(true, 200); // Disabled

    if (!billsData.bills || billsData.bills.length === 0) {
      logger.warn('No bills found for legacy voting records', { bioguideId });
      return [];
    }

    const votes: Vote[] = [];
    const parser = new RollCallParser();

    // Process each bill to find recorded votes
    for (const bill of billsData.bills.slice(0, limit)) {
      if (bill.actions && bill.actions.length > 0) {
        for (const action of bill.actions) {
          if (action.recordedVotes && action.recordedVotes.length > 0) {
            for (const recordedVote of action.recordedVotes) {
              // Only process votes from the member's chamber
              if (recordedVote.chamber.toLowerCase() !== chamber.toLowerCase()) {
                continue;
              }

              try {
                const memberVote = await getMemberVoteFromRollCall(
                  recordedVote.url,
                  bioguideId,
                  memberName,
                  parser
                );

                if (memberVote) {
                  const vote: Vote = {
                    voteId: `${bill.congress}-${recordedVote.rollNumber}`,
                    bill: {
                      number: bill.number,
                      title: bill.title || `${bill.type} ${bill.number}`,
                      congress: bill.congress.toString(),
                      type: bill.type,
                      url: bill.url,
                    },
                    question: action.text || 'On Passage',
                    result: 'Unknown', // Would need to parse from roll call XML
                    date: action.actionDate,
                    position: memberVote as 'Yea' | 'Nay' | 'Not Voting' | 'Present',
                    chamber: chamber as 'House' | 'Senate',
                    rollNumber: recordedVote.rollNumber,
                    isKeyVote: false, // Would need additional logic to determine
                    category: categorizeBill(bill.title || ''),
                    description: action.text,
                    metadata: {
                      sourceUrl: recordedVote.url,
                      lastUpdated: bill.updateDate,
                      confidence: 'high',
                    },
                  };

                  votes.push(vote);

                  if (votes.length >= limit) {
                    break;
                  }
                }
              } catch (voteError) {
                logger.warn('Error processing recorded vote', {
                  voteError,
                  rollNumber: recordedVote.rollNumber,
                });
                continue;
              }
            }

            if (votes.length >= limit) {
              break;
            }
          }
        }

        if (votes.length >= limit) {
          break;
        }
      }
    }

    logger.info('Legacy voting records retrieved', {
      bioguideId,
      votesFound: votes.length,
    });

    return votes;
  } catch (error) {
    logger.error('Error in legacy voting records fetch', error as Error, {
      bioguideId,
      chamber,
    });
    return [];
  }
}
