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
import { cachedHeavyEndpoint, govCache } from '@/services/cache';

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
    cached?: boolean;
    backgroundProcessing?: boolean;
    cacheKey?: string;
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
 * Optimized Senate votes fetching using batch voting service
 * Provides caching, parallel processing, and <2 second response times
 */
async function getSenateVotes(bioguideId: string, limit: number = 10): Promise<Vote[]> {
  try {
    logger.info('Fetching Senate votes using optimized batch service', {
      bioguideId,
      limit,
      method: 'batch-voting-service',
    });

    // Use the optimized batch voting service
    const { batchVotingService } = await import(
      '@/features/representatives/services/batch-voting-service'
    );

    const memberVotes = await batchVotingService.getSenateMemberVotes(
      bioguideId,
      119, // 119th Congress
      1, // Session 1
      limit // Limit votes
    );

    logger.info('Optimized Senate votes retrieved successfully', {
      bioguideId,
      votesCount: memberVotes.length,
      method: 'batch-voting-service',
    });

    // Transform to standardized Vote format
    const transformedVotes: Vote[] = memberVotes.map(vote => {
      const question = vote.question || 'Unknown Question';
      const result = vote.result || 'Unknown';
      const category = categorizeVote(question);
      const isKeyVote = determineKeyVote(question, result);

      return {
        voteId: vote.voteId,
        bill: vote.bill
          ? {
              number: String(vote.bill.number),
              title: vote.bill.title,
              congress: String(vote.bill.congress),
              type: vote.bill.type,
              url: vote.bill.url,
            }
          : {
              number: 'N/A',
              title: 'Vote without associated bill',
              congress: '119',
              type: 'Senate Resolution',
              url: undefined,
            },
        question,
        result,
        date: vote.date,
        position: vote.position as Vote['position'],
        chamber: 'Senate' as const,
        rollNumber: vote.rollCallNumber || 0,
        description: question,
        category,
        isKeyVote,
        metadata: {
          source: 'senate-xml-feed',
          confidence: 'high',
          processingDate: new Date().toISOString(),
        },
      };
    });

    return transformedVotes;
  } catch (error) {
    logger.error('Error fetching optimized Senate votes', error as Error, { bioguideId });
    return [];
  }
}

/**
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
 * Optimized House votes fetching using batch voting service
 * Provides caching, parallel processing, and <2 second response times
 */
async function getHouseVotes(
  bioguideId: string,
  limit: number = 20,
  bypassCache = false
): Promise<Vote[]> {
  try {
    logger.info('Fetching House votes using optimized batch service', {
      bioguideId,
      method: 'batch-voting-service',
      limit,
    });

    // Use the optimized batch voting service
    const { batchVotingService } = await import(
      '@/features/representatives/services/batch-voting-service'
    );

    const memberVotes = await batchVotingService.getHouseMemberVotes(
      bioguideId,
      119, // 119th Congress
      1, // Session 1
      limit, // Limit votes
      bypassCache // Bypass cache for testing
    );

    logger.info('Optimized House votes retrieved successfully', {
      bioguideId,
      votesCount: memberVotes.length,
      method: 'batch-voting-service',
    });

    // Transform to standardized Vote format
    const transformedVotes: Vote[] = memberVotes.map(vote => {
      const question = vote.question || 'Unknown Question';
      const result = vote.result || 'Unknown';
      const category = categorizeVote(question);
      const isKeyVote = determineKeyVote(question, result);

      return {
        voteId: vote.voteId,
        bill: vote.bill
          ? {
              number: String(vote.bill.number),
              title: vote.bill.title,
              congress: String(vote.bill.congress),
              type: vote.bill.type,
              url: vote.bill.url,
            }
          : {
              number: 'N/A',
              title: 'Vote without associated bill',
              congress: '119',
              type: 'House Resolution',
              url: undefined,
            },
        question,
        result,
        date: vote.date,
        position: vote.position as Vote['position'],
        chamber: 'House' as const,
        rollNumber: vote.rollCallNumber || 0,
        description: question,
        category,
        isKeyVote,
        metadata: {
          source: 'house-congress-api',
          confidence: 'high', // High because we have real member positions
          processingDate: new Date().toISOString(),
        },
      };
    });

    return transformedVotes;
  } catch (error) {
    logger.error('Error fetching House votes with Roll Call API', error as Error, { bioguideId });
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
    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const bypassCache = searchParams.get('nocache') === 'true';

    let votes: Vote[] = [];
    let dataSource = '';
    let cached = false;

    // Background processing with aggressive caching for heavy votes endpoint
    const cacheKey = `votes:${bioguideId}:${chamber}:${limit}`;

    try {
      const votesResult = await cachedHeavyEndpoint(
        cacheKey,
        async () => {
          if (chamber === 'Senate') {
            // Phase 2: For Senators, fetch real votes from XML feed
            logger.info('Senator detected - fetching real votes from XML feed (Background)', {
              bioguideId,
              name,
            });
            const senateVotes = await getSenateVotes(bioguideId, limit);
            return { votes: senateVotes, source: 'senate-xml-feed' };
          } else {
            // Phase 2: For House members, attempt to fetch with robust error handling
            logger.info('House member detected - fetching votes (Background)', {
              bioguideId,
              name,
            });
            const houseVotes = await getHouseVotes(bioguideId, limit, bypassCache);
            return { votes: houseVotes, source: 'house-congress-api' };
          }
        },
        {
          source: 'votes-background-processing',
          bypassCache,
        }
      );

      votes = votesResult.votes;
      dataSource = votesResult.source;
      cached = !bypassCache;
    } catch (error) {
      logger.error(
        'Background vote processing failed, falling back to empty response',
        error as Error,
        {
          bioguideId,
          chamber,
        }
      );

      // Fallback to empty votes instead of crashing
      votes = [];
      dataSource = `${chamber.toLowerCase()}-fallback-error`;
      cached = false;
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
        phase: 'Phase 2 - Senate XML Integrated (Background Processed)',
        crashProof: true,
        cached,
        backgroundProcessing: true,
        cacheKey,
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
