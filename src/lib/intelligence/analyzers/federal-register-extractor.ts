/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Federal Register Preamble Extractor
 *
 * Extracts structured facts (industry impacts, cost estimates, timelines)
 * from Federal Register document preambles. Follows the analyzer pattern:
 * cache check → fetch → statistics first → AI extraction → cache.
 *
 * Statistics-first: text statistics (word count, dollar mentions, date mentions)
 * are computed BEFORE any AI call and used as the fallback.
 */

import { cache } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { generateAIText } from '@/lib/ai/provider';
import { PLAIN_LANGUAGE_SYSTEM_PROMPT } from '@/lib/ai/plain-language';
import {
  withTimeout,
  ANALYZER_TIMEOUT_MS,
  generateInsightNarrative,
  trackInsightCacheHit,
  withInsightTracking,
} from './shared';
import { extractEntities } from '@/lib/intelligence/embeddings/civic-ner';
import type { CivicEntity } from '@/lib/intelligence/embeddings/types';
import {
  getDocumentMetadata,
  getPreambleText,
  computeTextStats,
  MAX_PREAMBLE_CHARS,
  MIN_WORDS_FOR_EXTRACTION,
} from '@/lib/data-sources/federal-register-service';
import type {
  PreambleExtractionInsight,
  PreambleIndustryImpact,
  PreambleCostEstimate,
  PreambleTimeline,
  PreambleFact,
  PreambleTextStats,
  FederalRegisterAPIDocument,
} from '@/types/federal-register';

const CACHE_TTL = 30 * 24 * 60 * 60; // 30 days — preamble content is immutable
const CACHE_PREFIX = 'insight:preamble';
const MAX_AI_RETRIES = 3;

const DISCLAIMER =
  'This analysis extracts facts from published Federal Register text. ' +
  'Extracted values are approximate and should be verified against the official document. ' +
  'This does not constitute legal or regulatory advice.';

/**
 * Extract structured facts from a Federal Register document preamble.
 *
 * @param documentNumber - FR document number (e.g., "2025-12345")
 * @returns Extraction insight or null if insufficient data
 */
export async function extractPreambleFacts(
  documentNumber: string
): Promise<PreambleExtractionInsight | null> {
  const cacheKey = `${CACHE_PREFIX}:${documentNumber}`;

  // 1. Cache check
  try {
    const cached = await cache.get<PreambleExtractionInsight>(cacheKey);
    if (cached) {
      logger.info('[PreambleExtractor] Cache hit', { documentNumber });
      trackInsightCacheHit('federal-register');
      return cached;
    }
  } catch {
    // Cache miss — continue
  }

  // 2. Compute with timeout
  return withInsightTracking('federal-register', () =>
    withTimeout(computeAndCache(documentNumber, cacheKey), ANALYZER_TIMEOUT_MS, 'PreambleExtractor')
  );
}

async function computeAndCache(
  documentNumber: string,
  cacheKey: string
): Promise<PreambleExtractionInsight | null> {
  // 1. Fetch metadata first, then pass to getPreambleText to avoid duplicate fetch
  const doc = await getDocumentMetadata(documentNumber);

  if (!doc) {
    logger.info('[PreambleExtractor] Document not found', { documentNumber });
    return null;
  }

  const preambleText = await getPreambleText(documentNumber, doc);

  if (!preambleText) {
    logger.info('[PreambleExtractor] No preamble text available', { documentNumber });
    return null;
  }

  // 2. Statistics first (before any AI call)
  const textStats = computeTextStats(preambleText);

  if (textStats.wordCount < MIN_WORDS_FOR_EXTRACTION) {
    logger.info('[PreambleExtractor] Insufficient text', {
      documentNumber,
      wordCount: textStats.wordCount,
    });
    return null;
  }

  // 3. Determine document type
  const documentType = mapDocumentType(doc.type);
  const agency = doc.agencies?.[0]?.name ?? 'Unknown Agency';

  // 4. Truncate for LLM input
  const truncatedText = preambleText.slice(0, MAX_PREAMBLE_CHARS);
  const stats: PreambleTextStats = {
    ...textStats,
    wasTruncated: preambleText.length > MAX_PREAMBLE_CHARS,
  };

  // 5a. NER entity extraction (non-critical, best-effort)
  let entities: CivicEntity[] = [];
  try {
    entities = await extractEntities(truncatedText, documentNumber);
  } catch {
    // NER is non-critical — continue without entities
  }

  // 5b. Attempt AI extraction
  const extraction = await attemptAIExtraction(doc, agency, documentType, truncatedText, stats);

  // 6. Generate narrative (uses shared utility for retry + reading level validation)
  const { narrative, source } = await buildNarrative(doc, agency, documentType, stats, extraction);

  // 7. Compute confidence
  const confidence = computeConfidence(stats, extraction, source);

  // 8. Build insight
  const methodologyParts = [
    `Analyzed ${stats.wordCount.toLocaleString()} words from Federal Register document ${documentNumber}.`,
    `Found ${stats.dollarAmountMentions} dollar amounts, ${stats.dateMentions} dates, and ${stats.entityMentions} entity references via text analysis.`,
  ];
  if (stats.wasTruncated) {
    methodologyParts.push(
      `Text was truncated to ${MAX_PREAMBLE_CHARS.toLocaleString()} characters for extraction.`
    );
  }

  const insight: PreambleExtractionInsight = {
    documentNumber,
    title: doc.title,
    agency,
    documentType,
    publicationDate: doc.publication_date,
    textStats: stats,
    industryImpacts: extraction.industryImpacts,
    costEstimates: extraction.costEstimates,
    timelines: extraction.timelines,
    facts: extraction.facts,
    narrative,
    entities: entities.length > 0 ? entities : undefined,
    confidence,
    dataAsOf: doc.publication_date,
    methodology: methodologyParts.join(' '),
    disclaimer: DISCLAIMER,
    lastAnalyzedAt: new Date().toISOString(),
    source,
  };

  // 9. Cache result
  try {
    await cache.set(cacheKey, insight, CACHE_TTL);
    logger.info('[PreambleExtractor] Cached insight', {
      documentNumber,
      confidence,
      facts: extraction.facts.length,
    });
  } catch {
    // Non-fatal
  }

  return insight;
}

// ── AI Extraction ───────────────────────────────────────────────────

interface ExtractionResult {
  industryImpacts: PreambleIndustryImpact[];
  costEstimates: PreambleCostEstimate[];
  timelines: PreambleTimeline[];
  facts: PreambleFact[];
  aiSucceeded: boolean;
}

const EXTRACTION_SYSTEM_PROMPT =
  'You extract structured regulatory facts from Federal Register preamble text for CIV.IQ, ' +
  'a civic intelligence platform. You output ONLY valid JSON — no markdown, no code fences, ' +
  'no explanation. Use "estimated" or "approximately" for uncertain values. ' +
  'Never claim causation. Use "associated with", "related to", "may affect".';

async function attemptAIExtraction(
  doc: FederalRegisterAPIDocument,
  agency: string,
  documentType: PreambleExtractionInsight['documentType'],
  text: string,
  stats: PreambleTextStats
): Promise<ExtractionResult> {
  const empty: ExtractionResult = {
    industryImpacts: [],
    costEstimates: [],
    timelines: [],
    facts: [],
    aiSucceeded: false,
  };

  const userPrompt = `DOCUMENT: ${doc.title}
AGENCY: ${agency}
TYPE: ${documentType}
PUBLISHED: ${doc.publication_date}
TEXT STATISTICS: ${stats.wordCount} words, ${stats.dollarAmountMentions} dollar amounts, ${stats.dateMentions} dates

PREAMBLE TEXT:
${text}

Extract the following as a JSON object with these exact keys:
{
  "industryImpacts": [{"industry": string, "impactType": "regulatory_burden"|"deregulatory_relief"|"new_requirement"|"modified_requirement", "description": string, "estimatedAffectedEntities": number|null}],
  "costEstimates": [{"description": string, "amount": string, "amountLow": number|null, "amountHigh": number|null, "type": "cost"|"benefit"|"transfer", "affectedParty": string, "timePeriod": string|null}],
  "timelines": [{"date": string, "event": string, "isEstimate": boolean}],
  "facts": [{"category": "industry_impact"|"cost_estimate"|"timeline"|"affected_entity"|"legal_authority"|"compliance_requirement", "summary": string, "sourceQuote": string|null, "confidence": number}]
}

Rules:
- Only extract facts explicitly stated in the text. Do not infer or speculate.
- For cost estimates, preserve the original dollar formatting in "amount" and parse to numbers where possible.
- For timelines, use ISO dates where possible, otherwise use descriptive text (e.g., "60 days after publication").
- Limit to the most significant facts — no more than 10 per category.
- Set confidence between 0 and 1 based on how clearly the fact is stated.`;

  for (let attempt = 0; attempt < MAX_AI_RETRIES; attempt++) {
    try {
      const result = await generateAIText(EXTRACTION_SYSTEM_PROMPT, userPrompt, {
        maxTokens: 2000,
        temperature: 0.1,
      });

      if (!result) continue;

      const parsed = parseExtractionJSON(result);
      if (parsed) {
        logger.info('[PreambleExtractor] AI extraction succeeded', {
          documentNumber: doc.document_number,
          attempt: attempt + 1,
          impacts: parsed.industryImpacts.length,
          costs: parsed.costEstimates.length,
          timelines: parsed.timelines.length,
          facts: parsed.facts.length,
        });
        return { ...parsed, aiSucceeded: true };
      }
    } catch (error) {
      logger.warn('[PreambleExtractor] AI extraction attempt failed', {
        attempt: attempt + 1,
        error: (error as Error).message,
      });
    }
  }

  logger.info('[PreambleExtractor] AI extraction failed, using statistics only', {
    documentNumber: doc.document_number,
  });
  return empty;
}

/**
 * Parse and validate the JSON response from the AI extraction.
 * Strips markdown code fences and validates structure.
 */
function parseExtractionJSON(raw: string): Omit<ExtractionResult, 'aiSucceeded'> | null {
  try {
    // Strip markdown code fences if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    // Validate expected arrays exist
    const industryImpacts = validateArray<PreambleIndustryImpact>(
      parsed.industryImpacts,
      isIndustryImpact
    );
    const costEstimates = validateArray<PreambleCostEstimate>(parsed.costEstimates, isCostEstimate);
    const timelines = validateArray<PreambleTimeline>(parsed.timelines, isTimeline);
    const facts = validateArray<PreambleFact>(parsed.facts, isFact);

    // Require at least one extracted item
    if (
      industryImpacts.length === 0 &&
      costEstimates.length === 0 &&
      timelines.length === 0 &&
      facts.length === 0
    ) {
      return null;
    }

    return { industryImpacts, costEstimates, timelines, facts };
  } catch {
    return null;
  }
}

// ── Type Guards ─────────────────────────────────────────────────────

function validateArray<T>(value: unknown, guard: (v: unknown) => v is T): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(guard).slice(0, 10); // Cap at 10 per category
}

function isIndustryImpact(v: unknown): v is PreambleIndustryImpact {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.industry === 'string' &&
    typeof obj.impactType === 'string' &&
    [
      'regulatory_burden',
      'deregulatory_relief',
      'new_requirement',
      'modified_requirement',
    ].includes(obj.impactType) &&
    typeof obj.description === 'string'
  );
}

function isCostEstimate(v: unknown): v is PreambleCostEstimate {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.description === 'string' &&
    typeof obj.amount === 'string' &&
    typeof obj.type === 'string' &&
    ['cost', 'benefit', 'transfer'].includes(obj.type) &&
    typeof obj.affectedParty === 'string'
  );
}

function isTimeline(v: unknown): v is PreambleTimeline {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.date === 'string' &&
    typeof obj.event === 'string' &&
    typeof obj.isEstimate === 'boolean'
  );
}

function isFact(v: unknown): v is PreambleFact {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.category === 'string' &&
    [
      'industry_impact',
      'cost_estimate',
      'timeline',
      'affected_entity',
      'legal_authority',
      'compliance_requirement',
    ].includes(obj.category) &&
    typeof obj.summary === 'string' &&
    typeof obj.confidence === 'number' &&
    obj.confidence >= 0 &&
    obj.confidence <= 1
  );
}

// ── Narrative Generation ────────────────────────────────────────────

async function buildNarrative(
  doc: FederalRegisterAPIDocument,
  agency: string,
  documentType: PreambleExtractionInsight['documentType'],
  stats: PreambleTextStats,
  extraction: ExtractionResult
): Promise<{ narrative: string; source: 'ai-generated' | 'statistical-fallback' }> {
  const fallback = buildStatisticalFallback(doc, agency, documentType, stats, extraction);

  if (!extraction.aiSucceeded) {
    return { narrative: fallback, source: 'statistical-fallback' };
  }

  const systemContext = 'You summarize Federal Register regulatory documents for CIV.IQ. ';

  const impactLines = extraction.industryImpacts
    .slice(0, 3)
    .map(i => `- ${i.industry}: ${i.description}`)
    .join('\n');

  const costLines = extraction.costEstimates
    .slice(0, 3)
    .map(c => `- ${c.description}: ${c.amount} (${c.type})`)
    .join('\n');

  const timelineLines = extraction.timelines
    .slice(0, 3)
    .map(t => `- ${t.date}: ${t.event}`)
    .join('\n');

  const userPrompt = `DOCUMENT: ${doc.title}
AGENCY: ${agency}
TYPE: ${documentType}
PUBLISHED: ${doc.publication_date}

EXTRACTED INDUSTRY IMPACTS:
${impactLines || 'None identified.'}

EXTRACTED COST ESTIMATES:
${costLines || 'None identified.'}

EXTRACTED TIMELINES:
${timelineLines || 'None identified.'}

Write a 2-3 sentence plain-language summary of this regulatory action.
State what the rule does, who it affects, and any key costs or deadlines.
Do not claim causation. Do not judge the rule.`;

  return generateInsightNarrative(systemContext, userPrompt, fallback, '[PreambleExtractor]');
}

function buildStatisticalFallback(
  doc: FederalRegisterAPIDocument,
  agency: string,
  documentType: PreambleExtractionInsight['documentType'],
  stats: PreambleTextStats,
  extraction: ExtractionResult
): string {
  const typeLabel = documentType.replace(/_/g, ' ');
  let summary =
    `This ${typeLabel} from ${agency}, published ${doc.publication_date}, ` +
    `contains ${stats.wordCount.toLocaleString()} words.`;

  if (stats.dollarAmountMentions > 0 || stats.dateMentions > 0) {
    summary +=
      ` The text references ${stats.dollarAmountMentions} dollar amounts` +
      ` and ${stats.dateMentions} dates.`;
  }

  if (extraction.aiSucceeded) {
    const parts: string[] = [];
    if (extraction.industryImpacts.length > 0) {
      parts.push(`${extraction.industryImpacts.length} industry impacts`);
    }
    if (extraction.costEstimates.length > 0) {
      parts.push(`${extraction.costEstimates.length} cost estimates`);
    }
    if (extraction.timelines.length > 0) {
      parts.push(`${extraction.timelines.length} timeline entries`);
    }
    if (parts.length > 0) {
      summary += ` Extraction identified ${parts.join(', ')}.`;
    }
  }

  return summary;
}

// ── Confidence Scoring ──────────────────────────────────────────────

function computeConfidence(
  stats: PreambleTextStats,
  extraction: ExtractionResult,
  source: 'ai-generated' | 'statistical-fallback'
): number {
  let score = 0;

  // Text length factor (more text = more extractable content)
  if (stats.wordCount >= 5000) score += 0.3;
  else if (stats.wordCount >= 1000) score += 0.2;
  else score += 0.1;

  // AI extraction success
  if (extraction.aiSucceeded) {
    score += 0.3;

    // More extracted items = higher confidence in the extraction
    const totalItems =
      extraction.industryImpacts.length +
      extraction.costEstimates.length +
      extraction.timelines.length +
      extraction.facts.length;

    if (totalItems >= 5) score += 0.2;
    else if (totalItems >= 2) score += 0.1;
  }

  // Data richness (dollar amounts and dates suggest substantive regulatory content)
  if (stats.dollarAmountMentions >= 3) score += 0.1;
  if (stats.dateMentions >= 2) score += 0.1;

  // Penalty for statistical fallback narrative
  if (source === 'statistical-fallback') {
    score = Math.min(score, 0.5);
  }

  return Math.min(Math.max(score, 0), 1);
}

// ── Helpers ─────────────────────────────────────────────────────────

function mapDocumentType(type: string): PreambleExtractionInsight['documentType'] {
  switch (type) {
    case 'Presidential Document':
      return 'executive_order';
    case 'Proposed Rule':
      return 'proposed_rule';
    case 'Rule':
      return 'final_rule';
    default:
      return 'notice';
  }
}
