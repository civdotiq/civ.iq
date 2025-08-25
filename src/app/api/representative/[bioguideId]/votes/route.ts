/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Voting Records API - 119th Congress Only
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import logger from '@/lib/logging/simple-logger';

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
  position: 'Yea' | 'Nay' | 'Not Voting' | 'Present' | 'Unknown';
  chamber: 'House' | 'Senate';
  rollNumber?: number;
  isKeyVote?: boolean;
  description?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');

  logger.info('Voting records API called', { bioguideId, limit });

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  if (!process.env.CONGRESS_API_KEY) {
    logger.error('Congress.gov API key not configured');
    return NextResponse.json({ error: 'Congress.gov API key not configured' }, { status: 500 });
  }

  try {
    // Determine member's chamber
    const enhancedRep = await getEnhancedRepresentative(bioguideId);
    const chamber = enhancedRep?.chamber || (bioguideId.startsWith('S') ? 'Senate' : 'House');
    const memberName = enhancedRep?.name || 'Unknown';

    logger.info('Fetching votes for member', { bioguideId, chamber, memberName });

    const votes: Vote[] = [];

    if (chamber === 'House') {
      // Fetch House votes from Congress.gov API
      const houseUrl = `https://api.congress.gov/v3/house-vote?format=json&api_key=${process.env.CONGRESS_API_KEY}&limit=500`;
      
      const response = await fetch(houseUrl, {
        headers: { 'User-Agent': 'CivIQ-Hub/2.0' },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        const houseVotes = data.houseRollCallVotes || [];
        
        // Filter to ONLY 119th Congress
        const congress119Votes = houseVotes.filter((vote: any) => {
          const congress = vote.congress || 0;
          return congress === 119;
        });

        logger.info('Filtered House votes', {
          totalFetched: houseVotes.length,
          congress119Count: congress119Votes.length,
          sampleCongresses: houseVotes.slice(0, 5).map((v: any) => v.congress),
        });

        // Transform House votes
        congress119Votes.slice(0, limit).forEach((vote: any) => {
          votes.push({
            voteId: `119-house-${vote.rollCallNumber}`,
            bill: {
              number: vote.billNumber || 'N/A',
              title: vote.voteQuestion || vote.question || 'House Vote',
              congress: '119',
              type: vote.billType || 'Unknown',
              url: vote.url,
            },
            question: vote.voteQuestion || vote.question || '',
            result: vote.voteResult || vote.result || '',
            date: vote.startDate || vote.date || '',
            position: 'Unknown', // Would need member-specific XML parsing
            chamber: 'House',
            rollNumber: vote.rollCallNumber,
            description: vote.voteDescription || vote.voteQuestion,
          });
        });
      }
    } else {
      // Fetch Senate votes - try different endpoints
      // First try the senate-vote endpoint (might exist in Congress.gov)
      try {
        const senateUrl = `https://api.congress.gov/v3/senate-vote?format=json&api_key=${process.env.CONGRESS_API_KEY}&limit=500`;
        
        const response = await fetch(senateUrl, {
          headers: { 'User-Agent': 'CivIQ-Hub/2.0' },
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const data = await response.json();
          const senateVotes = data.senateRollCallVotes || [];
          
          // Filter to ONLY 119th Congress
          const congress119Votes = senateVotes.filter((vote: any) => {
            const congress = vote.congress || 0;
            return congress === 119;
          });

          logger.info('Filtered Senate votes from Congress.gov', {
            totalFetched: senateVotes.length,
            congress119Count: congress119Votes.length,
          });

          // Transform Senate votes
          congress119Votes.slice(0, limit).forEach((vote: any) => {
            votes.push({
              voteId: `119-senate-${vote.rollCallNumber}`,
              bill: {
                number: vote.billNumber || 'N/A',
                title: vote.voteQuestion || vote.question || 'Senate Vote',
                congress: '119',
                type: vote.billType || 'Unknown',
                url: vote.url,
              },
              question: vote.voteQuestion || vote.question || '',
              result: vote.voteResult || vote.result || '',
              date: vote.startDate || vote.date || '',
              position: 'Unknown', // Would need member-specific XML parsing
              chamber: 'Senate',
              rollNumber: vote.rollCallNumber,
              description: vote.voteDescription || vote.voteQuestion,
            });
          });
        }
      } catch (senateError) {
        logger.warn('Senate-vote endpoint failed, trying member endpoint', {
          error: (senateError as Error).message,
        });
      }

      // If no Senate votes yet, try the member voting record endpoint as fallback
      if (votes.length === 0) {
        try {
          const memberVotesUrl = `https://api.congress.gov/v3/member/${bioguideId}/voting-record?format=json&api_key=${process.env.CONGRESS_API_KEY}&limit=500`;
          
          const response = await fetch(memberVotesUrl, {
            headers: { 'User-Agent': 'CivIQ-Hub/2.0' },
            signal: AbortSignal.timeout(10000),
          });

          if (response.ok) {
            const data = await response.json();
            const memberVotes = data.votes || [];
            
            // Filter to ONLY 119th Congress
            const congress119Votes = memberVotes.filter((vote: any) => {
              // Parse congress from various possible fields
              const congress = vote.congress || 
                              (vote.bill && vote.bill.congress) || 
                              (vote.date && vote.date.startsWith('2025') ? 119 : 0) ||
                              0;
              return congress === 119 || vote.date?.startsWith('2025');
            });

            logger.info('Filtered member votes', {
              bioguideId,
              totalFetched: memberVotes.length,
              congress119Count: congress119Votes.length,
            });

            // Transform member votes
            congress119Votes.slice(0, limit).forEach((vote: any) => {
              votes.push({
                voteId: vote.voteId || `119-${chamber.toLowerCase()}-${vote.rollCall || vote.rollCallNumber || 'unknown'}`,
                bill: {
                  number: vote.billNumber || vote.bill?.number || 'N/A',
                  title: vote.description || vote.question || vote.bill?.title || 'Vote',
                  congress: '119',
                  type: vote.billType || vote.bill?.type || 'Unknown',
                  url: vote.url || vote.bill?.url,
                },
                question: vote.question || vote.description || '',
                result: vote.result || '',
                date: vote.date || '',
                position: vote.position || vote.memberVote || 'Unknown',
                chamber: chamber as 'House' | 'Senate',
                rollNumber: vote.rollCall || vote.rollCallNumber,
                description: vote.description,
              });
            });
          }
        } catch (memberError) {
          logger.warn('Member voting-record endpoint failed', {
            bioguideId,
            error: (memberError as Error).message,
          });
        }
      }
    }

    // Sort by date (most recent first)
    const sortedVotes = votes.sort((a, b) => {
      const dateA = new Date(a.date || '2025-01-01').getTime();
      const dateB = new Date(b.date || '2025-01-01').getTime();
      return dateB - dateA;
    });

    logger.info('Returning votes', {
      bioguideId,
      chamber,
      totalVotes: sortedVotes.length,
      dates: sortedVotes.slice(0, 3).map(v => v.date),
    });

    // Calculate voting patterns
    const votingPattern = {
      yes: sortedVotes.filter(v => v.position === 'Yea').length,
      no: sortedVotes.filter(v => v.position === 'Nay').length,
      present: sortedVotes.filter(v => v.position === 'Present').length,
      notVoting: sortedVotes.filter(v => v.position === 'Not Voting').length,
    };

    return NextResponse.json({
      votes: sortedVotes,
      totalResults: sortedVotes.length,
      dataSource: 'congress-api',
      source: '119th-congress-only',
      cacheStatus: sortedVotes.length > 0 ? 'success' : 'no-votes-found',
      member: {
        bioguideId,
        name: memberName,
        chamber,
      },
      votingPattern,
      partyAlignment: {
        withParty: 0,
        againstParty: 0,
        percentage: 0,
      },
      recentVotes: sortedVotes.slice(0, 10).map(vote => ({
        date: vote.date,
        billNumber: vote.bill.number,
        description: vote.bill.title || vote.question,
        vote: vote.position,
        result: vote.result,
        chamber: vote.chamber,
        rollNumber: vote.rollNumber,
      })),
      totalVotes: sortedVotes.length,
      metadata: {
        dataSource: 'congress-api',
        endpoint: '119th-congress-votes',
        lastUpdated: new Date().toISOString(),
        congress: '119',
        responseTime: Date.now(),
        message: sortedVotes.length > 0 
          ? `Found ${sortedVotes.length} votes from 119th Congress`
          : 'No 119th Congress votes found for this member',
      },
    });
  } catch (error) {
    logger.error('Voting records API error', error as Error, { bioguideId });

    return NextResponse.json(
      {
        votes: [],
        totalResults: 0,
        dataSource: 'error',
        source: 'error',
        cacheStatus: 'Error fetching voting data',
        message: 'An error occurred while fetching voting records',
        member: {
          bioguideId,
          name: 'Unknown',
          chamber: 'Unknown',
        },
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
          dataSource: 'congress-api',
          endpoint: 'error',
          lastUpdated: new Date().toISOString(),
          congress: '119',
          responseTime: Date.now(),
          error: (error as Error).message,
        },
      },
      { status: 500 }
    );
  }
}
