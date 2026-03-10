/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Stance Classification via Zero-Shot NLI
 *
 * Thin wrapper around classifyZeroShot() that detects whether lobbying or
 * regulatory text supports/opposes legislation. Reuses the same
 * nli-deberta-v3-xsmall model — no additional model download.
 */

import { createHash } from 'crypto';
import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { classifyZeroShot } from './zero-shot-classifier';
import type { StanceClassification } from '../types';

const CACHE_TTL = 30 * 24 * 60 * 60; // 30 days
const CONFIDENCE_THRESHOLD = 0.3;

const LABEL_SETS: Record<StanceClassification['context'], string[]> = {
  lobbying: ['supports legislation', 'opposes legislation', 'seeks amendment', 'neutral'],
  regulatory: ['supports regulation', 'opposes regulation', 'requests modification', 'neutral'],
};

/**
 * Classify the stance of text toward legislation or regulation.
 *
 * @param text - Lobbying issue text or regulatory comment text.
 * @param context - Whether this is lobbying or regulatory text.
 * @returns Top stance if confidence > 0.3, otherwise null.
 */
export async function classifyStance(
  text: string,
  context: StanceClassification['context']
): Promise<StanceClassification | null> {
  if (!text.trim()) return null;

  // Check Redis cache
  const cacheKey = `stance:${hashText(text)}:${context}`;
  try {
    const cached = await getRedisCache().get<StanceClassification>(cacheKey);
    if (cached) return cached;
  } catch {
    // Cache miss — continue
  }

  try {
    const labels = LABEL_SETS[context];
    const results = await classifyZeroShot(text, labels);

    if (results.length === 0) return null;

    const top = results[0]!;
    if (top.score < CONFIDENCE_THRESHOLD) return null;

    const classification: StanceClassification = {
      stance: top.label,
      confidence: top.score,
      context,
    };

    // Cache result
    try {
      await getRedisCache().set(cacheKey, classification, CACHE_TTL);
    } catch {
      // Non-fatal
    }

    return classification;
  } catch (error) {
    logger.warn('[StanceClassifier] Classification failed', {
      error: (error as Error).message,
      context,
    });
    return null;
  }
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex').substring(0, 16);
}
