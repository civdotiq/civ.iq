/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AdvancedGDELTService } from '@/lib/services/gdelt/AdvancedGDELTService';
import logger from '@/lib/logging/simple-logger';
import type { EnhancedRepresentative } from '@/types/representative';
import type { GDELTTrendingTopic } from '@/types/gdelt';

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

export const dynamic = 'force-dynamic';

interface TrendingResponse {
  trending: GDELTTrendingTopic[];
  representative: {
    bioguideId: string;
    name: string;
    state: string;
    chamber: string;
  };
  analysis: {
    totalTopics: number;
    timeframe: string;
    topTrendingTopic?: string;
    averageTrendScore: number;
  };
  dataSource: 'gdelt-advanced' | 'fallback';
  cacheStatus?: string;
}

const advancedGDELTService = new AdvancedGDELTService({
  timeout: 30000,
  retryAttempts: 3,
  retryDelayMs: 1000,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const { searchParams } = request.nextUrl;
  const timeframe = searchParams.get('timeframe') || '7days';
  const minMentions = parseInt(searchParams.get('minMentions') || '3');

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  try {
    // Get representative info
    const repResponse = await fetch(`${request.nextUrl.origin}/api/representative/${bioguideId}`);

    if (!repResponse.ok) {
      return NextResponse.json({ error: 'Representative not found' }, { status: 404 });
    }

    const repData = await repResponse.json();
    const representative = repData.representative as EnhancedRepresentative;

    logger.info(
      'Analyzing trending topics for representative',
      {
        bioguideId,
        representativeName: representative.name,
        timeframe,
        minMentions,
        operation: 'trending_analysis',
      },
      request
    );

    // Analyze trending topics
    const trendingResult = await advancedGDELTService.analyzeTrendingTopics(representative, {
      minMentions,
      trendingWindow: timeframe,
      compareToBaseline: true,
    });

    if (trendingResult.data) {
      // Calculate analysis metrics
      const trending = trendingResult.data;
      const totalTopics = trending.length;
      const topTrendingTopic = trending.length > 0 ? trending[0]?.topic : undefined;
      const averageTrendScore =
        trending.length > 0
          ? trending.reduce((sum, topic) => sum + topic.trendScore, 0) / trending.length
          : 0;

      const response: TrendingResponse = {
        trending,
        representative: {
          bioguideId: representative.bioguideId,
          name: representative.name,
          state: representative.state,
          chamber: representative.chamber,
        },
        analysis: {
          totalTopics,
          timeframe,
          topTrendingTopic,
          averageTrendScore: Math.round(averageTrendScore * 100) / 100,
        },
        dataSource: 'gdelt-advanced',
        cacheStatus: 'Live trending analysis from GDELT data',
      };

      logger.info(
        'Trending analysis completed',
        {
          bioguideId,
          totalTopics,
          topTrendingTopic,
          averageTrendScore: response.analysis.averageTrendScore,
          operation: 'trending_analysis_complete',
        },
        request
      );

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800', // 15 min cache
        },
      });
    } else {
      // Fallback response
      logger.warn(
        'No trending topics found',
        {
          bioguideId,
          representativeName: representative.name,
          timeframe,
          operation: 'trending_analysis_empty',
        },
        request
      );

      const response: TrendingResponse = {
        trending: [],
        representative: {
          bioguideId: representative.bioguideId,
          name: representative.name,
          state: representative.state,
          chamber: representative.chamber,
        },
        analysis: {
          totalTopics: 0,
          timeframe,
          averageTrendScore: 0,
        },
        dataSource: 'fallback',
        cacheStatus: 'No trending topics currently available',
      };

      return NextResponse.json(response);
    }
  } catch (error) {
    logger.error(
      'Trending topics API error',
      error as Error,
      {
        bioguideId,
        timeframe,
        minMentions,
        operation: 'trending_api_error',
      },
      request
    );

    const errorResponse: TrendingResponse = {
      trending: [],
      representative: {
        bioguideId,
        name: 'Unknown',
        state: 'Unknown',
        chamber: 'Unknown',
      },
      analysis: {
        totalTopics: 0,
        timeframe,
        averageTrendScore: 0,
      },
      dataSource: 'fallback',
      cacheStatus: 'API temporarily unavailable',
    };

    return NextResponse.json(errorResponse, { status: 200 }); // Return 200 to avoid breaking UI
  }
}
