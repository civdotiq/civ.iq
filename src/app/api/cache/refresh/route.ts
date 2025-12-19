/**
 * Manual Cache Refresh Endpoint
 * Allows manual triggering of background cache refresh
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  quickRefresh,
  fullRefresh,
  refreshRepresentativesCache,
} from '@/services/cache/background-refresh';
import logger from '@/lib/logging/simple-logger';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const refreshType = searchParams.get('type') || 'quick';
    const bioguideIds = searchParams.get('bioguideIds')?.split(',');

    logger.info(`Manual cache refresh triggered: ${refreshType}`, {
      bioguideIds: bioguideIds?.length || 'default',
      userAgent: req.headers.get('user-agent'),
    });

    let result;

    switch (refreshType) {
      case 'quick':
        result = await quickRefresh(bioguideIds);
        break;

      case 'full':
        result = await fullRefresh(bioguideIds);
        break;

      case 'custom':
        const includeBills = searchParams.get('includeBills') === 'true';
        const includeFinance = searchParams.get('includeFinance') === 'true';
        const maxConcurrent = parseInt(searchParams.get('maxConcurrent') || '2');
        const delay = parseInt(searchParams.get('delay') || '1000');

        result = await refreshRepresentativesCache(bioguideIds, {
          maxConcurrent,
          delay,
          includeBills,
          includeFinance,
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid refresh type. Use: quick, full, or custom' },
          { status: 400 }
        );
    }

    logger.info('Manual cache refresh completed', {
      type: refreshType,
      ...result,
    });

    return NextResponse.json({
      success: true,
      refreshType,
      ...result,
      message: `Cache refresh completed: ${result.successful}/${result.totalProcessed} successful`,
    });
  } catch (error) {
    logger.error('Manual cache refresh failed', error as Error);

    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Cache Refresh API',
    usage: {
      'POST ?type=quick': 'Quick refresh (representatives + bills summary, top 5)',
      'POST ?type=full': 'Full refresh (all data types, all representatives)',
      'POST ?type=custom&includeBills=true&includeFinance=false&maxConcurrent=2&delay=1000':
        'Custom refresh with parameters',
      'POST ?type=quick&bioguideIds=K000367,P000612': 'Refresh specific representatives',
    },
    examples: [
      '/api/cache/refresh?type=quick',
      '/api/cache/refresh?type=full',
      '/api/cache/refresh?type=custom&includeBills=true&includeFinance=false&maxConcurrent=3&delay=500',
      '/api/cache/refresh?type=quick&bioguideIds=K000367,P000612,W000805',
    ],
  });
}
