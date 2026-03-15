/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Dataset Generator Cron Job
 *
 * Pre-generates the campaign finance dataset by fetching FEC totals
 * for every member of Congress and caching the result in Redis.
 * Runs daily at 2am ET via Vercel Cron (before other crons).
 *
 * The campaign finance dataset takes too long to generate on-demand
 * (~535 FEC API calls) so we pre-generate it in the background.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCampaignFinanceOnDemand } from '@/lib/datasets/generators/campaign-finance';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Verify cron authentication
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logger.info('Starting dataset generator cron job', {
    operation: 'dataset_generator_cron',
  });

  try {
    const result = await generateCampaignFinanceOnDemand();
    const totalTime = Date.now() - startTime;

    logger.info('Dataset generator cron job completed', {
      recordCount: result.metadata.recordCount,
      totalTime,
      operation: 'dataset_generator_cron',
    });

    return NextResponse.json({
      success: true,
      message: 'Campaign finance dataset generated and cached',
      recordCount: result.metadata.recordCount,
      totalTime,
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;

    logger.error('Dataset generator cron job failed', error as Error, {
      totalTime,
      operation: 'dataset_generator_cron',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Dataset generation failed',
        message: (error as Error).message,
        totalTime,
      },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return POST(request);
}
