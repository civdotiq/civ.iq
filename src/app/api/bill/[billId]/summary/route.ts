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
    const { searchParams } = new URL(request.url);

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

        return NextResponse.json({
          summary: cachedSummary,
          metadata: {
            cached: true,
            responseTime,
            readingLevel: cachedSummary.readingLevel,
            confidence: cachedSummary.confidence,
          },
        });
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

          return NextResponse.json({
            summary: cachedSummary,
            metadata: {
              cached: true,
              validated: true,
              responseTime,
              readingLevel: cachedSummary.readingLevel,
              confidence: cachedSummary.confidence,
            },
          });
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

    return NextResponse.json(response);
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
      new NextRequest(`${request.url}?forceRefresh=true&targetReadingLevel=${targetReadingLevel}`, {
        method: 'GET',
      }),
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
    // Extract congress and bill number from billId
    const [billNumber, congressStr] = billId.split('-');
    const congress = parseInt(congressStr || '118') || 118;

    if (!billNumber) {
      throw new Error('Invalid bill ID format');
    }

    const congressApiKey = process.env.CONGRESS_API_KEY;
    if (!congressApiKey) {
      throw new Error('Congress API key not configured');
    }

    // Fetch bill details first
    const billDetailsUrl = `https://api.congress.gov/v3/bill/${congress}/${billNumber.toLowerCase()}?api_key=${congressApiKey}&format=json`;
    const billDetailsResponse = await fetch(billDetailsUrl);

    if (!billDetailsResponse.ok) {
      throw new Error(`Failed to fetch bill details: ${billDetailsResponse.status}`);
    }

    const billDetails = await billDetailsResponse.json();
    const bill = billDetails.bill;

    // Fetch bill text
    const textUrl = `https://api.congress.gov/v3/bill/${congress}/${billNumber.toLowerCase()}/text?api_key=${congressApiKey}&format=json`;
    const textResponse = await fetch(textUrl);

    if (!textResponse.ok) {
      throw new Error(`Failed to fetch bill text: ${textResponse.status}`);
    }

    const textData = await textResponse.json();

    // Extract the most recent text version
    const textVersions = textData.textVersions || [];
    if (textVersions.length === 0) {
      throw new Error('No text versions available');
    }

    const latestVersion = textVersions[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fullTextUrl = latestVersion.formats?.find((f: any) => f.type === 'Formatted Text')?.url;

    if (!fullTextUrl) {
      throw new Error('Full text not available');
    }

    // Fetch the actual text content
    const fullTextResponse = await fetch(fullTextUrl);
    const fullText = await fullTextResponse.text();

    return {
      number: bill.number,
      title: bill.title,
      congress: bill.congress,
      chamber: bill.originChamber === 'House' ? 'House' : 'Senate',
      fullText,
    };
  } catch (error) {
    logger.error('Failed to fetch bill text', error as Error, {
      billId,
      operation: 'bill_text_fetch',
    });
    return null;
  }
}
