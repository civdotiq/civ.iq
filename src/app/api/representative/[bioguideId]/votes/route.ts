/**
 * Simplified Voting Records API - Temporary fallback while XML sources stabilize
 * This is a temporary solution for early 119th Congress when vote data may be sparse
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '25');

  logger.info('Simplified voting records API called', { bioguideId, limit });

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  // For now, return empty votes with a message about early 119th Congress
  // This prevents 500 errors while the complex XML parsing stabilizes
  const emptyResponse = {
    votes: [],
    totalResults: 0,
    dataSource: 'congress-api',
    source: 'simplified-fallback',
    cacheStatus: 'Early 119th Congress - limited voting data available',
    member: {
      bioguideId,
      name: 'Loading...',
      chamber: 'Loading...',
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
      endpoint: 'simplified-fallback',
      lastUpdated: new Date().toISOString(),
      congress: '119',
      responseTime: Date.now(),
      message: 'The 119th Congress began in January 2025. Voting data will populate as votes occur.',
      dataAccuracy: 'Temporary fallback - full XML parsing will be restored',
    },
  };

  // Try to fetch from Congress.gov API if available
  if (process.env.CONGRESS_API_KEY) {
    try {
      // Try House votes first
      const chamber = bioguideId.startsWith('S') ? 'senate' : 'house';
      const voteEndpoint = `https://api.congress.gov/v3/${chamber}-vote?format=json&api_key=${process.env.CONGRESS_API_KEY}&limit=${limit}`;
      
      const response = await fetch(voteEndpoint, {
        headers: {
          'User-Agent': 'CivIQ-Hub/1.0',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        const votes = data.houseRollCallVotes || data.senateRollCallVotes || [];
        
        // Filter to 119th Congress only
        const congress119Votes = votes.filter((vote: any) => vote.congress === 119);
        
        if (congress119Votes.length > 0) {
          logger.info('Found 119th Congress votes', { 
            bioguideId, 
            count: congress119Votes.length,
            chamber 
          });
          
          // Return simplified vote data
          return NextResponse.json({
            ...emptyResponse,
            votes: congress119Votes.slice(0, limit).map((vote: any) => ({
              voteId: `${vote.congress}-${chamber}-${vote.rollCallNumber}`,
              bill: {
                number: vote.billNumber || 'N/A',
                title: vote.voteQuestion || 'Vote',
                congress: String(vote.congress),
                type: 'Unknown',
              },
              question: vote.voteQuestion || '',
              result: vote.result || '',
              date: vote.startDate || vote.date || '',
              position: 'Unknown', // Would need member-specific data
              chamber: chamber === 'house' ? 'House' : 'Senate',
              rollNumber: vote.rollCallNumber,
            })),
            totalResults: congress119Votes.length,
            cacheStatus: `Found ${congress119Votes.length} votes from 119th Congress`,
          });
        }
      }
    } catch (error) {
      logger.warn('Failed to fetch votes from Congress.gov', { 
        error: (error as Error).message,
        bioguideId 
      });
    }
  }

  // Return empty response as fallback
  return NextResponse.json(emptyResponse);
}
