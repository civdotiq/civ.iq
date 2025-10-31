/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Legislator Bills API
 *
 * GET /api/state-legislature/[state]/legislator/[id]/bills
 * Returns bills sponsored or cosponsored by a specific state legislator.
 */

import { NextRequest, NextResponse } from 'next/server';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string; id: string }> }
) {
  const startTime = Date.now();
  const { searchParams } = request.nextUrl;

  try {
    const { state, id } = await params;
    const legislatorId = id.replace(/:/g, '/'); // Convert colon delimiter back to slash
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const session = searchParams.get('session') || undefined;

    if (!state || !legislatorId) {
      logger.warn('State legislator bills API request missing parameters', {
        state,
        id: legislatorId,
      });
      return NextResponse.json(
        { success: false, error: 'State and legislator ID are required' },
        { status: 400 }
      );
    }

    logger.info('Fetching state legislator bills', {
      state: state.toUpperCase(),
      legislatorId,
      limit,
      session,
    });

    // First, verify the legislator exists
    const legislator = await StateLegislatureCoreService.getStateLegislatorById(
      state.toUpperCase(),
      legislatorId
    );

    if (!legislator) {
      logger.warn('State legislator not found', {
        state: state.toUpperCase(),
        legislatorId,
      });
      return NextResponse.json(
        { success: false, error: 'State legislator not found' },
        { status: 404 }
      );
    }

    // Use efficient server-side sponsor filtering (ONE API call!)
    const legislatorBills = await StateLegislatureCoreService.getStateLegislatorBills(
      state.toUpperCase(),
      legislatorId,
      session,
      limit
    );

    logger.info('State legislator bills request successful', {
      state: state.toUpperCase(),
      legislatorId,
      legislatorName: legislator.name,
      totalBills: legislatorBills.length,
      returnedBills: legislatorBills.length,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        bills: legislatorBills,
        total: legislatorBills.length,
        returned: legislatorBills.length,
        legislator: {
          id: legislator.id,
          name: legislator.name,
          chamber: legislator.chamber,
          district: legislator.district,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('State legislator bills request failed', error as Error, {
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch state legislator bills',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
