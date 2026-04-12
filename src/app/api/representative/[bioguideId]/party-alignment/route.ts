/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { analyzePartyLineAlignment } from '@/lib/intelligence/analyzers/party-line-analyzer';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;

// Get party alignment data using the real party-line analyzer
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
    const insight = await analyzePartyLineAlignment(bioguideId);

    if (!insight) {
      logger.info('Party alignment unavailable (Independent or insufficient data)', { bioguideId });
      return NextResponse.json(
        {
          overall_alignment: 0,
          votes_with_party: 0,
          votes_against_party: 0,
          total_votes_analyzed: 0,
          metadata: {
            dataSource: 'unavailable',
            note:
              'Party alignment analysis is unavailable for this representative. ' +
              'This may be because they are Independent, have insufficient voting data, ' +
              'or no qualifying roll calls were found.',
          },
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          },
        }
      );
    }

    logger.info('Party alignment endpoint completed', {
      bioguideId,
      totalDuration: Date.now() - startTime,
      alignmentRate: insight.alignmentRate,
      votesAnalyzed: insight.votesAnalyzed,
    });

    return NextResponse.json(
      {
        overall_alignment: Math.round(insight.alignmentRate * 1000) / 10,
        votes_with_party: insight.votesWithParty,
        votes_against_party: insight.votesAgainstParty,
        total_votes_analyzed: insight.votesAnalyzed,
        peer_average_alignment: Math.round(insight.peerAverageAlignment * 1000) / 10,
        peer_count: insight.peerCount,
        confidence: Math.round(insight.confidence * 100) / 100,
        data_as_of: insight.dataAsOf,
        methodology: insight.methodology,
        disclaimer: insight.disclaimer,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    logger.error('Error calculating party alignment', error as Error, { bioguideId });

    return NextResponse.json(
      {
        overall_alignment: 0,
        votes_with_party: 0,
        votes_against_party: 0,
        total_votes_analyzed: 0,
        metadata: {
          dataSource: 'unavailable',
          note:
            'Party alignment analysis is currently unavailable. ' +
            'This feature requires comprehensive voting record data from Congress.gov.',
        },
      },
      { status: 500 }
    );
  }
}
