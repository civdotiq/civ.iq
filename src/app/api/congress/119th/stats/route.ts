/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

// Force recompilation - updated to serve pre-built JSON data

// Response interface for Congress statistics
interface CongressStatsResponse {
  success: boolean;
  statistics?: {
    total: {
      members: number;
      house: number;
      senate: number;
    };
    byParty: {
      democrat: {
        total: number;
        house: number;
        senate: number;
      };
      republican: {
        total: number;
        house: number;
        senate: number;
      };
      independent: {
        total: number;
        house: number;
        senate: number;
      };
    };
    byState: {
      totalStates: number;
      representationCounts: Record<string, number>;
    };
    demographics: {
      averageAge?: number;
      genderDistribution?: {
        male: number;
        female: number;
        unknown: number;
      };
    };
    session: {
      congress: string;
      period: string;
      startDate: string;
      endDate: string;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: {
    timestamp: string;
    dataSource: string;
    cacheable: boolean;
    processingTime?: number;
    originalBuildTime?: string;
    generatedBy?: string;
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  logger.info('Congress statistics API request started (serving pre-built data)');

  try {
    // Check for optional chamber filter
    const { searchParams } = request.nextUrl;
    const chamber = searchParams.get('chamber'); // 'house', 'senate', or null for all

    logger.info('Request parameters', { chamber });

    // Get base URL from request headers for fetching static files
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Fetch pre-built statistics from public directory
    const statsFileUrl = `${baseUrl}/data/congress-stats.json`;

    let statsData;
    try {
      logger.debug('Fetching congress stats from URL', { url: statsFileUrl });
      const response = await fetch(statsFileUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      statsData = await response.json();
    } catch (fileError) {
      logger.error('Failed to fetch congress statistics file', {
        url: statsFileUrl,
        error: fileError,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'STATS_FILE_NOT_FOUND',
            message: 'Congress statistics file not found. Please run npm run seed-data.',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            dataSource: 'pre-built-file',
            cacheable: false,
            processingTime: Date.now() - startTime,
          },
        } as CongressStatsResponse,
        { status: 404 }
      );
    }

    if (!statsData.success || !statsData.statistics) {
      logger.warn('Invalid statistics data in file');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATS_DATA',
            message: 'Invalid statistics data format',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            dataSource: 'pre-built-file',
            cacheable: false,
            processingTime: Date.now() - startTime,
          },
        } as CongressStatsResponse,
        { status: 500 }
      );
    }

    let responseStats = statsData.statistics;

    // Apply chamber filter if specified
    if (chamber && chamber !== 'all') {
      const chamberLower = chamber.toLowerCase();
      if (chamberLower === 'house' || chamberLower === 'senate') {
        responseStats = {
          ...responseStats,
          total: {
            members: responseStats.total[chamberLower],
            house: responseStats.total.house,
            senate: responseStats.total.senate,
          },
          byParty: {
            democrat: {
              ...responseStats.byParty.democrat,
              total: responseStats.byParty.democrat[chamberLower],
            },
            republican: {
              ...responseStats.byParty.republican,
              total: responseStats.byParty.republican[chamberLower],
            },
            independent: {
              ...responseStats.byParty.independent,
              total: responseStats.byParty.independent[chamberLower],
            },
          },
        };
      }
    }

    logger.info('Statistics served successfully', {
      totalMembers: responseStats.total.members,
      chamber: chamber || 'all',
      source: 'pre-built-file',
    });

    const response: CongressStatsResponse = {
      success: true,
      statistics: responseStats,
      metadata: {
        timestamp: new Date().toISOString(),
        dataSource: 'pre-built-file',
        cacheable: true,
        processingTime: Date.now() - startTime,
        originalBuildTime: statsData.metadata?.timestamp,
        generatedBy: statsData.metadata?.generatedBy || 'unknown',
      },
    };

    // Set cache headers for 1 hour (data is pre-built and stable)
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    logger.error('Error serving Congress statistics:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to serve Congress statistics',
          details: process.env.NODE_ENV === 'development' ? error : undefined,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          dataSource: 'pre-built-file',
          cacheable: false,
          processingTime: Date.now() - startTime,
        },
      } as CongressStatsResponse,
      { status: 500 }
    );
  }
}
