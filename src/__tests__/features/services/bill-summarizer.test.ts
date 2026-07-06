/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for BillSummarizer — the AI bill-summarization service that 8 modules
 * import. Covers the summarizeBill pipeline (Redis cache, AI call, reading-level
 * regeneration, rule-based fallback on unparseable AI output), IndustrySector
 * validation with the policy-area-map fallback, outer fallback-chain delegation,
 * the public reading-metrics calculator, and the static prompt builders.
 *
 * generateAIText (the provider wrapper) is THE key mock — the summarizer never
 * touches the AI SDK directly. Redis, the reading-level tracker, and the
 * fallback chain are mocked; IndustrySector and policy-area-map are real so
 * sector validation runs against the true enum values.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// The mock object is created inside the hoisted factory (same pattern as the
// file-cache mock in congress.service.test.ts) so it exists no matter when
// getRedisCache() is first called.
jest.mock('@/lib/cache/redis-client', () => {
  const redisCache = { get: jest.fn(), set: jest.fn(), delete: jest.fn() };
  return { getRedisCache: () => redisCache };
});

jest.mock('@/lib/ai/provider', () => ({
  generateAIText: jest.fn(),
}));

// Fire-and-forget analytics — never part of the summary result.
jest.mock('@/lib/analytics/reading-level-tracker', () => ({
  trackReadingLevel: jest.fn(),
}));

// The outer catch delegates to this chain; its internals get their own suite.
jest.mock('@/features/legislation/services/ai/bill-summary-fallbacks', () => ({
  BillSummaryFallbacks: { executeFallbackChain: jest.fn() },
}));

import { getRedisCache } from '@/lib/cache/redis-client';
import { generateAIText } from '@/lib/ai/provider';
import { trackReadingLevel } from '@/lib/analytics/reading-level-tracker';
import { BillSummaryFallbacks } from '@/features/legislation/services/ai/bill-summary-fallbacks';
import {
  BillSummarizer,
  type BillSummary,
  type BillMetadata,
} from '@/features/legislation/services/ai/bill-summarizer';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';

const mockRedis = getRedisCache() as unknown as { get: jest.Mock; set: jest.Mock };
const mockGenerateAIText = generateAIText as jest.Mock;
const mockTrackReadingLevel = trackReadingLevel as jest.Mock;
const mockExecuteFallbackChain = BillSummaryFallbacks.executeFallbackChain as jest.Mock;

const DAY_SECONDS = 24 * 60 * 60;

const BILL_METADATA: BillMetadata = {
  number: 'hr-1234',
  title: 'School Repair Act',
  congress: 119,
  chamber: 'house',
};

// "to provide ..." and "shall ..." feed the rule-based key-phrase extractor.
const BILL_TEXT =
  'A bill to provide funds to repair public school buildings. ' +
  'Each state shall report spending each year.';

// Short words, short sentences — Flesch-Kincaid grade well under 8, so the
// regeneration path stays off in happy-path tests.
const SIMPLE_SUMMARY =
  'This bill helps schools. It gives money to fix old buildings. Kids get safer classrooms.';

// One long sentence of polysyllabic words — grade far above 8, triggering
// the regeneration path.
const COMPLEX_SUMMARY =
  'This comprehensive legislation establishes multifaceted administrative infrastructure ' +
  'requirements notwithstanding considerable organizational implementation complications ' +
  'throughout intergovernmental regulatory coordination mechanisms across numerous ' +
  'participating jurisdictional authorities.';

interface AIResponseFields {
  summary?: string;
  keyPoints?: string[];
  whoItAffects?: string[];
  whatItDoes?: string;
  whyItMatters?: string;
  affectedIndustries?: unknown[];
  confidence?: number;
}

/** JSON wrapped in prose, since parseSummaryResponse extracts with /\{[\s\S]*\}/. */
function makeAIResponse(overrides: AIResponseFields = {}): string {
  const payload = {
    summary: SIMPLE_SUMMARY,
    keyPoints: ['Schools get repair money', 'Old buildings get fixed'],
    whoItAffects: ['Students', 'Teachers'],
    whatItDoes: 'Gives schools money to fix old buildings.',
    whyItMatters: 'Safer schools help kids learn.',
    affectedIndustries: [IndustrySector.CONSTRUCTION],
    confidence: 0.92,
    ...overrides,
  };
  return `Here is the requested summary.\n${JSON.stringify(payload)}\nLet me know if you need more.`;
}

function makeBillSummary(overrides: Partial<BillSummary> = {}): BillSummary {
  return {
    billId: 'hr-1234-119',
    title: 'School Repair Act',
    summary: 'A stored plain-language summary.',
    keyPoints: ['Stored point'],
    whoItAffects: ['Everyone'],
    whatItDoes: 'It does a stored thing.',
    whyItMatters: 'It matters.',
    affectedIndustries: [],
    readingLevel: 6.5,
    confidence: 0.9,
    lastUpdated: '2026-07-01T00:00:00.000Z',
    source: 'ai-generated',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRedis.get.mockResolvedValue(null);
  mockRedis.set.mockResolvedValue(true);
  mockGenerateAIText.mockResolvedValue(makeAIResponse());
});

describe('summarizeBill', () => {
  it('parses the AI JSON into a BillSummary and caches it for 24 hours', async () => {
    const result = await BillSummarizer.summarizeBill(BILL_TEXT, BILL_METADATA);

    expect(result.billId).toBe('hr-1234-119');
    expect(result.title).toBe('School Repair Act');
    expect(result.summary).toBe(SIMPLE_SUMMARY);
    expect(result.keyPoints).toEqual(['Schools get repair money', 'Old buildings get fixed']);
    expect(result.whoItAffects).toEqual(['Students', 'Teachers']);
    expect(result.whatItDoes).toBe('Gives schools money to fix old buildings.');
    expect(result.whyItMatters).toBe('Safer schools help kids learn.');
    expect(result.affectedIndustries).toEqual([IndustrySector.CONSTRUCTION]);
    expect(result.confidence).toBe(0.92);
    expect(result.source).toBe('ai-generated');

    // Simple summary stays at or under the grade-8 target — no regeneration.
    expect(result.readingLevel).toBeLessThanOrEqual(8);
    expect(mockGenerateAIText).toHaveBeenCalledTimes(1);

    // lastUpdated is a valid ISO timestamp.
    expect(new Date(result.lastUpdated).toISOString()).toBe(result.lastUpdated);

    // Cached under bill-summary:{number}:{congress} with a 24h TTL.
    expect(mockRedis.set).toHaveBeenCalledWith('bill-summary:hr-1234:119', result, DAY_SECONDS);

    // Reading level is tracked fire-and-forget under {congress}-{number}.
    expect(mockTrackReadingLevel).toHaveBeenCalledWith(
      result.readingLevel,
      '119-hr-1234',
      expect.any(Number)
    );
  });

  it('returns the cached summary without calling the AI provider', async () => {
    const cached = makeBillSummary();
    mockRedis.get.mockResolvedValue(cached);

    const result = await BillSummarizer.summarizeBill(BILL_TEXT, BILL_METADATA);

    expect(result).toBe(cached);
    expect(mockGenerateAIText).not.toHaveBeenCalled();
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it('never touches the cache when useCache is false', async () => {
    const result = await BillSummarizer.summarizeBill(BILL_TEXT, BILL_METADATA, {
      useCache: false,
    });

    expect(result.summary).toBe(SIMPLE_SUMMARY);
    expect(mockRedis.get).not.toHaveBeenCalled();
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it('regenerates with the simplification prompt when the summary exceeds grade 8', async () => {
    const simplified = 'This bill helps kids. It gives schools money.';
    mockGenerateAIText
      .mockResolvedValueOnce(makeAIResponse({ summary: COMPLEX_SUMMARY }))
      .mockResolvedValueOnce(
        JSON.stringify({ summary: simplified, keyPoints: ['Simple point one', 'Simple point two'] })
      );

    const result = await BillSummarizer.summarizeBill(BILL_TEXT, BILL_METADATA);

    expect(mockGenerateAIText).toHaveBeenCalledTimes(2);

    // The second call is the simplification prompt. Quirk: it embeds the
    // preprocessed BILL TEXT, not the failed summary.
    const secondUserPrompt = mockGenerateAIText.mock.calls[1]?.[1] as string;
    expect(secondUserPrompt).toContain('too complex');
    expect(secondUserPrompt).toContain('A bill to provide funds');

    // Simplified text replaces summary and keyPoints; other fields survive.
    expect(result.summary).toBe(simplified);
    expect(result.keyPoints).toEqual(['Simple point one', 'Simple point two']);
    expect(result.whoItAffects).toEqual(['Students', 'Teachers']);
    expect(result.readingLevel).toBeLessThanOrEqual(8);
  });

  it('falls back to a rule-based summary when the AI response has no JSON', async () => {
    mockGenerateAIText.mockResolvedValue('Sorry, I cannot summarize this bill right now.');

    const result = await BillSummarizer.summarizeBill(BILL_TEXT, BILL_METADATA);

    // Rule-based fallback inside generateAISummary — NOT the outer chain.
    expect(mockExecuteFallbackChain).not.toHaveBeenCalled();
    expect(mockGenerateAIText).toHaveBeenCalledTimes(1);

    expect(result.confidence).toBe(0.6);
    expect(result.summary).toContain('School Repair Act');
    // Key phrases extracted from the real bill text feed the summary.
    expect(result.summary).toContain('to provide funds');
    expect(result.keyPoints).toHaveLength(3);
    expect(result.source).toBe('ai-generated');
    expect(result.billId).toBe('hr-1234-119');
  });

  describe('affectedIndustries validation', () => {
    it('keeps only valid IndustrySector values from a mixed AI response', async () => {
      mockGenerateAIText.mockResolvedValue(
        makeAIResponse({
          affectedIndustries: [IndustrySector.HEALTH, 'Garbage Sector', IndustrySector.DEFENSE, 42],
        })
      );

      const result = await BillSummarizer.summarizeBill(BILL_TEXT, BILL_METADATA, {
        useCache: false,
      });

      expect(result.affectedIndustries).toEqual([IndustrySector.HEALTH, IndustrySector.DEFENSE]);
    });

    it('falls back to the policy-area map when the AI returns only garbage', async () => {
      mockGenerateAIText.mockResolvedValue(
        makeAIResponse({ affectedIndustries: ['Not A Sector', 'Also Wrong'] })
      );

      const result = await BillSummarizer.summarizeBill(
        BILL_TEXT,
        { ...BILL_METADATA, policyArea: 'Health' },
        { useCache: false }
      );

      // Real policy-area-map lookup: 'Health' → [IndustrySector.HEALTH].
      expect(result.affectedIndustries).toEqual([IndustrySector.HEALTH]);
    });

    it('returns an empty array with garbage sectors and no policyArea', async () => {
      mockGenerateAIText.mockResolvedValue(makeAIResponse({ affectedIndustries: ['Nonsense'] }));

      const result = await BillSummarizer.summarizeBill(BILL_TEXT, BILL_METADATA, {
        useCache: false,
      });

      expect(result.affectedIndustries).toEqual([]);
    });
  });

  it('delegates to the fallback chain when the pipeline throws outside the AI call', async () => {
    mockRedis.get.mockRejectedValue(new Error('redis down'));

    const fallbackSummary = makeBillSummary({
      summary: 'Congressional summary text.',
      confidence: 0.5,
      source: 'congressional-summary',
    });
    mockExecuteFallbackChain.mockResolvedValue({
      summary: fallbackSummary,
      fallbackMethod: 'congressional',
      success: true,
      errors: ['redis down'],
    });

    const result = await BillSummarizer.summarizeBill(BILL_TEXT, BILL_METADATA);

    expect(result).toBe(fallbackSummary);
    expect(mockExecuteFallbackChain).toHaveBeenCalledWith(
      BILL_TEXT,
      BILL_METADATA,
      expect.any(Error),
      {
        useCongressionalSummary: true,
        useKeywordExtraction: true,
        useSimpleExtraction: true,
      }
    );
  });
});

describe('calculateReadingMetrics', () => {
  it('scores simple text at the clamp floors and ceilings', () => {
    // Raw Flesch-Kincaid goes negative and reading ease exceeds 100 for
    // three-word sentences — both are clamped to grade 1 and ease 100.
    expect(BillSummarizer.calculateReadingMetrics('The cat sat. The dog ran.')).toEqual({
      gradeLevel: 1,
      fleschReadingEase: 100,
    });
  });

  it('returns the sentinel {13, 0} for empty text', () => {
    expect(BillSummarizer.calculateReadingMetrics('')).toEqual({
      gradeLevel: 13,
      fleschReadingEase: 0,
    });
    expect(BillSummarizer.calculateReadingMetrics('   ')).toEqual({
      gradeLevel: 13,
      fleschReadingEase: 0,
    });
  });

  it('scores dense polysyllabic text above grade 8 with ease clamped to 0', () => {
    const metrics = BillSummarizer.calculateReadingMetrics(COMPLEX_SUMMARY);
    // Also validates the fixture assumption behind the regeneration test.
    expect(metrics.gradeLevel).toBeGreaterThan(8);
    expect(metrics.fleschReadingEase).toBe(0);
  });
});

describe('prompt builders', () => {
  it('buildStreamingSummaryPrompt asks for plain text, never JSON', () => {
    const { system, user } = BillSummarizer.buildStreamingSummaryPrompt(BILL_TEXT, BILL_METADATA);

    expect(system).toContain('Do not output JSON');
    expect(system).not.toContain('Output valid JSON only');
    expect(user).toContain('hr-1234');
    expect(user).toContain('School Repair Act');
    expect(user).toContain(BILL_TEXT);
  });

  it('buildStructuredExtractionPrompt requests JSON output', () => {
    const { system, user } = BillSummarizer.buildStructuredExtractionPrompt(
      BILL_TEXT,
      BILL_METADATA
    );

    expect(system).toContain('Output valid JSON only');
    expect(user).toContain('hr-1234');
    expect(user).toContain('School Repair Act');
    expect(user).toContain(BILL_TEXT);
    expect(user).toContain('Respond with ONLY this JSON');
    expect(user).toContain('"keyPoints"');
  });
});

describe('getMultiFormatSummary', () => {
  it('delegates to summarizeBill and maps the formats', async () => {
    const result = await BillSummarizer.getMultiFormatSummary(BILL_TEXT, BILL_METADATA);

    expect(mockGenerateAIText).toHaveBeenCalledTimes(1);
    expect(result.brief).toBe(result.detailed.whatItDoes);
    expect(result.plainEnglish).toBe(result.detailed.summary);
    expect(result.keyPoints).toBe(result.detailed.keyPoints);
    expect(result.detailed.billId).toBe('hr-1234-119');
  });
});
