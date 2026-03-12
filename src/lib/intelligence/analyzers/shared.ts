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

// ── Timeout Wrapper ─────────────────────────────────────────────────

/** Default analyzer timeout: 55 seconds (leaves 5s headroom for Vercel function overhead) */
export const ANALYZER_TIMEOUT_MS = 55_000;

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
 * Get industry sectors for a bill. Four-tier fallback:
 * 1. Cached AI summary (fastest, most accurate)
 * 2. Semantic embedding classification (cosine similarity, handles novel titles)
 * 3. Zero-shot NLI classification (NLI model, understands natural language)
 * 4. Keyword-based inference (static, always works)
 */
export async function getBillSectors(billId: string, billTitle: string): Promise<IndustrySector[]> {
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
