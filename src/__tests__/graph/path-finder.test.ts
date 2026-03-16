/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { findPaths } from '@/lib/graph/path-finder';
import * as hydrator from '@/lib/graph/hydrator';
import type { GraphNeighborhood, GraphNode, GraphEdge } from '@/types/graph';

jest.mock('@/lib/graph/hydrator');
jest.mock('@/lib/intelligence/analyzers/shared', () => ({
  withTimeout: jest.fn(<T>(p: Promise<T>) => p),
  ANALYZER_TIMEOUT_MS: 55_000,
}));
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockHydrate = hydrator.hydrateNeighborhood as jest.MockedFunction<
  typeof hydrator.hydrateNeighborhood
>;

function makeNode(id: string, type: GraphNode['type'] = 'representative'): GraphNode {
  return { id, type, label: id, properties: {}, dataAsOf: '2026-01-01T00:00:00Z' };
}

function makeEdge(
  sourceId: string,
  targetId: string,
  type: GraphEdge['type'] = 'serves_on'
): GraphEdge {
  return {
    id: `${sourceId}->${type}->${targetId}`,
    type,
    sourceId,
    targetId,
    label: `${sourceId} → ${targetId}`,
    properties: {},
    weight: 0.5,
    confidence: 0.9,
    dataAsOf: '2026-01-01T00:00:00Z',
  };
}

function makeNeighborhood(
  center: GraphNode,
  connections: Array<{ node: GraphNode; edge: GraphEdge }>
): GraphNeighborhood {
  return {
    center,
    edges: connections.map(c => c.edge),
    connectedNodes: connections.map(c => c.node),
    completeness: 'complete',
    failedSources: [],
  };
}

describe('findPaths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty when source not found', async () => {
    mockHydrate.mockResolvedValue(null);
    const result = await findPaths('rep:XXXXXX', 'rep:YYYYYY');
    expect(result.paths).toHaveLength(0);
    expect(result.shortestLength).toBe(0);
  });

  it('finds direct 1-hop path', async () => {
    const repNode = makeNode('rep:A');
    const cmteNode = makeNode('cmte:B', 'committee');
    const edge = makeEdge('rep:A', 'cmte:B', 'serves_on');

    mockHydrate.mockImplementation(async (nodeId: string) => {
      if (nodeId === 'rep:A') {
        return makeNeighborhood(repNode, [{ node: cmteNode, edge }]);
      }
      return null;
    });

    const result = await findPaths('rep:A', 'cmte:B');
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0]?.nodes).toHaveLength(2);
    expect(result.paths[0]?.edges).toHaveLength(1);
    expect(result.shortestLength).toBe(1);
  });

  it('finds 2-hop path', async () => {
    const nodeA = makeNode('rep:A');
    const nodeB = makeNode('cmte:B', 'committee');
    const nodeC = makeNode('org:C', 'organization');
    const edgeAB = makeEdge('rep:A', 'cmte:B', 'serves_on');
    const edgeBC = makeEdge('org:C', 'cmte:B', 'lobbied');

    mockHydrate.mockImplementation(async (nodeId: string) => {
      if (nodeId === 'rep:A') {
        return makeNeighborhood(nodeA, [{ node: nodeB, edge: edgeAB }]);
      }
      if (nodeId === 'cmte:B') {
        return makeNeighborhood(nodeB, [
          { node: nodeA, edge: edgeAB },
          { node: nodeC, edge: edgeBC },
        ]);
      }
      return null;
    });

    const result = await findPaths('rep:A', 'org:C');
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0]?.nodes).toHaveLength(3);
    expect(result.paths[0]?.edges).toHaveLength(2);
    expect(result.shortestLength).toBe(2);
  });

  it('respects maxDepth limit', async () => {
    const nodeA = makeNode('rep:A');
    const nodeB = makeNode('cmte:B', 'committee');
    const edgeAB = makeEdge('rep:A', 'cmte:B', 'serves_on');

    // Only 1-hop path, but target is 3 hops away
    mockHydrate.mockImplementation(async (nodeId: string) => {
      if (nodeId === 'rep:A') {
        return makeNeighborhood(nodeA, [{ node: nodeB, edge: edgeAB }]);
      }
      if (nodeId === 'cmte:B') {
        return makeNeighborhood(nodeB, [{ node: nodeA, edge: edgeAB }]);
      }
      return null;
    });

    const result = await findPaths('rep:A', 'org:UNREACHABLE', { maxDepth: 1 });
    expect(result.paths).toHaveLength(0);
  });

  it('sorts paths by confidence', async () => {
    const nodeA = makeNode('rep:A');
    const nodeB = makeNode('cmte:B', 'committee');
    const nodeC = makeNode('cmte:C', 'committee');
    const nodeT = makeNode('org:T', 'organization');

    const edgeAB = { ...makeEdge('rep:A', 'cmte:B', 'serves_on'), confidence: 0.5 };
    const edgeBT = { ...makeEdge('org:T', 'cmte:B', 'lobbied'), confidence: 0.5 };
    const edgeAC = { ...makeEdge('rep:A', 'cmte:C', 'serves_on'), confidence: 1.0 };
    const edgeCT = { ...makeEdge('org:T', 'cmte:C', 'lobbied'), confidence: 1.0 };

    mockHydrate.mockImplementation(async (nodeId: string) => {
      if (nodeId === 'rep:A') {
        return makeNeighborhood(nodeA, [
          { node: nodeB, edge: edgeAB },
          { node: nodeC, edge: edgeAC },
        ]);
      }
      if (nodeId === 'cmte:B') {
        return makeNeighborhood(nodeB, [{ node: nodeT, edge: edgeBT }]);
      }
      if (nodeId === 'cmte:C') {
        return makeNeighborhood(nodeC, [{ node: nodeT, edge: edgeCT }]);
      }
      return null;
    });

    const result = await findPaths('rep:A', 'org:T');
    expect(result.paths).toHaveLength(2);
    // Higher confidence path should be first
    expect(result.paths[0]?.totalConfidence).toBeGreaterThan(result.paths[1]?.totalConfidence ?? 0);
  });
});
