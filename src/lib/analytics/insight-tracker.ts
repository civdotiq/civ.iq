/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Insight Quality Analytics — Fire-and-forget Tracker
 *
 * Logs analyzer outcomes, confidence scores, narrative sources, cache hits,
 * and latency for every intelligence insight generated.
 * Follows reading-level-tracker.ts pattern exactly: never blocks, 30-day TTL.
 */

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  try {
    // cache: 'default' — the SDK's 'no-store' default breaks ISR renders
    // (app-static-to-dynamic-error); POSTs are never data-cached anyway.
    redis = new Redis({ url, token, cache: 'default' });
    return redis;
  } catch {
    return null;
  }
}

const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

/** All tracked analyzer names. */
export const ANALYZER_NAMES = [
  'finance-jurisdiction',
  'vote-finance',
  'vote-prediction',
  'temporal-votes',
  'temporal-proximity',
  'pac-votes',
  'influence-chains',
  'lobbying-pipeline',
  'bill-intelligence',
  'stock-committee',
  'sector-leaderboard',
  'civic-brief',
  'federal-register',
  'regulation',
  'enforcement',
  'influence-graph',
] as const;

export type AnalyzerName = (typeof ANALYZER_NAMES)[number];

export type InsightOutcome = 'success' | 'failure' | 'timeout' | 'insufficient-data';

export interface InsightTrackingData {
  analyzer: AnalyzerName;
  outcome: InsightOutcome;
  confidence?: number;
  narrativeSource?: 'ai-generated' | 'statistical-fallback';
  latencyMs: number;
  cacheHit: boolean;
}

function fireIncr(key: string, client: Redis): void {
  client.incr(key).then(
    val => {
      if (val === 1) {
        client.expire(key, TTL_SECONDS).catch(() => {});
      }
    },
    () => {}
  );
}

function fireIncrBy(key: string, amount: number, client: Redis): void {
  client.incrby(key, amount).then(
    val => {
      if (val === amount) {
        client.expire(key, TTL_SECONDS).catch(() => {});
      }
    },
    () => {}
  );
}

export function trackInsightRun(data: InsightTrackingData): void {
  const client = getRedis();
  if (!client) return;

  const date = new Date().toISOString().slice(0, 10);
  const prefix = `analytics:insight:${date}:${data.analyzer}`;

  fireIncr(`${prefix}:${data.outcome}`, client);

  if (data.cacheHit) {
    fireIncr(`${prefix}:cache-hit`, client);
  }

  if (data.narrativeSource === 'ai-generated') {
    fireIncr(`${prefix}:ai-narrative`, client);
  } else if (data.narrativeSource === 'statistical-fallback') {
    fireIncr(`${prefix}:stat-fallback`, client);
  }

  if (data.confidence !== undefined && data.confidence >= 0) {
    const scaledConfidence = Math.round(data.confidence * 100);
    fireIncrBy(`${prefix}:confidence-sum`, scaledConfidence, client);
    fireIncr(`${prefix}:confidence-count`, client);
  }

  if (data.latencyMs >= 0 && !data.cacheHit) {
    fireIncrBy(`${prefix}:latency-sum`, Math.round(data.latencyMs), client);
    fireIncr(`${prefix}:latency-count`, client);
  }
}

export interface AnalyzerDayStats {
  successes: number;
  failures: number;
  timeouts: number;
  insufficientData: number;
  cacheHits: number;
  aiNarratives: number;
  statFallbacks: number;
  avgConfidence: number;
  avgLatencyMs: number;
}

export interface InsightQualityDay {
  date: string;
  analyzers: Partial<Record<AnalyzerName, AnalyzerDayStats>>;
  totals: AnalyzerDayStats & { runs: number };
}

export async function getInsightStats(
  startDate: string,
  endDate: string
): Promise<InsightQualityDay[]> {
  const client = getRedis();
  if (!client) return [];

  const results: InsightQualityDay[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    try {
      const dayResult = await readDayStats(client, date);
      if (dayResult) results.push(dayResult);
    } catch {
      continue;
    }
  }

  return results;
}

const KEYS_PER_ANALYZER = [
  'success',
  'failure',
  'timeout',
  'insufficient-data',
  'cache-hit',
  'ai-narrative',
  'stat-fallback',
  'confidence-sum',
  'confidence-count',
  'latency-sum',
  'latency-count',
] as const;

async function readDayStats(client: Redis, date: string): Promise<InsightQualityDay | null> {
  const pipeline = client.pipeline();

  for (const analyzer of ANALYZER_NAMES) {
    const prefix = `analytics:insight:${date}:${analyzer}`;
    for (const suffix of KEYS_PER_ANALYZER) {
      pipeline.get(`${prefix}:${suffix}`);
    }
  }

  const values = await pipeline.exec();

  const analyzers: Partial<Record<AnalyzerName, AnalyzerDayStats>> = {};
  const totals: AnalyzerDayStats & { runs: number } = {
    runs: 0,
    successes: 0,
    failures: 0,
    timeouts: 0,
    insufficientData: 0,
    cacheHits: 0,
    aiNarratives: 0,
    statFallbacks: 0,
    avgConfidence: 0,
    avgLatencyMs: 0,
  };

  let totalConfidenceSum = 0,
    totalConfidenceCount = 0;
  let totalLatencySum = 0,
    totalLatencyCount = 0;
  let hasData = false;

  for (let i = 0; i < ANALYZER_NAMES.length; i++) {
    const offset = i * KEYS_PER_ANALYZER.length;
    const successes = toInt(values[offset]);
    const failures = toInt(values[offset + 1]);
    const timeouts = toInt(values[offset + 2]);
    const insufficientData = toInt(values[offset + 3]);
    const cacheHits = toInt(values[offset + 4]);
    const aiNarratives = toInt(values[offset + 5]);
    const statFallbacks = toInt(values[offset + 6]);
    const confidenceSum = toInt(values[offset + 7]);
    const confidenceCount = toInt(values[offset + 8]);
    const latencySum = toInt(values[offset + 9]);
    const latencyCount = toInt(values[offset + 10]);

    const runs = successes + failures + timeouts + insufficientData;
    if (runs === 0 && cacheHits === 0) continue;

    hasData = true;

    analyzers[ANALYZER_NAMES[i]!] = {
      successes,
      failures,
      timeouts,
      insufficientData,
      cacheHits,
      aiNarratives,
      statFallbacks,
      avgConfidence: confidenceCount > 0 ? Math.round(confidenceSum / confidenceCount) / 100 : 0,
      avgLatencyMs: latencyCount > 0 ? Math.round(latencySum / latencyCount) : 0,
    };

    totals.runs += runs;
    totals.successes += successes;
    totals.failures += failures;
    totals.timeouts += timeouts;
    totals.insufficientData += insufficientData;
    totals.cacheHits += cacheHits;
    totals.aiNarratives += aiNarratives;
    totals.statFallbacks += statFallbacks;
    totalConfidenceSum += confidenceSum;
    totalConfidenceCount += confidenceCount;
    totalLatencySum += latencySum;
    totalLatencyCount += latencyCount;
  }

  if (!hasData) return null;

  totals.avgConfidence =
    totalConfidenceCount > 0 ? Math.round(totalConfidenceSum / totalConfidenceCount) / 100 : 0;
  totals.avgLatencyMs = totalLatencyCount > 0 ? Math.round(totalLatencySum / totalLatencyCount) : 0;

  return { date, analyzers, totals };
}

function toInt(val: unknown): number {
  return parseInt(String(val ?? 0)) || 0;
}
