/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bulk Dataset Download API
 *
 * Serves downloadable CSV and JSON datasets of civic data.
 * Each dataset is generated on-demand with ISR caching.
 *
 * GET /api/download/{dataset}?format=csv|json
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatasetBySlug, DATASET_REGISTRY } from '@/lib/datasets';
import { streamDataset, getContentType } from '@/lib/datasets/format';
import { regenerateWithDiff } from '@/lib/datasets/regenerate-with-diff';
import type { FormatType } from '@/types/dataset';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dataset: string }> }
) {
  const { dataset: slug } = await params;
  const format = (request.nextUrl.searchParams.get('format') || 'csv') as FormatType;

  if (format !== 'csv' && format !== 'json') {
    return NextResponse.json(
      { error: 'Invalid format. Use ?format=csv or ?format=json' },
      { status: 400 }
    );
  }

  const generator = getDatasetBySlug(slug);
  if (!generator) {
    const available = DATASET_REGISTRY.map(d => d.slug);
    return NextResponse.json(
      { error: `Dataset "${slug}" not found. Available: ${available.join(', ')}` },
      { status: 404 }
    );
  }

  try {
    const result = await regenerateWithDiff(generator);

    // Some datasets (campaign-finance) are pre-generated via cron.
    // Return 202 if the data isn't ready yet.
    if (!result) {
      return NextResponse.json(
        {
          error: 'Dataset is still being generated. Please try again later.',
          dataset: slug,
          hint: 'This dataset is pre-generated daily. It may not be available immediately after deployment.',
        },
        { status: 202 }
      );
    }

    if (result.data.length === 0) {
      return NextResponse.json(
        {
          error: 'Dataset has no records. The upstream data source may be temporarily unavailable.',
          dataset: slug,
          source: generator.source,
        },
        { status: 503 }
      );
    }

    const date = new Date().toISOString().split('T')[0];
    const extension = format === 'csv' ? 'csv' : 'json';
    const filename = `${slug}-${date}.${extension}`;

    logger.info('Dataset download served', {
      dataset: slug,
      format,
      recordCount: result.metadata.recordCount,
      operation: 'dataset_download',
    });

    // Streamed rather than serialized into one string. The complete lobbying
    // corpus is ~124,000 rows and ~28 MB of CSV; buffering that holds the whole
    // payload in function memory and pushes the response past what a serverless
    // function should be handing back in one piece.
    const chunks = streamDataset(result, format);
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        const next = chunks.next();
        if (next.done) controller.close();
        else controller.enqueue(encoder.encode(next.value));
      },
      cancel() {
        chunks.return(undefined);
      },
    });

    return new NextResponse(body, {
      headers: {
        'Content-Type': getContentType(format),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        Vary: 'Accept-Encoding',
      },
    });
  } catch (error) {
    logger.error('Dataset generation failed', error as Error, {
      dataset: slug,
      format,
      operation: 'dataset_download',
    });

    return NextResponse.json({ error: 'Failed to generate dataset' }, { status: 500 });
  }
}
