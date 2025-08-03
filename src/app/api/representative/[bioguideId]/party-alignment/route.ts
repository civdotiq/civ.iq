/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { structuredLogger } from '@/lib/logging/logger';

interface PartyAlignment {
  overall_alignment: number;
  party_loyalty_score: number;
  bipartisan_votes: number;
  total_votes_analyzed: number;
  recent_alignment: number;
  alignment_trend: 'increasing' | 'decreasing' | 'stable';
  key_departures: Array<{
    bill_number: string;
    bill_title: string;
    vote_date: string;
    representative_position: string;
    party_majority_position: string;
    significance: 'high' | 'medium' | 'low';
  }>;
  voting_patterns: {
    with_party: number;
    against_party: number;
    bipartisan: number;
    absent: number;
  };
  comparison_to_peers: {
    state_avg_alignment: number;
    party_avg_alignment: number;
    chamber_avg_alignment: number;
  };
}

// Get party alignment data based on legislative activity and voting patterns
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const startTime = Date.now();

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  try {
    // Use cached fetch for better performance
    const alignmentData = await cachedFetch(
      `party-alignment-${bioguideId}`,
      async () => {
        const fetchStartTime = Date.now();

        // Get representative info from congress.service
        structuredLogger.info('Fetching representative data', { bioguideId });
        const repStartTime = Date.now();
        let representative = null;

        try {
          const { getEnhancedRepresentative } = await import(
            '@/features/representatives/services/congress.service'
          );
          representative = await getEnhancedRepresentative(bioguideId);

          if (!representative) {
            throw new Error('Representative not found');
          }

          structuredLogger.info('Representative data fetched', {
            bioguideId,
            duration: Date.now() - repStartTime,
          });
        } catch (error) {
          structuredLogger.warn('Could not fetch representative data, using defaults', {
            bioguideId,
            error: (error as Error).message,
          });
          // Continue with empty representative data
        }

        // Skip fetching votes for now since analyzePartyAlignment mostly generates mock data
        // This dramatically improves performance from 65+ seconds to <1 second
        structuredLogger.info('Skipping votes fetch for performance - using mock analysis', {
          bioguideId,
        });
        const votesData = { votes: [] };

        // Analyze party alignment based on sponsorship/cosponsorship patterns
        const analysisStartTime = Date.now();
        const partyAlignment = analyzePartyAlignment(representative, votesData.votes);
        structuredLogger.info('Party alignment analyzed', {
          bioguideId,
          analysisDuration: Date.now() - analysisStartTime,
          totalDuration: Date.now() - fetchStartTime,
        });

        return partyAlignment;
      },
      30 * 60 * 1000 // 30 minutes cache
    );

    const totalDuration = Date.now() - startTime;
    structuredLogger.info('Party alignment endpoint completed', {
      bioguideId,
      totalDuration,
      cached: totalDuration < 100, // If it's under 100ms, it was likely cached
    });

    return NextResponse.json(alignmentData);
  } catch (error) {
    structuredLogger.error('Error calculating party alignment', error as Error, { bioguideId });

    // Return unavailable response instead of mock data
    return NextResponse.json({
      overall_alignment: 0,
      party_loyalty_score: 0,
      bipartisan_votes: 0,
      total_votes_analyzed: 0,
      recent_alignment: 0,
      alignment_trend: 'stable' as const,
      key_departures: [],
      voting_patterns: {
        with_party: 0,
        against_party: 0,
        bipartisan: 0,
        absent: 0,
      },
      comparison_to_peers: {
        state_avg_alignment: 0,
        party_avg_alignment: 0,
        chamber_avg_alignment: 0,
      },
      metadata: {
        dataSource: 'unavailable',
        note: 'Party alignment analysis is currently unavailable. This feature requires comprehensive voting record data from Congress.gov.',
      },
    });
  }
}

function analyzePartyAlignment(_representative: unknown, _votes: unknown[]): PartyAlignment {
  // No mock data generation - return unavailable response
  structuredLogger.info('Party alignment analysis requires real voting data from Congress.gov');

  return {
    overall_alignment: 0,
    party_loyalty_score: 0,
    bipartisan_votes: 0,
    total_votes_analyzed: 0,
    recent_alignment: 0,
    alignment_trend: 'stable',
    key_departures: [],
    voting_patterns: {
      with_party: 0,
      against_party: 0,
      bipartisan: 0,
      absent: 0,
    },
    comparison_to_peers: {
      state_avg_alignment: 0,
      party_avg_alignment: 0,
      chamber_avg_alignment: 0,
    },
  };
}
