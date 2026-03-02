/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { houseDisclosureService } from '@/lib/data-sources/house-disclosure-service';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import logger from '@/lib/logging/simple-logger';
import { circuitBreakers } from '@/lib/circuit-breaker';
import type { StockTradeResponse } from '@/types/stock-trades';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;

/**
 * Get STOCK Act financial disclosure data for a House representative
 *
 * Fetches Periodic Transaction Reports (PTRs) from the U.S. House Office
 * of the Clerk, showing what stocks, bonds, and other securities a member
 * has personally traded.
 *
 * @param _request - Next.js request object (unused)
 * @param params - Route parameters containing bioguideId
 * @returns JSON response with stock trade data
 *
 * @example
 * GET /api/representative/P000197/stock-trades
 * Returns: { trades: [...], member: {...}, metadata: {...} }
 *
 * @see {@link https://disclosures-clerk.house.gov} House Clerk Disclosures
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const startTime = Date.now();
  const { bioguideId } = await params;

  logger.info('Stock trades data request started', { bioguideId });

  try {
    if (!bioguideId) {
      return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
    }

    // Get representative data to confirm they exist and are House members
    const repData = await getEnhancedRepresentative(bioguideId);

    if (!repData) {
      logger.warn('Representative not found', { bioguideId });
      return NextResponse.json({ error: 'Representative not found' }, { status: 404 });
    }

    const stateDistrict = repData.district
      ? `${repData.state}${repData.district.padStart(2, '0')}`
      : `${repData.state}00`;

    // Senate members — return empty with note (House-only for now)
    if (repData.chamber === 'Senate') {
      const response: StockTradeResponse = {
        trades: [],
        member: { bioguideId, name: repData.name, stateDistrict },
        metadata: {
          dataSource: 'house-clerk-disclosures',
          lastUpdated: new Date().toISOString(),
          totalFilings: 0,
          coveragePeriod: 'N/A',
          note: 'STOCK Act disclosures for Senators are filed through the Senate Office of Public Records and are not yet available in this system. House member disclosures are available.',
        },
      };

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      });
    }

    // Fetch stock trades via circuit breaker
    const trades = await circuitBreakers.houseClerk.execute(async () => {
      return houseDisclosureService.getTradesForMember(bioguideId);
    });

    const currentYear = new Date().getFullYear();
    const response: StockTradeResponse = {
      trades,
      member: { bioguideId, name: repData.name, stateDistrict },
      metadata: {
        dataSource: 'house-clerk-disclosures',
        lastUpdated: new Date().toISOString(),
        totalFilings: new Set(trades.map(t => t.filingId)).size,
        coveragePeriod: `${currentYear - 1}-${currentYear}`,
        note:
          trades.length > 0
            ? 'Data from STOCK Act Periodic Transaction Reports filed with the U.S. House Office of the Clerk. Transactions over $1,000 must be disclosed within 45 days.'
            : 'No STOCK Act financial disclosures found for this representative. Disclosures are required under the STOCK Act of 2012 for securities transactions over $1,000.',
      },
    };

    const processingTime = Date.now() - startTime;
    logger.info('Stock trades request completed', {
      bioguideId,
      processingTime,
      tradeCount: trades.length,
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error processing stock trades request', error as Error, {
      bioguideId,
      processingTime,
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isCircuitOpen = errorMessage.includes('Circuit breaker');

    return NextResponse.json(
      {
        trades: [],
        member: { bioguideId, name: 'Unknown', stateDistrict: '' },
        metadata: {
          dataSource: isCircuitOpen ? 'house-clerk-circuit-open' : 'house-clerk-error',
          lastUpdated: new Date().toISOString(),
          totalFilings: 0,
          coveragePeriod: 'Error',
          note: isCircuitOpen
            ? 'STOCK Act disclosure data is temporarily unavailable. The House Clerk service may be experiencing issues. Please try again later.'
            : 'STOCK Act disclosure data is temporarily unavailable due to a service error. Please try again later.',
        },
      } satisfies StockTradeResponse,
      { status: 500 }
    );
  }
}
