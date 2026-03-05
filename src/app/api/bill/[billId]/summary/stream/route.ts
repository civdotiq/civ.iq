/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Streaming Bill Summary API Endpoint
 *
 * Returns AI-generated bill summaries via Server-Sent Events (SSE).
 * Cached summaries return instantly as JSON. Uncached summaries stream
 * the plain-text summary token-by-token while generating structured
 * fields (keyPoints, etc.) in parallel.
 *
 * Wire format (SSE with JSON payloads):
 *   {"type":"text","content":"chunk..."}       — streamed summary tokens
 *   {"type":"complete","summary":{...},"metadata":{...}} — final data
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { BillSummarizer } from '@/features/legislation/services/ai/bill-summarizer';
import type { BillSummary } from '@/features/legislation/services/ai/bill-summarizer';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';
import { BillSummaryCache } from '@/features/legislation/services/ai/bill-summary-cache';
import { BillTextProcessor } from '@/features/legislation/services/ai/bill-text-processor';
import { ReadingLevelValidator } from '@/features/legislation/services/ai/reading-level-validator';
import { fetchBillText } from '@/features/legislation/services/bill-text-fetcher';
import { PLAIN_LANGUAGE_ATTRIBUTION } from '@/lib/ai/plain-language';
import { generateAIText, streamAIText } from '@/lib/ai/provider';
import logger from '@/lib/logging/simple-logger';
import { InputValidator } from '@/lib/validation/input-validator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
): Promise<NextResponse | Response> {
  const startTime = Date.now();

  try {
    const { billId } = await params;

    // Validate billId
    const billIdErrors = InputValidator.validateValue(billId, {
      required: true,
      minLength: 5,
      maxLength: 20,
      pattern: /^[A-Z0-9\-\.]+$/i,
    });

    if (billIdErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid bill ID', details: billIdErrors },
        { status: 400 }
      );
    }

    // Check cache first — return JSON instantly if hit
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
            plainLanguage: PLAIN_LANGUAGE_ATTRIBUTION,
          },
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          },
        }
      );
    }

    // Fetch bill text
    const billText = await fetchBillText(billId);
    if (!billText) {
      return NextResponse.json(
        { error: 'Bill text not found', message: 'Unable to retrieve bill text for summarization' },
        { status: 404 }
      );
    }

    // Process bill text
    const processedText = await BillTextProcessor.processBillText(billText.fullText, {
      number: billText.number,
      title: billText.title,
      congress: billText.congress,
    });
    const keyContent = BillTextProcessor.extractKeyContent(processedText, 3000);

    const billMetadata = {
      number: billText.number,
      title: billText.title,
      congress: billText.congress,
      chamber: billText.chamber,
    };

    // Build prompts
    const streamingPrompt = BillSummarizer.buildStreamingSummaryPrompt(keyContent, billMetadata);
    const structuredPrompt = BillSummarizer.buildStructuredExtractionPrompt(
      keyContent,
      billMetadata
    );

    // Start both AI calls concurrently
    const streamResult = streamAIText(streamingPrompt.system, streamingPrompt.user, {
      temperature: 0.3,
      maxTokens: 1000,
    });

    const structuredPromise = generateAIText(structuredPrompt.system, structuredPrompt.user, {
      temperature: 0.3,
      maxTokens: 800,
    });

    // Create SSE stream
    const encoder = new TextEncoder();
    let fullStreamedText = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream text chunks as SSE events
          for await (const chunk of streamResult.textStream) {
            fullStreamedText += chunk;
            const event = `data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`;
            controller.enqueue(encoder.encode(event));
          }

          // Await structured result
          const structuredResponse = await structuredPromise;
          const structured = parseStructuredResponse(structuredResponse);

          // Validate reading level
          const readingAnalysis = ReadingLevelValidator.analyzeReadingLevel(fullStreamedText, {
            targetGrade: 8,
          });

          // Build complete summary
          const textHash = BillSummaryCache.generateTextHash(billText.fullText);
          const summary: BillSummary = {
            billId: `${billMetadata.number}-${billMetadata.congress}`,
            title: billMetadata.title,
            summary: fullStreamedText,
            keyPoints: structured.keyPoints,
            whoItAffects: structured.whoItAffects,
            whatItDoes: structured.whatItDoes,
            whyItMatters: structured.whyItMatters,
            affectedIndustries: structured.affectedIndustries,
            readingLevel: readingAnalysis.gradeLevel,
            confidence: structured.confidence,
            lastUpdated: new Date().toISOString(),
            source: 'ai-generated',
          };

          // Cache asynchronously (don't block the response)
          BillSummaryCache.storeSummary(billId, summary, textHash, {
            priority: 'medium',
          }).catch((err: unknown) => {
            logger.warn('Failed to cache streamed summary', {
              billId,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          });

          const responseTime = Date.now() - startTime;

          // Send complete event
          const completeEvent = `data: ${JSON.stringify({
            type: 'complete',
            summary,
            metadata: {
              cached: false,
              responseTime,
              readingLevel: summary.readingLevel,
              confidence: summary.confidence,
              plainLanguage: PLAIN_LANGUAGE_ATTRIBUTION,
            },
          })}\n\n`;
          controller.enqueue(encoder.encode(completeEvent));

          logger.info('Streaming bill summary completed', {
            billId,
            responseTime,
            readingLevel: summary.readingLevel,
            confidence: summary.confidence,
            operation: 'bill_summary_stream',
          });

          controller.close();
        } catch (error) {
          logger.error('Streaming summary failed mid-stream', error as Error, {
            billId,
            operation: 'bill_summary_stream',
          });

          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            message: 'Summary generation failed',
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const { billId: errorBillId } = await params;

    logger.error('Streaming bill summary request failed', error as Error, {
      billId: errorBillId,
      responseTime,
      operation: 'bill_summary_stream',
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
 * Parse the structured JSON response from the extraction call
 */
function parseStructuredResponse(response: string): {
  keyPoints: string[];
  whoItAffects: string[];
  whatItDoes: string;
  whyItMatters: string;
  affectedIndustries: IndustrySector[];
  confidence: number;
} {
  const validSectors = new Set(Object.values(IndustrySector));
  const defaults = {
    keyPoints: [] as string[],
    whoItAffects: [] as string[],
    whatItDoes: '',
    whyItMatters: '',
    affectedIndustries: [] as IndustrySector[],
    confidence: 0.8,
  };

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return defaults;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : defaults.keyPoints,
      whoItAffects: Array.isArray(parsed.whoItAffects)
        ? parsed.whoItAffects
        : defaults.whoItAffects,
      whatItDoes: typeof parsed.whatItDoes === 'string' ? parsed.whatItDoes : defaults.whatItDoes,
      whyItMatters:
        typeof parsed.whyItMatters === 'string' ? parsed.whyItMatters : defaults.whyItMatters,
      affectedIndustries: Array.isArray(parsed.affectedIndustries)
        ? parsed.affectedIndustries.filter(
            (v: unknown): v is IndustrySector =>
              typeof v === 'string' && validSectors.has(v as IndustrySector)
          )
        : defaults.affectedIndustries,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : defaults.confidence,
    };
  } catch {
    logger.warn('Failed to parse structured extraction response', {
      responseLength: response.length,
      operation: 'bill_summary_stream',
    });
    return defaults;
  }
}
