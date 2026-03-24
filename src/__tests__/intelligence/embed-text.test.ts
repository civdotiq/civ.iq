/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for the embedText() function from the embedding classifier.
 * Mocks @huggingface/transformers -- does NOT load the real model.
 */

// Mock logger
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock sector embeddings (needed because the module loads them)
jest.mock('@/lib/intelligence/embeddings/sector-embeddings.json', () => [
  { sector: 'Defense', embedding: [1, 0, 0, 0] },
  { sector: 'Health', embedding: [0, 1, 0, 0] },
]);

// Mock @huggingface/transformers
const mockPipeline = jest.fn();
const mockExtractor = jest.fn();
jest.mock('@huggingface/transformers', () => ({
  pipeline: (...args: unknown[]) => mockPipeline(...args),
  env: { allowLocalModels: true },
}));

import {
  embedText,
  classifyBillSectors,
  _resetForTesting,
} from '@/lib/intelligence/embeddings/embedding-classifier';

describe('embedText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetForTesting();
    mockPipeline.mockResolvedValue(mockExtractor);
  });

  it('returns Float32Array of 384 dimensions for valid text', async () => {
    const data = new Float32Array(384);
    for (let i = 0; i < 384; i++) data[i] = Math.sin(i * 0.1);
    mockExtractor.mockResolvedValue({ data, dims: [1, 384] });

    const result = await embedText('Test sentence');
    expect(result).toBeInstanceOf(Float32Array);
    expect(result).toHaveLength(384);
  });

  it('returns null for empty string', async () => {
    const result = await embedText('');
    expect(result).toBeNull();
    expect(mockPipeline).not.toHaveBeenCalled();
  });

  it('returns null for whitespace-only string', async () => {
    const result = await embedText('   \t\n  ');
    expect(result).toBeNull();
    expect(mockPipeline).not.toHaveBeenCalled();
  });

  it('returns null when pipeline load fails', async () => {
    mockPipeline.mockRejectedValue(new Error('WASM failed'));

    const result = await embedText('Some text');
    expect(result).toBeNull();
  });

  it('does not retry after pipeline load failure', async () => {
    mockPipeline.mockRejectedValue(new Error('WASM failed'));

    await embedText('First attempt');
    await embedText('Second attempt');

    // Pipeline load attempted only once (pipelineLoadFailed flag is set)
    expect(mockPipeline).toHaveBeenCalledTimes(1);
  });

  it('shares pipeline instance with classifyBillSectors', async () => {
    const data = new Float32Array(4);
    mockExtractor.mockResolvedValue({ data, dims: [1, 4] });

    // Both use getOrCreatePipeline() -- pipeline should be created once
    await embedText('Some text');
    await classifyBillSectors('Defense bill');

    // Pipeline factory called exactly once
    expect(mockPipeline).toHaveBeenCalledTimes(1);
    // But extractor called twice (once for embedText, once for classifyBillSectors)
    expect(mockExtractor).toHaveBeenCalledTimes(2);
  });

  it('returns null when extractor throws', async () => {
    mockExtractor.mockRejectedValue(new Error('Embedding failed'));

    const result = await embedText('Some text');
    expect(result).toBeNull();
  });

  it('passes correct options to pipeline', async () => {
    const data = new Float32Array(384);
    mockExtractor.mockResolvedValue({ data, dims: [1, 384] });

    await embedText('Test text');

    expect(mockExtractor).toHaveBeenCalledWith('Test text', {
      pooling: 'mean',
      normalize: true,
    });
  });
});
