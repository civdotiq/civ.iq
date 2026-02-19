/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Spending Narrative Generator
 *
 * Validates AI-powered spending narrative generation with fallback behavior.
 */

import { SpendingNarrativeGenerator } from '@/features/legislation/services/ai/spending-narrative-generator';
import type { DistrictSpending } from '@/types/ai';

// Mock the AI provider
jest.mock('@/lib/ai/provider', () => ({
  generateAIText: jest.fn(),
}));

// Mock Redis cache
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock logger
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { generateAIText } from '@/lib/ai/provider';

const mockGenerateAIText = generateAIText as jest.MockedFunction<typeof generateAIText>;

const sampleSpending: DistrictSpending = {
  totalAmount: 2_300_000_000,
  categories: [
    { name: 'Medicare/Medicaid', amount: 890_000_000, percentage: 39 },
    { name: 'Defense contracts', amount: 650_000_000, percentage: 28 },
    { name: 'Infrastructure', amount: 340_000_000, percentage: 15 },
  ],
  topContracts: [
    {
      recipient: 'Lockheed Martin',
      amount: 120_000_000,
      description: 'Fighter jet maintenance',
    },
    {
      recipient: 'State University',
      amount: 45_000_000,
      description: 'Research grant for renewable energy',
    },
  ],
};

describe('SpendingNarrativeGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateNarrative - AI success path', () => {
    it('should return AI-generated narrative when AI succeeds', async () => {
      mockGenerateAIText.mockResolvedValue(
        JSON.stringify({
          summary: 'Your district received $2.3 billion in federal spending last year.',
          topCategories:
            'Medicare/Medicaid ($890 million), Defense contracts ($650 million), Infrastructure ($340 million)',
          localImpact:
            'Federal spending represents a significant portion of district economic activity.',
          notableContracts: [
            'Lockheed Martin received $120 million for fighter jet maintenance.',
            'State University received $45 million for renewable energy research.',
          ],
          confidence: 0.88,
        })
      );

      const result = await SpendingNarrativeGenerator.generateNarrative('CA-12', sampleSpending);

      expect(result.source).toBe('ai-generated');
      expect(result.summary).toContain('$2.3 billion');
      expect(result.notableContracts).toHaveLength(2);
      expect(result.confidence).toBe(0.88);
      expect(result.lastUpdated).toBeDefined();
    });

    it('should call generateAIText with spending data in prompt', async () => {
      mockGenerateAIText.mockResolvedValue(
        JSON.stringify({
          summary: 'Summary.',
          topCategories: 'Categories.',
          localImpact: 'Impact.',
          notableContracts: ['Contract 1.'],
          confidence: 0.8,
        })
      );

      await SpendingNarrativeGenerator.generateNarrative('CA-12', sampleSpending);

      expect(mockGenerateAIText).toHaveBeenCalledTimes(1);
      const [systemPrompt, userPrompt, options] = mockGenerateAIText.mock.calls[0];

      expect(systemPrompt).toContain('nonpartisan');
      expect(systemPrompt).toContain('Plain Language Guidelines');
      expect(systemPrompt).toContain('plainlanguage.gov');
      expect(userPrompt).toContain('CA-12');
      expect(userPrompt).toContain('Medicare/Medicaid');
      expect(userPrompt).toContain('Lockheed Martin');
      expect(userPrompt).toContain('Do not editorialize');
      expect(options).toEqual({ temperature: 0.3, maxTokens: 1000 });
    });
  });

  describe('generateNarrative - fallback path', () => {
    it('should return fallback with raw spending data when AI fails', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('AI provider unavailable'));

      const result = await SpendingNarrativeGenerator.generateNarrative('CA-12', sampleSpending);

      expect(result.source).toBe('fallback');
      expect(result.confidence).toBe(0.3);
      expect(result.summary).toContain('CA-12');
      expect(result.summary).toContain('$2.3 billion');
    });

    it('should format currency correctly in fallback', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('AI unavailable'));

      const result = await SpendingNarrativeGenerator.generateNarrative('CA-12', sampleSpending);

      // Total is $2.3 billion
      expect(result.summary).toContain('$2.3 billion');
      // Categories should be formatted
      expect(result.topCategories).toContain('Medicare/Medicaid');
    });

    it('should include notable contracts in fallback', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('AI unavailable'));

      const result = await SpendingNarrativeGenerator.generateNarrative('CA-12', sampleSpending);

      expect(result.notableContracts.length).toBe(2);
      expect(result.notableContracts[0]).toContain('Lockheed Martin');
      expect(result.notableContracts[0].toLowerCase()).toContain('fighter jet maintenance');
    });

    it('should handle empty spending data in fallback', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('AI unavailable'));

      const emptySpending: DistrictSpending = {
        totalAmount: 0,
        categories: [],
        topContracts: [],
      };

      const result = await SpendingNarrativeGenerator.generateNarrative('CA-12', emptySpending);

      expect(result.source).toBe('fallback');
      expect(result.topCategories).toBe('Spending category data unavailable');
      expect(result.notableContracts).toEqual(['Contract data unavailable']);
    });
  });

  describe('generateNarrative - AI response parsing', () => {
    it('should handle AI response with extra text around JSON', async () => {
      mockGenerateAIText.mockResolvedValue(
        'Analysis:\n' +
          JSON.stringify({
            summary: 'District received $2.3B.',
            topCategories: 'Medicare ($890M).',
            localImpact: 'Significant.',
            notableContracts: ['Contract 1.'],
            confidence: 0.9,
          })
      );

      const result = await SpendingNarrativeGenerator.generateNarrative('CA-12', sampleSpending);

      expect(result.source).toBe('ai-generated');
      expect(result.summary).toBe('District received $2.3B.');
    });

    it('should fall back when AI returns invalid JSON', async () => {
      mockGenerateAIText.mockResolvedValue('Not valid JSON');

      const result = await SpendingNarrativeGenerator.generateNarrative('CA-12', sampleSpending);

      expect(result.source).toBe('fallback');
    });

    it('should handle missing fields in AI response', async () => {
      mockGenerateAIText.mockResolvedValue(
        JSON.stringify({
          summary: 'Only summary provided.',
        })
      );

      const result = await SpendingNarrativeGenerator.generateNarrative('CA-12', sampleSpending);

      expect(result.source).toBe('ai-generated');
      expect(result.summary).toBe('Only summary provided.');
      expect(result.topCategories).toBe('');
      expect(result.localImpact).toBe('');
      expect(result.notableContracts).toEqual([]);
      expect(result.confidence).toBe(0.7);
    });
  });

  describe('currency formatting', () => {
    it('should format billions correctly in fallback', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('AI unavailable'));

      const spending: DistrictSpending = {
        totalAmount: 5_400_000_000,
        categories: [],
        topContracts: [],
      };

      const result = await SpendingNarrativeGenerator.generateNarrative('NY-10', spending);
      expect(result.summary).toContain('$5.4 billion');
    });

    it('should format millions correctly in fallback', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('AI unavailable'));

      const spending: DistrictSpending = {
        totalAmount: 75_000_000,
        categories: [],
        topContracts: [],
      };

      const result = await SpendingNarrativeGenerator.generateNarrative('WY-0', spending);
      expect(result.summary).toContain('$75.0 million');
    });
  });
});
