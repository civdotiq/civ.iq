/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { houseDisclosureService } from '@/lib/data-sources/house-disclosure-service';
import { senateDisclosureService } from '@/lib/data-sources/senate-disclosure-service';
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
 * - Senate: Senate Stock Watcher (derived from Senate eFD filings)
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
    const coverageYears = 5;

    // Fetch stock trades via appropriate service + circuit breaker
    const trades = isSenate
      ? await circuitBreakers.senateStockWatcher.execute(async () => {
          const senateTrades = await senateDisclosureService.getTradesForMember(bioguideId);
          // Backfill stateDistrict on Senate trades (not in source data)
          return senateTrades.map(t => ({ ...t, stateDistrict }));
        })
      : await circuitBreakers.houseClerk.execute(async () => {
          return houseDisclosureService.getTradesForMember(bioguideId);
        });

    // Fetch annual financial disclosures (House only — every member files these)
    const annualDisclosures = isSenate
      ? []
      : await circuitBreakers.houseClerk
          .execute(async () => {
            return houseDisclosureService.getAnnualDisclosuresForMember(bioguideId);
          })
          .catch(err => {
            logger.warn('Failed to fetch annual disclosures', {
              bioguideId,
              error: String(err),
            });
            return [];
          });

    const yearsChecked = isSenate
      ? []
      : Array.from({ length: coverageYears }, (_, i) => currentYear - i).sort();

    const response: StockTradeResponse = {
      trades,
      annualDisclosures,
      member: { bioguideId, name: repData.name, stateDistrict },
      metadata: {
        dataSource: isSenate ? 'senate-stock-watcher' : 'house-clerk-disclosures',
        lastUpdated: new Date().toISOString(),
        totalFilings: new Set(trades.map(t => t.filingId)).size,
        coveragePeriod: isSenate
          ? '2012-2021'
          : `${currentYear - coverageYears + 1}-${currentYear}`,
        yearsChecked,
        note: isSenate
          ? trades.length > 0
            ? 'Data from STOCK Act Periodic Transaction Reports filed with the Senate Office of Public Records. ' +
              'Parsed by Senate Stock Watcher, an independent open-source project. ' +
              'Transactions over $1,000 must be disclosed within 45 days.'
            : 'No STOCK Act financial disclosures found for this Senator in the Senate Stock Watcher dataset. ' +
              'This may mean the Senator had no reportable transactions or their filings were not electronically processed.'
          : trades.length > 0
            ? 'Data from STOCK Act Periodic Transaction Reports filed with the U.S. House Office of the Clerk. Transactions over $1,000 must be disclosed within 45 days.'
            : 'No Periodic Transaction Reports found. This representative has not disclosed securities transactions over $1,000 in the years checked.',
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
