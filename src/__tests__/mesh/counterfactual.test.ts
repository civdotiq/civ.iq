/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Civic Mesh Counterfactual Analysis.
 *
 * Tests maskDonorProfile() renormalization and edge cases.
 * Integration tests for runCounterfactual() are mocked since they
 * require ONNX model + real API data.
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

// Mock external dependencies
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('@/lib/intelligence/analyzers/vote-finance-analyzer', () => ({
  analyzeVoteFinance: jest.fn(),
}));

jest.mock('@/lib/intelligence/ml/vote-predictor', () => ({
  predictVote: jest.fn(),
  buildFeatureVector: jest.fn().mockReturnValue({}),
}));

jest.mock('@/lib/intelligence/analyzers/shared', () => ({
  getBillSectors: jest.fn().mockResolvedValue(['Energy']),
  withTimeout: jest.fn((promise: Promise<unknown>) => promise),
}));

jest.mock('@/features/representatives/services/congress.service', () => ({
  getAllEnhancedRepresentatives: jest.fn().mockResolvedValue([]),
}));

import { maskDonorProfile } from '@/lib/mesh/propagation/counterfactual';
import type { IndustrySector } from '@/lib/fec/industry-taxonomy';

describe('maskDonorProfile', () => {
  it('zeroes out masked sectors and renormalizes', () => {
    const profile: Record<string, number> = {
      Energy: 0.4,
      Defense: 0.3,
      Health: 0.2,
      Finance: 0.1,
    };

    const masked = maskDonorProfile(profile, ['Energy' as IndustrySector]);

    expect(masked['Energy']).toBe(0);
    // Remaining should sum to 1
    const sum = Object.values(masked).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1.0, 5);
    // Defense was 0.3 out of remaining 0.6, so should be 0.5
    expect(masked['Defense']).toBeCloseTo(0.5, 5);
    expect(masked['Health']).toBeCloseTo(1 / 3, 5);
    expect(masked['Finance']).toBeCloseTo(1 / 6, 5);
  });

  it('handles masking multiple sectors', () => {
    const profile: Record<string, number> = {
      Energy: 0.4,
      Defense: 0.3,
      Health: 0.2,
      Finance: 0.1,
    };

    const masked = maskDonorProfile(profile, [
      'Energy' as IndustrySector,
      'Defense' as IndustrySector,
    ]);

    expect(masked['Energy']).toBe(0);
    expect(masked['Defense']).toBe(0);
    const sum = Object.values(masked).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1.0, 5);
    // Health was 0.2 / (0.2 + 0.1) = 2/3
    expect(masked['Health']).toBeCloseTo(2 / 3, 5);
    expect(masked['Finance']).toBeCloseTo(1 / 3, 5);
  });

  it('handles all sectors masked (returns all zeros)', () => {
    const profile: Record<string, number> = {
      Energy: 0.5,
      Defense: 0.5,
    };

    const masked = maskDonorProfile(profile, [
      'Energy' as IndustrySector,
      'Defense' as IndustrySector,
    ]);

    expect(masked['Energy']).toBe(0);
    expect(masked['Defense']).toBe(0);
    const sum = Object.values(masked).reduce((s, v) => s + v, 0);
    expect(sum).toBe(0);
  });

  it('handles empty profile', () => {
    const masked = maskDonorProfile({}, ['Energy' as IndustrySector]);
    // Masking adds the sector key with value 0
    expect(masked['Energy']).toBe(0);
  });

  it('does not mutate original profile', () => {
    const profile: Record<string, number> = { Energy: 0.6, Defense: 0.4 };
    maskDonorProfile(profile, ['Energy' as IndustrySector]);
    expect(profile['Energy']).toBe(0.6);
  });

  it('handles masking a sector not in the profile', () => {
    const profile: Record<string, number> = { Energy: 0.6, Defense: 0.4 };
    const masked = maskDonorProfile(profile, ['Health' as IndustrySector]);
    // Should remain unchanged since Health wasn't present
    const sum = Object.values(masked).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1.0, 5);
    expect(masked['Energy']).toBeCloseTo(0.6, 5);
    expect(masked['Defense']).toBeCloseTo(0.4, 5);
  });
});
