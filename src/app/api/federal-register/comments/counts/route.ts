/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { regulationsGovService } from '@/lib/data-sources/regulations-gov-service';
import { batchPromises } from '@/lib/api/middleware';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

const MAX_DOCUMENTS = 60;

interface CountsResponse {
  success: boolean;
  counts: Record<string, number>;
  metadata: { dataSource: string; generatedAt: string };
  error?: string;
}

/**
 * Batch comment-count lookup for Federal Register documents.
 *
 * Resolves the public-comment total for each document number in one request,
 * replacing the per-item client fan-out on the comment-periods page. The
 * underlying searchDocuments/getCommentStats calls are Redis-cached, and the
 * fan-out is concurrency-limited server-side instead of jittered in the browser.
 *
 * @example
 * POST /api/federal-register/comments/counts
 * { "documentNumbers": ["2025-12345", "2025-67890"] }
 * -> { success: true, counts: { "2025-12345": 412, "2025-67890": 0 } }
 */
export async function POST(request: NextRequest): Promise<NextResponse<CountsResponse>> {
  const generatedAt = new Date().toISOString();
  const base = { metadata: { dataSource: 'regulations.gov', generatedAt } };

  let documentNumbers: string[] = [];
  try {
    const body = await request.json();
    const raw = (body as { documentNumbers?: unknown })?.documentNumbers;
    if (!Array.isArray(raw)) {
      return NextResponse.json(
        { success: false, counts: {}, ...base, error: 'documentNumbers must be an array' },
        { status: 400 }
      );
    }
    // Sanitize: strings only, trimmed, deduped, capped.
    documentNumbers = Array.from(
      new Set(
        raw
          .filter((d): d is string => typeof d === 'string')
          .map(d => d.trim())
          .filter(Boolean)
      )
    ).slice(0, MAX_DOCUMENTS);
  } catch {
    return NextResponse.json(
      { success: false, counts: {}, ...base, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (documentNumbers.length === 0) {
    return NextResponse.json({ success: true, counts: {}, ...base });
  }

  // No API key: return empty counts (the badge treats absence as "unknown").
  if (!process.env.DATA_GOV_API_KEY) {
    return NextResponse.json({ success: true, counts: {}, ...base });
  }

  try {
    const results = await batchPromises(
      documentNumbers,
      async documentNumber => {
        const documents = await regulationsGovService.searchDocuments({
          searchTerm: documentNumber,
          pageSize: 5,
        });
        const docketId = documents[0]?.docketId;
        if (!docketId) return { documentNumber, count: 0 };
        const stats = await regulationsGovService.getCommentStats(docketId);
        return { documentNumber, count: stats?.total ?? 0 };
      },
      { batchSize: 5, delayMs: 100 }
    );

    const counts: Record<string, number> = {};
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        counts[result.value.documentNumber] = result.value.count;
      }
    }

    return NextResponse.json({ success: true, counts, ...base });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Federal Register comment-counts batch failed', error as Error, {
      requested: documentNumbers.length,
    });
    return NextResponse.json(
      { success: false, counts: {}, ...base, error: errorMessage },
      { status: 500 }
    );
  }
}
