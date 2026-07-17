/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { houseDisclosureService } from '@/lib/data-sources/house-disclosure-service';
import { congressTradingMonitor } from '@/lib/data-sources/senate-disclosure-service';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import logger from '@/lib/logging/simple-logger';
import { circuitBreakers } from '@/lib/circuit-breaker';
import type { StockTradeResponse } from '@/types/stock-trades';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;

/**
 * Get STOCK Act financial disclosure data for a member of Congress
 *
 * Fetches Periodic Transaction Reports (PTRs) showing what stocks,
 * bonds, and other securities a member has personally traded.
 *
 * - House: U.S. House Office of the Clerk
 * - Senate: Congress Trading Monitor (derived from Senate eFD filings)
 *
 * @param _request - Next.js request object (unused)
 * @param params - Route parameters containing bioguideId
 * @returns JSON response with stock trade data
 *
 * @example
 * GET /api/representative/P000197/stock-trades  // House member
 * GET /api/representative/T000476/stock-trades  // Senator
 * Returns: { trades: [...], member: {...}, metadata: {...} }
 *
 * @see {@link https://disclosures-clerk.house.gov} House Clerk Disclosures
 * @see {@link https://efdsearch.senate.gov} Senate eFD Search
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

    // Get representative data to confirm they exist
    const repData = await getEnhancedRepresentative(bioguideId);

    if (!repData) {
      logger.warn('Representative not found', { bioguideId });
      return NextResponse.json({ error: 'Representative not found' }, { status: 404 });
    }

    const stateDistrict = repData.district
      ? `${repData.state}${repData.district.padStart(2, '0')}`
      : `${repData.state}00`;

    const isSenate = repData.chamber === 'Senate';

    const currentYear = new Date().getFullYear();

    // Fetch stock trades and annual disclosures in parallel — they're
    // independent requests, so there's no reason to wait on one before
    // starting the other.
    const [trades, annualDisclosures] = await Promise.all([
      circuitBreakers.senateStockWatcher.execute(async () => {
        // Both chambers now come from Congress Trading Monitor, which does not
        // carry stateDistrict — backfill it from the representative record.
        const ctmTrades = isSenate
          ? await congressTradingMonitor.getTradesForMember(bioguideId)
          : await congressTradingMonitor.getTradesForRepresentative(bioguideId);
        return ctmTrades.map(t => ({ ...t, stateDistrict }));
      }),
      // Annual financial disclosures (House only — every member files these)
      isSenate
        ? Promise.resolve([])
        : circuitBreakers.houseClerk
            .execute(async () => {
              return houseDisclosureService.getAnnualDisclosuresForMember(bioguideId);
            })
            .catch(err => {
              logger.warn('Failed to fetch annual disclosures', {
                bioguideId,
                error: String(err),
              });
              return [];
            }),
    ]);

    // Trades now come from Congress Trading Monitor (2015-present) for both
    // chambers, so there is no per-year PDF scan window to report.
    const primarySource = isSenate ? 'efdsearch.senate.gov' : 'the U.S. House Office of the Clerk';

    const response: StockTradeResponse = {
      trades,
      annualDisclosures,
      member: { bioguideId, name: repData.name, stateDistrict },
      metadata: {
        dataSource: 'congress-trading-monitor',
        lastUpdated: new Date().toISOString(),
        totalFilings: new Set(trades.map(t => t.filingId)).size,
        coveragePeriod: `2015-${currentYear}`,
        yearsChecked: [],
        note:
          trades.length > 0
            ? `Data from STOCK Act Periodic Transaction Reports parsed by Congress Trading Monitor, ` +
              `an independent open-source project; each trade links to its original ${primarySource} filing. ` +
              `Electronic filings from 2015 onward; pre-2015 paper filings are not included. ` +
              `Transactions over $1,000 must be disclosed within 45 days.`
            : `No STOCK Act Periodic Transaction Reports found for this member in the Congress Trading Monitor dataset. ` +
              `This may mean they had no reportable transactions or their filings were not electronically processed.`,
      },
    };

    const processingTime = Date.now() - startTime;
    logger.info('Stock trades request completed', {
      bioguideId,
      processingTime,
      tradeCount: trades.length,
      chamber: repData.chamber,
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
        annualDisclosures: [],
        member: { bioguideId, name: 'Unknown', stateDistrict: '' },
        metadata: {
          dataSource: isCircuitOpen ? 'circuit-open' : 'service-error',
          lastUpdated: new Date().toISOString(),
          totalFilings: 0,
          coveragePeriod: 'Error',
          yearsChecked: [],
          note: isCircuitOpen
            ? 'STOCK Act disclosure data is temporarily unavailable. The data service may be experiencing issues. Please try again later.'
            : 'STOCK Act disclosure data is temporarily unavailable due to a service error. Please try again later.',
        },
      } satisfies StockTradeResponse,
      { status: 500 }
    );
  }
}
