/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Civic Mesh Funding Cascade Simulation.
 *
 * Tests perturbSectorFunding() perturbation/renormalization logic.
 * Integration tests for simulateCascade() are mocked.
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

import { perturbSectorFunding } from '@/lib/mesh/propagation/cascade';
import type { IndustrySector } from '@/lib/fec/industry-taxonomy';

describe('perturbSectorFunding', () => {
  it('increases sector funding by percentage and renormalizes', () => {
    const profile: Record<string, number> = {
      Energy: 0.4,
      Defense: 0.3,
      Health: 0.3,
    };

    const perturbed = perturbSectorFunding(profile, 'Energy' as IndustrySector, 50);

    // Energy was 0.4, +50% = 0.6; total = 0.6 + 0.3 + 0.3 = 1.2
    // After renorm: Energy = 0.6/1.2 = 0.5
    expect(perturbed['Energy']).toBeCloseTo(0.5, 5);
    const sum = Object.values(perturbed).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('decreases sector funding by percentage', () => {
    const profile: Record<string, number> = {
      Energy: 0.4,
      Defense: 0.3,
      Health: 0.3,
    };

    const perturbed = perturbSectorFunding(profile, 'Energy' as IndustrySector, -50);

    // Energy was 0.4, -50% = 0.2; total = 0.2 + 0.3 + 0.3 = 0.8
    // After renorm: Energy = 0.2/0.8 = 0.25
    expect(perturbed['Energy']).toBeCloseTo(0.25, 5);
    const sum = Object.values(perturbed).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('clamps to zero for -100% change', () => {
    const profile: Record<string, number> = {
      Energy: 0.4,
      Defense: 0.6,
    };

    const perturbed = perturbSectorFunding(profile, 'Energy' as IndustrySector, -100);

    expect(perturbed['Energy']).toBe(0);
    expect(perturbed['Defense']).toBeCloseTo(1.0, 5);
  });

  it('does not go negative for > -100% change', () => {
    const profile: Record<string, number> = {
      Energy: 0.4,
      Defense: 0.6,
    };

    const perturbed = perturbSectorFunding(profile, 'Energy' as IndustrySector, -200);

    expect(perturbed['Energy']).toBe(0);
    const sum = Object.values(perturbed).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('handles sector not in profile', () => {
    const profile: Record<string, number> = {
      Energy: 0.5,
      Defense: 0.5,
    };

    const perturbed = perturbSectorFunding(profile, 'Health' as IndustrySector, 100);

    // Health was 0, +100% of 0 = 0
    const sum = Object.values(perturbed).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('does not mutate original profile', () => {
    const profile: Record<string, number> = { Energy: 0.6, Defense: 0.4 };
    perturbSectorFunding(profile, 'Energy' as IndustrySector, 50);
    expect(profile['Energy']).toBe(0.6);
  });

  it('handles empty profile', () => {
    const perturbed = perturbSectorFunding({}, 'Energy' as IndustrySector, 50);
    // Perturbing adds the sector key with value 0 (since 0 * 1.5 = 0)
    expect(perturbed['Energy']).toBe(0);
  });

  it('large increase still sums to 1', () => {
    const profile: Record<string, number> = {
      Energy: 0.1,
      Defense: 0.3,
      Health: 0.3,
      Finance: 0.3,
    };

    const perturbed = perturbSectorFunding(profile, 'Energy' as IndustrySector, 900);

    // Energy was 0.1, +900% = 1.0; total = 1.0 + 0.3 + 0.3 + 0.3 = 1.9
    const sum = Object.values(perturbed).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1.0, 5);
    // Energy should now dominate
    expect(perturbed['Energy']!).toBeGreaterThan(0.5);
  });
});
