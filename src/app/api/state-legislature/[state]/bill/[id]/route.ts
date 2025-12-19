/**
 * State Bill Details API Route
 * GET /api/state-legislature/[state]/bill/[id]
 * Returns full bill details including abstract, sponsors, actions, and votes
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import { decodeBase64Url } from '@/lib/url-encoding';
import logger from '@/lib/logging/simple-logger';
import { analyzeBillProgress } from '@/lib/bill-progress';
import type { StateBillApiResponse } from '@/types/state-legislature';

export const runtime = 'edge';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ state: string; id: string }> }
) {
  const startTime = Date.now();
  const { state, id } = await context.params;

  try {
    // Decode Base64 bill ID to OCD format
    const billId = decodeBase64Url(id);

    logger.info(`[StateBillAPI] Fetching bill: ${state}/${billId}`);

    // Get bill from core service
    const bill = await StateLegislatureCoreService.getStateBillById(state, billId);

    if (!bill) {
      logger.warn(`[StateBillAPI] Bill not found: ${state}/${billId}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Bill not found',
          metadata: {
            cacheHit: false,
            responseTime: Date.now() - startTime,
          },
        } as StateBillApiResponse,
        { status: 404 }
      );
    }

    // Analyze bill progress for tracking and visualization
    const progress = analyzeBillProgress(bill);

    logger.info(`[StateBillAPI] Successfully fetched bill: ${bill.identifier}`, {
      state,
      billId: bill.id,
      hasAbstract: !!bill.abstract,
      sponsorCount: bill.sponsorships.length,
      actionCount: bill.actions.length,
      voteCount: bill.votes.length,
      currentStage: progress.currentStage,
      percentComplete: progress.percentComplete,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      bill,
      progress,
      metadata: {
        cacheHit: false,
        responseTime: Date.now() - startTime,
      },
    } as StateBillApiResponse);
  } catch (error) {
    logger.error(`[StateBillAPI] Error fetching bill:`, error as Error, {
      state,
      id,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bill',
        metadata: {
          cacheHit: false,
          responseTime: Date.now() - startTime,
        },
      } as StateBillApiResponse,
      { status: 500 }
    );
  }
}
