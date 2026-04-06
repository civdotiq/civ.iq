/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill-Lobbying Language Similarity
 *
 * Measures semantic similarity between bill text and lobbying filing text
 * to surface when legislative language mirrors what lobbyists asked for.
 *
 * Uses the same bge-small-en-v1.5 pipeline as bill sector classification —
 * no new model loading. The embedText() function exposes raw embeddings
 * for arbitrary text comparison.
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { embedText } from './embedding-classifier';
import { cosineSimilarity } from './cosine-similarity';
import type { LobbyingSimilarityMatch, BillLobbyingSimilarity } from '../types';

/**
 * Threshold above which a match is considered "strong."
 * Calibrated for bge-small-en-v1.5: related bill-lobbying pairs
 * score ~0.70, unrelated ~0.45, so 0.60 provides clean separation.
 */
const HIGH_SIMILARITY_THRESHOLD = 0.6;

/** Maximum matches to return per bill. */
const MAX_MATCHES = 10;

/** Maximum lobbying filings to compare per bill (performance limit). */
const MAX_FILINGS_TO_COMPARE = 100;

/** Redis TTL for cached lobbying embeddings (30 days). */
const EMBEDDING_CACHE_TTL = 30 * 24 * 60 * 60;

/** Timeout for the entire similarity computation. */
const SIMILARITY_TIMEOUT_MS = 15_000;

/**
 * Compute semantic similarity between a bill's text and lobbying filings.
 *
 * @param billId - Bill identifier for caching.
 * @param billText - First ~2000 chars of bill text.
 * @param filings - Lobbying filings to compare against (pre-filtered by relevance).
 * @returns Similarity results, or null on failure.
 */
export async function computeBillLobbyingSimilarity(
  billId: string,
  billText: string,
  filings: Array<{
    id: string;
    client: string;
    registrant: string;
    specificIssues: string[];
    income: number;
    period: string;
  }>
): Promise<BillLobbyingSimilarity | null> {
  if (!billText.trim() || filings.length === 0) return null;

  try {
    return await withTimeout(
      computeSimilarityInternal(billId, billText, filings),
      SIMILARITY_TIMEOUT_MS
    );
  } catch (error) {
    logger.warn('[BillLobbyingSimilarity] Computation failed', {
      billId,
      error: (error as Error).message,
    });
    return null;
  }
}

async function computeSimilarityInternal(
  billId: string,
  billText: string,
  filings: Array<{
    id: string;
    client: string;
    registrant: string;
    specificIssues: string[];
    income: number;
    period: string;
  }>
): Promise<BillLobbyingSimilarity | null> {
  // Step 1: Embed the bill text
  const truncatedBillText = billText.substring(0, 2000);
  const billEmbedding = await embedText(truncatedBillText);
  if (!billEmbedding) return null;

  // Step 2: Embed each lobbying filing (with Redis caching)
  const filingsToProcess = filings.slice(0, MAX_FILINGS_TO_COMPARE);
  const matches: LobbyingSimilarityMatch[] = [];
  const redis = getRedisCache();

  for (const filing of filingsToProcess) {
    const issueText = filing.specificIssues.join(' ').trim();
    if (!issueText) continue;

    // Check embedding cache
    const cacheKey = `v2-lobbying-embedding:${filing.id}`;
    let filingEmbedding: Float32Array | null = null;

    try {
      const cached = await redis.get<number[]>(cacheKey);
      if (cached) {
        filingEmbedding = Float32Array.from(cached);
      }
    } catch {
      // Cache miss — compute
    }

    if (!filingEmbedding) {
      filingEmbedding = await embedText(issueText.substring(0, 2000));
      if (!filingEmbedding) continue;

      // Cache the embedding
      try {
        await redis.set(cacheKey, Array.from(filingEmbedding), EMBEDDING_CACHE_TTL);
      } catch {
        // Non-fatal
      }
    }

    // Step 3: Compute cosine similarity
    const similarity = cosineSimilarity(billEmbedding, filingEmbedding);

    matches.push({
      filingId: filing.id,
      client: filing.client,
      registrant: filing.registrant,
      issueText: issueText.substring(0, 500),
      similarity,
      period: filing.period,
      income: filing.income,
    });
  }

  // Step 4: Sort by similarity descending, cap at MAX_MATCHES
  matches.sort((a, b) => b.similarity - a.similarity);
  const topMatches = matches.slice(0, MAX_MATCHES);

  const averageSimilarity =
    matches.length > 0 ? matches.reduce((sum, m) => sum + m.similarity, 0) / matches.length : 0;

  const hasStrongMatches = topMatches.some(m => m.similarity >= HIGH_SIMILARITY_THRESHOLD);

  return {
    billId,
    matches: topMatches,
    averageSimilarity,
    hasStrongMatches,
  };
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
