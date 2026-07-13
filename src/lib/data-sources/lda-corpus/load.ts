/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Request-time reader for the committed LDA corpus (data/lda-aggregates.json,
 * built by scripts/sync-lda-corpus.ts). Loads once per process and caches the
 * parsed aggregates plus a committee-code index. Returns null gracefully when
 * the corpus has not been generated yet (real-data-or-unavailable rule).
 *
 * Serves corpus-backed dollar TOTALS only. Top-org lists are intentionally not
 * exposed here: LDA client.id is per firm-relationship, so corpus topOrgs
 * fragment a client across the firms it hires — that needs entity resolution
 * (PLAN-lobbying-corpus-2026-07.md Phase 2 follow-up) before display.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CommitteeQuarterAgg, IssueQuarterAgg, LdaAggregates } from './types';

interface CorpusIndex {
  aggregates: LdaAggregates;
  /** committeeCode → its quarter rows, oldest quarter first. */
  byCommittee: Map<string, CommitteeQuarterAgg[]>;
  /** committeeCode → window total (sum across quarters). */
  committeeWindowTotal: Map<string, number>;
  /** Median committee window total, for peer baselines. */
  peerMedianTotal: number;
  /** LDA issue code → its quarter rows, oldest quarter first. */
  byIssue: Map<string, IssueQuarterAgg[]>;
}

// undefined = not yet loaded; null = corpus unavailable.
let cache: CorpusIndex | null | undefined;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function buildIndex(aggregates: LdaAggregates): CorpusIndex {
  const byCommittee = new Map<string, CommitteeQuarterAgg[]>();
  for (const row of aggregates.committees) {
    const rows = byCommittee.get(row.committeeCode) ?? [];
    rows.push(row);
    byCommittee.set(row.committeeCode, rows);
  }
  const committeeWindowTotal = new Map<string, number>();
  for (const [code, rows] of byCommittee) {
    rows.sort((a, b) => a.quarter.localeCompare(b.quarter));
    committeeWindowTotal.set(
      code,
      rows.reduce((sum, r) => sum + r.total, 0)
    );
  }
  const byIssue = new Map<string, IssueQuarterAgg[]>();
  for (const row of aggregates.issues) {
    const rows = byIssue.get(row.code) ?? [];
    rows.push(row);
    byIssue.set(row.code, rows);
  }
  for (const rows of byIssue.values()) rows.sort((a, b) => a.quarter.localeCompare(b.quarter));
  return {
    aggregates,
    byCommittee,
    committeeWindowTotal,
    peerMedianTotal: median([...committeeWindowTotal.values()]),
    byIssue,
  };
}

async function loadIndex(): Promise<CorpusIndex | null> {
  if (cache !== undefined) return cache;
  try {
    const raw = await readFile(join(process.cwd(), 'data/lda-aggregates.json'), 'utf8');
    cache = buildIndex(JSON.parse(raw) as LdaAggregates);
  } catch {
    cache = null;
  }
  return cache;
}

export interface CommitteeCorpusTotals {
  committeeCode: string;
  committeeName: string;
  /** Total reported LD-2 spend on filings disclosing this committee, across the window. */
  windowTotal: number;
  quarterly: Array<{ quarter: string; total: number }>;
  topIssues: CommitteeQuarterAgg['topIssues'];
  /** Peer baseline: this committee's window total vs the median committee's. */
  peer: { medianTotal: number; ratioToMedian: number };
}

/** Corpus-backed totals for one committee code, or null if absent/unavailable. */
export async function getCommitteeCorpusTotals(
  committeeCode: string
): Promise<CommitteeCorpusTotals | null> {
  const idx = await loadIndex();
  if (!idx) return null;
  const rows = idx.byCommittee.get(committeeCode);
  if (!rows || rows.length === 0) return null;

  const windowTotal = idx.committeeWindowTotal.get(committeeCode) ?? 0;
  // Latest quarter's issues are the most representative snapshot.
  const topIssues = rows[rows.length - 1]!.topIssues;
  return {
    committeeCode,
    committeeName: rows[0]!.committeeName,
    windowTotal,
    quarterly: rows.map(r => ({ quarter: r.quarter, total: r.total })),
    topIssues,
    peer: {
      medianTotal: idx.peerMedianTotal,
      ratioToMedian: idx.peerMedianTotal > 0 ? windowTotal / idx.peerMedianTotal : 0,
    },
  };
}

export interface SectorCorpusTotals {
  /** Sum across the sector's issue codes and quarters. Filings citing several of
   *  the sector's issues count once per issue, so this is spending on filings
   *  touching the sector's issue areas, not a deduped partition. */
  windowTotal: number;
  quarterly: Array<{ quarter: string; total: number }>;
  byIssue: Array<{ code: string; label: string; windowTotal: number }>;
  quarters: string[];
}

/**
 * Corpus-backed lobbying totals for a sector, given its LDA issue codes
 * (map a sector to codes with getSectorIssueCodes). Returns null if the corpus
 * is unavailable or none of the codes appear in it.
 */
export async function getSectorCorpusTotals(
  issueCodes: string[]
): Promise<SectorCorpusTotals | null> {
  const idx = await loadIndex();
  if (!idx) return null;

  const quarterTotals = new Map<string, number>();
  const byIssue: SectorCorpusTotals['byIssue'] = [];
  for (const code of issueCodes) {
    const rows = idx.byIssue.get(code);
    if (!rows || rows.length === 0) continue;
    let issueTotal = 0;
    for (const r of rows) {
      quarterTotals.set(r.quarter, (quarterTotals.get(r.quarter) ?? 0) + r.total);
      issueTotal += r.total;
    }
    byIssue.push({ code, label: rows[0]!.label, windowTotal: issueTotal });
  }
  if (byIssue.length === 0) return null;

  byIssue.sort((a, b) => b.windowTotal - a.windowTotal);
  const quarterly = idx.aggregates.quarters.map(q => ({
    quarter: q,
    total: quarterTotals.get(q) ?? 0,
  }));
  return {
    windowTotal: [...quarterTotals.values()].reduce((a, b) => a + b, 0),
    quarterly,
    byIssue,
    quarters: idx.aggregates.quarters,
  };
}

/** Corpus metadata (quarters covered, freshness) or null if unavailable. */
export async function getCorpusMeta(): Promise<Pick<
  LdaAggregates,
  'quarters' | 'generatedAt' | 'latestFilingPosted'
> | null> {
  const idx = await loadIndex();
  if (!idx) return null;
  const { quarters, generatedAt, latestFilingPosted } = idx.aggregates;
  return { quarters, generatedAt, latestFilingPosted };
}

/** Test-only: reset the module cache between cases. */
export function __resetCorpusCache(): void {
  cache = undefined;
}
