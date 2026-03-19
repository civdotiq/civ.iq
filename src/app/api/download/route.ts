/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Dataset Catalog API
 *
 * Lists all available bulk datasets with descriptions, row counts,
 * and download URLs in both CSV and JSON formats.
 *
 * GET /api/download
 */

import { NextResponse } from 'next/server';
import { DATASET_REGISTRY } from '@/lib/datasets';

export const dynamic = 'force-dynamic';

export async function GET() {
  const datasets = DATASET_REGISTRY.map(d => ({
    slug: d.slug,
    name: d.name,
    description: d.description,
    source: d.source,
    sourceUrl: d.sourceUrl,
    approximateRows: d.approximateRows,
    downloads: {
      csv: `/api/download/${d.slug}?format=csv`,
      json: `/api/download/${d.slug}?format=json`,
    },
  }));

  return NextResponse.json({
    name: 'CIV.IQ Bulk Datasets',
    description:
      'Downloadable civic datasets from official government sources. No API key required.',
    license: 'Public Domain',
    datasets,
  });
}
