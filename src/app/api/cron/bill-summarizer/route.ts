/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill Summarizer Cron Job
 *
 * Fetches recent bills from Congress.gov and generates AI summaries
 * for any that don't already have cached summaries.
 * Runs daily at 8am UTC via Vercel Cron.
 */

import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import { NextRequest, NextResponse } from 'next/server';
import { BillSummarizer } from '@/features/legislation/services/ai/bill-summarizer';
import { BillSummaryCache } from '@/features/legislation/services/ai/bill-summary-cache';
import { BillTextProcessor } from '@/features/legislation/services/ai/bill-text-processor';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

interface CongressBill {
  number: string;
  title: string;
  type: string;
  originChamber: string;
  congress: number;
  url: string;
  latestAction?: {
    actionDate: string;
    text: string;
  };
}

interface SummarizationResult {
  billNumber: string;
  title: string;
  status: 'summarized' | 'cached' | 'skipped' | 'failed';
  error?: string;
  processingTime: number;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchRecentBills(congress: string): Promise<CongressBill[]> {
  const congressApiKey = process.env.CONGRESS_API_KEY;
  if (!congressApiKey) {
    throw new Error('Congress API key not configured');
  }

  const url = `https://api.congress.gov/v3/bill/${congress}?limit=20&sort=updateDate+desc&format=json`;
  const response = await fetch(url, {
    headers: {
      'X-API-Key': congressApiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Congress API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.bills || []) as CongressBill[];
}

async function fetchBillText(
  congress: number,
  billType: string,
  billNumber: string,
  apiKey: string
): Promise<string | null> {
  const apiHeaders = {
    'X-API-Key': apiKey,
    'User-Agent': 'CIV.IQ/1.0 (civic data platform; civdotiq.org)',
  };

  try {
    // Try full bill text first
    const textUrl = `https://api.congress.gov/v3/bill/${congress}/${billType}/${billNumber}/text?format=json`;
    const textResponse = await fetch(textUrl, { headers: apiHeaders });

    if (textResponse.ok) {
      const textData = await textResponse.json();
      const textVersions = textData.textVersions || [];

      if (textVersions.length > 0) {
        const latestVersion = textVersions[0];
        const fullTextUrl = latestVersion.formats?.find(
          (f: { type?: string }) => f.type === 'Formatted Text'
        )?.url;

        if (fullTextUrl) {
          const fullTextResponse = await fetch(fullTextUrl, {
            headers: {
              'User-Agent': 'CIV.IQ/1.0 (civic data platform; civdotiq.org)',
              Accept: 'text/html,application/xhtml+xml,text/plain',
            },
          });

          if (fullTextResponse.ok) {
            return fullTextResponse.text();
          }
        }
      }
    }

    // Fallback: use Congress API summaries endpoint
    const summaryUrl = `https://api.congress.gov/v3/bill/${congress}/${billType}/${billNumber}/summaries?format=json`;
    const summaryResponse = await fetch(summaryUrl, { headers: apiHeaders });

    if (summaryResponse.ok) {
      const data = await summaryResponse.json();
      const summaries = data.summaries || [];
      if (summaries.length > 0) {
        const bestSummary = summaries[summaries.length - 1];
        const text = (bestSummary.text || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (text.length >= 50) {
          return text;
        }
      }
    }

    return null;
  } catch (error) {
    logger.error('Failed to fetch bill text for cron', error as Error, {
      congress,
      billType,
      billNumber,
      operation: 'bill_summarizer_cron',
    });
    return null;
  }
}

async function processBill(bill: CongressBill): Promise<SummarizationResult> {
  const startTime = Date.now();
  const billId = `${bill.number}-${bill.congress}`;

  try {
    // Check if we already have a cached summary
    const cached = await BillSummaryCache.getSummary(billId);
    if (cached) {
      return {
        billNumber: bill.number,
        title: bill.title,
        status: 'cached',
        processingTime: Date.now() - startTime,
      };
    }

    // Fetch bill text
    const congressApiKey = process.env.CONGRESS_API_KEY;
    if (!congressApiKey) {
      return {
        billNumber: bill.number,
        title: bill.title,
        status: 'failed',
        error: 'Congress API key not configured',
        processingTime: Date.now() - startTime,
      };
    }

    // Parse bill type and number from the bill number (e.g., "H.R. 1234" -> type="hr", number="1234")
    const match = bill.number.match(
      /^(H\.R\.|S\.|H\.Res\.|S\.Res\.|H\.J\.Res\.|S\.J\.Res\.|H\.Con\.Res\.|S\.Con\.Res\.)\s*(\d+)/i
    );
    if (!match) {
      return {
        billNumber: bill.number,
        title: bill.title,
        status: 'skipped',
        error: 'Could not parse bill number',
        processingTime: Date.now() - startTime,
      };
    }

    const billType = match[1]!.toLowerCase().replace(/\./g, '').replace(/\s+/g, '');
    const billNum = match[2]!;

    const billText = await fetchBillText(bill.congress, billType, billNum, congressApiKey);
    if (!billText) {
      return {
        billNumber: bill.number,
        title: bill.title,
        status: 'skipped',
        error: 'Bill text not available',
        processingTime: Date.now() - startTime,
      };
    }

    // Process and summarize
    const processedText = await BillTextProcessor.processBillText(billText, {
      number: bill.number,
      title: bill.title,
      congress: bill.congress,
    });

    const keyContent = BillTextProcessor.extractKeyContent(processedText, 3000);

    await BillSummarizer.summarizeBill(keyContent, {
      number: bill.number,
      title: bill.title,
      congress: bill.congress,
      chamber: bill.originChamber || 'House',
    });

    return {
      billNumber: bill.number,
      title: bill.title,
      status: 'summarized',
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      billNumber: bill.number,
      title: bill.title,
      status: 'failed',
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

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logger.info('Starting bill summarizer cron job', {
    operation: 'bill_summarizer_cron',
  });

  try {
    const congress = process.env.CURRENT_CONGRESS || String(getCurrentCongressNumber());
    const bills = await fetchRecentBills(congress);

    logger.info(`Fetched ${bills.length} recent bills`, {
      congress,
      operation: 'bill_summarizer_cron',
    });

    const results: SummarizationResult[] = [];

    // Process bills sequentially with delay to respect Gemini rate limits (15 RPM)
    for (const bill of bills) {
      const result = await processBill(bill);
      results.push(result);

      // Delay between AI calls to respect rate limits
      if (result.status === 'summarized') {
        await delay(1000);
      }
    }

    const totalTime = Date.now() - startTime;
    const summary = {
      totalBills: bills.length,
      summarized: results.filter(r => r.status === 'summarized').length,
      cached: results.filter(r => r.status === 'cached').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'failed').length,
      totalTime,
      results,
    };

    logger.info('Bill summarizer cron job completed', {
      ...summary,
      results: undefined,
      operation: 'bill_summarizer_cron',
    });

    return NextResponse.json({
      success: true,
      message: 'Bill summarization completed',
      ...summary,
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;

    logger.error('Bill summarizer cron job failed', error as Error, {
      totalTime,
      operation: 'bill_summarizer_cron',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Bill summarization failed',
        message: (error as Error).message,
        totalTime,
      },
      { status: 500 }
    );
  }
}

// Allow GET requests for manual testing
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return POST(request);
}
