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
import type { StateBill } from '@/types/state-legislature';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string; id: string }> }
) {
  const startTime = Date.now();
  const { searchParams } = request.nextUrl;

  try {
    const { state, id } = await params;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const session = searchParams.get('session') || undefined;

    if (!state || !id) {
      logger.warn('State legislator bills API request missing parameters', { state, id });
      return NextResponse.json(
        { success: false, error: 'State and legislator ID are required' },
        { status: 400 }
      );
    }

    logger.info('Fetching state legislator bills', {
      state: state.toUpperCase(),
      legislatorId: id,
      limit,
      session,
    });

    // First, verify the legislator exists
    const legislator = await StateLegislatureCoreService.getStateLegislatorById(
      state.toUpperCase(),
      id
    );

    if (!legislator) {
      logger.warn('State legislator not found', {
        state: state.toUpperCase(),
        legislatorId: id,
      });
      return NextResponse.json(
        { success: false, error: 'State legislator not found' },
        { status: 404 }
      );
    }

    // Fetch all bills for the state (summaries)
    const allBillSummaries = await StateLegislatureCoreService.getStateBills(
      state.toUpperCase(),
      session,
      undefined, // chamber - undefined to get all chambers
      undefined, // subject
      200 // Get more bills to filter through
    );

    // Get detailed bill information to access sponsorships
    const detailedBills: StateBill[] = [];
    for (const billSummary of allBillSummaries.slice(0, limit * 2)) {
      try {
        const detailedBill = await StateLegislatureCoreService.getStateBillById(
          state.toUpperCase(),
          billSummary.id
        );
        if (detailedBill) {
          detailedBills.push(detailedBill);
        }
      } catch {
        // Skip bills that fail to fetch
        continue;
      }
    }

    // Filter bills where the legislator is a sponsor or cosponsor
    const legislatorBills = detailedBills.filter(bill => {
      return bill.sponsorships?.some(sponsorship => {
        const sponsorName = sponsorship.name.toLowerCase();
        const legislatorNameLower = legislator.name.toLowerCase();
        const lastNameLower = legislator.lastName?.toLowerCase() || '';
        return sponsorName.includes(legislatorNameLower) || sponsorName.includes(lastNameLower);
      });
    });

    // Limit the results
    const limitedBills = legislatorBills.slice(0, limit);

    logger.info('State legislator bills request successful', {
      state: state.toUpperCase(),
      legislatorId: id,
      legislatorName: legislator.name,
      totalBills: legislatorBills.length,
      returnedBills: limitedBills.length,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        bills: limitedBills,
        total: legislatorBills.length,
        returned: limitedBills.length,
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
