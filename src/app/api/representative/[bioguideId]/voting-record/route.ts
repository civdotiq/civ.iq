/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { congressRollCallAPI } from '@/features/representatives/services/congress-rollcall-api';
import { logger } from '@/lib/logging/logger-edge';

interface VotingRecord {
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

interface VotingStatistics {
  totalVotes: number;
  attendanceRate: number;
  positions: {
    yea: number;
    nay: number;
    present: number;
    notVoting: number;
  };
  partyAlignment?: {
    withParty: number;
    againstParty: number;
    alignmentRate: number;
  };
}

// Helper function to categorize bills
function categorizeBill(title: string): VotingRecord['category'] {
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
function isKeyVote(title: string): boolean {
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

// Calculate voting statistics
function calculateVotingStatistics(votes: VotingRecord[], memberParty?: string): VotingStatistics {
  const positions = {
    yea: votes.filter(v => v.position === 'Yea').length,
    nay: votes.filter(v => v.position === 'Nay').length,
    present: votes.filter(v => v.position === 'Present').length,
    notVoting: votes.filter(v => v.position === 'Not Voting').length,
  };

  const totalVotes = votes.length;
  const attendanceRate =
    totalVotes > 0 ? ((positions.yea + positions.nay + positions.present) / totalVotes) * 100 : 0;

  let partyAlignment: VotingStatistics['partyAlignment'];

  if (memberParty && votes.length > 0) {
    let withParty = 0;
    let totalComparableVotes = 0;

    for (const vote of votes) {
      if (vote.partyBreakdown && vote.position !== 'Not Voting') {
        const partyBreakdown =
          memberParty === 'D'
            ? vote.partyBreakdown.democratic
            : memberParty === 'R'
              ? vote.partyBreakdown.republican
              : vote.partyBreakdown.independent;

        // Determine majority party position
        const partyYea = partyBreakdown.yea;
        const partyNay = partyBreakdown.nay;

        if (partyYea + partyNay > 0) {
          const majorityPosition = partyYea > partyNay ? 'Yea' : 'Nay';
          if (vote.position === majorityPosition) {
            withParty++;
          }
          totalComparableVotes++;
        }
      }
    }

    partyAlignment = {
      withParty,
      againstParty: totalComparableVotes - withParty,
      alignmentRate: totalComparableVotes > 0 ? (withParty / totalComparableVotes) * 100 : 0,
    };
  }

  return {
    totalVotes,
    attendanceRate: Math.round(attendanceRate * 100) / 100,
    positions,
    partyAlignment,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  logger.info('Voting record API called', { bioguideId });

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const congress = parseInt(searchParams.get('congress') || '119');

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  try {
    // Get representative information to determine chamber
    const enhancedRep = await getEnhancedRepresentative(bioguideId);

    if (!enhancedRep) {
      return NextResponse.json({ error: 'Representative not found' }, { status: 404 });
    }

    const chamber = enhancedRep.chamber || 'House';
    const memberParty = enhancedRep.party;

    logger.info('Processing voting record request', {
      bioguideId,
      chamber,
      congress,
      limit,
      memberName: enhancedRep.fullName?.official,
    });

    // Fetch voting records based on chamber
    let votingRecords: VotingRecord[] = [];

    if (chamber === 'House') {
      // Use House Roll Call API for House members
      const houseVotes = await congressRollCallAPI.getMemberVotingHistory(
        bioguideId,
        congress,
        1, // Session 1
        limit
      );

      // Transform House votes to our format
      votingRecords = houseVotes.map(vote => ({
        voteId: vote.voteId,
        bill: {
          number: vote.bill
            ? `${vote.bill.type.toUpperCase()}. ${vote.bill.number}`
            : `Roll Call ${vote.rollCallNumber}`,
          title: vote.bill?.title || vote.question,
          congress: vote.bill?.congress.toString() || congress.toString(),
          type: vote.bill?.type || 'rollcall',
          url: vote.bill?.url,
        },
        question: vote.question,
        result: vote.result,
        date: vote.date,
        position: vote.position,
        chamber: 'House' as const,
        rollNumber: vote.rollCallNumber,
        isKeyVote: isKeyVote(vote.bill?.title || vote.question),
        category: categorizeBill(vote.bill?.title || vote.question),
        metadata: {
          sourceUrl: `https://api.congress.gov/v3/house-roll-call-vote/${congress}/1/${vote.rollCallNumber}`,
          lastUpdated: new Date().toISOString(),
          confidence: 'high',
        },
      }));
    } else {
      // Use enhanced Congress data service for Senate members
      const { enhancedCongressDataService } = await import(
        '@/features/representatives/services/enhanced-congress-data-service'
      );
      const senateVotes = await enhancedCongressDataService.getSenateVotes(congress, 1, limit);

      // Transform to VotingRecord format and filter for this member
      for (const vote of senateVotes) {
        if (vote.memberVotes) {
          const memberVote = vote.memberVotes.find(mv => mv.bioguideId === bioguideId);
          if (memberVote) {
            const votingRecord: VotingRecord = {
              voteId: vote.voteId,
              bill: vote.bill
                ? {
                    number: `${vote.bill.type.toUpperCase()}. ${vote.bill.number}`,
                    title: vote.bill.title,
                    congress: vote.bill.congress.toString(),
                    type: vote.bill.type,
                    url: vote.bill.url,
                  }
                : {
                    number: `Senate Vote ${vote.rollCallNumber}`,
                    title: vote.question,
                    congress: congress.toString(),
                    type: 'senate-vote',
                  },
              question: vote.question,
              result: vote.result,
              date: vote.date,
              position: memberVote.position,
              chamber: 'Senate' as const,
              rollNumber: vote.rollCallNumber,
              isKeyVote: isKeyVote(vote.bill?.title || vote.question),
              category: categorizeBill(vote.bill?.title || vote.question),
              metadata: {
                sourceUrl: vote.metadata.sourceUrl,
                lastUpdated: new Date().toISOString(),
                confidence: 'high',
              },
            };
            votingRecords.push(votingRecord);
          }
        }
      }
    }

    // Calculate voting statistics
    const statistics = calculateVotingStatistics(votingRecords, memberParty);

    logger.info('Voting records retrieved successfully', {
      bioguideId,
      chamber,
      recordsFound: votingRecords.length,
      attendanceRate: statistics.attendanceRate,
    });

    return NextResponse.json({
      member: {
        bioguideId,
        name: enhancedRep.fullName?.official || enhancedRep.name,
        chamber,
        party: memberParty,
        congress,
      },
      votingRecords,
      statistics,
      metadata: {
        totalRecords: votingRecords.length,
        congress,
        session: 1,
        dataSource: chamber === 'House' ? 'congress.gov-rollcall-api' : 'senate.gov-xml',
        lastUpdated: new Date().toISOString(),
        cacheStatus: `Real ${chamber} voting records for 119th Congress`,
      },
    });
  } catch (error) {
    logger.error(
      'Voting record API error',
      error instanceof Error ? error : new Error(String(error)),
      { bioguideId }
    );

    return NextResponse.json(
      {
        error: 'Failed to fetch voting records',
        member: {
          bioguideId,
        },
        votingRecords: [],
        statistics: {
          totalVotes: 0,
          attendanceRate: 0,
          positions: { yea: 0, nay: 0, present: 0, notVoting: 0 },
        },
        metadata: {
          totalRecords: 0,
          dataSource: 'error',
          lastUpdated: new Date().toISOString(),
          cacheStatus: 'Error occurred while fetching voting records',
        },
      },
      { status: 500 }
    );
  }
}
