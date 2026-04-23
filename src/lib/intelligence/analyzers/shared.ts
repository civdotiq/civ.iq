/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Shared utilities for intelligence analyzers.
 *
 * Deduplicates common logic: FEC cycle computation, committee fuzzy matching,
 * bill sector classification, and AI narrative generation with retry/fallback.
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { generateAIText } from '@/lib/ai/provider';
import { PLAIN_LANGUAGE_SYSTEM_PROMPT } from '@/lib/ai/plain-language';
import { ReadingLevelValidator } from '@/features/legislation/services/ai/reading-level-validator';
import { BillSummaryCache } from '@/features/legislation/services/ai/bill-summary-cache';
import {
  ALL_COMMITTEE_MAPPINGS,
  type CommitteeMapping,
} from '@/lib/connections/committee-agency-map';
import { getIndustrySectorsForPolicyArea } from '@/lib/connections/policy-area-map';
import type { IndustrySector } from '@/lib/fec/industry-taxonomy';
import { classifyBillSectors } from '@/lib/intelligence/embeddings';
import { classifyBillSectorsZeroShot } from '@/lib/intelligence/embeddings';
import { trackInsightRun, type AnalyzerName } from '@/lib/analytics/insight-tracker';

// ── Timeout Wrapper ─────────────────────────────────────────────────

/** Default analyzer timeout: 55 seconds (leaves 5s headroom for Vercel function overhead) */
export const ANALYZER_TIMEOUT_MS = 55_000;

/**
 * Phase timer for analyzer instrumentation.
 *
 * Emits a structured log line on every `mark()` so phase-level durations
 * survive even when the outer `withTimeout` race fires — the analyzer keeps
 * running in the background after a timeout is declared, so per-phase logs
 * are the only way to see *which* phase burned the budget in production.
 *
 * Introduced for MR7 (`PROMPT-MR7-analyzer-timeout-rootcause.md`) to root-cause
 * uniform 55000ms timeouts on vote-finance + vote-prediction. Remove when the
 * root cause is fixed and steady-state production timings are known.
 */
export function createPhaseTimer(label: string) {
  const start = performance.now();
  let lastMark = start;
  return {
    mark(phase: string, meta?: Record<string, unknown>) {
      const now = performance.now();
      const phaseMs = Math.round(now - lastMark);
      const cumulativeMs = Math.round(now - start);
      logger.info(`${label} [timing]`, { phase, phaseMs, cumulativeMs, ...meta });
      lastMark = now;
    },
  };
}

/**
 * Race a promise against a timeout. Individual service calls already have
 * their own timeouts (10-30s), but this catches accumulated latency when
 * multiple sequential calls add up.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(`[${label}] Analyzer timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]);
}

// ── Source Data Freshness ──────────────────────────────────────────

/**
 * Returns the most recent ISO date string from a list of candidate timestamps.
 * Filters out undefined/null/empty values.
 *
 * Use this for `dataAsOf` — it MUST reflect the freshest *source data*, not
 * analysis time. Returning "now" when no dates exist would tell citizens the
 * data is fresh when it isn't.
 *
 * Returns null if no valid dates are provided. Callers must either:
 * 1. Guarantee at least one valid date (most analyzers do via sample size guards), or
 * 2. Handle null by not creating the insight (return null from the analyzer).
 */
export function freshestDate(...dates: (string | undefined | null)[]): string | null {
  const valid = dates.filter((d): d is string => !!d && !isNaN(Date.parse(d)));
  if (valid.length === 0) {
    logger.warn('[freshestDate] No valid dates provided — returning null instead of current time');
    return null;
  }
  valid.sort((a, b) => Date.parse(b) - Date.parse(a));
  return valid[0]!;
}

// ── Signal Classification ────────────────────────────────────────────

import type { InsightSignal, InsightSource } from '../types';

export type { InsightSignal, InsightSource };

/**
 * Central signal classifier — derives signal type from insight data.
 * Keeps classification consistent across all analyzers.
 *
 * Rules:
 * - alert: value exceeds 2× peer average, or peer percentile > 90th / < 10th
 * - pattern: statistically significant finding (confidence ≥ 0.7)
 * - tracking: data present, trend observable, but not yet significant
 * - baseline: reference measurement, no notable deviation
 */
export function classifySignal(params: {
  /** The insight's primary metric (0-1 scale). */
  value?: number;
  /** Peer group average for comparison. */
  peerAverage?: number;
  /** Percentile rank among peers (0-100). */
  percentileRank?: number;
  /** Confidence score (0-1). */
  confidence: number;
  /** Whether an anomaly was explicitly flagged by the stats layer. */
  hasAnomaly?: boolean;
  /** Overall trend if available. */
  trend?: 'stable' | 'increasing' | 'decreasing' | 'volatile';
}): InsightSignal {
  // Explicit anomaly always wins
  if (params.hasAnomaly) return 'alert';

  // Extreme percentile rank
  if (params.percentileRank !== undefined) {
    if (params.percentileRank >= 90 || params.percentileRank <= 10) return 'alert';
  }

  // Value exceeds 2× peer average
  if (
    params.value !== undefined &&
    params.peerAverage !== undefined &&
    params.peerAverage > 0 &&
    params.value >= params.peerAverage * 2
  ) {
    return 'alert';
  }

  // Volatile trend is alert-worthy
  if (params.trend === 'volatile') return 'alert';

  // Confident finding is a pattern
  if (params.confidence >= 0.7) return 'pattern';

  // Some data but low confidence — tracking
  if (params.confidence >= 0.5) return 'tracking';

  // Everything else is baseline
  return 'baseline';
}

// ── Source Collector ─────────────────────────────────────────────────

/**
 * Accumulates data source citations during analyzer execution.
 * Call `add()` as each API responds, then `toSources()` to emit the array.
 */
export class SourceCollector {
  private entries: InsightSource[] = [];

  add(name: string, period: string, recordCount?: number): void {
    // Deduplicate by name — update if already tracked
    const existing = this.entries.find(e => e.name === name);
    if (existing) {
      existing.period = period;
      if (recordCount !== undefined) existing.recordCount = recordCount;
    } else {
      this.entries.push({ name, period, recordCount });
    }
  }

  toSources(): InsightSource[] {
    return [...this.entries];
  }

  get count(): number {
    return this.entries.length;
  }
}

// ── Error Classification (re-exported from error-utils) ─────────────

export { classifyError, insufficientDataError } from '../error-utils';

// ── FEC Election Cycle ──────────────────────────────────────────────

/**
 * Returns the current FEC election cycle year.
 * FEC cycles are even years — contributions in odd years belong to the next even year.
 */
export function getCurrentElectionCycle(): number {
  const year = new Date().getFullYear();
  return year % 2 === 0 ? year : year + 1;
}

// ── Committee Fuzzy Matching ────────────────────────────────────────

/**
 * Find the best matching committee mapping for a given committee name.
 * Uses bidirectional substring matching against ALL_COMMITTEE_MAPPINGS.
 */
export function findCommitteeMapping(committeeName: string): CommitteeMapping | undefined {
  const normalized = committeeName.toLowerCase();
  return ALL_COMMITTEE_MAPPINGS.find(
    m =>
      normalized.includes(m.committeeName.toLowerCase()) ||
      m.committeeName.toLowerCase().includes(normalized)
  );
}

// ── Bill Sector Classification ──────────────────────────────────────

/**
 * Redis cache for bill-sector classification results.
 *
 * Classification runs embeddings + zero-shot NLI — hundreds of ms per call
 * on a cold path. Reps overlap heavily on which bills they vote on, so
 * keying by billId alone makes the cache shared across every analyzer
 * (vote-finance, vote-prediction, influence-chain, influence-graph). Bills
 * are immutable once introduced, so a 30-day TTL is safe; bump the key
 * version if the classifier itself changes in a breaking way.
 */
const BILL_SECTORS_CACHE_TTL_S = 30 * 24 * 60 * 60;
const BILL_SECTORS_CACHE_PREFIX = 'insight:bill_sectors:v1:';

/**
 * Get industry sectors for a bill. Four-tier fallback:
 * 1. Cached AI summary (fastest, most accurate)
 * 2. Semantic embedding classification (cosine similarity, handles novel titles)
 * 3. Zero-shot NLI classification (NLI model, understands natural language)
 * 4. Keyword-based inference (static, always works)
 *
 * The resolved result is memoized in Redis under `insight:bill_sectors:v1:{billId}`
 * so the expensive classifier pipeline runs at most once per bill.
 */
export async function getBillSectors(billId: string, billTitle: string): Promise<IndustrySector[]> {
  const cacheKey = `${BILL_SECTORS_CACHE_PREFIX}${billId}`;

  try {
    const cached = await getRedisCache().get<IndustrySector[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached;
    }
  } catch {
    // Cache miss or error — fall through and compute
  }

  const sectors = await computeBillSectors(billId, billTitle);

  try {
    await getRedisCache().set(cacheKey, sectors, BILL_SECTORS_CACHE_TTL_S);
  } catch {
    // Non-fatal — classification still returns correctly
  }

  return sectors;
}

async function computeBillSectors(billId: string, billTitle: string): Promise<IndustrySector[]> {
  // Step 1: Cached AI summary
  try {
    const summary = await BillSummaryCache.getSummary(billId);
    if (summary?.affectedIndustries?.length) {
      return summary.affectedIndustries;
    }
  } catch {
    // Cache miss — try embedding classifier
  }

  // Step 2: Semantic embedding classification
  try {
    const embeddingResults = await classifyBillSectors(billTitle);
    if (embeddingResults.length > 0) {
      return embeddingResults.map(r => r.sector);
    }
  } catch {
    // Embedding failed — try zero-shot
  }

  // Step 3: Zero-shot NLI classification
  try {
    const zeroShotResults = await classifyBillSectorsZeroShot(billTitle);
    if (zeroShotResults.length > 0) {
      return zeroShotResults.map(r => r.sector);
    }
  } catch {
    // Zero-shot failed — fall back to keywords
  }

  // Step 4: Keyword-based inference
  return inferSectorsFromTitle(billTitle);
}

/**
 * Rough inference of sectors from bill title keywords → policy area → sectors.
 * Not as accurate as AI classification but provides coverage for
 * bills without cached summaries.
 */
export function inferSectorsFromTitle(title: string): IndustrySector[] {
  const titleLower = title.toLowerCase();

  const keywordToPolicyArea: Array<[string[], string]> = [
    [['defense', 'military', 'armed forces', 'veteran'], 'Armed Forces and National Security'],
    [['health', 'medicare', 'medicaid', 'drug', 'pharmaceutical'], 'Health'],
    [['tax', 'revenue', 'irs'], 'Taxation'],
    [['energy', 'oil', 'gas', 'renewable', 'nuclear'], 'Energy'],
    [['bank', 'financial', 'securities', 'insurance'], 'Finance and Financial Sector'],
    [['agriculture', 'farm', 'food', 'nutrition'], 'Agriculture and Food'],
    [['transportation', 'highway', 'aviation', 'rail'], 'Transportation and Public Works'],
    [['education', 'school', 'student'], 'Education'],
    [['environment', 'climate', 'pollution', 'epa'], 'Environmental Protection'],
    [['labor', 'worker', 'employment', 'wage'], 'Labor and Employment'],
    [['immigration', 'border', 'visa'], 'Immigration'],
    [['trade', 'tariff', 'commerce'], 'Commerce'],
    [['housing', 'hud', 'mortgage'], 'Housing and Community Development'],
    [['technology', 'cyber', 'broadband', 'telecom'], 'Science, Technology, Communications'],
    [['crime', 'law enforcement', 'criminal'], 'Crime and Law Enforcement'],
    [['construction', 'infrastructure', 'water'], 'Water Resources Development'],
  ];

  const sectors = new Set<IndustrySector>();

  for (const [keywords, policyArea] of keywordToPolicyArea) {
    if (keywords.some(k => titleLower.includes(k))) {
      for (const sector of getIndustrySectorsForPolicyArea(policyArea)) {
        sectors.add(sector);
      }
    }
  }

  return Array.from(sectors);
}

// ── AI Narrative Generation ─────────────────────────────────────────

/** Max AI narrative regeneration attempts */
const MAX_AI_RETRIES = 3;

/** Target Flesch-Kincaid reading level */
const TARGET_READING_LEVEL = 8;

/**
 * Generate an AI narrative with reading level validation and retry logic.
 * Falls back to the provided statistical summary on failure.
 *
 * @param systemContext - Domain-specific prefix for the system prompt
 * @param userPrompt - The full data-bearing prompt for the AI
 * @param statisticalFallback - Pre-built plain-text fallback if AI fails
 * @param label - Log label for this analyzer (e.g., '[FinanceJurisdiction]')
 * @returns The narrative string and whether AI was used
 */
export async function generateInsightNarrative(
  systemContext: string,
  userPrompt: string,
  statisticalFallback: string,
  label: string
): Promise<{ narrative: string; source: 'ai-generated' | 'statistical-fallback' }> {
  const systemPrompt =
    systemContext +
    PLAIN_LANGUAGE_SYSTEM_PROMPT.replace('Output valid JSON only.', 'Output plain text only.');

  for (let attempt = 0; attempt < MAX_AI_RETRIES; attempt++) {
    try {
      const result = await generateAIText(systemPrompt, userPrompt, {
        maxTokens: 300,
        temperature: 0.3,
      });

      if (!result) continue;

      if (ReadingLevelValidator.meetsTarget(result, TARGET_READING_LEVEL)) {
        return { narrative: result, source: 'ai-generated' };
      }

      logger.warn(`${label} Narrative failed reading level`, { attempt: attempt + 1 });
    } catch (error) {
      logger.warn(`${label} AI generation attempt failed`, {
        attempt: attempt + 1,
        error: (error as Error).message,
      });
    }
  }

  return { narrative: statisticalFallback, source: 'statistical-fallback' };
}

// ── Insight Quality Tracking ──────────────────────────────────────────

export function trackInsightCacheHit(analyzerName: AnalyzerName): void {
  trackInsightRun({
    analyzer: analyzerName,
    outcome: 'success',
    latencyMs: 0,
    cacheHit: true,
  });
}

export async function withInsightTracking<T>(
  analyzerName: AnalyzerName,
  fn: () => Promise<T | null>
): Promise<T | null> {
  const start = Date.now();
  try {
    const result = await fn();
    const latencyMs = Date.now() - start;

    if (result === null) {
      trackInsightRun({
        analyzer: analyzerName,
        outcome: 'insufficient-data',
        latencyMs,
        cacheHit: false,
      });
      return null;
    }

    const obj = result as Record<string, unknown>;
    const confidence = typeof obj.confidence === 'number' ? obj.confidence : undefined;
    const narrativeSource =
      obj.source === 'ai-generated' || obj.source === 'statistical-fallback'
        ? (obj.source as 'ai-generated' | 'statistical-fallback')
        : undefined;

    trackInsightRun({
      analyzer: analyzerName,
      outcome: 'success',
      confidence,
      narrativeSource,
      latencyMs,
      cacheHit: false,
    });
    return result;
  } catch (error) {
    const latencyMs = Date.now() - start;
    const isTimeout = error instanceof Error && error.message.includes('timed out');
    trackInsightRun({
      analyzer: analyzerName,
      outcome: isTimeout ? 'timeout' : 'failure',
      latencyMs,
      cacheHit: false,
    });
    throw error;
  }
}
