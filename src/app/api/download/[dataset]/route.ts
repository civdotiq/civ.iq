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
import { formatDataset, getContentType } from '@/lib/datasets/format';
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

    const content = formatDataset(result, format);
    const date = new Date().toISOString().split('T')[0];
    const extension = format === 'csv' ? 'csv' : 'json';
    const filename = `${slug}-${date}.${extension}`;

    logger.info('Dataset download served', {
      dataset: slug,
      format,
      recordCount: result.metadata.recordCount,
      operation: 'dataset_download',
    });

    return new NextResponse(content, {
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
