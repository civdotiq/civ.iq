/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Cosine similarity and sector classification from embedding vectors.
 *
 * Pure math — no ML dependencies. The embedding model produces normalized
 * 384-dim vectors; cosine similarity of normalized vectors is just the
 * dot product, which is a single loop.
 */

import type { IndustrySector } from '@/lib/fec/industry-taxonomy';
import type { SectorClassification, SectorEmbeddingEntry } from './types';

/**
 * Default cosine similarity threshold for sector classification.
 *
 * Calibrated for bge-small-en-v1.5 which produces higher absolute
 * similarities than the previous all-MiniLM-L6-v2 model. At 0.56,
 * known-good bills (NDAA, CHIPS Act, Medicare, Farm Bill) all classify
 * correctly while ceremonial resolutions return empty. The margin is
 * tight (min good 0.562, max bad 0.560) — recalibrate if the model
 * or sector descriptions change.
 */
export const DEFAULT_THRESHOLD = 0.56;

/** Default maximum sectors to return per bill. */
export const DEFAULT_MAX_SECTORS = 3;

/**
 * Compute cosine similarity between two vectors.
 *
 * For normalized vectors (magnitude = 1), this is equivalent to the dot product.
 * Returns 0 if either vector has zero length.
 */
export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < len; i++) {
    const ai = a[i]!;
    const bi = b[i]!;
    dot += ai * bi;
    magA += ai * ai;
    magB += bi * bi;
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;

  return dot / denom;
}

/**
 * Classify a bill's embedding against pre-computed sector embeddings.
 *
 * Returns sectors whose cosine similarity exceeds the threshold,
 * sorted by confidence descending, capped at maxSectors.
 */
export function classifySectors(
  billEmbedding: ArrayLike<number>,
  sectorEmbeddings: SectorEmbeddingEntry[],
  options?: {
    threshold?: number;
    maxSectors?: number;
  }
): SectorClassification[] {
  const threshold = options?.threshold ?? DEFAULT_THRESHOLD;
  const maxSectors = options?.maxSectors ?? DEFAULT_MAX_SECTORS;

  const scores: Array<{ sector: IndustrySector; confidence: number }> = [];

  for (const entry of sectorEmbeddings) {
    const similarity = cosineSimilarity(billEmbedding, entry.embedding);
    if (similarity > threshold) {
      scores.push({ sector: entry.sector, confidence: similarity });
    }
  }

  // Sort by confidence descending, cap at maxSectors
  scores.sort((a, b) => b.confidence - a.confidence);
  return scores.slice(0, maxSectors);
}
