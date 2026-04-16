/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Calibration endpoint for the lobbying matcher's embedding threshold.
 *
 * Returns per-committee similarity scores so we can validate or tune the
 * SIMILARITY_THRESHOLD constant in `src/lib/data-sources/senate-lobbying-api.ts`.
 *
 * Dev-only — gated by NODE_ENV check.
 *
 * Usage:
 *   npm run dev
 *   curl -s http://localhost:3000/api/debug/calibrate-lobbying | jq
 *
 * If this endpoint returns `embedding pipeline failed to load`, see
 * `docs/EMBEDDING-PIPELINE-BROKEN-2026-04.md` — the transformers WASM
 * loader is broken in current Node/Next combinations and the embedding
 * tier is disabled in production as a result.
 */

import { NextResponse } from 'next/server';
import { embedText } from '@/lib/intelligence/embeddings/embedding-classifier';
import { cosineSimilarity } from '@/lib/intelligence/embeddings/cosine-similarity';
import {
  getAllLDAIssueCodes,
  getLDAIssueLabel,
} from '@/lib/intelligence/entity-resolution/lda-issue-policy-map';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const THRESHOLD_UNDER_TEST = 0.4;
const COMMITTEE_PROMPT = (name: string) =>
  `Congressional committee on ${name} jurisdiction and policy`;

const CALIBRATION_SET: Array<{ committee: string; expectedCodes: string[] }> = [
  { committee: 'Special Committee on Aging', expectedCodes: ['RET', 'MMM'] },
  { committee: 'Subcommittee on Space and Aeronautics', expectedCodes: ['AER', 'SCI'] },
  { committee: 'Joint Committee on Taxation', expectedCodes: ['TAX'] },
  { committee: 'Subcommittee on Conservation and Forestry', expectedCodes: ['NAT', 'AGR'] },
  { committee: 'Subcommittee on Border Security', expectedCodes: ['HOM', 'IMM'] },
  { committee: 'Subcommittee on Trade', expectedCodes: ['TRD'] },
  { committee: 'Subcommittee on Disaster Management', expectedCodes: ['DIS', 'HOM'] },
  { committee: 'Subcommittee on Tourism', expectedCodes: ['TOU'] },
];

export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'dev-only endpoint' }, { status: 403 });
  }

  const codes = getAllLDAIssueCodes();
  const labelEmbeddings: Array<{ code: string; label: string; embedding: Float32Array }> = [];
  for (const code of codes) {
    const label = getLDAIssueLabel(code);
    const embedding = await embedText(label);
    if (embedding) labelEmbeddings.push({ code, label, embedding });
  }

  if (labelEmbeddings.length === 0) {
    return NextResponse.json(
      { error: 'embedding pipeline failed to load — check server logs' },
      { status: 500 }
    );
  }

  const results: Array<{
    committee: string;
    expectedCodes: string[];
    top5: Array<{ code: string; label: string; similarity: number; expected: boolean }>;
    worstExpectedSimilarity: number;
    bestUnrelatedSimilarity: number;
    expectedHitsThreshold: boolean;
    unexpectedAboveThreshold: Array<{ code: string; similarity: number }>;
  }> = [];

  for (const { committee, expectedCodes } of CALIBRATION_SET) {
    const committeeEmbedding = await embedText(COMMITTEE_PROMPT(committee));
    if (!committeeEmbedding) continue;

    const scored = labelEmbeddings
      .map(entry => ({
        code: entry.code,
        label: entry.label,
        similarity: cosineSimilarity(committeeEmbedding, entry.embedding),
        expected: expectedCodes.includes(entry.code),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    const expected = scored.filter(s => s.expected);
    const worstExpected = expected.length > 0 ? Math.min(...expected.map(e => e.similarity)) : 0;
    const bestUnrelated = scored.find(s => !s.expected)?.similarity ?? 0;
    const unexpectedAbove = scored
      .filter(s => !s.expected && s.similarity >= THRESHOLD_UNDER_TEST)
      .map(s => ({ code: s.code, similarity: Number(s.similarity.toFixed(3)) }));

    results.push({
      committee,
      expectedCodes,
      top5: scored.slice(0, 5).map(s => ({
        code: s.code,
        label: s.label,
        similarity: Number(s.similarity.toFixed(3)),
        expected: s.expected,
      })),
      worstExpectedSimilarity: Number(worstExpected.toFixed(3)),
      bestUnrelatedSimilarity: Number(bestUnrelated.toFixed(3)),
      expectedHitsThreshold: worstExpected >= THRESHOLD_UNDER_TEST,
      unexpectedAboveThreshold: unexpectedAbove,
    });
  }

  const minExpected = Math.min(...results.map(r => r.worstExpectedSimilarity));
  const maxUnrelated = Math.max(...results.map(r => r.bestUnrelatedSimilarity));
  const failures = results.filter(r => !r.expectedHitsThreshold);

  return NextResponse.json({
    thresholdUnderTest: THRESHOLD_UNDER_TEST,
    summary: {
      minExpectedSimilarity: Number(minExpected.toFixed(3)),
      maxUnrelatedSimilarity: Number(maxUnrelated.toFixed(3)),
      failures: failures.length,
      totalCases: results.length,
      verdict:
        failures.length === 0
          ? `PASS — all expected codes clear ${THRESHOLD_UNDER_TEST}`
          : `FAIL — ${failures.length} case(s) below threshold; lower to ≤${minExpected.toFixed(3)} or expand keyword table`,
    },
    results,
  });
}
