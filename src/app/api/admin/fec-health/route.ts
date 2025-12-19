/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * FEC System Health API Endpoint
 *
 * Provides comprehensive monitoring and optimization data for the FEC mapping system.
 * This endpoint is designed for administrative monitoring and system optimization.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

export async function GET(_request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check if FEC_API_KEY is available at runtime
    const fecApiKey = process.env.FEC_API_KEY;
    if (!fecApiKey) {
      logger.warn('[FEC Health API] FEC_API_KEY not available, returning degraded health report');
      return NextResponse.json({
        status: 'success',
        data: {
          overall: 'needs-attention' as const,
          error: 'FEC_API_KEY not configured',
          message: 'FEC health monitoring is disabled - API key not available',
          timestamp: new Date().toISOString(),
        },
        metadata: {
          endpoint: '/api/admin/fec-health',
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });
    }

    logger.info('[FEC Health API] Generating system health report');

    // Dynamic import only when FEC_API_KEY is available
    const { fecPerformanceMonitor } = await import('@/lib/fec/fec-performance-monitor');

    // Generate comprehensive health report
    const healthReport = await fecPerformanceMonitor.generateSystemHealthReport();

    logger.info('[FEC Health API] System health report completed', {
      overall: healthReport.overall,
      responseTime: Date.now() - startTime,
      recommendationsCount: healthReport.recommendations.length,
    });

    return NextResponse.json({
      status: 'success',
      data: healthReport,
      metadata: {
        endpoint: '/api/admin/fec-health',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('[FEC Health API] Failed to generate health report', {
      error: error instanceof Error ? error.message : String(error),
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to generate FEC system health report',
        message: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          endpoint: '/api/admin/fec-health',
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for validating specific representatives
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { bioguideId } = body;

    if (!bioguideId || typeof bioguideId !== 'string') {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Invalid request',
          message: 'bioguideId is required and must be a string',
        },
        { status: 400 }
      );
    }

    // Check if FEC_API_KEY is available at runtime
    const fecApiKey = process.env.FEC_API_KEY;
    if (!fecApiKey) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'FEC_API_KEY not configured',
          message: 'FEC validation is disabled - API key not available',
        },
        { status: 503 }
      );
    }

    logger.info('[FEC Health API] Validating representative', { bioguideId });

    // Dynamic import only when FEC_API_KEY is available
    const { fecPerformanceMonitor } = await import('@/lib/fec/fec-performance-monitor');

    // Validate specific representative
    const validation = await fecPerformanceMonitor.validateRepresentative(bioguideId);

    logger.info('[FEC Health API] Representative validation completed', {
      bioguideId,
      hasFecMapping: validation.validation.hasFecMapping,
      dataQuality: validation.validation.dataQuality,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json({
      status: 'success',
      data: validation,
      metadata: {
        endpoint: '/api/admin/fec-health',
        method: 'POST',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('[FEC Health API] Failed to validate representative', {
      error: error instanceof Error ? error.message : String(error),
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to validate representative',
        message: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          endpoint: '/api/admin/fec-health',
          method: 'POST',
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
