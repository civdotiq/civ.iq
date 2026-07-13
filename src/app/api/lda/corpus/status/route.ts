/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Freshness status for the committed LDA corpus (data/lda-aggregates.json).
 *
 * Reads only the small meta sidecar written by scripts/sync-lda-corpus.ts, so
 * the health canary and dashboards can check when the mirror last ran and how
 * recent its newest filing is — without loading the multi-MB corpus. Returns
 * `status: "unavailable"` (HTTP 200) when the corpus has never been generated,
 * per the real-data-or-unavailable rule.
 */

import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const dynamic = 'force-dynamic';

interface CorpusMeta {
  generatedAt: string;
  latestFilingPosted: string | null;
  quarters: string[];
  committeeQuarters: number;
  issueQuarters: number;
  meta: {
    totalFilingsFetched: number;
    reportFilingsUsed: number;
    gatedFilingCount: number;
    committeeMatch: string;
  };
}

async function loadMeta(): Promise<CorpusMeta | null> {
  try {
    const raw = await readFile(join(process.cwd(), 'data/lda-aggregates.meta.json'), 'utf8');
    return JSON.parse(raw) as CorpusMeta;
  } catch {
    return null;
  }
}

export async function GET() {
  const meta = await loadMeta();
  if (!meta) {
    return NextResponse.json(
      {
        status: 'unavailable',
        message: 'LDA corpus has not been generated yet. Run the lda-corpus-mirror workflow.',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const generatedAgeHours = (Date.now() - new Date(meta.generatedAt).getTime()) / (1000 * 60 * 60);

  return NextResponse.json(
    {
      status: 'ok',
      generatedAt: meta.generatedAt,
      generatedAgeHours: Math.round(generatedAgeHours),
      latestFilingPosted: meta.latestFilingPosted,
      quarters: meta.quarters,
      committeeQuarters: meta.committeeQuarters,
      issueQuarters: meta.issueQuarters,
      reportFilingsUsed: meta.meta.reportFilingsUsed,
      gatedFilingCount: meta.meta.gatedFilingCount,
      committeeMatch: meta.meta.committeeMatch,
    },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } }
  );
}
