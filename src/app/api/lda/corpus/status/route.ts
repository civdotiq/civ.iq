/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Freshness status for the committed LDA corpus.
 *
 * The mirror emits two artifacts: aggregate totals (data/lda-aggregates.json)
 * and the filing-level rows the analyzers read (data/lda-filings.json.br). Both
 * come from one run, so a difference in their generatedAt means one of them was
 * committed without the other and they now describe different sets of filings —
 * reported here as `drift`, since nothing downstream can detect it after the
 * fact.
 *
 * Reads only the small meta sidecars, so the health canary and dashboards never
 * load the multi-MB corpus. Returns `status: "unavailable"` (HTTP 200) when the
 * corpus has never been generated, per the real-data-or-unavailable rule.
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

interface FilingsMeta {
  generatedAt: string;
  latestFilingPosted: string | null;
  quarters: string[];
  rows: number;
  compressedBytes: number;
}

async function readSidecar<T>(fileName: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(join(process.cwd(), 'data', fileName), 'utf8')) as T;
  } catch {
    return null;
  }
}

const loadMeta = (): Promise<CorpusMeta | null> =>
  readSidecar<CorpusMeta>('lda-aggregates.meta.json');

export async function GET() {
  const [meta, filings] = await Promise.all([
    loadMeta(),
    readSidecar<FilingsMeta>('lda-filings.meta.json'),
  ]);
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
      filings: filings
        ? {
            status: filings.generatedAt === meta.generatedAt ? 'ok' : 'drift',
            generatedAt: filings.generatedAt,
            rows: filings.rows,
            quarters: filings.quarters,
            compressedBytes: filings.compressedBytes,
          }
        : { status: 'unavailable' },
    },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } }
  );
}
