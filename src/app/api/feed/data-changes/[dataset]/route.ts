/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Per-Dataset Data Changes Feed
 *
 * Atom 1.0 feed of detected changes for a single bulk dataset.
 *
 * GET /api/feed/data-changes/{dataset}
 */

import { NextResponse } from 'next/server';
import { generateAtomFeed } from '@/lib/feeds/atom-generator';
import type { AtomFeedConfig, AtomEntry } from '@/lib/feeds/atom-generator';
import { getDatasetDiffs } from '@/lib/datasets/regenerate-with-diff';
import { getDatasetBySlug, DATASET_REGISTRY } from '@/lib/datasets';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dataset: string }> }
): Promise<NextResponse> {
  const { dataset: slug } = await params;

  const generator = getDatasetBySlug(slug);
  if (!generator) {
    const available = DATASET_REGISTRY.map(d => d.slug);
    return NextResponse.json(
      { error: `Dataset "${slug}" not found. Available: ${available.join(', ')}` },
      { status: 404 }
    );
  }

  try {
    const diffs = await getDatasetDiffs(slug);

    // Flatten diff entries into Atom entries
    const entries: AtomEntry[] = [];
    for (const diff of diffs) {
      for (const entry of diff.entries) {
        entries.push({
          id: `urn:civiq:data-change:${entry.dataset}:${entry.key}:${entry.detectedAt}`,
          title: entry.summary,
          link: `https://civdotiq.org/api/download/${slug}?format=json`,
          updated: new Date(entry.detectedAt),
          summary: entry.summary,
          categories: [{ term: entry.type, label: entry.type }],
        });
      }
    }

    // Sort by date, newest first
    entries.sort((a, b) => b.updated.getTime() - a.updated.getTime());

    const config: AtomFeedConfig = {
      id: `urn:civiq:feed:data-changes:${slug}`,
      title: `CIV.IQ Data Changes: ${generator.name}`,
      subtitle: `Detected changes in the ${generator.name} dataset`,
      link: `https://civdotiq.org/api/download/${slug}?format=json`,
      selfLink: `https://civdotiq.org/api/feed/data-changes/${slug}`,
      updated: entries[0]?.updated ?? new Date(),
      author: { name: 'CIV.IQ', uri: 'https://civdotiq.org' },
      rights: 'Public Domain',
      generator: { name: 'CIV.IQ', uri: 'https://civdotiq.org', version: '1.0' },
    };

    const xml = generateAtomFeed(config, entries);

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/atom+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    logger.error('Per-dataset change feed error', error as Error, { dataset: slug });
    return new NextResponse(
      '<feed xmlns="http://www.w3.org/2005/Atom"><title>Error</title></feed>',
      {
        status: 500,
        headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
      }
    );
  }
}
