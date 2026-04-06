/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Zero-Shot Classification via NLI (Natural Language Inference)
 *
 * Uses nli-deberta-v3-xsmall (~60MB q8) for zero-shot classification.
 * Replaces keyword fallback with a 22M-parameter NLI model that understands
 * natural language entailment.
 *
 * Same lazy-load pattern as embedding-classifier.ts: module-level singleton,
 * shared promise for concurrent callers, fail-fast after first failure.
 */

import { createHash } from 'crypto';
import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';
import type { SectorClassification, ZeroShotResult } from './types';

const MODEL_ID = 'Xenova/nli-deberta-v3-xsmall';
const CLASSIFY_TIMEOUT_MS = 10_000;
const CACHE_TTL = 30 * 24 * 60 * 60; // 30 days

/** Maximum sectors returned from zero-shot classification. */
const MAX_SECTORS = 3;

/** Minimum confidence threshold for sector classification. */
const SECTOR_THRESHOLD = 0.15;

// ── Pipeline Singleton ──────────────────────────────────────────────

interface ZeroShotPipeline {
  (
    text: string,
    labels: string[],
    options?: { multi_label?: boolean }
  ): Promise<{ labels: string[]; scores: number[] }>;
}

let pipelineInstance: ZeroShotPipeline | null = null;
let pipelineLoadPromise: Promise<ZeroShotPipeline | null> | null = null;
let pipelineLoadFailed = false;

// ── Sector Labels ───────────────────────────────────────────────────

const SECTOR_LABELS: string[] = Object.values(IndustrySector);

const LABEL_TO_SECTOR = new Map<string, IndustrySector>(
  Object.values(IndustrySector).map(s => [s, s])
);

// ── Public API ──────────────────────────────────────────────────────

/**
 * Classify a bill's affected industry sectors using zero-shot NLI.
 *
 * @param text - Bill title (and optionally summary) to classify.
 * @returns Sector classifications sorted by confidence, or empty array on failure.
 */
export async function classifyBillSectorsZeroShot(text: string): Promise<SectorClassification[]> {
  if (!text.trim()) return [];
  if (pipelineLoadFailed) return [];

  // Check Redis cache
  const cacheKey = `zs-bill:${hashText(text)}`;
  try {
    const cached = await getRedisCache().get<SectorClassification[]>(cacheKey);
    if (cached) return cached;
  } catch {
    // Cache miss — continue
  }

  try {
    const results = await withTimeout(classifyInternal(text), CLASSIFY_TIMEOUT_MS);

    // Cache on success
    if (results.length > 0) {
      try {
        await getRedisCache().set(cacheKey, results, CACHE_TTL);
      } catch {
        // Non-fatal
      }
    }

    return results;
  } catch (error) {
    logger.warn('[ZeroShotClassifier] Classification failed', {
      error: (error as Error).message,
      text: text.substring(0, 100),
    });
    return [];
  }
}

/**
 * Generic zero-shot classification against arbitrary labels.
 * Reused by stance-classifier.ts.
 */
export async function classifyZeroShot(
  text: string,
  labels: string[],
  options?: { multi_label?: boolean }
): Promise<ZeroShotResult[]> {
  if (!text.trim() || labels.length === 0) return [];
  if (pipelineLoadFailed) return [];

  try {
    const pipe = await getOrCreatePipeline();
    if (!pipe) return [];

    const result = await withTimeout(
      pipe(text, labels, { multi_label: options?.multi_label ?? false }),
      CLASSIFY_TIMEOUT_MS
    );

    return result.labels.map((label, i) => ({
      label,
      score: result.scores[i]!,
    }));
  } catch (error) {
    logger.warn('[ZeroShotClassifier] classifyZeroShot failed', {
      error: (error as Error).message,
    });
    return [];
  }
}

/**
 * Reset internal state. Only for testing.
 */
export function _resetForTesting(): void {
  pipelineInstance = null;
  pipelineLoadPromise = null;
  pipelineLoadFailed = false;
}

// ── Internal ────────────────────────────────────────────────────────

async function classifyInternal(text: string): Promise<SectorClassification[]> {
  const pipe = await getOrCreatePipeline();
  if (!pipe) return [];

  const result = await pipe(text, SECTOR_LABELS, { multi_label: true });

  const classifications: SectorClassification[] = [];
  for (let i = 0; i < result.labels.length; i++) {
    const score = result.scores[i]!;
    if (score < SECTOR_THRESHOLD) continue;

    const sector = LABEL_TO_SECTOR.get(result.labels[i]!);
    if (sector) {
      classifications.push({ sector, confidence: score });
    }
  }

  return classifications.sort((a, b) => b.confidence - a.confidence).slice(0, MAX_SECTORS);
}

async function getOrCreatePipeline(): Promise<ZeroShotPipeline | null> {
  if (pipelineInstance) return pipelineInstance;
  if (pipelineLoadPromise) return pipelineLoadPromise;

  pipelineLoadPromise = loadPipeline();
  return pipelineLoadPromise;
}

async function loadPipeline(): Promise<ZeroShotPipeline | null> {
  try {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.allowLocalModels = false;

    const t0 = performance.now();
    const classifier = await pipeline('zero-shot-classification', MODEL_ID, {
      dtype: 'q8',
    });
    const loadMs = Math.round(performance.now() - t0);

    // The HuggingFace pipeline() returns a callable class instance whose
    // TypeScript signature is (...args: any[]) => any. We wrap it in a
    // typed function to enforce our ZeroShotPipeline contract.
    const typedClassifier: ZeroShotPipeline = (text, labels, options) =>
      classifier(text, labels, options) as Promise<{ labels: string[]; scores: number[] }>;
    pipelineInstance = typedClassifier;
    logger.info('[ZeroShotClassifier] Pipeline loaded', {
      model: MODEL_ID,
      loadTimeMs: loadMs,
      operation: 'ml_pipeline_load',
    });
    return pipelineInstance;
  } catch (error) {
    pipelineLoadFailed = true;
    logger.warn('[ZeroShotClassifier] Pipeline load failed, disabling for this process', {
      error: (error as Error).message,
    });
    return null;
  } finally {
    pipelineLoadPromise = null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex').substring(0, 16);
}
