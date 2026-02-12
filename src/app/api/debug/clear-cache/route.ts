/**
 * Debug endpoint to clear voting cache
 */
import { NextResponse } from 'next/server';
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import { logger } from '@/lib/logging/logger-edge';

export async function POST() {
  // Block debug endpoint in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    batchVotingService.clearCache();

    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
    });
  } catch (error) {
    logger.error('Error clearing cache', error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear cache',
      },
      { status: 500 }
    );
  }
}
