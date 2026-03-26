/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Federal Register Preamble Extraction
 *
 * Extracts structured facts (industry impacts, cost estimates, timelines)
 * from Federal Register document preambles.
 *
 * Endpoint: GET /api/intelligence/federal-register/[documentNumber]
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { extractPreambleFacts } from '@/lib/intelligence/analyzers/federal-register-extractor';
import type { PreambleExtractionInsight } from '@/types/federal-register';
import type { InsightError } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// FR document numbers follow YYYY-NNNNN pattern (e.g., "2025-12345")
const DOCUMENT_NUMBER_PATTERN = /^\d{4}-\d{1,6}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentNumber: string }> }
): Promise<NextResponse<PreambleExtractionInsight | { error: string }>> {
  const { documentNumber } = await params;

  if (!documentNumber || typeof documentNumber !== 'string') {
    return NextResponse.json({ error: 'Document number is required' }, { status: 400 });
  }

  if (!DOCUMENT_NUMBER_PATTERN.test(documentNumber)) {
    return NextResponse.json(
      {
        error: `Invalid document number format: ${documentNumber}. Expected YYYY-NNNNN (e.g., 2025-12345).`,
      },
      { status: 400 }
    );
  }

  try {
    logger.info('[Intelligence] Preamble extraction request', { documentNumber });

    const insight = await extractPreambleFacts(documentNumber);

    if (!insight) {
      return NextResponse.json(
        {
          error: 'Insufficient data for preamble extraction',
          errors: [] as InsightError[],
          status: 'unavailable' as const,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ...insight, errors: [] as InsightError[], status: 'complete' as const },
      {
        headers: {
          // 24-hour CDN cache — preamble content is immutable
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    logger.error('[Intelligence] Preamble extraction error', error as Error, { documentNumber });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
