/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { RollCallParser } from '@/lib/rollcall-parser';
import { getEnhancedRepresentative } from '@/lib/congress-legislators';
import { structuredLogger } from '@/lib/logging/logger';
import { monitorExternalApi } from '@/lib/monitoring/telemetry';

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
  category?: 'Budget' | 'Healthcare' | 'Defense' | 'Infrastructure' | 'Immigration' | 'Environment' | 'Education' | 'Other';
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

interface BillWithVotes {
  congress: number;
  type: string;
  number: number;
  title: string;
  actions: Array<{
    actionDate: string;
    text: string;
    recordedVotes?: Array<{
      chamber: string;
      congress: number;
      date: string;
      rollNumber: number;
      url: string;
    }>;
  }>;
}

// Helper function to categorize bills
function categorizeBill(title: string): Vote['category'] {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('budget') || lowerTitle.includes('appropriation') || lowerTitle.includes('spending')) {
    return 'Budget';
  } else if (lowerTitle.includes('health') || lowerTitle.includes('medicare') || lowerTitle.includes('medicaid')) {
    return 'Healthcare';
  } else if (lowerTitle.includes('defense') || lowerTitle.includes('military') || lowerTitle.includes('armed forces')) {
    return 'Defense';
  } else if (lowerTitle.includes('infrastructure') || lowerTitle.includes('transportation') || lowerTitle.includes('highway')) {
    return 'Infrastructure';
  } else if (lowerTitle.includes('immigration') || lowerTitle.includes('border') || lowerTitle.includes('visa')) {
    return 'Immigration';
  } else if (lowerTitle.includes('environment') || lowerTitle.includes('climate') || lowerTitle.includes('energy')) {
    return 'Environment';
  } else if (lowerTitle.includes('education') || lowerTitle.includes('school') || lowerTitle.includes('student')) {
    return 'Education';
  }
  return 'Other';
}

// Enhanced function to fetch member voting position from roll call data
async function getMemberVoteFromRollCall(
  rollCallUrl: string,
  bioguideId: string,
  memberName: string,
  parser: RollCallParser
): Promise<'Yea' | 'Nay' | 'Not Voting' | 'Present'> {
  try {
    structuredLogger.debug('Fetching roll call data', { rollCallUrl, bioguideId });
    
    const rollCallData = await parser.fetchAndParseRollCall(rollCallUrl);
    if (!rollCallData) {
      structuredLogger.warn('No roll call data retrieved', { rollCallUrl });
      return 'Not Voting';
    }

    const memberVote = parser.findMemberVote(rollCallData, bioguideId, memberName);
    const position = memberVote ? memberVote.vote : 'Not Voting';
    
    structuredLogger.debug('Member vote found', { 
      bioguideId, 
      position, 
      memberName,
      voteFound: !!memberVote 
    });
    
    return position;
  } catch (error) {
    structuredLogger.error('Error fetching roll call data', error as Error, { 
      rollCallUrl, 
      bioguideId 
    });
    return 'Not Voting';
  }
}

// Enhanced function to get recent votes using Congress.gov API
async function getEnhancedVotingRecords(
  bioguideId: string, 
  chamber: string, 
  limit: number
): Promise<Vote[]> {
  try {
    structuredLogger.info('Fetching enhanced voting records', { bioguideId, chamber, limit });

    // Get recent votes from Congress.gov API
    const votesResponse = await fetch(
      `https://api.congress.gov/v3/member/${bioguideId}/votes?api_key=${process.env.CONGRESS_API_KEY}&limit=${Math.min(limit * 3, 250)}&format=json`,
      {
        headers: {
          'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)'
        }
      }
    );

    const monitor = monitorExternalApi('congress', 'member-votes', votesResponse.url);

    if (!votesResponse.ok) {
      monitor.end(false, votesResponse.status);
      throw new Error(`Congress API failed: ${votesResponse.status} ${votesResponse.statusText}`);
    }

    const votesData = await votesResponse.json();
    monitor.end(true, 200);

    structuredLogger.info('Retrieved votes from Congress.gov', {
      bioguideId,
      votesCount: votesData.votes?.length || 0
    });

    if (!votesData.votes || votesData.votes.length === 0) {
      structuredLogger.warn('No votes found for member', { bioguideId });
      return [];
    }

    // Process and enhance vote data
    const enhancedVotes: Vote[] = votesData.votes.slice(0, limit).map((vote: any) => {
      const bill = vote.bill || {};
      const category = categorizeBill(bill.title || '');
      
      // Determine if this is a key vote
      const isKeyVote = 
        category === 'Budget' ||
        category === 'Healthcare' ||
        category === 'Defense' ||
        vote.question?.toLowerCase().includes('final passage') ||
        vote.question?.toLowerCase().includes('override') ||
        (bill.title?.toLowerCase().includes('appropriations') ?? false);

      return {
        voteId: `${vote.congress || 'unknown'}-${bill.type || 'unknown'}-${bill.number || 'unknown'}-${vote.rollCall || Date.now()}`,
        bill: {
          number: bill.number ? `${bill.type?.toUpperCase() || ''} ${bill.number}` : 'Unknown',
          title: bill.title || 'Unknown Bill',
          congress: (vote.congress || 'unknown').toString(),
          type: bill.type || 'unknown',
          url: bill.url
        },
        question: vote.question || 'On Passage',
        result: vote.result || 'Unknown',
        date: vote.date || new Date().toISOString().split('T')[0],
        position: vote.position || 'Not Voting',
        chamber: vote.chamber as 'House' | 'Senate' || chamber as 'House' | 'Senate',
        rollNumber: vote.rollCall,
        isKeyVote,
        description: vote.description,
        category,
        metadata: {
          sourceUrl: vote.url,
          lastUpdated: new Date().toISOString(),
          confidence: vote.position ? 'high' : 'medium'
        }
      };
    });

    structuredLogger.info('Successfully processed enhanced votes', {
      bioguideId,
      processedVotes: enhancedVotes.length,
      keyVotes: enhancedVotes.filter(v => v.isKeyVote).length
    });

    return enhancedVotes;

  } catch (error) {
    structuredLogger.error('Error fetching enhanced voting records', error as Error, { bioguideId });
    throw error;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!bioguideId) {
    return NextResponse.json(
      { error: 'Bioguide ID is required' },
      { status: 400 }
    );
  }

  try {
    structuredLogger.info('Processing voting records request', { bioguideId, limit });

    // Try to get enhanced representative data for better context
    let enhancedRep;
    try {
      enhancedRep = await getEnhancedRepresentative(bioguideId);
    } catch (error) {
      structuredLogger.warn('Could not get enhanced representative data', {
        bioguideId,
        error: (error as Error).message
      });
    }

    const memberChamber = enhancedRep?.chamber || 'House';
    const memberName = enhancedRep?.fullName?.official || enhancedRep?.name || '';

    structuredLogger.info('Member context determined', {
      bioguideId,
      chamber: memberChamber,
      memberName,
      hasEnhancedData: !!enhancedRep
    });

    // Use enhanced voting records approach
    const votes = await cachedFetch(
      `enhanced-voting-records-${bioguideId}`,
      async () => {
        if (!process.env.CONGRESS_API_KEY) {
          throw new Error('Congress API key not configured');
        }

        try {
          // Strategy 1: Try enhanced direct member votes API
          return await getEnhancedVotingRecords(bioguideId, memberChamber, limit);
        } catch (enhancedError) {
          structuredLogger.warn('Enhanced voting records failed, trying fallback', {
            bioguideId,
            error: (enhancedError as Error).message
          });

          // Strategy 2: Fallback to bill-based approach (legacy)
          return await getLegacyVotingRecords(bioguideId, memberChamber, memberName, limit);
        }
      },
      30 * 60 * 1000 // 30 minutes cache
    );

    return NextResponse.json({ 
      votes: votes,
      metadata: {
        totalVotes: votes.length,
        chamber: memberChamber,
        dataSource: 'congress.gov',
        note: 'Voting positions fetched from Congress.gov API with enhanced categorization and metadata.',
        enhancedDataUsed: true,
        keyVotes: votes.filter(v => v.isKeyVote).length
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    
    // Fallback mock voting data
    const mockVotes: Vote[] = [
      {
        voteId: '119-hr-1-28',
        bill: {
          number: 'HR 1',
          title: 'One Big Beautiful Bill Act',
          congress: '119',
          type: 'hr'
        },
        question: 'On Passage',
        result: 'Passed',
        date: '2025-07-03',
        position: 'Yea',
        chamber: 'House',
        rollNumber: 190,
        isKeyVote: true
      },
      {
        voteId: '119-hr-43-28',
        bill: {
          number: 'HR 43',
          title: 'Alaska Native Village Municipal Lands Restoration Act',
          congress: '119',
          type: 'hr'
        },
        question: 'On Motion to Suspend the Rules and Pass',
        result: 'Passed',
        date: '2025-02-04',
        position: 'Yea',
        chamber: 'House',
        rollNumber: 28
      },
      {
        voteId: '118-s-2226-245',
        bill: {
          number: 'S 2226',
          title: 'Building Chips in America Act',
          congress: '118',
          type: 's'
        },
        question: 'On Passage',
        result: 'Passed',
        date: '2024-07-25',
        position: 'Yea',
        chamber: 'Senate',
        rollNumber: 245,
        isKeyVote: true
      },
      {
        voteId: '118-hr-3935-305',
        bill: {
          number: 'HR 3935',
          title: 'Securing Growth and Robust Leadership in American Aviation Act',
          congress: '118',
          type: 'hr'
        },
        question: 'On Passage',
        result: 'Passed',
        date: '2024-05-15',
        position: 'Nay',
        chamber: 'House',
        rollNumber: 305
      },
      {
        voteId: '118-hr-5376-234',
        bill: {
          number: 'HR 5376',
          title: 'Inflation Reduction Act',
          congress: '118',
          type: 'hr'
        },
        question: 'On Amendment',
        result: 'Failed',
        date: '2024-04-10',
        position: 'Not Voting',
        chamber: 'House',
        rollNumber: 234
      }
    ];

    return NextResponse.json({ 
      votes: mockVotes.slice(0, limit),
      metadata: {
        dataSource: 'mock',
        note: 'Fallback data - API temporarily unavailable',
        error: (error as Error).message
      }
    });
  }
}

// Legacy voting records function using bill-based approach
async function getLegacyVotingRecords(
  bioguideId: string,
  chamber: string, 
  memberName: string,
  limit: number
): Promise<Vote[]> {
  try {
    structuredLogger.info('Fetching legacy voting records', { bioguideId, chamber, limit });

    // Get recent bills with recorded votes
    const billsResponse = await fetch(
      `https://api.congress.gov/v3/bill?api_key=${process.env.CONGRESS_API_KEY}&limit=${Math.min(limit * 2, 100)}&format=json`,
      {
        headers: {
          'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)'
        }
      }
    );

    const monitor = monitorExternalApi('congress', 'bills', billsResponse.url);

    if (!billsResponse.ok) {
      monitor.end(false, billsResponse.status);
      throw new Error(`Congress API failed: ${billsResponse.status} ${billsResponse.statusText}`);
    }

    const billsData = await billsResponse.json();
    monitor.end(true, 200);

    if (!billsData.bills || billsData.bills.length === 0) {
      structuredLogger.warn('No bills found for legacy voting records', { bioguideId });
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
              // Only include votes from the member's chamber
              if (recordedVote.chamber && recordedVote.chamber.toLowerCase() === chamber.toLowerCase()) {
                const voteId = `${bill.congress}-${bill.type}-${bill.number}-${recordedVote.rollNumber}`;
                
                // Get member's vote position from roll call data
                let memberVotePosition: 'Yea' | 'Nay' | 'Not Voting' | 'Present' = 'Not Voting';
                
                if (recordedVote.url) {
                  memberVotePosition = await getMemberVoteFromRollCall(
                    recordedVote.url,
                    bioguideId,
                    memberName,
                    parser
                  );
                }

                // Determine result and question from action text
                const actionText = action.text?.toLowerCase() || '';
                let result = 'Unknown';
                let question = 'On Passage';
                
                if (actionText.includes('passed') || actionText.includes('agreed to')) {
                  result = 'Passed';
                } else if (actionText.includes('failed') || actionText.includes('rejected')) {
                  result = 'Failed';
                }

                if (actionText.includes('motion to')) {
                  const motionMatch = actionText.match(/motion to ([^.]+)/);
                  if (motionMatch) {
                    question = `On ${motionMatch[1]}`;
                  }
                } else if (actionText.includes('amendment')) {
                  question = 'On Amendment';
                } else if (actionText.includes('cloture')) {
                  question = 'On Cloture';
                }

                const category = categorizeBill(bill.title || '');
                const isKeyVote = 
                  category === 'Budget' ||
                  category === 'Healthcare' ||
                  category === 'Defense' ||
                  actionText.includes('final passage') ||
                  actionText.includes('appropriations');

                votes.push({
                  voteId,
                  bill: {
                    number: `${bill.type?.toUpperCase() || ''} ${bill.number}`,
                    title: bill.title || 'Unknown Bill',
                    congress: (bill.congress || 'unknown').toString(),
                    type: bill.type || 'unknown',
                    url: bill.url
                  },
                  question,
                  result,
                  date: recordedVote.date || new Date().toISOString().split('T')[0],
                  position: memberVotePosition,
                  chamber: recordedVote.chamber as 'House' | 'Senate',
                  rollNumber: recordedVote.rollNumber,
                  isKeyVote,
                  category,
                  metadata: {
                    sourceUrl: recordedVote.url,
                    lastUpdated: new Date().toISOString(),
                    confidence: memberVotePosition !== 'Not Voting' ? 'medium' : 'low'
                  }
                });
              }
            }
          }
        }
      }
    }

    // Sort by date (most recent first) and limit
    votes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const limitedVotes = votes.slice(0, limit);

    structuredLogger.info('Successfully processed legacy votes', {
      bioguideId,
      processedVotes: limitedVotes.length,
      keyVotes: limitedVotes.filter(v => v.isKeyVote).length
    });

    return limitedVotes;

  } catch (error) {
    structuredLogger.error('Error fetching legacy voting records', error as Error, { bioguideId });
    throw error;
  }
}