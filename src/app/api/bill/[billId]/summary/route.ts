/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill Summary API Endpoint
 *
 * Provides AI-generated summaries of bills at an 8th grade reading level.
 * Includes caching, validation, and error handling.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { BillSummarizer } from '@/features/legislation/services/ai/bill-summarizer';
import { BillSummaryCache } from '@/features/legislation/services/ai/bill-summary-cache';
import { BillTextProcessor } from '@/features/legislation/services/ai/bill-text-processor';
import { ReadingLevelValidator } from '@/features/legislation/services/ai/reading-level-validator';
import logger from '@/lib/logging/simple-logger';
import { InputValidator } from '@/lib/validation/input-validator';

interface _BillSummaryRequest {
  includeFull?: boolean;
  forceRefresh?: boolean;
  targetReadingLevel?: number;
  format?: 'brief' | 'detailed' | 'full';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const { billId } = await params;
    const { searchParams } = request.nextUrl;

    // Validate billId
    const billIdErrors = InputValidator.validateValue(billId, {
      required: true,
      minLength: 5,
      maxLength: 20,
      pattern: /^[A-Z0-9\-\.]+$/i,
    });

    if (billIdErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid bill ID',
          details: billIdErrors,
        },
        { status: 400 }
      );
    }

    // Parse query parameters
    const includeFull = searchParams.get('includeFull') === 'true';
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    const targetReadingLevel = parseInt(searchParams.get('targetReadingLevel') || '8');
    const format = (searchParams.get('format') || 'detailed') as 'brief' | 'detailed' | 'full';

    logger.info('Bill summary request received', {
      billId,
      includeFull,
      forceRefresh,
      targetReadingLevel,
      format,
      operation: 'bill_summary_api',
    });

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedSummary = await BillSummaryCache.getSummary(billId);
      if (cachedSummary) {
        const responseTime = Date.now() - startTime;

        return NextResponse.json(
          {
            summary: cachedSummary,
            metadata: {
              cached: true,
              responseTime,
              readingLevel: cachedSummary.readingLevel,
              confidence: cachedSummary.confidence,
            },
          },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
            },
          }
        );
      }
    }

    // Fetch bill text from Congress API
    const billText = await fetchBillText(billId);
    if (!billText) {
      return NextResponse.json(
        {
          error: 'Bill text not found',
          message: 'Unable to retrieve bill text for summarization',
        },
        { status: 404 }
      );
    }

    // Generate text hash for cache validation
    const textHash = BillSummaryCache.generateTextHash(billText.fullText);

    // Check if cached summary is still valid
    if (!forceRefresh) {
      const isValid = await BillSummaryCache.isSummaryValid(billId, textHash);
      if (isValid) {
        const cachedSummary = await BillSummaryCache.getSummary(billId);
        if (cachedSummary) {
          const responseTime = Date.now() - startTime;

          return NextResponse.json(
            {
              summary: cachedSummary,
              metadata: {
                cached: true,
                validated: true,
                responseTime,
                readingLevel: cachedSummary.readingLevel,
                confidence: cachedSummary.confidence,
              },
            },
            {
              headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
              },
            }
          );
        }
      }
    }

    // Process bill text
    const processedText = await BillTextProcessor.processBillText(billText.fullText, {
      number: billText.number,
      title: billText.title,
      congress: billText.congress,
    });

    // Extract key content for summarization
    const keyContent = BillTextProcessor.extractKeyContent(processedText, 3000);

    // Generate AI summary
    const summary = await BillSummarizer.summarizeBill(
      keyContent,
      {
        number: billText.number,
        title: billText.title,
        congress: billText.congress,
        chamber: billText.chamber,
      },
      {
        targetReadingLevel,
        maxLength: format === 'brief' ? 150 : format === 'detailed' ? 300 : 500,
        useCache: !forceRefresh,
      }
    );

    // Validate reading level
    const readingAnalysis = ReadingLevelValidator.analyzeReadingLevel(summary.summary, {
      targetGrade: targetReadingLevel,
    });

    // Update summary with validated reading level
    summary.readingLevel = readingAnalysis.gradeLevel;

    // Cache the summary
    await BillSummaryCache.storeSummary(billId, summary, textHash, {
      priority: 'medium',
    });

    const responseTime = Date.now() - startTime;

    // Build response based on format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = {
      summary,
      metadata: {
        cached: false,
        responseTime,
        readingLevel: summary.readingLevel,
        confidence: summary.confidence,
        textProcessing: {
          originalLength: processedText.originalLength,
          processedLength: processedText.processedLength,
          chunksGenerated: processedText.chunks.length,
          complexity: processedText.metadata.complexity,
        },
        readingAnalysis: {
          passesTarget: readingAnalysis.passesTarget,
          complexWords: readingAnalysis.complexWordCount,
          suggestions: readingAnalysis.suggestions.slice(0, 3),
        },
      },
    };

    // Add full details if requested
    if (includeFull || format === 'full') {
      response.fullAnalysis = {
        processedText: processedText.metadata,
        readingLevelAnalysis: readingAnalysis,
        textStatistics: BillTextProcessor.getTextStatistics(processedText),
      };
    }

    // Format response based on requested format
    if (format === 'brief') {
      response.summary = {
        billId: summary.billId,
        title: summary.title,
        whatItDoes: summary.whatItDoes,
        readingLevel: summary.readingLevel,
        confidence: summary.confidence,
        lastUpdated: summary.lastUpdated,
      };
    }

    logger.info('Bill summary generated successfully', {
      billId,
      responseTime,
      readingLevel: summary.readingLevel,
      confidence: summary.confidence,
      format,
      operation: 'bill_summary_api',
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const { billId: errorBillId } = await params;

    logger.error('Bill summary generation failed', error as Error, {
      billId: errorBillId,
      responseTime,
      operation: 'bill_summary_api',
    });

    return NextResponse.json(
      {
        error: 'Summary generation failed',
        message: 'Unable to generate AI summary at this time',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Update or regenerate a bill summary
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
): Promise<NextResponse> {
  try {
    const { billId } = await params;
    const body = await request.json();

    const {
      targetReadingLevel = 8,
      priority: _priority = 'medium',
      options: _options = {},
    }: {
      targetReadingLevel?: number;
      priority?: 'high' | 'medium' | 'low';
      options?: unknown;
    } = body;

    // Invalidate existing cache
    await BillSummaryCache.invalidateSummary(billId);

    // Generate new summary with updated parameters
    const response = await GET(
      new NextRequest(
        `${request.nextUrl.href}?forceRefresh=true&targetReadingLevel=${targetReadingLevel}`,
        {
          method: 'GET',
        }
      ),
      { params }
    );

    return response;
  } catch (error) {
    const { billId: errorBillId } = await params;
    logger.error('Bill summary update failed', error as Error, {
      billId: errorBillId,
      operation: 'bill_summary_api',
    });

    return NextResponse.json(
      {
        error: 'Summary update failed',
        message: 'Unable to update summary at this time',
      },
      { status: 500 }
    );
  }
}

/**
 * Delete a bill summary from cache
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
): Promise<NextResponse> {
  try {
    const { billId } = await params;

    await BillSummaryCache.invalidateSummary(billId);

    logger.info('Bill summary deleted', {
      billId,
      operation: 'bill_summary_api',
    });

    return NextResponse.json({
      message: 'Summary deleted successfully',
      billId,
    });
  } catch (error) {
    const { billId: errorBillId } = await params;
    logger.error('Bill summary deletion failed', error as Error, {
      billId: errorBillId,
      operation: 'bill_summary_api',
    });

    return NextResponse.json(
      {
        error: 'Summary deletion failed',
        message: 'Unable to delete summary at this time',
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch bill text from Congress API
 */
async function fetchBillText(billId: string): Promise<{
  number: string;
  title: string;
  congress: number;
  chamber: string;
  fullText: string;
} | null> {
  try {
    // Extract congress, type, and number from billId (format: "119-hr-1")
    const parts = billId.split('-');
    if (parts.length < 3) {
      throw new Error('Invalid bill ID format: expected congress-type-number');
    }
    const congress = parseInt(parts[0]!) || 119;
    const billType = parts[1]!;
    const billNumber = parts.slice(2).join('-');

    if (!billType || !billNumber) {
      throw new Error('Invalid bill ID format');
    }

    const congressApiKey = process.env.CONGRESS_API_KEY;
    if (!congressApiKey) {
      throw new Error('Congress API key not configured');
    }

    const apiHeaders = {
      'X-API-Key': congressApiKey,
      'User-Agent': 'CIV.IQ/1.0 (civic data platform; civdotiq.org)',
    };

    // Fetch bill details first
    const billDetailsUrl = `https://api.congress.gov/v3/bill/${congress}/${billType.toLowerCase()}/${billNumber}?format=json`;
    const billDetailsResponse = await fetch(billDetailsUrl, { headers: apiHeaders });

    if (!billDetailsResponse.ok) {
      throw new Error(`Failed to fetch bill details: ${billDetailsResponse.status}`);
    }

    const billDetails = await billDetailsResponse.json();
    const bill = billDetails.bill;

    // Try to fetch full bill text from congress.gov
    const fullText = await fetchFullBillText(congress, billType, billNumber, congressApiKey);

    if (fullText) {
      return {
        number: bill.number,
        title: bill.title,
        congress: bill.congress,
        chamber: bill.originChamber === 'House' ? 'House' : 'Senate',
        fullText,
      };
    }

    // Fallback: use Congress API summaries endpoint
    const summaryText = await fetchCongressSummary(congress, billType, billNumber, congressApiKey);

    if (summaryText) {
      return {
        number: bill.number,
        title: bill.title,
        congress: bill.congress,
        chamber: bill.originChamber === 'House' ? 'House' : 'Senate',
        fullText: summaryText,
      };
    }

    throw new Error('Could not retrieve bill text or summary from Congress API');
  } catch (error) {
    logger.error('Failed to fetch bill text', error as Error, {
      billId,
      operation: 'bill_text_fetch',
    });
    return null;
  }
}

/**
 * Fetch full bill text from congress.gov via the text versions API
 */
async function fetchFullBillText(
  congress: number,
  billType: string,
  billNumber: string,
  apiKey: string
): Promise<string | null> {
  try {
    const textUrl = `https://api.congress.gov/v3/bill/${congress}/${billType.toLowerCase()}/${billNumber}/text?format=json`;
    const textResponse = await fetch(textUrl, {
      headers: {
        'X-API-Key': apiKey,
        'User-Agent': 'CIV.IQ/1.0 (civic data platform; civdotiq.org)',
      },
    });

    if (!textResponse.ok) {
      logger.warn('Failed to fetch bill text versions', {
        status: textResponse.status,
        congress,
        billType,
        billNumber,
      });
      return null;
    }

    const textData = await textResponse.json();
    const textVersions = textData.textVersions || [];
    if (textVersions.length === 0) {
      return null;
    }

    const latestVersion = textVersions[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fullTextUrl = latestVersion.formats?.find((f: any) => f.type === 'Formatted Text')?.url;

    if (!fullTextUrl) {
      return null;
    }

    // Fetch from congress.gov with proper headers to avoid bot blocking
    const fullTextResponse = await fetch(fullTextUrl, {
      headers: {
        'User-Agent': 'CIV.IQ/1.0 (civic data platform; civdotiq.org)',
        Accept: 'text/html,application/xhtml+xml,text/plain',
      },
    });

    if (!fullTextResponse.ok) {
      logger.warn('Congress.gov bill text fetch failed', {
        status: fullTextResponse.status,
        url: fullTextUrl,
      });
      return null;
    }

    return await fullTextResponse.text();
  } catch (error) {
    logger.warn('Error fetching full bill text', {
      error: error instanceof Error ? error.message : 'Unknown error',
      congress,
      billType,
      billNumber,
    });
    return null;
  }
}

/**
 * Fallback: fetch bill summary from Congress API summaries endpoint
 */
async function fetchCongressSummary(
  congress: number,
  billType: string,
  billNumber: string,
  apiKey: string
): Promise<string | null> {
  try {
    const summaryUrl = `https://api.congress.gov/v3/bill/${congress}/${billType.toLowerCase()}/${billNumber}/summaries?format=json`;
    const response = await fetch(summaryUrl, {
      headers: {
        'X-API-Key': apiKey,
        'User-Agent': 'CIV.IQ/1.0 (civic data platform; civdotiq.org)',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const summaries = data.summaries || [];
    if (summaries.length === 0) {
      return null;
    }

    // Use the most recent summary (last in array = most detailed version)
    const bestSummary = summaries[summaries.length - 1];
    const text = bestSummary.text || '';

    // Strip HTML tags from congressional summary
    const plainText = text
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (plainText.length < 50) {
      return null;
    }

    logger.info('Using Congress API summary as fallback', {
      congress,
      billType,
      billNumber,
      summaryLength: plainText.length,
    });

    return plainText;
  } catch (error) {
    logger.warn('Error fetching Congress summary fallback', {
      error: error instanceof Error ? error.message : 'Unknown error',
      congress,
      billType,
      billNumber,
    });
    return null;
  }
}
