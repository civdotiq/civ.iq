/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Stock Trade Parser Cron Job
 *
 * Fetches new STOCK Act Periodic Transaction Reports from the House Clerk
 * and parses them into structured trade data. Processes up to 20 new filings
 * per run to stay within Vercel's function timeout.
 *
 * Runs daily at noon UTC via Vercel Cron.
 */

import { NextRequest, NextResponse } from 'next/server';
import { houseDisclosureService } from '@/lib/data-sources/house-disclosure-service';
import { cache } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type { StockTrade, HouseClerkFiling } from '@/types/stock-trades';

export const dynamic = 'force-dynamic';

const MAX_FILINGS_PER_RUN = 20;

interface ParseResult {
  docId: string;
  memberName: string;
  status: 'processed' | 'cached' | 'skipped' | 'failed';
  tradeCount: number;
  error?: string;
  processingTime: number;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processFiling(filing: HouseClerkFiling, year: number): Promise<ParseResult> {
  const startTime = Date.now();
  const memberName = `${filing.first} ${filing.last}`;

  try {
    // Resolve bioguide ID
    const bioguideId = await houseDisclosureService.resolveBioguideId(filing);

    if (!bioguideId) {
      return {
        docId: filing.docId,
        memberName,
        status: 'skipped',
        tradeCount: 0,
        error: 'Could not resolve bioguide ID',
        processingTime: Date.now() - startTime,
      };
    }

    // Check if we already have this filing parsed
    const existingTrades = await cache.get<StockTrade[]>(`house-disclosure-ptr:${filing.docId}`);
    if (existingTrades) {
      return {
        docId: filing.docId,
        memberName,
        status: 'cached',
        tradeCount: existingTrades.length,
        processingTime: Date.now() - startTime,
      };
    }

    // Parse the PTR PDF
    const trades = await houseDisclosureService.parsePtrPdf(filing.docId, year, filing);

    // Tag trades with resolved bioguide ID
    const taggedTrades = trades.map(t => ({ ...t, bioguideId }));

    // Append to the member's trade cache
    const memberCacheKey = `stock-trades:${bioguideId}`;
    const existingMemberTrades = (await cache.get<StockTrade[]>(memberCacheKey)) || [];

    // Deduplicate by filingId + asset + transactionDate
    const seen = new Set(
      existingMemberTrades.map(t => `${t.filingId}:${t.assetDescription}:${t.transactionDate}`)
    );
    const newTrades = taggedTrades.filter(t => {
      const key = `${t.filingId}:${t.assetDescription}:${t.transactionDate}`;
      return !seen.has(key);
    });

    if (newTrades.length > 0) {
      const merged = [...existingMemberTrades, ...newTrades].sort(
        (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
      );
      await cache.set(memberCacheKey, merged, 21600); // 6 hours
    }

    return {
      docId: filing.docId,
      memberName,
      status: 'processed',
      tradeCount: taggedTrades.length,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      docId: filing.docId,
      memberName,
      status: 'failed',
      tradeCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    };
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Verify cron authentication
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logger.info('Starting stock trade parser cron job', {
    operation: 'stock_trade_parser_cron',
  });

  try {
    // Ensure member lookup is built before processing
    await houseDisclosureService.buildMemberLookup();

    const currentYear = new Date().getFullYear();
    const filings = await houseDisclosureService.fetchFilingIndex(currentYear);

    // Get last processed doc ID to find new filings
    const lastProcessedKey = `stock-trades:last-processed:${currentYear}`;
    const lastProcessedDocId = await cache.get<string>(lastProcessedKey);

    // Sort filings by filing date ascending to process oldest first
    const sortedFilings = [...filings].sort(
      (a, b) => new Date(a.filingDate).getTime() - new Date(b.filingDate).getTime()
    );

    // Find new filings since last processed
    let newFilings: HouseClerkFiling[];
    if (lastProcessedDocId) {
      const lastIndex = sortedFilings.findIndex(f => f.docId === lastProcessedDocId);
      newFilings = lastIndex >= 0 ? sortedFilings.slice(lastIndex + 1) : sortedFilings;
    } else {
      newFilings = sortedFilings;
    }

    // Limit to MAX_FILINGS_PER_RUN to stay within timeout
    const filingsToProcess = newFilings.slice(0, MAX_FILINGS_PER_RUN);

    logger.info(`Processing ${filingsToProcess.length} new PTR filings`, {
      totalAvailable: filings.length,
      newSinceLastRun: newFilings.length,
      processing: filingsToProcess.length,
      operation: 'stock_trade_parser_cron',
    });

    const results: ParseResult[] = [];

    for (const filing of filingsToProcess) {
      const result = await processFiling(filing, currentYear);
      results.push(result);

      // Small delay between PDF fetches to be respectful to House Clerk servers
      if (result.status === 'processed') {
        await delay(500);
      }
    }

    // Update last processed marker
    if (filingsToProcess.length > 0) {
      const lastFiling = filingsToProcess[filingsToProcess.length - 1];
      if (lastFiling) {
        await cache.set(lastProcessedKey, lastFiling.docId, 604800); // 7 days
      }
    }

    const totalTime = Date.now() - startTime;
    const summary = {
      totalFilings: filings.length,
      newFilings: newFilings.length,
      processed: results.filter(r => r.status === 'processed').length,
      cached: results.filter(r => r.status === 'cached').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'failed').length,
      totalTrades: results.reduce((sum, r) => sum + r.tradeCount, 0),
      totalTime,
      remainingBacklog: Math.max(0, newFilings.length - MAX_FILINGS_PER_RUN),
    };

    logger.info('Stock trade parser cron job completed', {
      ...summary,
      operation: 'stock_trade_parser_cron',
    });

    return NextResponse.json({
      success: true,
      message: 'Stock trade parsing completed',
      ...summary,
      results,
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;

    logger.error('Stock trade parser cron job failed', error as Error, {
      totalTime,
      operation: 'stock_trade_parser_cron',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Stock trade parsing failed',
        message: (error as Error).message,
        totalTime,
      },
      { status: 500 }
    );
  }
}

// Allow GET requests for manual testing
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return POST(request);
}
