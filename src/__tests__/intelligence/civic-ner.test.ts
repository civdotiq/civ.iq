/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for the civic NER module.
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
const mockNER = jest.fn();
jest.mock('@huggingface/transformers', () => ({
  pipeline: (...args: unknown[]) => mockPipeline(...args),
  env: { allowLocalModels: true },
}));

import { extractEntities, _resetForTesting } from '@/lib/intelligence/embeddings/civic-ner';

describe('civic NER', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetForTesting();
    mockRedisGet.mockResolvedValue(null);

    mockPipeline.mockResolvedValue(mockNER);
  });

  it('extracts entities using BIO tag merging', async () => {
    mockNER.mockResolvedValue([
      { word: 'Environmental', entity: 'B-ORG', score: 0.95, start: 0, end: 13 },
      { word: 'Protection', entity: 'I-ORG', score: 0.92, start: 14, end: 24 },
      { word: 'Agency', entity: 'I-ORG', score: 0.9, start: 25, end: 31 },
    ]);

    const entities = await extractEntities('Environmental Protection Agency issues new rule');

    const orgs = entities.filter(e => e.type === 'ORG');
    expect(orgs).toHaveLength(1);
    expect(orgs[0]!.text).toContain('Environmental');
    expect(orgs[0]!.text).toContain('Protection');
    expect(orgs[0]!.text).toContain('Agency');
    expect(orgs[0]!.confidence).toBeLessThanOrEqual(0.95);
  });

  it('augments with regex MONEY entities', async () => {
    mockNER.mockResolvedValue([]);

    const entities = await extractEntities('The rule costs $5.2 billion to implement');

    const money = entities.filter(e => e.type === 'MONEY');
    expect(money).toHaveLength(1);
    expect(money[0]!.text).toBe('$5.2 billion');
    expect(money[0]!.confidence).toBe(1.0);
  });

  it('augments with regex DATE entities', async () => {
    mockNER.mockResolvedValue([]);

    const entities = await extractEntities('Effective January 15, 2025 through 2025-12-31');

    const dates = entities.filter(e => e.type === 'DATE');
    expect(dates).toHaveLength(2);
    expect(dates.map(d => d.text)).toContain('January 15, 2025');
    expect(dates.map(d => d.text)).toContain('2025-12-31');
  });

  it('returns empty array for empty input', async () => {
    const entities = await extractEntities('');
    expect(entities).toEqual([]);
    expect(mockPipeline).not.toHaveBeenCalled();
  });

  it('returns empty array when pipeline fails to load', async () => {
    mockPipeline.mockRejectedValue(new Error('WASM failed'));

    // Should still return regex entities even if ML pipeline fails
    const entities = await extractEntities('Cost is $100 million');
    const money = entities.filter(e => e.type === 'MONEY');
    expect(money).toHaveLength(1);
  });

  it('does not retry pipeline load after failure (fail-fast)', async () => {
    mockPipeline.mockRejectedValue(new Error('WASM failed'));

    await extractEntities('First attempt');
    await extractEntities('Second attempt');

    expect(mockPipeline).toHaveBeenCalledTimes(1);
  });

  it('chunks long text into overlapping windows', async () => {
    mockNER.mockResolvedValue([]);

    // Create text longer than WINDOW_SIZE (1600 chars)
    const longText = 'word '.repeat(500); // 2500 chars

    await extractEntities(longText);

    // NER should be called multiple times (one per chunk)
    expect(mockNER).toHaveBeenCalledTimes(2);
  });

  it('deduplicates overlapping entities', async () => {
    mockNER.mockResolvedValue([
      { word: 'EPA', entity: 'B-ORG', score: 0.9, start: 0, end: 3 },
      { word: 'EPA', entity: 'B-ORG', score: 0.85, start: 0, end: 3 },
    ]);

    const entities = await extractEntities('EPA issues rule');

    const orgs = entities.filter(e => e.type === 'ORG');
    expect(orgs).toHaveLength(1);
    expect(orgs[0]!.confidence).toBe(0.9); // Higher confidence kept
  });

  it('handles mismatched I- tags', async () => {
    mockNER.mockResolvedValue([
      { word: 'John', entity: 'B-PER', score: 0.9, start: 0, end: 4 },
      { word: 'EPA', entity: 'I-ORG', score: 0.8, start: 5, end: 8 }, // Mismatched type
    ]);

    const entities = await extractEntities('John EPA');

    const persons = entities.filter(e => e.type === 'PER');
    expect(persons).toHaveLength(1);
    expect(persons[0]!.text.trim()).toBe('John');
  });

  it('caches results to Redis with document number', async () => {
    mockNER.mockResolvedValue([{ word: 'EPA', entity: 'B-ORG', score: 0.9, start: 0, end: 3 }]);

    await extractEntities('EPA issues rule', '2025-12345');

    expect(mockRedisSet).toHaveBeenCalledWith(
      'ner2:2025-12345',
      expect.any(Array),
      expect.any(Number)
    );
  });

  it('returns cached results from Redis', async () => {
    mockRedisGet.mockResolvedValueOnce([
      { text: 'EPA', type: 'ORG', confidence: 0.9, start: 0, end: 3 },
    ]);

    const entities = await extractEntities('EPA issues rule', '2025-12345');

    expect(entities).toEqual([{ text: 'EPA', type: 'ORG', confidence: 0.9, start: 0, end: 3 }]);
    expect(mockNER).not.toHaveBeenCalled();
  });

  it('loads the correct model', async () => {
    mockNER.mockResolvedValue([]);

    await extractEntities('Test');

    expect(mockPipeline).toHaveBeenCalledWith(
      'token-classification',
      'onnx-community/distilbert-NER-ONNX',
      expect.objectContaining({ dtype: 'q8' })
    );
  });

  it('resets state correctly', async () => {
    mockPipeline.mockRejectedValue(new Error('Failed'));
    await extractEntities('Fail');

    _resetForTesting();
    mockPipeline.mockResolvedValue(mockNER);
    mockNER.mockResolvedValue([{ word: 'EPA', entity: 'B-ORG', score: 0.9, start: 0, end: 3 }]);

    const entities = await extractEntities('EPA test');
    const orgs = entities.filter(e => e.type === 'ORG');
    expect(orgs).toHaveLength(1);
  });

  it('handles timeout gracefully', async () => {
    mockNER.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 20_000)));

    const entities = await extractEntities('Slow text');
    // Should still get regex entities (if any match) or empty
    expect(Array.isArray(entities)).toBe(true);
  }, 15_000);
});
