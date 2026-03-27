/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for cascade wall-clock deadline behavior.
 *
 * Verifies that simulateCascade() returns partial results
 * when the deadline is reached before all reps are scanned.
 */

// Mock logger before anything imports it
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock hydrateNeighborhood to avoid TransformStream / AI SDK import chain
jest.mock('@/lib/graph/hydrator', () => ({
  hydrateNeighborhood: jest.fn(),
}));

// Mock cache
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock analyzeVoteFinance to take ~2s per call
jest.mock('@/lib/intelligence/analyzers/vote-finance-analyzer', () => ({
  analyzeVoteFinance: jest.fn().mockImplementation(
    () =>
      new Promise(resolve => {
        setTimeout(
          () =>
            resolve({
              correlations: [
                { sector: 'Energy', donationAmount: 50000, correlation: 0.6 },
                { sector: 'Defense', donationAmount: 30000, correlation: 0.3 },
              ],
            }),
          2000
        );
      })
  ),
}));

jest.mock('@/lib/intelligence/ml/vote-predictor', () => ({
  predictVote: jest.fn().mockResolvedValue({
    predictedVote: 'yea',
    yeaProbability: 0.7,
    confidence: 0.8,
  }),
  buildFeatureVector: jest.fn().mockReturnValue({}),
}));

// withTimeout should just pass through (the 2s delay is in the mock itself)
jest.mock('@/lib/intelligence/analyzers/shared', () => ({
  getBillSectors: jest.fn().mockResolvedValue(['Energy']),
  withTimeout: jest.fn((promise: Promise<unknown>) => promise),
  classifySignal: jest.fn(() => 'pattern' as const),
  SourceCollector: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    toSources: jest.fn(() => []),
    count: 0,
  })),
}));

// Generate 100 fake reps (5 batches of 20)
function makeFakeReps() {
  return Array.from({ length: 100 }, (_, i) => ({
    bioguideId: `B${String(i).padStart(6, '0')}`,
    name: `Rep ${i}`,
    party: i % 2 === 0 ? 'D' : 'R',
    state: 'CA',
    chamber: 'House',
    yearsInOffice: 4,
  }));
}

const TOTAL_REPS = 100;

jest.mock('@/features/representatives/services/congress.service', () => ({
  getAllEnhancedRepresentatives: jest
    .fn()
    .mockImplementation(() => Promise.resolve(makeFakeReps())),
}));

import { simulateCascade } from '@/lib/mesh/propagation/cascade';
import type { IndustrySector } from '@/lib/fec/industry-taxonomy';
import logger from '@/lib/logging/simple-logger';

describe('simulateCascade wall-clock deadline', () => {
  it('returns partial results when deadline is reached', async () => {
    const result = await simulateCascade(
      { sector: 'Energy' as IndustrySector, changePercent: -20 },
      5000 // 5s deadline
    );

    expect(result).not.toBeNull();
    expect(result!.partial).toBe(true);
    expect(result!.repsScanned).toBeLessThan(TOTAL_REPS);
    expect(result!.repsAnalyzed).toBeGreaterThanOrEqual(0);
  }, 30_000);

  it('logs a warning when returning partial results', async () => {
    await simulateCascade({ sector: 'Energy' as IndustrySector, changePercent: -20 }, 5000);

    expect(logger.warn).toHaveBeenCalledWith(
      '[Cascade] Wall-clock deadline reached, returning partial results',
      expect.objectContaining({
        sector: 'Energy',
        repsScanned: expect.any(Number),
        totalReps: TOTAL_REPS,
      })
    );
  }, 30_000);
});
