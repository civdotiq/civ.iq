/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Data Changes Feed (All Datasets)
 *
 * Atom 1.0 feed of detected changes across all bulk datasets.
 * History is ephemeral — older entries expire when Redis TTL runs out.
 *
 * GET /api/feed/data-changes
 */

import { NextResponse } from 'next/server';
import { generateAtomFeed } from '@/lib/feeds/atom-generator';
import type { AtomFeedConfig, AtomEntry } from '@/lib/feeds/atom-generator';
import { getAllDatasetDiffs } from '@/lib/datasets/regenerate-with-diff';
import { DATASET_REGISTRY } from '@/lib/datasets';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const diffs = await getAllDatasetDiffs();

    // Build dataset name lookup
    const nameMap = new Map(DATASET_REGISTRY.map(d => [d.slug, d.name]));

    // Convert diff entries to Atom entries
    const entries: AtomEntry[] = [];
    for (const diff of diffs) {
      for (const entry of diff.entries) {
        entries.push({
          id: `urn:civiq:data-change:${entry.dataset}:${entry.key}:${entry.detectedAt}`,
          title: `[${nameMap.get(entry.dataset) ?? entry.dataset}] ${entry.summary}`,
          link: `https://civdotiq.org/api/download/${entry.dataset}?format=json`,
          updated: new Date(entry.detectedAt),
          summary: entry.summary,
          categories: [
            { term: entry.type, label: entry.type },
            { term: entry.dataset, label: nameMap.get(entry.dataset) ?? entry.dataset },
          ],
        });
      }
    }

    // Sort by date, newest first, cap at 200
    entries.sort((a, b) => b.updated.getTime() - a.updated.getTime());
    const capped = entries.slice(0, 200);

    const config: AtomFeedConfig = {
      id: 'urn:civiq:feed:data-changes',
      title: 'CIV.IQ Data Changes',
      subtitle: 'Detected changes across all CIV.IQ bulk datasets',
      link: 'https://civdotiq.org/open',
      selfLink: 'https://civdotiq.org/api/feed/data-changes',
      updated: capped[0]?.updated ?? new Date(),
      author: { name: 'CIV.IQ', uri: 'https://civdotiq.org' },
      rights: 'Public Domain',
      generator: { name: 'CIV.IQ', uri: 'https://civdotiq.org', version: '1.0' },
    };

    const xml = generateAtomFeed(config, capped);

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/atom+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    logger.error('Data changes feed error', error as Error);
    return new NextResponse(
      '<feed xmlns="http://www.w3.org/2005/Atom"><title>Error</title></feed>',
      {
        status: 500,
        headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
      }
    );
  }
}
