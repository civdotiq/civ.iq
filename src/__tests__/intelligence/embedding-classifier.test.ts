/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for the embedding classifier.
 * Mocks @huggingface/transformers — does NOT load the real model.
 */

// Mock logger
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock the sector embeddings JSON
jest.mock('@/lib/intelligence/embeddings/sector-embeddings.json', () => [
  {
    sector: 'Defense',
    // Unit vector along first axis (simplified 4-dim for testing)
    embedding: [1, 0, 0, 0],
  },
  {
    sector: 'Health',
    embedding: [0, 1, 0, 0],
  },
  {
    sector: 'Communications/Electronics',
    embedding: [0, 0, 1, 0],
  },
]);

// Mock @huggingface/transformers
const mockPipeline = jest.fn();
const mockExtractor = jest.fn();
jest.mock('@huggingface/transformers', () => ({
  pipeline: (...args: unknown[]) => mockPipeline(...args),
  env: { allowLocalModels: true },
}));

import {
  classifyBillSectors,
  _resetForTesting,
} from '@/lib/intelligence/embeddings/embedding-classifier';

describe('embedding classifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetForTesting();

    // Default: pipeline() returns a working extractor
    mockPipeline.mockResolvedValue(mockExtractor);
  });

  it('classifies bill text against sector embeddings', async () => {
    // Return embedding close to Defense (first axis)
    mockExtractor.mockResolvedValue({
      data: new Float32Array([0.95, 0.1, 0.05, 0.0]),
      dims: [1, 4],
    });

    const results = await classifyBillSectors('National Defense Authorization Act');

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.sector).toBe('Defense');
    expect(results[0]!.confidence).toBeGreaterThan(0.5);
  });

  it('returns multiple sectors when embedding has multiple high similarities', async () => {
    // Return embedding between Defense and Health
    mockExtractor.mockResolvedValue({
      data: new Float32Array([0.7, 0.7, 0.1, 0.0]),
      dims: [1, 4],
    });

    const results = await classifyBillSectors('Veterans Health Care Act', {
      threshold: 0.3,
    });

    expect(results.length).toBeGreaterThanOrEqual(2);
    const sectors = results.map(r => r.sector);
    expect(sectors).toContain('Defense');
    expect(sectors).toContain('Health');
  });

  it('returns empty array for empty text', async () => {
    const results = await classifyBillSectors('');
    expect(results).toEqual([]);
    expect(mockPipeline).not.toHaveBeenCalled();
  });

  it('returns empty array for whitespace-only text', async () => {
    const results = await classifyBillSectors('   ');
    expect(results).toEqual([]);
  });

  it('lazy-loads the pipeline on first call', async () => {
    mockExtractor.mockResolvedValue({
      data: new Float32Array([0.9, 0.1, 0.0, 0.0]),
      dims: [1, 4],
    });

    expect(mockPipeline).not.toHaveBeenCalled();

    await classifyBillSectors('Test bill');
    expect(mockPipeline).toHaveBeenCalledTimes(1);
    expect(mockPipeline).toHaveBeenCalledWith(
      'feature-extraction',
      'Xenova/bge-small-en-v1.5',
      expect.objectContaining({ dtype: 'q8' })
    );
  });

  it('reuses the pipeline on subsequent calls', async () => {
    mockExtractor.mockResolvedValue({
      data: new Float32Array([0.9, 0.1, 0.0, 0.0]),
      dims: [1, 4],
    });

    await classifyBillSectors('First bill');
    await classifyBillSectors('Second bill');
    await classifyBillSectors('Third bill');

    // Pipeline created once, extractor called three times
    expect(mockPipeline).toHaveBeenCalledTimes(1);
    expect(mockExtractor).toHaveBeenCalledTimes(3);
  });

  it('shares a single pipeline load across concurrent callers', async () => {
    // Simulate a slow pipeline load
    let resolveLoad: (value: unknown) => void;
    mockPipeline.mockReturnValue(
      new Promise(resolve => {
        resolveLoad = resolve;
      })
    );
    mockExtractor.mockResolvedValue({
      data: new Float32Array([0.9, 0.1, 0.0, 0.0]),
      dims: [1, 4],
    });

    // Fire 3 concurrent classification calls
    const p1 = classifyBillSectors('Bill A');
    const p2 = classifyBillSectors('Bill B');
    const p3 = classifyBillSectors('Bill C');

    // Resolve the single pipeline load
    resolveLoad!(mockExtractor);
    await Promise.all([p1, p2, p3]);

    // Pipeline factory should be called exactly once, not 3 times
    expect(mockPipeline).toHaveBeenCalledTimes(1);
    // But the extractor should be called for each bill
    expect(mockExtractor).toHaveBeenCalledTimes(3);
  });

  it('returns empty array when pipeline fails to load', async () => {
    mockPipeline.mockRejectedValue(new Error('WASM failed'));

    const results = await classifyBillSectors('Defense bill');
    expect(results).toEqual([]);
  });

  it('does not retry pipeline load after failure', async () => {
    mockPipeline.mockRejectedValue(new Error('WASM failed'));

    await classifyBillSectors('First attempt');
    await classifyBillSectors('Second attempt');

    // Pipeline load attempted only once
    expect(mockPipeline).toHaveBeenCalledTimes(1);
  });

  it('returns empty array when extractor throws', async () => {
    mockExtractor.mockRejectedValue(new Error('Embedding failed'));

    const results = await classifyBillSectors('Some bill');
    expect(results).toEqual([]);
  });

  it('returns empty array when all sectors below threshold', async () => {
    // Return embedding orthogonal to all sectors
    mockExtractor.mockResolvedValue({
      data: new Float32Array([0.0, 0.0, 0.0, 1.0]),
      dims: [1, 4],
    });

    // Our mock embeddings don't have a sector along the 4th axis
    // (only Defense[1,0,0,0], Health[0,1,0,0], Comms[0,0,1,0])
    // so nothing should match above the default threshold
    const results = await classifyBillSectors('Procedural resolution');
    expect(results).toEqual([]);
  });

  it('respects custom threshold', async () => {
    mockExtractor.mockResolvedValue({
      data: new Float32Array([0.5, 0.3, 0.2, 0.1]),
      dims: [1, 4],
    });

    // Very strict threshold — should match fewer
    const strict = await classifyBillSectors('Some bill', { threshold: 0.8 });
    // Reset to get fresh pipeline (or it reuses)
    _resetForTesting();
    mockPipeline.mockResolvedValue(mockExtractor);

    // Very lenient threshold — should match more
    const lenient = await classifyBillSectors('Some bill', { threshold: 0.1 });

    expect(lenient.length).toBeGreaterThanOrEqual(strict.length);
  });

  it('respects maxSectors', async () => {
    mockExtractor.mockResolvedValue({
      data: new Float32Array([0.8, 0.8, 0.8, 0.0]),
      dims: [1, 4],
    });

    const results = await classifyBillSectors('Multi-sector bill', {
      threshold: 0.1,
      maxSectors: 1,
    });

    expect(results).toHaveLength(1);
  });

  it('calls extractor with correct options', async () => {
    mockExtractor.mockResolvedValue({
      data: new Float32Array([0.9, 0.1, 0.0, 0.0]),
      dims: [1, 4],
    });

    await classifyBillSectors('Defense Authorization');

    expect(mockExtractor).toHaveBeenCalledWith('Defense Authorization', {
      pooling: 'mean',
      normalize: true,
    });
  });
});
