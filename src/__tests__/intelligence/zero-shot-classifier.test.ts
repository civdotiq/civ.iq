/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for the zero-shot classifier.
 * Mocks @huggingface/transformers — does NOT load the real model.
 */

// Mock logger
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock Redis cache
const mockRedisGet = jest.fn().mockResolvedValue(null);
const mockRedisSet = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  }),
}));

// Mock @huggingface/transformers
const mockPipeline = jest.fn();
const mockClassifier = jest.fn();
jest.mock('@huggingface/transformers', () => ({
  pipeline: (...args: unknown[]) => mockPipeline(...args),
  env: { allowLocalModels: true },
}));

import {
  classifyBillSectorsZeroShot,
  classifyZeroShot,
  _resetForTesting,
} from '@/lib/intelligence/embeddings/zero-shot-classifier';

describe('zero-shot classifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetForTesting();
    mockRedisGet.mockResolvedValue(null);

    // Default: pipeline() returns a working classifier
    mockPipeline.mockResolvedValue(mockClassifier);
  });

  describe('classifyBillSectorsZeroShot', () => {
    it('classifies bill text and returns sectors above threshold', async () => {
      mockClassifier.mockResolvedValue({
        labels: ['Defense', 'Health', 'Agribusiness'],
        scores: [0.85, 0.45, 0.05],
      });

      const results = await classifyBillSectorsZeroShot('National Defense Authorization Act');

      expect(results).toHaveLength(2); // Defense and Health above 0.15 threshold
      expect(results[0]!.sector).toBe('Defense');
      expect(results[0]!.confidence).toBe(0.85);
      expect(results[1]!.sector).toBe('Health');
    });

    it('returns at most 3 sectors', async () => {
      mockClassifier.mockResolvedValue({
        labels: ['Defense', 'Health', 'Agribusiness', 'Labor', 'Construction'],
        scores: [0.9, 0.8, 0.7, 0.6, 0.5],
      });

      const results = await classifyBillSectorsZeroShot('Multi-sector bill');
      expect(results).toHaveLength(3);
    });

    it('returns empty array for empty input', async () => {
      const results = await classifyBillSectorsZeroShot('');
      expect(results).toEqual([]);
      expect(mockPipeline).not.toHaveBeenCalled();
    });

    it('returns empty array when pipeline fails to load', async () => {
      mockPipeline.mockRejectedValue(new Error('WASM failed'));

      const results = await classifyBillSectorsZeroShot('Defense bill');
      expect(results).toEqual([]);
    });

    it('does not retry pipeline load after failure (fail-fast)', async () => {
      mockPipeline.mockRejectedValue(new Error('WASM failed'));

      await classifyBillSectorsZeroShot('First attempt');
      await classifyBillSectorsZeroShot('Second attempt');

      expect(mockPipeline).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent pipeline loads', async () => {
      let resolveLoad: (value: unknown) => void;
      mockPipeline.mockReturnValue(
        new Promise(resolve => {
          resolveLoad = resolve;
        })
      );
      mockClassifier.mockResolvedValue({
        labels: ['Defense'],
        scores: [0.9],
      });

      const p1 = classifyBillSectorsZeroShot('Bill A');
      const p2 = classifyBillSectorsZeroShot('Bill B');

      resolveLoad!(mockClassifier);
      await Promise.all([p1, p2]);

      expect(mockPipeline).toHaveBeenCalledTimes(1);
    });

    it('uses multi_label mode', async () => {
      mockClassifier.mockResolvedValue({
        labels: ['Defense'],
        scores: [0.9],
      });

      await classifyBillSectorsZeroShot('Test bill');

      expect(mockClassifier).toHaveBeenCalledWith(
        'Test bill',
        expect.any(Array),
        expect.objectContaining({ multi_label: true })
      );
    });

    it('returns cached results from Redis', async () => {
      mockRedisGet.mockResolvedValueOnce([{ sector: 'Defense', confidence: 0.85 }]);

      const results = await classifyBillSectorsZeroShot('Defense bill');

      expect(results).toEqual([{ sector: 'Defense', confidence: 0.85 }]);
      expect(mockClassifier).not.toHaveBeenCalled();
    });

    it('caches results to Redis on success', async () => {
      mockClassifier.mockResolvedValue({
        labels: ['Defense'],
        scores: [0.9],
      });

      await classifyBillSectorsZeroShot('Defense bill');

      expect(mockRedisSet).toHaveBeenCalledWith(
        expect.stringContaining('zs-bill:'),
        expect.arrayContaining([expect.objectContaining({ sector: 'Defense' })]),
        expect.any(Number)
      );
    });

    it('handles timeout gracefully', async () => {
      mockClassifier.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 20_000)));

      const results = await classifyBillSectorsZeroShot('Slow bill');
      expect(results).toEqual([]);
    }, 15_000);

    it('loads the correct model', async () => {
      mockClassifier.mockResolvedValue({ labels: [], scores: [] });

      await classifyBillSectorsZeroShot('Test');

      expect(mockPipeline).toHaveBeenCalledWith(
        'zero-shot-classification',
        'Xenova/nli-deberta-v3-xsmall',
        expect.objectContaining({ dtype: 'q8' })
      );
    });

    it('resets state correctly', async () => {
      mockPipeline.mockRejectedValue(new Error('Failed'));
      await classifyBillSectorsZeroShot('Fail');

      _resetForTesting();
      mockPipeline.mockResolvedValue(mockClassifier);
      mockClassifier.mockResolvedValue({
        labels: ['Defense'],
        scores: [0.9],
      });

      const results = await classifyBillSectorsZeroShot('Defense bill');
      expect(results).toHaveLength(1);
    });
  });

  describe('classifyZeroShot', () => {
    it('classifies text against arbitrary labels', async () => {
      mockClassifier.mockResolvedValue({
        labels: ['supports legislation', 'opposes legislation'],
        scores: [0.8, 0.2],
      });

      const results = await classifyZeroShot('We support this bill', [
        'supports legislation',
        'opposes legislation',
      ]);

      expect(results).toHaveLength(2);
      expect(results[0]!.label).toBe('supports legislation');
      expect(results[0]!.score).toBe(0.8);
    });

    it('returns empty array for empty labels', async () => {
      const results = await classifyZeroShot('Some text', []);
      expect(results).toEqual([]);
    });

    it('returns empty array for empty text', async () => {
      const results = await classifyZeroShot('', ['label1']);
      expect(results).toEqual([]);
    });

    it('returns empty array when pipeline fails', async () => {
      mockPipeline.mockRejectedValue(new Error('Failed'));

      const results = await classifyZeroShot('Text', ['label']);
      expect(results).toEqual([]);
    });
  });
});
