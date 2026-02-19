/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Legislative Process Explainer
 *
 * Validates AI-powered bill status explanation with fallback behavior.
 */

import { LegislativeProcessExplainer } from '@/features/legislation/services/ai/legislative-process-explainer';
import type { BillStatus } from '@/types/ai';

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

const sampleBillStatus: BillStatus = {
  latestAction: {
    actionDate: '2025-03-15',
    text: 'Referred to the House Committee on Ways and Means.',
  },
  committees: [{ name: 'Ways and Means', chamber: 'House' }],
  currentStage: 'committee',
};

describe('LegislativeProcessExplainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('explainProcess - AI success path', () => {
    it('should return AI-generated explanation when AI succeeds', async () => {
      mockGenerateAIText.mockResolvedValue(
        JSON.stringify({
          currentStatus: 'This bill is in the House Ways and Means Committee.',
          whatHappened: 'Introduced and referred to committee on March 15, 2025.',
          nextSteps: ['Committee hearings', 'Committee markup vote', 'Floor debate'],
          estimatedTimeline: 'Most bills at this stage take 2-6 months.',
          confidence: 0.85,
        })
      );

      const result = await LegislativeProcessExplainer.explainProcess(
        '119-hr-1234',
        'Test Bill Act',
        sampleBillStatus
      );

      expect(result.source).toBe('ai-generated');
      expect(result.currentStatus).toContain('Ways and Means');
      expect(result.nextSteps).toHaveLength(3);
      expect(result.confidence).toBe(0.85);
      expect(result.lastUpdated).toBeDefined();
    });

    it('should call generateAIText with correct parameters', async () => {
      mockGenerateAIText.mockResolvedValue(
        JSON.stringify({
          currentStatus: 'In committee.',
          whatHappened: 'Referred.',
          nextSteps: ['Hearings'],
          estimatedTimeline: '2-6 months.',
          confidence: 0.8,
        })
      );

      await LegislativeProcessExplainer.explainProcess(
        '119-hr-1234',
        'Test Bill Act',
        sampleBillStatus
      );

      expect(mockGenerateAIText).toHaveBeenCalledTimes(1);
      const [systemPrompt, userPrompt, options] = mockGenerateAIText.mock.calls[0];

      expect(systemPrompt).toContain('nonpartisan');
      expect(systemPrompt).toContain('Plain Language Guidelines');
      expect(systemPrompt).toContain('plainlanguage.gov');
      expect(userPrompt).toContain('119-hr-1234');
      expect(userPrompt).toContain('Ways and Means');
      expect(userPrompt).toContain('committee');
      expect(options).toEqual({ temperature: 0.3, maxTokens: 1000 });
    });
  });

  describe('explainProcess - fallback path', () => {
    it('should return fallback when AI fails', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('AI provider unavailable'));

      const result = await LegislativeProcessExplainer.explainProcess(
        '119-hr-1234',
        'Test Bill Act',
        sampleBillStatus
      );

      expect(result.source).toBe('fallback');
      expect(result.confidence).toBe(0.3);
      expect(result.currentStatus).toContain('committee');
    });

    it('should return correct fallback for each stage', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('AI unavailable'));

      const stages: BillStatus['currentStage'][] = [
        'introduced',
        'committee',
        'floor',
        'passed',
        'enacted',
      ];

      for (const stage of stages) {
        const status: BillStatus = {
          ...sampleBillStatus,
          currentStage: stage,
        };

        const result = await LegislativeProcessExplainer.explainProcess(
          '119-hr-1234',
          'Test Bill Act',
          status
        );

        expect(result.source).toBe('fallback');
        expect(result.nextSteps.length).toBeGreaterThan(0);
        expect(result.estimatedTimeline).toBeTruthy();
        expect(result.currentStatus).toBeTruthy();
      }
    });

    it('should include latest action in fallback whatHappened', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('AI unavailable'));

      const result = await LegislativeProcessExplainer.explainProcess(
        '119-hr-1234',
        'Test Bill Act',
        sampleBillStatus
      );

      expect(result.whatHappened).toContain('2025-03-15');
      expect(result.whatHappened).toContain('Referred to the House Committee');
    });
  });

  describe('explainProcess - AI response parsing', () => {
    it('should handle AI response with extra text around JSON', async () => {
      mockGenerateAIText.mockResolvedValue(
        'Here is the analysis:\n' +
          JSON.stringify({
            currentStatus: 'In committee.',
            whatHappened: 'Referred.',
            nextSteps: ['Step 1'],
            estimatedTimeline: '2 months.',
            confidence: 0.9,
          }) +
          '\nEnd of analysis.'
      );

      const result = await LegislativeProcessExplainer.explainProcess(
        '119-hr-1234',
        'Test Bill Act',
        sampleBillStatus
      );

      expect(result.source).toBe('ai-generated');
      expect(result.currentStatus).toBe('In committee.');
    });

    it('should fall back when AI returns invalid JSON', async () => {
      mockGenerateAIText.mockResolvedValue('This is not valid JSON at all.');

      const result = await LegislativeProcessExplainer.explainProcess(
        '119-hr-1234',
        'Test Bill Act',
        sampleBillStatus
      );

      expect(result.source).toBe('fallback');
      expect(result.confidence).toBe(0.3);
    });

    it('should handle missing fields in AI response gracefully', async () => {
      mockGenerateAIText.mockResolvedValue(
        JSON.stringify({
          currentStatus: 'In committee.',
          // Missing other fields
        })
      );

      const result = await LegislativeProcessExplainer.explainProcess(
        '119-hr-1234',
        'Test Bill Act',
        sampleBillStatus
      );

      expect(result.source).toBe('ai-generated');
      expect(result.currentStatus).toBe('In committee.');
      expect(result.whatHappened).toBe('');
      expect(result.nextSteps).toEqual([]);
      expect(result.confidence).toBe(0.7); // default
    });
  });
});
