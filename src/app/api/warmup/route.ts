/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextResponse } from 'next/server';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { structuredLogger } from '@/lib/logging/logger';
import { getFileCache } from '@/lib/cache/file-cache';

/**
 * Warmup endpoint to pre-fetch and cache critical data
 * This can be called on server startup or periodically to keep caches warm
 */
export async function GET() {
  const startTime = Date.now();
  const results = {
    success: true,
    cached: [] as string[],
    errors: [] as string[],
    duration: 0,
  };

  try {
    structuredLogger.info('Starting warmup process...');

    // Pre-fetch congress legislators data
    try {
      structuredLogger.info('Pre-fetching congress legislators data...');
      const representatives = await getAllEnhancedRepresentatives();
      if (representatives.length > 0) {
        results.cached.push(`congress-legislators (${representatives.length} members)`);
        structuredLogger.info('Congress legislators data cached successfully', {
          count: representatives.length,
        });
      }
    } catch (error) {
      structuredLogger.error('Failed to cache congress legislators', error as Error);
      results.errors.push('congress-legislators');
    }

    // Check file cache stats
    const fileCache = getFileCache();
    const cacheStats = await fileCache.getStats();
    structuredLogger.info('File cache statistics', cacheStats);

    results.duration = Date.now() - startTime;

    if (results.errors.length > 0) {
      results.success = false;
    }

    structuredLogger.info('Warmup process completed', {
      duration: results.duration,
      cached: results.cached.length,
      errors: results.errors.length,
    });

    return NextResponse.json(results, {
      status: results.success ? 200 : 207, // 207 Multi-Status if partial success
    });
  } catch (error) {
    structuredLogger.error('Warmup process failed', error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Warmup process failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
