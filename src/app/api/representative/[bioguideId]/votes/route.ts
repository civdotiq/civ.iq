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
import { cachedFetch, govCache as _govCache } from '@/services/cache';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;

// Vercel serverless function configuration
export const maxDuration = 30; // 30 seconds for vote enrichment
export const dynamic = 'force-dynamic';

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
  congressUrl?: string; // Direct link to Congress.gov vote page
  // Phase 3: Additional standardized fields for consistency
  category?: 'Budget' | 'Healthcare' | 'Defense' | 'Judiciary' | 'Foreign Affairs' | 'Other';
  isKeyVote?: boolean;
  // Enhanced context fields for meaningful political insight
  total?: {
    yes: number;
    no: number;
    not_voting: number;
    present: number;
  };
  party_breakdown?: {
    democratic: { yes: number; no: number; not_voting: number; present: number };
    republican: { yes: number; no: number; not_voting: number; present: number };
    independent?: { yes: number; no: number; not_voting: number; present: number };
  };
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
 * Generate Congress.gov URL for a vote
 */
function generateCongressUrl(
  chamber: 'House' | 'Senate',
  congress: string,
  rollNumber: number
): string {
  const congressNum = congress || '119';
  const chamberSlug = chamber.toLowerCase() === 'house' ? 'house' : 'senate';

  if (rollNumber && rollNumber > 0) {
    return `https://www.congress.gov/vote/${congressNum}th-congress/${chamberSlug}-vote/${rollNumber}`;
  }

  // Fallback to general votes page
  return `https://www.congress.gov/search?q={"source":["rollcallvote"],"congress":"${congressNum}","chamber":"${chamber.toLowerCase()}"}`;
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
 * Cache individual roll-call vote details aggressively (24+ hours)
 */
type VoteDetailCache = {
  voteQuestion?: string;
  result?: string;
  votePartyTotal?: Array<{
    party: { name: string; type: string };
    yeaTotal: number;
    nayTotal: number;
    notVotingTotal: number;
    presentTotal: number;
  }>;
  legislationType?: string;
  legislationNumber?: string;
};

type BillDetailCache = {
  title?: string;
  policyArea?: { name: string };
};

const voteCache = new Map<string, VoteDetailCache | BillDetailCache>();

/**
 * Fetch enriched roll-call vote data from Congress.gov API
 * This provides the rich context missing from member summary data
 */
async function fetchRollCallVoteDetails(
  congress: number,
  chamber: 'house' | 'senate',
  session: number,
  rollNumber: number
): Promise<{
  voteQuestion?: string;
  result?: string;
  votePartyTotal?: Array<{
    party: { name: string; type: string };
    yeaTotal: number;
    nayTotal: number;
    notVotingTotal: number;
    presentTotal: number;
  }>;
  legislationType?: string;
  legislationNumber?: string;
} | null> {
  const cacheKey = `rollcall:${congress}:${chamber}:${session}:${rollNumber}`;

  logger.debug(`🔍 Fetching roll-call details`, {
    congress,
    chamber,
    session,
    rollNumber,
    cacheKey,
  });

  // Check cache first (24 hour TTL)
  if (voteCache.has(cacheKey)) {
    logger.debug(`📋 Cache hit for roll-call ${rollNumber}`, { cacheKey });
    return voteCache.get(cacheKey) as VoteDetailCache;
  }

  try {
    const url = `https://api.congress.gov/v3/${chamber}-vote/${congress}/${session}/${rollNumber}?format=json`;
    logger.debug(`🌐 Calling Congress.gov API`, { url, rollNumber });

    const response = await fetch(url, {
      headers: {
        'X-API-Key': process.env.CONGRESS_API_KEY || '',
        Accept: 'application/json',
        'User-Agent': 'CivicIntelHub/1.0',
      },
      // 10 second timeout for individual votes
      signal: AbortSignal.timeout(10000),
    });

    logger.debug(`📡 Congress.gov API response`, {
      rollNumber,
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
    });

    if (!response.ok) {
      logger.warn(`❌ Roll-call vote not found: ${rollNumber}`, {
        congress,
        chamber,
        session,
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const data = await response.json();
    const voteData = data.houseRollCallVote || data.senateRollCallVote;

    if (voteData) {
      logger.debug(`✅ Roll-call data retrieved successfully`, {
        rollNumber,
        hasVotePartyTotal: !!voteData.votePartyTotal,
        votePartyTotalLength: voteData.votePartyTotal?.length || 0,
        hasVoteQuestion: !!voteData.voteQuestion,
      });

      // Cache for 24 hours
      setTimeout(() => voteCache.delete(cacheKey), 86400000);
      voteCache.set(cacheKey, voteData);
      return voteData;
    }

    logger.warn(`❌ No vote data found in response`, {
      rollNumber,
      responseKeys: Object.keys(data),
    });
    return null;
  } catch (error) {
    logger.error('❌ Error fetching roll-call details', error as Error, {
      rollNumber,
      congress,
      chamber,
      session,
      errorType: error?.constructor?.name,
    });
    return null;
  }
}

/**
 * Fetch enriched bill details from Congress.gov API
 */
async function fetchBillDetails(
  congress: number,
  billType: string,
  billNumber: string
): Promise<{ title?: string; policyArea?: { name: string } } | null> {
  const cacheKey = `bill:${congress}:${billType}:${billNumber}`;

  // Check cache first
  if (voteCache.has(cacheKey)) {
    return voteCache.get(cacheKey) as BillDetailCache;
  }

  try {
    const normalizedType = billType.toLowerCase().replace(/[^a-z]/g, '');
    const url = `https://api.congress.gov/v3/bill/${congress}/${normalizedType}/${billNumber}?format=json`;
    const response = await fetch(url, {
      headers: {
        'X-API-Key': process.env.CONGRESS_API_KEY || '',
        Accept: 'application/json',
        'User-Agent': 'CivicIntelHub/1.0',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const billData = data.bill;

    if (billData) {
      const enrichedBill = {
        title: billData.title,
        policyArea: billData.policyArea,
      };
      // Cache for 24 hours
      setTimeout(() => voteCache.delete(cacheKey), 86400000);
      voteCache.set(cacheKey, enrichedBill);
      return enrichedBill;
    }

    return null;
  } catch (error) {
    logger.debug('Error fetching bill details', { error: (error as Error).message, billNumber });
    return null;
  }
}

/**
 * Enhanced House votes fetching with N+1 enrichment pattern
 * First gets vote summary, then enriches each vote with roll-call details
 */
async function getHouseVotes(
  bioguideId: string,
  limit: number = 20,
  bypassCache = false
): Promise<Vote[]> {
  try {
    logger.info('Fetching House votes with enrichment pattern', {
      bioguideId,
      method: 'n+1-enrichment',
      limit,
    });

    // Step 1: Get basic vote list from batch service
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

    logger.info('Basic House votes retrieved, starting enrichment', {
      bioguideId,
      votesCount: memberVotes.length,
    });

    // Step 2: Enrich each vote with roll-call details (N+1 pattern)
    const enrichmentPromises = memberVotes.map(async vote => {
      const question = vote.question || 'Unknown Question';
      const result = vote.result || 'Unknown';
      const category = categorizeVote(question);
      const isKeyVote = determineKeyVote(question, result);
      const rollNumber = vote.rollCallNumber || 0;

      // Enrich with roll-call details if we have a roll number
      let enrichedTotal: Vote['total'] = undefined;
      let enrichedPartyBreakdown: Vote['party_breakdown'] = undefined;
      let enrichedQuestion = question;
      let enrichedBillTitle = vote.bill?.title || 'Vote without associated bill';

      if (rollNumber > 0) {
        logger.debug(`🔄 Starting enrichment for vote`, {
          bioguideId,
          voteId: vote.voteId,
          rollNumber,
          currentQuestion: question,
        });

        try {
          // Robust session detection: 119th Congress started in 2025
          // Congressional sessions: odd years = Session 1, even years = Session 2
          // Note: Update congressStartYear for 120th Congress in 2027
          const currentYear = new Date().getFullYear();
          const sessionNumber = currentYear % 2 === 1 ? 1 : 2;

          // Log for validation and debugging
          logger.debug('[Vote Enrichment] Session calculated', {
            currentYear,
            congress: 119,
            calculatedSession: sessionNumber,
          });
          const rollCallDetails = await fetchRollCallVoteDetails(
            119,
            'house',
            sessionNumber,
            rollNumber
          );

          if (rollCallDetails) {
            // Extract better question text
            if (rollCallDetails.voteQuestion) {
              enrichedQuestion = rollCallDetails.voteQuestion;
            }

            // Calculate totals from party breakdown
            if (rollCallDetails.votePartyTotal && rollCallDetails.votePartyTotal.length > 0) {
              const totals = rollCallDetails.votePartyTotal.reduce(
                (acc, party) => ({
                  yes: acc.yes + party.yeaTotal,
                  no: acc.no + party.nayTotal,
                  not_voting: acc.not_voting + party.notVotingTotal,
                  present: acc.present + party.presentTotal,
                }),
                { yes: 0, no: 0, not_voting: 0, present: 0 }
              );
              enrichedTotal = totals;

              // Create party breakdown
              const partyBreakdown: Vote['party_breakdown'] = {
                democratic: { yes: 0, no: 0, not_voting: 0, present: 0 },
                republican: { yes: 0, no: 0, not_voting: 0, present: 0 },
              };

              rollCallDetails.votePartyTotal.forEach(party => {
                if (party.party.type === 'D') {
                  partyBreakdown.democratic = {
                    yes: party.yeaTotal,
                    no: party.nayTotal,
                    not_voting: party.notVotingTotal,
                    present: party.presentTotal,
                  };
                } else if (party.party.type === 'R') {
                  partyBreakdown.republican = {
                    yes: party.yeaTotal,
                    no: party.nayTotal,
                    not_voting: party.notVotingTotal,
                    present: party.presentTotal,
                  };
                } else if (party.party.type === 'I') {
                  partyBreakdown.independent = {
                    yes: party.yeaTotal,
                    no: party.nayTotal,
                    not_voting: party.notVotingTotal,
                    present: party.presentTotal,
                  };
                }
              });

              enrichedPartyBreakdown = partyBreakdown;

              logger.debug(`✅ Enrichment successful for Roll Call #${rollNumber}`, {
                bioguideId,
                rollNumber,
                hasTotal: !!enrichedTotal,
                totalValues: enrichedTotal,
                hasPartyBreakdown: !!enrichedPartyBreakdown,
                partyBreakdown: enrichedPartyBreakdown,
              });
            }

            // Enrich bill title if we have legislation details
            if (rollCallDetails.legislationType && rollCallDetails.legislationNumber) {
              try {
                const billDetails = await fetchBillDetails(
                  119,
                  rollCallDetails.legislationType,
                  rollCallDetails.legislationNumber
                );
                if (billDetails?.title) {
                  enrichedBillTitle = billDetails.title;
                }
              } catch (billError) {
                logger.error(
                  `Failed to enrich bill title for Roll Call #${rollNumber}`,
                  billError as Error,
                  {
                    bioguideId,
                    rollNumber,
                    legislationType: rollCallDetails.legislationType,
                    legislationNumber: rollCallDetails.legislationNumber,
                  }
                );
              }
            }
          } else {
            logger.debug(`❌ No roll-call details returned for Roll Call #${rollNumber}`, {
              bioguideId,
              rollNumber,
              voteId: vote.voteId,
            });
          }
        } catch (enrichmentError) {
          logger.error(
            `❌ Failed to enrich vote Roll Call #${rollNumber}`,
            enrichmentError as Error,
            {
              bioguideId,
              rollNumber,
              voteId: vote.voteId,
            }
          );
        }
      } else {
        logger.debug(`⚠️ Skipping enrichment - no valid roll number`, {
          bioguideId,
          voteId: vote.voteId,
          rollNumber,
        });
      }

      return {
        voteId: vote.voteId,
        bill: {
          number: String(vote.bill?.number || 'N/A'),
          title: enrichedBillTitle,
          congress: String(vote.bill?.congress || '119'),
          type: vote.bill?.type || 'House Resolution',
          url: vote.bill?.url,
        },
        question: enrichedQuestion,
        result,
        date: vote.date,
        position: vote.position as Vote['position'],
        chamber: 'House' as const,
        rollNumber,
        description: enrichedQuestion,
        congressUrl: generateCongressUrl('House', String(vote.bill?.congress || '119'), rollNumber),
        category,
        isKeyVote,
        total: enrichedTotal,
        party_breakdown: enrichedPartyBreakdown,
        metadata: {
          source: 'house-congress-api' as const,
          confidence: (enrichedTotal ? 'high' : 'medium') as 'high' | 'medium' | 'low',
          processingDate: new Date().toISOString(),
        },
      };
    });

    // Execute enrichment calls in controlled batches to avoid rate limits
    const BATCH_SIZE = 5; // Process 5 votes at a time
    const enrichedVotes: Vote[] = [];

    logger.info('Processing enrichment in batches', {
      bioguideId,
      totalVotes: enrichmentPromises.length,
      batchSize: BATCH_SIZE,
    });

    for (let i = 0; i < enrichmentPromises.length; i += BATCH_SIZE) {
      const batch = enrichmentPromises.slice(i, i + BATCH_SIZE);
      logger.debug(`Processing enrichment batch ${Math.floor(i / BATCH_SIZE) + 1}`, {
        bioguideId,
        batchStart: i,
        batchEnd: Math.min(i + BATCH_SIZE, enrichmentPromises.length),
      });

      const batchResults = await Promise.all(batch);
      enrichedVotes.push(...batchResults);

      // Small delay between batches to be respectful to Congress.gov API
      if (i + BATCH_SIZE < enrichmentPromises.length) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      }
    }

    logger.info('House vote enrichment completed', {
      bioguideId,
      totalVotes: enrichedVotes.length,
      enrichedVotes: enrichedVotes.filter(v => v.total).length,
    });

    return enrichedVotes;
  } catch (error) {
    logger.error('Error fetching enriched House votes', error as Error, { bioguideId });
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
            phase: 'Phase 3 - Roll-call Enriched (N+1 Pattern)',
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
            phase: 'Phase 3 - Roll-call Enriched (N+1 Pattern)',
            crashProof: true,
          },
        } satisfies VoteResponse,
        { status: 200 }
      );
    }

    const { chamber, name } = memberInfo;
    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const bypassCache =
      searchParams.get('bypassCache') === 'true' || searchParams.get('nocache') === 'true';

    let votes: Vote[] = [];
    let dataSource = '';
    let cached = false;

    // Background processing with aggressive caching for heavy votes endpoint
    const cacheKey = `votes:${bioguideId}:${chamber}:${limit}`;

    try {
      // Bypass cache if requested
      let votesResult;
      if (bypassCache) {
        if (chamber === 'Senate') {
          const senateVotes = await getSenateVotes(bioguideId, limit);
          votesResult = { votes: senateVotes, source: 'senate-xml-feed' };
        } else {
          const houseVotes = await getHouseVotes(bioguideId, limit, bypassCache);
          votesResult = { votes: houseVotes, source: 'house-congress-api-enriched' };
        }
      } else {
        votesResult = await cachedFetch(
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
              // Phase 3: For House members, use N+1 enrichment for full context
              logger.info(
                'House member detected - enriching votes with roll-call data (Background)',
                {
                  bioguideId,
                  name,
                }
              );
              const houseVotes = await getHouseVotes(bioguideId, limit, bypassCache);
              return { votes: houseVotes, source: 'house-congress-api-enriched' };
            }
          },
          {
            dataType: 'votes', // Use 15-minute cache for fresh voting data
            source: 'votes-enriched-processing',
          }
        );
      }

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
        phase: 'Phase 3 - Roll-call Enriched (N+1 Pattern)',
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
