/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { hydrateNeighborhood } from '@/lib/graph/hydrator';
import * as cache from '@/lib/graph/cache';
import * as repHydrator from '@/lib/graph/hydrators/representative';
import type { GraphNeighborhood, GraphNode } from '@/types/graph';
import type { HydrationSource } from '@/lib/graph/types';

// Mock dependencies
jest.mock('@/lib/graph/cache');
jest.mock('@/lib/graph/hydrators/representative');
jest.mock('@/lib/graph/hydrators/bill');
jest.mock('@/lib/graph/hydrators/committee');
jest.mock('@/lib/intelligence/analyzers/shared', () => ({
  withTimeout: jest.fn(<T>(p: Promise<T>) => p),
  ANALYZER_TIMEOUT_MS: 55_000,
}));
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockGetCached = cache.getCachedNeighborhood as jest.MockedFunction<
  typeof cache.getCachedNeighborhood
>;
const mockSetCached = cache.setCachedNeighborhood as jest.MockedFunction<
  typeof cache.setCachedNeighborhood
>;
const mockHydrateRep = repHydrator.hydrateRepresentative as jest.MockedFunction<
  typeof repHydrator.hydrateRepresentative
>;

function makeNode(id: string, type: GraphNode['type'] = 'representative'): GraphNode {
  return {
    id,
    type,
    label: `Test ${id}`,
    properties: {},
    dataAsOf: '2026-03-10T00:00:00Z',
  };
}

describe('hydrateNeighborhood', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCached.mockResolvedValue(null);
    mockSetCached.mockResolvedValue(undefined);
  });

  it('returns cached neighborhood when available', async () => {
    const cached: GraphNeighborhood = {
      center: makeNode('rep:P000197'),
      edges: [],
      connectedNodes: [],
      completeness: 'complete',
      failedSources: [],
    };
    mockGetCached.mockResolvedValue(cached);

    const result = await hydrateNeighborhood('rep:P000197');
    expect(result).toEqual(cached);
    expect(mockHydrateRep).not.toHaveBeenCalled();
  });

  it('returns null for invalid canonical ID', async () => {
    const result = await hydrateNeighborhood('invalid');
    expect(result).toBeNull();
  });

  it('returns null for unknown prefix', async () => {
    const result = await hydrateNeighborhood('foo:bar');
    expect(result).toBeNull();
  });

  it('dispatches to representative hydrator', async () => {
    const center = makeNode('rep:P000197');
    const cmteNode = makeNode('cmte:SSAS', 'committee');
    const sources: HydrationSource[] = [
      {
        name: 'committees',
        fetch: async () => ({
          nodes: [cmteNode],
          edges: [
            {
              id: 'rep:P000197->serves_on->cmte:SSAS',
              type: 'serves_on' as const,
              sourceId: 'rep:P000197',
              targetId: 'cmte:SSAS',
              label: 'Serves on Armed Services',
              properties: {},
              weight: 0.5,
              confidence: 1.0,
              dataAsOf: '2026-03-10T00:00:00Z',
            },
          ],
        }),
      },
    ];

    mockHydrateRep.mockResolvedValue({ center, sources });

    const result = await hydrateNeighborhood('rep:P000197');

    expect(result).not.toBeNull();
    expect(result?.center.id).toBe('rep:P000197');
    expect(result?.edges).toHaveLength(1);
    expect(result?.edges[0]?.type).toBe('serves_on');
    expect(result?.connectedNodes).toHaveLength(1);
    expect(result?.completeness).toBe('complete');
    expect(mockSetCached).toHaveBeenCalledWith('rep:P000197', expect.any(Object));
  });

  it('returns null when hydrator finds no entity', async () => {
    mockHydrateRep.mockResolvedValue(null);

    const result = await hydrateNeighborhood('rep:XXXXXX');
    expect(result).toBeNull();
  });

  it('handles partial source failures gracefully', async () => {
    const center = makeNode('rep:P000197');
    const sources: HydrationSource[] = [
      {
        name: 'committees',
        fetch: async () => ({ nodes: [], edges: [] }),
      },
      {
        name: 'contributions',
        fetch: async () => {
          throw new Error('FEC API unavailable');
        },
      },
    ];

    mockHydrateRep.mockResolvedValue({ center, sources });

    const result = await hydrateNeighborhood('rep:P000197');

    expect(result).not.toBeNull();
    expect(result?.completeness).toBe('partial');
    expect(result?.failedSources).toContain('contributions');
  });

  it('deduplicates nodes by ID across sources', async () => {
    const center = makeNode('rep:P000197');
    const sharedNode = makeNode('cmte:SSAS', 'committee');
    const sources: HydrationSource[] = [
      {
        name: 'source1',
        fetch: async () => ({ nodes: [sharedNode], edges: [] }),
      },
      {
        name: 'source2',
        fetch: async () => ({ nodes: [{ ...sharedNode }], edges: [] }),
      },
    ];

    mockHydrateRep.mockResolvedValue({ center, sources });

    const result = await hydrateNeighborhood('rep:P000197');
    expect(result?.connectedNodes).toHaveLength(1);
  });
});
