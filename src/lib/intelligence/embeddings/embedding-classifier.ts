/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill Sector Classification via Semantic Embeddings
 *
 * Uses all-MiniLM-L6-v2 (via @huggingface/transformers) to embed bill text,
 * then classifies against pre-computed sector embeddings using cosine similarity.
 *
 * The model runs on the WASM backend (onnxruntime-web, bundled with
 * @huggingface/transformers). No native onnxruntime-node dependency — avoids
 * the 720MB deployment overhead.
 *
 * This module is server-only. It lazy-loads the pipeline on first call and
 * caches it for subsequent calls within the same process.
 *
 * If the model fails to load or embed for any reason, returns an empty array.
 * The caller (getBillSectors in shared.ts) falls back to keyword matching.
 */

import logger from '@/lib/logging/simple-logger';
import { classifySectors } from './cosine-similarity';
import type { SectorClassification, SectorEmbeddingEntry } from './types';

/** Model to use for embedding. Quantized int8 variant (~23MB). */
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

/** Timeout for the entire classify operation (model load + embedding). */
const CLASSIFY_TIMEOUT_MS = 10_000;

/** Cached pipeline instance — created once, reused for all subsequent calls. */
let pipelineInstance: FeatureExtractionPipeline | null = null;

/**
 * In-flight pipeline load promise. Prevents concurrent callers from
 * triggering duplicate model downloads when the first load is slow.
 */
let pipelineLoadPromise: Promise<FeatureExtractionPipeline | null> | null = null;

/** Whether we've already tried and failed to load the pipeline. */
let pipelineLoadFailed = false;

/** Cached sector embeddings loaded from JSON. */
let sectorEmbeddingsCache: SectorEmbeddingEntry[] | null = null;

/**
 * Type for the feature-extraction pipeline from @huggingface/transformers.
 * Defined here to avoid importing the full library at module level
 * (it should only be loaded lazily at runtime).
 */
/** Pooling strategies supported by the HuggingFace feature-extraction pipeline. */
type PoolingStrategy = 'none' | 'mean' | 'cls' | 'first_token' | 'eos' | 'last_token';

interface FeatureExtractionPipeline {
  (text: string, options?: { pooling?: PoolingStrategy; normalize?: boolean }): Promise<Tensor>;
}

/** Minimal Tensor interface — only the fields we use. */
interface Tensor {
  data: Float32Array;
  dims: number[];
}

/**
 * Classify a bill's affected industry sectors using semantic embeddings.
 *
 * @param text - Bill title (and optionally summary) to classify.
 * @param options - Optional threshold and maxSectors overrides.
 * @returns Sector classifications sorted by confidence, or empty array on failure.
 */
export async function classifyBillSectors(
  text: string,
  options?: {
    threshold?: number;
    maxSectors?: number;
  }
): Promise<SectorClassification[]> {
  if (!text.trim()) return [];

  // Don't retry if we already know the pipeline can't load
  if (pipelineLoadFailed) return [];

  try {
    return await withTimeout(classifyInternal(text, options), CLASSIFY_TIMEOUT_MS);
  } catch (error) {
    logger.warn('[EmbeddingClassifier] Classification failed, falling back', {
      error: (error as Error).message,
      text: text.substring(0, 100),
    });
    return [];
  }
}

/**
 * Internal classification logic — separated so we can wrap it in a timeout.
 */
async function classifyInternal(
  text: string,
  options?: { threshold?: number; maxSectors?: number }
): Promise<SectorClassification[]> {
  const pipe = await getOrCreatePipeline();
  if (!pipe) return [];

  const sectorEmbeddings = loadSectorEmbeddings();
  if (!sectorEmbeddings.length) return [];

  // Embed the bill text
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  const billEmbedding = output.data;

  return classifySectors(billEmbedding, sectorEmbeddings, options);
}

/**
 * Get or create the feature-extraction pipeline. Lazy-loads
 * @huggingface/transformers on first call.
 */
async function getOrCreatePipeline(): Promise<FeatureExtractionPipeline | null> {
  if (pipelineInstance) return pipelineInstance;

  // If a load is already in flight, share it instead of starting another
  if (pipelineLoadPromise) return pipelineLoadPromise;

  pipelineLoadPromise = loadPipeline();
  return pipelineLoadPromise;
}

/**
 * Actually load the pipeline. Called at most once — concurrent callers
 * share the same promise via pipelineLoadPromise.
 */
async function loadPipeline(): Promise<FeatureExtractionPipeline | null> {
  try {
    // Dynamic import — the library is only loaded when first needed
    const { pipeline, env } = await import('@huggingface/transformers');

    // Prefer WASM backend, disable local model search
    env.allowLocalModels = false;

    const extractor = await pipeline('feature-extraction', MODEL_ID, {
      dtype: 'q8',
    });

    // The HuggingFace pipeline() returns a callable class instance whose
    // TypeScript signature is (...args: any[]) => any. We wrap it in a
    // typed function to enforce our FeatureExtractionPipeline contract.
    const typedExtractor: FeatureExtractionPipeline = (text, options) =>
      extractor(text, options) as Promise<Tensor>;
    pipelineInstance = typedExtractor;
    logger.info('[EmbeddingClassifier] Pipeline loaded', { model: MODEL_ID });
    return pipelineInstance;
  } catch (error) {
    pipelineLoadFailed = true;
    logger.warn('[EmbeddingClassifier] Pipeline load failed, disabling for this process', {
      error: (error as Error).message,
    });
    return null;
  } finally {
    pipelineLoadPromise = null;
  }
}

/**
 * Load pre-computed sector embeddings from JSON.
 * Cached after first load — the JSON file never changes at runtime.
 */
function loadSectorEmbeddings(): SectorEmbeddingEntry[] {
  if (sectorEmbeddingsCache) return sectorEmbeddingsCache;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data = require('./sector-embeddings.json') as SectorEmbeddingEntry[];
    sectorEmbeddingsCache = data;
    return data;
  } catch (error) {
    logger.warn('[EmbeddingClassifier] Failed to load sector embeddings', {
      error: (error as Error).message,
    });
    return [];
  }
}

/**
 * Race a promise against a timeout.
 */
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

/**
 * Embed arbitrary text using the sentence transformer.
 * Returns a normalized 384-dim vector, or null on failure.
 *
 * Used by bill-lobbying similarity (Phase 3) and influence clustering
 * (Phase 4). The pipeline is shared with classifyBillSectors().
 */
export async function embedText(text: string): Promise<Float32Array | null> {
  if (!text.trim()) return null;
  if (pipelineLoadFailed) return null;

  try {
    const pipe = await getOrCreatePipeline();
    if (!pipe) return null;
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    return output.data;
  } catch (error) {
    logger.warn('[EmbeddingClassifier] embedText failed', {
      error: (error as Error).message,
      textLength: text.length,
    });
    return null;
  }
}

/**
 * Reset internal state. Only for testing.
 */
export function _resetForTesting(): void {
  pipelineInstance = null;
  pipelineLoadPromise = null;
  pipelineLoadFailed = false;
  sectorEmbeddingsCache = null;
}
