/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Diagnostic route for MR7 (`PROMPT-MR7-analyzer-timeout-rootcause.md`).
 *
 * Runs a single analyzer for a single rep and returns the phase timings
 * captured by `createPhaseTimer` inline in the HTTP response. Needed because
 * production Vercel logs aren't reachable from every deploy context and the
 * `logger.info` emissions alone can't answer "which phase burned the 55s
 * budget?" without log access.
 *
 * Remove (or gate behind an admin token) once MR7 lands and steady-state
 * production timings are known.
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeVoteFinance } from '@/lib/intelligence/analyzers/vote-finance-analyzer';
import { analyzeVotePrediction } from '@/lib/intelligence/analyzers/vote-prediction-analyzer';
import { analyzeFinanceJurisdiction } from '@/lib/intelligence/analyzers/finance-jurisdiction-analyzer';
import { analyzeInfluenceChains } from '@/lib/intelligence/analyzers/influence-chain-analyzer';
import { getLastPhases } from '@/lib/intelligence/analyzers/shared';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ANALYZERS: Record<
  string,
  { run: (id: string) => Promise<unknown>; label: (id: string) => string }
> = {
  'vote-finance': {
    run: analyzeVoteFinance,
    label: id => `[VoteFinance] ${id}`,
  },
  'vote-prediction': {
    run: analyzeVotePrediction,
    label: id => `[VotePrediction] ${id}`,
  },
  'finance-jurisdiction': {
    run: analyzeFinanceJurisdiction,
    label: id => `[FinanceJurisdiction] ${id}`,
  },
  'influence-chain': {
    run: analyzeInfluenceChains,
    label: id => `[InfluenceChain] ${id}`,
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string; analyzer: string }> }
) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { bioguideId, analyzer } = await params;
  const entry = ANALYZERS[analyzer];
  if (!entry) {
    return NextResponse.json(
      { error: `Unknown analyzer '${analyzer}'`, valid: Object.keys(ANALYZERS) },
      { status: 400 }
    );
  }

  const start = Date.now();
  let status: 'ok' | 'error' | 'timeout' = 'ok';
  let errorMessage: string | undefined;
  let hasResult = false;

  try {
    const result = await entry.run(bioguideId);
    hasResult = result !== null && result !== undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errorMessage = message;
    status = message.includes('timed out') ? 'timeout' : 'error';
  }

  const elapsedMs = Date.now() - start;
  const phases = getLastPhases(entry.label(bioguideId)) ?? [];

  return NextResponse.json({
    bioguideId,
    analyzer,
    status,
    elapsedMs,
    hasResult,
    errorMessage,
    phases,
  });
}
