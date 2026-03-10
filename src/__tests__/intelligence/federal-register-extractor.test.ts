/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Federal Register Preamble Extractor.
 */

// ── Mocks ─────────────────────────────────────────────────────────

const mockCacheGet = jest.fn();
const mockCacheSet = jest.fn();

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((_key: string, fn: () => Promise<unknown>) => fn()),
  cache: {
    get: (...args: unknown[]) => mockCacheGet(...args),
    set: (...args: unknown[]) => mockCacheSet(...args),
  },
}));

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: mockCacheGet,
    set: mockCacheSet,
    keys: jest.fn().mockResolvedValue([]),
    mget: jest.fn().mockResolvedValue([]),
  }),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockGenerateAIText = jest.fn();
jest.mock('@/lib/ai/provider', () => ({
  generateAIText: (...args: unknown[]) => mockGenerateAIText(...args),
}));

jest.mock('@/lib/ai/plain-language', () => ({
  PLAIN_LANGUAGE_RULES: 'Use plain language.',
  PLAIN_LANGUAGE_SYSTEM_PROMPT: 'Write in plain language. Output valid JSON only.',
}));

jest.mock('@/features/legislation/services/ai/reading-level-validator', () => ({
  ReadingLevelValidator: { meetsTarget: jest.fn().mockReturnValue(true) },
}));

// ── Mock Federal Register Service ─────────────────────────────────

const mockGetDocumentMetadata = jest.fn();
const mockGetPreambleText = jest.fn();

jest.mock('@/lib/data-sources/federal-register-service', () => ({
  getDocumentMetadata: (...args: unknown[]) => mockGetDocumentMetadata(...args),
  getPreambleText: (...args: unknown[]) => mockGetPreambleText(...args),
  computeTextStats: jest.requireActual('@/lib/data-sources/federal-register-service')
    .computeTextStats,
  MAX_PREAMBLE_CHARS: 30000,
  MIN_WORDS_FOR_EXTRACTION: 100,
}));

// ── Imports ───────────────────────────────────────────────────────

import { extractPreambleFacts } from '@/lib/intelligence/analyzers/federal-register-extractor';
import { computeTextStats } from '@/lib/data-sources/federal-register-service';
import type { FederalRegisterAPIDocument } from '@/types/federal-register';

// ── Test Data ─────────────────────────────────────────────────────

const MOCK_DOC: FederalRegisterAPIDocument = {
  document_number: '2025-12345',
  title: 'Air Quality Standards for Industrial Emissions',
  abstract: 'EPA proposes new emission limits for industrial facilities.',
  type: 'Proposed Rule',
  publication_date: '2025-03-01',
  html_url: 'https://www.federalregister.gov/d/2025-12345',
  pdf_url: 'https://www.federalregister.gov/d/2025-12345/pdf',
  body_html_url: 'https://www.federalregister.gov/d/2025-12345/htm',
  raw_text_url: 'https://www.federalregister.gov/d/2025-12345/txt',
  agencies: [
    {
      raw_name: 'ENVIRONMENTAL PROTECTION AGENCY',
      name: 'Environmental Protection Agency',
      id: 145,
      url: 'https://www.federalregister.gov/agencies/environmental-protection-agency',
      json_url: 'https://www.federalregister.gov/api/v1/agencies/145',
      parent_id: null,
      slug: 'environmental-protection-agency',
    },
  ],
};

const MOCK_PREAMBLE = `
Environmental Protection Agency

Air Quality Standards for Industrial Emissions

Section I. Background

The Environmental Protection Agency is proposing new emission standards for
industrial facilities under the Clean Air Act. These standards would affect
approximately 12,000 facilities across the manufacturing sector.

Section II. Cost Analysis

The estimated annual compliance cost is $2.3 billion for affected industries.
Small businesses with fewer than 500 employees may face costs of $50,000 to
$150,000 per facility. The Department of Commerce estimates these rules will
affect the petroleum refining, chemical manufacturing, and steel production
industries.

The estimated annual health benefits are $8.5 billion due to reduced
particulate matter exposure.

Section III. Timeline

The proposed rule would take effect on January 15, 2026. Public comments
are due by June 30, 2025. Compliance deadlines for existing facilities
would be phased over 3 years beginning March 1, 2026.

Section IV. Legal Authority

This rule is issued under authority of Section 111 of the Clean Air Act
(42 U.S.C. 7411).
`.repeat(3); // Repeat to exceed MIN_WORDS_FOR_EXTRACTION

const MOCK_AI_EXTRACTION = JSON.stringify({
  industryImpacts: [
    {
      industry: 'petroleum refining',
      impactType: 'new_requirement',
      description: 'New emission limits for industrial facilities',
      estimatedAffectedEntities: 12000,
    },
    {
      industry: 'chemical manufacturing',
      impactType: 'regulatory_burden',
      description: 'Compliance requirements for chemical plants',
      estimatedAffectedEntities: null,
    },
  ],
  costEstimates: [
    {
      description: 'Annual compliance cost for affected industries',
      amount: '$2.3 billion',
      amountLow: 2300000000,
      amountHigh: 2300000000,
      type: 'cost',
      affectedParty: 'manufacturing sector',
      timePeriod: 'annually',
    },
    {
      description: 'Annual health benefits from reduced particulate matter',
      amount: '$8.5 billion',
      amountLow: 8500000000,
      amountHigh: 8500000000,
      type: 'benefit',
      affectedParty: 'general public',
      timePeriod: 'annually',
    },
  ],
  timelines: [
    {
      date: '2026-01-15',
      event: 'Proposed rule takes effect',
      isEstimate: false,
    },
    {
      date: '2025-06-30',
      event: 'Public comment deadline',
      isEstimate: false,
    },
  ],
  facts: [
    {
      category: 'legal_authority',
      summary: 'Rule issued under Section 111 of the Clean Air Act (42 U.S.C. 7411).',
      sourceQuote: 'This rule is issued under authority of Section 111 of the Clean Air Act',
      confidence: 0.95,
    },
  ],
});

// ── Tests ─────────────────────────────────────────────────────────

describe('Federal Register Preamble Extractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheGet.mockResolvedValue(null); // Default: no cache
    mockCacheSet.mockResolvedValue(true);
    mockGetDocumentMetadata.mockResolvedValue(MOCK_DOC);
    mockGetPreambleText.mockResolvedValue(MOCK_PREAMBLE);
  });

  describe('extractPreambleFacts', () => {
    it('returns cached insight on cache hit', async () => {
      const cachedInsight = { documentNumber: '2025-12345', cached: true };
      mockCacheGet.mockResolvedValue(cachedInsight);

      const result = await extractPreambleFacts('2025-12345');
      expect(result).toEqual(cachedInsight);
      expect(mockGetDocumentMetadata).not.toHaveBeenCalled();
    });

    it('returns null when document not found', async () => {
      mockGetDocumentMetadata.mockResolvedValue(null);

      const result = await extractPreambleFacts('2025-99999');
      expect(result).toBeNull();
    });

    it('returns null when no preamble text available', async () => {
      mockGetPreambleText.mockResolvedValue(null);

      const result = await extractPreambleFacts('2025-12345');
      expect(result).toBeNull();
    });

    it('returns null when text is too short', async () => {
      mockGetPreambleText.mockResolvedValue('Short text.');

      const result = await extractPreambleFacts('2025-12345');
      expect(result).toBeNull();
    });

    it('extracts structured facts with AI', async () => {
      mockGenerateAIText
        .mockResolvedValueOnce(MOCK_AI_EXTRACTION) // extraction call
        .mockResolvedValueOnce(
          'This proposed rule from EPA sets new emission limits for 12,000 industrial facilities. Compliance costs are estimated at $2.3 billion per year.'
        ); // narrative call

      const result = await extractPreambleFacts('2025-12345');

      expect(result).not.toBeNull();
      expect(result?.documentNumber).toBe('2025-12345');
      expect(result?.agency).toBe('Environmental Protection Agency');
      expect(result?.documentType).toBe('proposed_rule');
      expect(result?.industryImpacts).toHaveLength(2);
      expect(result?.costEstimates).toHaveLength(2);
      expect(result?.timelines).toHaveLength(2);
      expect(result?.facts).toHaveLength(1);
      expect(result?.source).toBe('ai-generated');
      expect(result?.confidence).toBeGreaterThan(0);
      expect(result?.disclaimer).toContain('does not constitute legal');
    });

    it('falls back to statistical narrative when AI narrative fails', async () => {
      mockGenerateAIText
        .mockResolvedValueOnce(MOCK_AI_EXTRACTION) // extraction succeeds
        .mockRejectedValue(new Error('AI unavailable')); // narrative fails

      const result = await extractPreambleFacts('2025-12345');

      expect(result).not.toBeNull();
      expect(result?.source).toBe('statistical-fallback');
      expect(result?.narrative).toContain('proposed rule');
      expect(result?.narrative).toContain('Environmental Protection Agency');
      // AI extraction still populated
      expect(result?.industryImpacts).toHaveLength(2);
    });

    it('returns statistical-only result when AI extraction fails', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('AI unavailable'));

      const result = await extractPreambleFacts('2025-12345');

      expect(result).not.toBeNull();
      expect(result?.source).toBe('statistical-fallback');
      expect(result?.industryImpacts).toHaveLength(0);
      expect(result?.costEstimates).toHaveLength(0);
      expect(result?.timelines).toHaveLength(0);
      expect(result?.facts).toHaveLength(0);
      expect(result?.confidence).toBeLessThanOrEqual(0.5);
    });

    it('caches the result after computation', async () => {
      mockGenerateAIText
        .mockResolvedValueOnce(MOCK_AI_EXTRACTION)
        .mockResolvedValueOnce('Summary narrative.');

      await extractPreambleFacts('2025-12345');

      expect(mockCacheSet).toHaveBeenCalledWith(
        'insight:preamble:2025-12345',
        expect.objectContaining({ documentNumber: '2025-12345' }),
        30 * 24 * 60 * 60
      );
    });

    it('includes methodology with word count and text statistics', async () => {
      mockGenerateAIText
        .mockResolvedValueOnce(MOCK_AI_EXTRACTION)
        .mockResolvedValueOnce('Summary narrative.');

      const result = await extractPreambleFacts('2025-12345');

      expect(result?.methodology).toContain('words');
      expect(result?.methodology).toContain('dollar amounts');
      expect(result?.methodology).toContain('dates');
    });

    it('handles malformed AI JSON gracefully', async () => {
      mockGenerateAIText
        .mockResolvedValueOnce('not valid json {{{')
        .mockResolvedValueOnce('not valid json {{{')
        .mockResolvedValueOnce('not valid json {{{');

      const result = await extractPreambleFacts('2025-12345');

      expect(result).not.toBeNull();
      expect(result?.source).toBe('statistical-fallback');
      expect(result?.industryImpacts).toHaveLength(0);
    });

    it('strips markdown code fences from AI response', async () => {
      const wrappedJson = '```json\n' + MOCK_AI_EXTRACTION + '\n```';
      mockGenerateAIText
        .mockResolvedValueOnce(wrappedJson)
        .mockResolvedValueOnce('Summary narrative.');

      const result = await extractPreambleFacts('2025-12345');

      expect(result?.industryImpacts).toHaveLength(2);
    });
  });

  describe('computeTextStats', () => {
    it('counts words accurately', () => {
      const stats = computeTextStats('one two three four five');
      expect(stats.wordCount).toBe(5);
    });

    it('detects dollar amounts', () => {
      const text = 'The cost is $2.3 billion and the benefit is $500 million annually.';
      const stats = computeTextStats(text);
      expect(stats.dollarAmountMentions).toBe(2);
    });

    it('detects date mentions', () => {
      const text = 'Effective January 15, 2026. Comments due by 2025-06-30.';
      const stats = computeTextStats(text);
      expect(stats.dateMentions).toBe(2);
    });

    it('detects section headings', () => {
      const text = '\nSection 1 Background\n\nSection 2 Analysis\n\nSection 3 Timeline\n';
      const stats = computeTextStats(text);
      expect(stats.sectionCount).toBe(3);
    });

    it('detects entity mentions', () => {
      const text =
        'The Department of Commerce and the Agency of Environmental Protection reviewed this.';
      const stats = computeTextStats(text);
      expect(stats.entityMentions).toBeGreaterThanOrEqual(1);
    });

    it('returns zero counts for empty-like text', () => {
      const stats = computeTextStats('no special content here');
      expect(stats.dollarAmountMentions).toBe(0);
      expect(stats.dateMentions).toBe(0);
      expect(stats.sectionCount).toBe(0);
    });
  });
});
