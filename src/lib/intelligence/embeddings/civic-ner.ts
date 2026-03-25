/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Civic NER (Named Entity Recognition) via BERT
 *
 * Uses bert-base-NER (~170MB q8) for token-level entity extraction,
 * augmented with regex patterns for MONEY and DATE entities.
 *
 * Replaces cloud-LLM dependency for entity extraction with a local
 * 110M-parameter BERT model. The hybrid approach (ML for names + regex
 * for dollar/date) demonstrates thoughtful model selection.
 *
 * Same lazy-load pattern as embedding-classifier.ts.
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import type { CivicEntity } from './types';

const MODEL_ID = 'Xenova/bert-base-NER';
const EXTRACT_TIMEOUT_MS = 10_000;
const CACHE_TTL = 30 * 24 * 60 * 60; // 30 days

/** Approximate token window for the 512-token BERT limit. */
const WINDOW_SIZE = 1600; // ~400 tokens at ~4 chars/token
const OVERLAP_SIZE = 200; // ~50 tokens overlap

// ── Pipeline Singleton ──────────────────────────────────────────────

interface NERToken {
  word: string;
  entity: string;
  score: number;
  start: number;
  end: number;
}

interface NERPipeline {
  (text: string): Promise<NERToken[]>;
}

let pipelineInstance: NERPipeline | null = null;
let pipelineLoadPromise: Promise<NERPipeline | null> | null = null;
let pipelineLoadFailed = false;

// ── Regex Patterns ──────────────────────────────────────────────────

const MONEY_REGEX = /\$[\d,]+(?:\.\d+)?(?:\s*(?:billion|million|thousand|trillion))?/gi;
const DATE_REGEX =
  /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/gi;

// ── Public API ──────────────────────────────────────────────────────

/**
 * Extract named entities from text using BERT NER + regex augmentation.
 *
 * @param text - Document text to extract entities from.
 * @param documentNumber - Optional FR document number for cache key.
 * @returns Array of civic entities, or empty array on failure.
 */
export async function extractEntities(
  text: string,
  documentNumber?: string
): Promise<CivicEntity[]> {
  if (!text.trim()) return [];

  // Check Redis cache
  if (documentNumber) {
    try {
      const cached = await getRedisCache().get<CivicEntity[]>(`ner:${documentNumber}`);
      if (cached) return cached;
    } catch {
      // Cache miss — continue
    }
  }

  try {
    const results = await withTimeout(extractInternal(text), EXTRACT_TIMEOUT_MS);

    // Cache on success
    if (documentNumber && results.length > 0) {
      try {
        await getRedisCache().set(`ner:${documentNumber}`, results, CACHE_TTL);
      } catch {
        // Non-fatal
      }
    }

    return results;
  } catch (error) {
    logger.warn('[CivicNER] Extraction failed', {
      error: (error as Error).message,
      textLength: text.length,
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

async function extractInternal(text: string): Promise<CivicEntity[]> {
  const pipe = await getOrCreatePipeline();

  // ML entities (may be null if pipeline fails to load)
  let mlEntities: CivicEntity[] = [];
  if (pipe) {
    const chunks = chunkText(text);
    const allTokens: NERToken[] = [];

    for (const chunk of chunks) {
      const tokens = await pipe(chunk.text);
      // Adjust positions by chunk offset
      for (const token of tokens) {
        allTokens.push({
          ...token,
          start: token.start + chunk.offset,
          end: token.end + chunk.offset,
        });
      }
    }

    mlEntities = mergeBIOTokens(allTokens);
  }

  // Regex entities (always available)
  const regexEntities = extractRegexEntities(text);

  // Merge and deduplicate
  return deduplicateEntities([...mlEntities, ...regexEntities]);
}

/**
 * Chunk text into overlapping windows for the 512-token BERT limit.
 */
function chunkText(text: string): Array<{ text: string; offset: number }> {
  if (text.length <= WINDOW_SIZE) {
    return [{ text, offset: 0 }];
  }

  const chunks: Array<{ text: string; offset: number }> = [];
  let offset = 0;

  while (offset < text.length) {
    const end = Math.min(offset + WINDOW_SIZE, text.length);
    chunks.push({ text: text.slice(offset, end), offset });

    if (end >= text.length) break;
    offset += WINDOW_SIZE - OVERLAP_SIZE;
  }

  return chunks;
}

/**
 * Merge BIO-tagged tokens into entity spans.
 * Adjacent I-ORG tokens after B-ORG become a single entity.
 */
function mergeBIOTokens(tokens: NERToken[]): CivicEntity[] {
  const entities: CivicEntity[] = [];
  let current: { text: string; type: string; score: number; start: number; end: number } | null =
    null;

  for (const token of tokens) {
    const prefix = token.entity.substring(0, 2); // B- or I-
    const entityType = token.entity.substring(2); // ORG, PER, LOC, MISC

    if (prefix === 'B-') {
      // Flush previous entity
      if (current) {
        entities.push(toEntity(current));
      }
      current = {
        text: cleanTokenText(token.word),
        type: entityType,
        score: token.score,
        start: token.start,
        end: token.end,
      };
    } else if (prefix === 'I-' && current && entityType === current.type) {
      // Continue the current entity
      current.text += cleanTokenText(token.word);
      current.score = Math.min(current.score, token.score);
      current.end = token.end;
    } else {
      // O tag or mismatched I- tag
      if (current) {
        entities.push(toEntity(current));
        current = null;
      }
    }
  }

  // Flush last entity
  if (current) {
    entities.push(toEntity(current));
  }

  return entities;
}

function toEntity(raw: {
  text: string;
  type: string;
  score: number;
  start: number;
  end: number;
}): CivicEntity {
  const typeMap: Record<string, CivicEntity['type']> = {
    ORG: 'ORG',
    PER: 'PER',
    LOC: 'LOC',
    MISC: 'MISC',
  };
  return {
    text: raw.text.trim(),
    type: typeMap[raw.type] ?? 'MISC',
    confidence: raw.score,
    start: raw.start,
    end: raw.end,
  };
}

/**
 * Clean WordPiece token artifacts (## prefix from BERT tokenizer).
 */
function cleanTokenText(word: string): string {
  if (word.startsWith('##')) {
    return word.substring(2);
  }
  return ' ' + word;
}

/**
 * Extract MONEY and DATE entities using regex patterns.
 */
function extractRegexEntities(text: string): CivicEntity[] {
  const entities: CivicEntity[] = [];

  for (const match of text.matchAll(MONEY_REGEX)) {
    entities.push({
      text: match[0],
      type: 'MONEY',
      confidence: 1.0,
      start: match.index!,
      end: match.index! + match[0].length,
    });
  }

  for (const match of text.matchAll(DATE_REGEX)) {
    entities.push({
      text: match[0],
      type: 'DATE',
      confidence: 1.0,
      start: match.index!,
      end: match.index! + match[0].length,
    });
  }

  return entities;
}

/**
 * Deduplicate entities by position overlap.
 * When two entities overlap, keep the one with higher confidence.
 */
function deduplicateEntities(entities: CivicEntity[]): CivicEntity[] {
  if (entities.length <= 1) return entities;

  // Sort by start position
  const sorted = [...entities].sort((a, b) => a.start - b.start || b.end - a.end);
  const result: CivicEntity[] = [];

  for (const entity of sorted) {
    const last = result[result.length - 1];
    if (last && entity.start < last.end) {
      // Overlapping — keep higher confidence
      if (entity.confidence > last.confidence) {
        result[result.length - 1] = entity;
      }
    } else {
      result.push(entity);
    }
  }

  return result;
}

// ── Pipeline Loading ────────────────────────────────────────────────

async function getOrCreatePipeline(): Promise<NERPipeline | null> {
  if (pipelineInstance) return pipelineInstance;
  if (pipelineLoadFailed) return null;
  if (pipelineLoadPromise) return pipelineLoadPromise;

  pipelineLoadPromise = loadPipeline();
  return pipelineLoadPromise;
}

async function loadPipeline(): Promise<NERPipeline | null> {
  try {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.allowLocalModels = false;

    const ner = await pipeline('token-classification', MODEL_ID, {
      dtype: 'q8',
    });

    // The HuggingFace pipeline() returns a callable class instance whose
    // TypeScript signature is (...args: any[]) => any. We wrap it in a
    // typed function to enforce our NERPipeline contract at the call boundary.
    const typedNer: NERPipeline = (text: string) => ner(text) as Promise<NERToken[]>;
    pipelineInstance = typedNer;
    logger.info('[CivicNER] Pipeline loaded', { model: MODEL_ID });
    return pipelineInstance;
  } catch (error) {
    pipelineLoadFailed = true;
    logger.warn('[CivicNER] Pipeline load failed, disabling for this process', {
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
