/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for the stance classifier.
 * Mocks classifyZeroShot (not HF directly) — tests the wrapper logic.
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

// Mock the zero-shot classifier
const mockClassifyZeroShot = jest.fn();
jest.mock('@/lib/intelligence/embeddings/zero-shot-classifier', () => ({
  classifyZeroShot: (...args: unknown[]) => mockClassifyZeroShot(...args),
}));

import { classifyStance } from '@/lib/intelligence/embeddings/stance-classifier';

describe('stance classifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
  });

  it('returns stance for lobbying context with sufficient confidence', async () => {
    mockClassifyZeroShot.mockResolvedValue([
      { label: 'supports legislation', score: 0.75 },
      { label: 'opposes legislation', score: 0.15 },
      { label: 'seeks amendment', score: 0.05 },
      { label: 'neutral', score: 0.05 },
    ]);

    const result = await classifyStance(
      'We strongly support this important legislation',
      'lobbying'
    );

    expect(result).toEqual({
      stance: 'supports legislation',
      confidence: 0.75,
      context: 'lobbying',
    });
  });

  it('uses lobbying labels for lobbying context', async () => {
    mockClassifyZeroShot.mockResolvedValue([{ label: 'supports legislation', score: 0.5 }]);

    await classifyStance('Some text', 'lobbying');

    expect(mockClassifyZeroShot).toHaveBeenCalledWith('Some text', [
      'supports legislation',
      'opposes legislation',
      'seeks amendment',
      'neutral',
    ]);
  });

  it('uses regulatory labels for regulatory context', async () => {
    mockClassifyZeroShot.mockResolvedValue([{ label: 'supports regulation', score: 0.5 }]);

    await classifyStance('Some text', 'regulatory');

    expect(mockClassifyZeroShot).toHaveBeenCalledWith('Some text', [
      'supports regulation',
      'opposes regulation',
      'requests modification',
      'neutral',
    ]);
  });

  it('returns null when confidence below threshold', async () => {
    mockClassifyZeroShot.mockResolvedValue([{ label: 'neutral', score: 0.25 }]);

    const result = await classifyStance('Ambiguous text', 'lobbying');
    expect(result).toBeNull();
  });

  it('returns null for empty text', async () => {
    const result = await classifyStance('', 'lobbying');
    expect(result).toBeNull();
    expect(mockClassifyZeroShot).not.toHaveBeenCalled();
  });

  it('returns null when zero-shot returns empty', async () => {
    mockClassifyZeroShot.mockResolvedValue([]);

    const result = await classifyStance('Some text', 'lobbying');
    expect(result).toBeNull();
  });

  it('returns null when zero-shot throws', async () => {
    mockClassifyZeroShot.mockRejectedValue(new Error('Model failed'));

    const result = await classifyStance('Some text', 'lobbying');
    expect(result).toBeNull();
  });

  it('returns cached result from Redis', async () => {
    mockRedisGet.mockResolvedValueOnce({
      stance: 'opposes legislation',
      confidence: 0.8,
      context: 'lobbying',
    });

    const result = await classifyStance('Cached text', 'lobbying');

    expect(result).toEqual({
      stance: 'opposes legislation',
      confidence: 0.8,
      context: 'lobbying',
    });
    expect(mockClassifyZeroShot).not.toHaveBeenCalled();
  });

  it('caches result to Redis on success', async () => {
    mockClassifyZeroShot.mockResolvedValue([{ label: 'opposes legislation', score: 0.9 }]);

    await classifyStance('We oppose this bill', 'lobbying');

    expect(mockRedisSet).toHaveBeenCalledWith(
      expect.stringContaining('stance:'),
      expect.objectContaining({
        stance: 'opposes legislation',
        confidence: 0.9,
        context: 'lobbying',
      }),
      expect.any(Number)
    );
  });

  it('does not cache when result is null', async () => {
    mockClassifyZeroShot.mockResolvedValue([{ label: 'neutral', score: 0.1 }]);

    await classifyStance('Ambiguous', 'lobbying');

    expect(mockRedisSet).not.toHaveBeenCalled();
  });
});
