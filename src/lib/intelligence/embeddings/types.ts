/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { IndustrySector } from '@/lib/fec/industry-taxonomy';

/**
 * A sector classification result from embedding-based cosine similarity.
 */
export interface SectorClassification {
  sector: IndustrySector;
  /** Cosine similarity score (0-1 for normalized vectors). */
  confidence: number;
}

/**
 * A pre-computed sector embedding entry, stored in sector-embeddings.json.
 */
export interface SectorEmbeddingEntry {
  sector: IndustrySector;
  /** 384-dimensional normalized embedding vector. */
  embedding: number[];
}

/**
 * A zero-shot classification result from NLI-based inference.
 */
export interface ZeroShotResult {
  label: string;
  score: number;
}

/**
 * An entity extracted from text via NER or regex augmentation.
 */
export interface CivicEntity {
  text: string;
  type: 'ORG' | 'PER' | 'LOC' | 'MISC' | 'MONEY' | 'DATE';
  confidence: number;
  start: number;
  end: number;
}
