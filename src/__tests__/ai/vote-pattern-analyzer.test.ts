/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Vote Pattern Analyzer
 *
 * Validates AI-powered vote categorization with fallback behavior.
 */

import { VotePatternAnalyzer } from '@/features/legislation/services/ai/vote-pattern-analyzer';
import type { VoteRecord } from '@/types/ai';

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

const sampleVoteRecord: VoteRecord = {
  legislatorId: 'P000197',
  votes: [
    {
      billNumber: 'HR-1234',
      title: 'Medicare Improvement Act',
      vote: 'Yea',
      date: '2025-03-01',
      subjects: ['Health', 'Medicare'],
    },
    {
      billNumber: 'HR-5678',
      title: 'Defense Authorization Act',
      vote: 'Nay',
      date: '2025-02-15',
      subjects: ['Defense', 'Armed Forces'],
    },
    {
      billNumber: 'HR-9012',
      title: 'Infrastructure Investment Act',
      vote: 'Yea',
      date: '2025-01-20',
      subjects: ['Infrastructure', 'Transportation'],
    },
    {
      billNumber: 'HR-3456',
      title: 'Education Funding Act',
      vote: 'Yea',
      date: '2025-01-10',
      subjects: ['Education', 'Schools'],
    },
    {
      billNumber: 'HR-7890',
      title: 'Tax Reform Act',
      vote: 'Not Voting',
      date: '2024-12-15',
      subjects: ['Taxation', 'Revenue'],
    },
  ],
};

describe('VotePatternAnalyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzePatterns - AI success path', () => {
    it('should return AI-generated analysis when AI succeeds', async () => {
      mockGenerateAIText.mockResolvedValue(
        JSON.stringify({
          totalVotes: 5,
          categoryCounts: {
            Healthcare: { count: 1, percentage: 20 },
            Defense: { count: 1, percentage: 20 },
            Infrastructure: { count: 1, percentage: 20 },
            Education: { count: 1, percentage: 20 },
            Taxation: { count: 1, percentage: 20 },
          },
          summary:
            'Voted on 5 bills. 1 healthcare, 1 defense, 1 infrastructure, 1 education, 1 taxation.',
          topIssueAreas: ['Healthcare', 'Defense', 'Infrastructure'],
          confidence: 0.85,
        })
      );

      const result = await VotePatternAnalyzer.analyzePatterns(sampleVoteRecord);

      expect(result.source).toBe('ai-generated');
      expect(result.totalVotes).toBe(5);
      expect(result.topIssueAreas).toHaveLength(3);
      expect(result.confidence).toBe(0.85);
      expect(result.lastUpdated).toBeDefined();
    });

    it('should always use the actual vote count for totalVotes', async () => {
      mockGenerateAIText.mockResolvedValue(
        JSON.stringify({
          totalVotes: 999, // AI might hallucinate a different count
          categoryCounts: {},
          summary: 'Summary.',
          topIssueAreas: [],
          confidence: 0.8,
        })
      );

      const result = await VotePatternAnalyzer.analyzePatterns(sampleVoteRecord);

      // Should use the actual count, not the AI's answer
      expect(result.totalVotes).toBe(5);
    });

    it('should call generateAIText with vote data in prompt', async () => {
      mockGenerateAIText.mockResolvedValue(
        JSON.stringify({
          totalVotes: 5,
          categoryCounts: {},
          summary: 'Summary.',
          topIssueAreas: [],
          confidence: 0.8,
        })
      );

      await VotePatternAnalyzer.analyzePatterns(sampleVoteRecord);

      expect(mockGenerateAIText).toHaveBeenCalledTimes(1);
      const [systemPrompt, userPrompt, options] = mockGenerateAIText.mock.calls[0];

      expect(systemPrompt).toContain('nonpartisan');
      expect(systemPrompt).toContain('Plain Language Guidelines');
      expect(systemPrompt).toContain('plainlanguage.gov');
      expect(userPrompt).toContain('P000197');
      expect(userPrompt).toContain('Medicare Improvement Act');
      expect(userPrompt).toContain('Do not characterize voting patterns as liberal, conservative');
      expect(options).toEqual({ temperature: 0.3, maxTokens: 1000 });
    });
  });

  describe('analyzePatterns - fallback path', () => {
    it('should return fallback with category counts when AI fails', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('AI provider unavailable'));

      const result = await VotePatternAnalyzer.analyzePatterns(sampleVoteRecord);

      expect(result.source).toBe('fallback');
      expect(result.confidence).toBe(0.3);
      expect(result.totalVotes).toBe(5);
    });

    it('should correctly categorize subjects in fallback', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('AI unavailable'));

      const result = await VotePatternAnalyzer.analyzePatterns(sampleVoteRecord);

      // Health and Medicare should both map to Healthcare
      expect(result.categoryCounts['Healthcare']).toBeDefined();
      expect(result.categoryCounts['Healthcare'].count).toBe(2); // 'Health' + 'Medicare'

      // Defense and Armed Forces should both map to Defense
      expect(result.categoryCounts['Defense']).toBeDefined();
      expect(result.categoryCounts['Defense'].count).toBe(2); // 'Defense' + 'Armed Forces'

      // Infrastructure and Transportation should map to Infrastructure
      expect(result.categoryCounts['Infrastructure']).toBeDefined();
      expect(result.categoryCounts['Infrastructure'].count).toBe(2); // 'Infrastructure' + 'Transportation'
    });

    it('should calculate correct percentages in fallback', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('AI unavailable'));

      const result = await VotePatternAnalyzer.analyzePatterns(sampleVoteRecord);

      const totalCounted = Object.values(result.categoryCounts).reduce(
        (sum, c) => sum + c.count,
        0
      );

      // Each category's percentage should be relative to total categorized
      for (const category of Object.values(result.categoryCounts)) {
        const expectedPct = Math.round((category.count / totalCounted) * 1000) / 10;
        expect(category.percentage).toBe(expectedPct);
      }
    });

    it('should build a summary string in fallback', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('AI unavailable'));

      const result = await VotePatternAnalyzer.analyzePatterns(sampleVoteRecord);

      expect(result.summary).toContain('Voted on 5 bills');
      expect(result.summary).toContain('healthcare');
    });

    it('should identify top issue areas in fallback', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('AI unavailable'));

      const result = await VotePatternAnalyzer.analyzePatterns(sampleVoteRecord);

      expect(result.topIssueAreas.length).toBeGreaterThan(0);
      expect(result.topIssueAreas.length).toBeLessThanOrEqual(5);
    });

    it('should handle votes with no subjects in fallback', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('AI unavailable'));

      const noSubjectsRecord: VoteRecord = {
        legislatorId: 'P000197',
        votes: [
          {
            billNumber: 'HR-1',
            title: 'Test Bill',
            vote: 'Yea',
            date: '2025-01-01',
            subjects: [],
          },
        ],
      };

      const result = await VotePatternAnalyzer.analyzePatterns(noSubjectsRecord);

      expect(result.source).toBe('fallback');
      expect(result.totalVotes).toBe(1);
      expect(Object.keys(result.categoryCounts)).toHaveLength(0);
    });
  });

  describe('analyzePatterns - AI response parsing', () => {
    it('should handle AI response with extra text around JSON', async () => {
      mockGenerateAIText.mockResolvedValue(
        'Here is the analysis:\n' +
          JSON.stringify({
            totalVotes: 5,
            categoryCounts: { Healthcare: { count: 2, percentage: 40 } },
            summary: 'Voted on 5 bills.',
            topIssueAreas: ['Healthcare'],
            confidence: 0.9,
          }) +
          '\nDone.'
      );

      const result = await VotePatternAnalyzer.analyzePatterns(sampleVoteRecord);

      expect(result.source).toBe('ai-generated');
      expect(result.categoryCounts['Healthcare'].count).toBe(2);
    });

    it('should fall back when AI returns invalid JSON', async () => {
      mockGenerateAIText.mockResolvedValue('This is not valid JSON.');

      const result = await VotePatternAnalyzer.analyzePatterns(sampleVoteRecord);

      expect(result.source).toBe('fallback');
    });

    it('should handle missing fields in AI response', async () => {
      mockGenerateAIText.mockResolvedValue(
        JSON.stringify({
          summary: 'Only summary.',
        })
      );

      const result = await VotePatternAnalyzer.analyzePatterns(sampleVoteRecord);

      expect(result.source).toBe('ai-generated');
      expect(result.totalVotes).toBe(5);
      expect(result.categoryCounts).toEqual({});
      expect(result.topIssueAreas).toEqual([]);
      expect(result.confidence).toBe(0.7);
    });
  });

  describe('category normalization', () => {
    it('should normalize health-related subjects to Healthcare', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('AI unavailable'));

      const healthRecord: VoteRecord = {
        legislatorId: 'TEST',
        votes: [
          { billNumber: 'HR-1', title: '', vote: 'Yea', date: '', subjects: ['Health'] },
          { billNumber: 'HR-2', title: '', vote: 'Yea', date: '', subjects: ['Medicare'] },
          { billNumber: 'HR-3', title: '', vote: 'Yea', date: '', subjects: ['Medicaid'] },
          { billNumber: 'HR-4', title: '', vote: 'Yea', date: '', subjects: ['Drug Policy'] },
        ],
      };

      const result = await VotePatternAnalyzer.analyzePatterns(healthRecord);

      expect(result.categoryCounts['Healthcare']).toBeDefined();
      expect(result.categoryCounts['Healthcare'].count).toBe(4);
    });

    it('should normalize defense-related subjects to Defense', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('AI unavailable'));

      const defenseRecord: VoteRecord = {
        legislatorId: 'TEST',
        votes: [
          { billNumber: 'HR-1', title: '', vote: 'Yea', date: '', subjects: ['Defense'] },
          { billNumber: 'HR-2', title: '', vote: 'Yea', date: '', subjects: ['Military Spending'] },
          { billNumber: 'HR-3', title: '', vote: 'Yea', date: '', subjects: ['Veterans Affairs'] },
        ],
      };

      const result = await VotePatternAnalyzer.analyzePatterns(defenseRecord);

      expect(result.categoryCounts['Defense']).toBeDefined();
      expect(result.categoryCounts['Defense'].count).toBe(3);
    });
  });
});
