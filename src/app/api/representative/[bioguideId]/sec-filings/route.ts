/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { secEdgarService } from '@/lib/data-sources/sec-edgar-service';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { congressTradingMonitor } from '@/lib/data-sources/senate-disclosure-service';
import logger from '@/lib/logging/simple-logger';
import type { SecFilingsResponse } from '@/types/sec-edgar';

export const dynamic = 'force-dynamic'; // 1 hour

/**
 * Get SEC EDGAR filings related to a representative's stock trades.
 *
 * Looks up tickers from the representative's STOCK Act disclosures,
 * maps them to CIK numbers, and fetches Form 4 insider trading filings.
 *
 * @example
 * GET /api/representative/P000197/sec-filings
 * GET /api/representative/P000197/sec-filings?ticker=AAPL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const { searchParams } = request.nextUrl;
  const tickerParam = searchParams.get('ticker');

  logger.info('SEC filings request', { bioguideId, ticker: tickerParam });

  try {
    if (!bioguideId) {
      return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
    }

    const repData = await getEnhancedRepresentative(bioguideId);
    if (!repData) {
      return NextResponse.json({ error: 'Representative not found' }, { status: 404 });
    }

    // Determine tickers to look up: explicit param or from stock trades
    let tickers: string[] = [];

    if (tickerParam) {
      tickers = [tickerParam.toUpperCase()];
    } else if (repData.chamber === 'House') {
      const trades = await congressTradingMonitor.getTradesForRepresentative(bioguideId);
      const uniqueTickers = new Set(
        trades.map(t => t.ticker).filter((t): t is string => t !== null && t.length > 0)
      );
      tickers = Array.from(uniqueTickers).slice(0, 10); // Limit to avoid rate limit issues
    }

    if (tickers.length === 0) {
      const response: SecFilingsResponse = {
        success: true,
        filings: [],
        form4Transactions: [],
        company: null,
        metadata: {
          dataSource: 'sec-edgar',
          generatedAt: new Date().toISOString(),
          totalFilings: 0,
        },
      };

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      });
    }

    // Look up CIK for first ticker and fetch filings
    const primaryTicker = tickers[0];
    const cik = primaryTicker ? await secEdgarService.findCikByTicker(primaryTicker) : null;

    if (!cik) {
      const response: SecFilingsResponse = {
        success: true,
        filings: [],
        form4Transactions: [],
        company: null,
        metadata: {
          dataSource: 'sec-edgar',
          generatedAt: new Date().toISOString(),
          totalFilings: 0,
        },
      };

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      });
    }

    const [profile, filings] = await Promise.all([
      secEdgarService.fetchCompanyProfile(cik),
      secEdgarService.fetchForm4Filings(cik),
    ]);

    const response: SecFilingsResponse = {
      success: true,
      filings,
      form4Transactions: [], // Form 4 XML parsing would be a future enhancement
      company: profile ? { cik: profile.cik, name: profile.name, tickers: profile.tickers } : null,
      metadata: {
        dataSource: 'sec-edgar',
        generatedAt: new Date().toISOString(),
        totalFilings: filings.length,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('SEC filings request failed', error as Error, { bioguideId });

    return NextResponse.json(
      {
        success: false,
        filings: [],
        form4Transactions: [],
        company: null,
        metadata: {
          dataSource: 'sec-edgar',
          generatedAt: new Date().toISOString(),
          totalFilings: 0,
        },
        error: errorMessage,
      } satisfies SecFilingsResponse,
      { status: 500 }
    );
  }
}
