/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { traverseMesh } from '@/lib/mesh/traversal';
import type { GraphNeighborhood, GraphNode, GraphEdge } from '@/types/graph';

// Mock logger before anything imports it
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock hydrateNeighborhood to avoid real API calls
jest.mock('@/lib/graph/hydrator', () => ({
  hydrateNeighborhood: jest.fn(),
}));

// Mock normalize (only parseCanonicalId is used, but keep it real)
jest.mock('@/lib/graph/normalize', () => ({
  parseCanonicalId: jest.fn((id: string) => {
    const colonIdx = id.indexOf(':');
    if (colonIdx === -1) return null;
    const prefix = id.slice(0, colonIdx);
    const identifier = id.slice(colonIdx + 1);
    const prefixMap: Record<string, string> = {
      rep: 'representative',
      bill: 'bill',
      cmte: 'committee',
      agency: 'agency',
      org: 'organization',
      sector: 'sector',
    };
    const type = prefixMap[prefix];
    return type ? { type, identifier } : null;
  }),
}));

import { hydrateNeighborhood } from '@/lib/graph/hydrator';

const mockHydrate = hydrateNeighborhood as jest.MockedFunction<typeof hydrateNeighborhood>;

// ── Test Fixtures ─────────────────────────────────────────────────────

function makeNode(id: string, type: GraphNode['type'], label: string): GraphNode {
  return {
    id,
    type,
    label,
    properties: {},
    dataAsOf: '2026-03-17T00:00:00Z',
  };
}

function makeEdge(
  sourceId: string,
  targetId: string,
  type: GraphEdge['type'],
  confidence = 0.9
): GraphEdge {
  return {
    id: `${sourceId}->${type}->${targetId}`,
    type,
    sourceId,
    targetId,
    label: `${type} edge`,
    properties: {},
    weight: 0.5,
    confidence,
    dataAsOf: '2026-03-17T00:00:00Z',
  };
}

function makeNeighborhood(
  center: GraphNode,
  edges: GraphEdge[],
  connectedNodes: GraphNode[]
): GraphNeighborhood {
  return {
    center,
    edges,
    connectedNodes,
    completeness: 'complete',
    failedSources: [],
  };
}

// ── Test Graph ────────────────────────────────────────────────────────
//
// rep:A → serves_on → cmte:X
// rep:A → donated_to (from) → org:Y
// cmte:X → oversees → agency:Z
// org:Y → in_sector → sector:D
//

const repA = makeNode('rep:A', 'representative', 'Rep A');
const cmteX = makeNode('cmte:X', 'committee', 'Committee X');
const orgY = makeNode('org:Y', 'organization', 'Org Y');
const agencyZ = makeNode('agency:Z', 'agency', 'Agency Z');
const sectorD = makeNode('sector:D', 'sector', 'Defense');

const edgeServesOn = makeEdge('rep:A', 'cmte:X', 'serves_on');
const edgeDonatedTo = makeEdge('org:Y', 'rep:A', 'donated_to');
const edgeOversees = makeEdge('cmte:X', 'agency:Z', 'oversees');
const edgeInSector = makeEdge('org:Y', 'sector:D', 'in_sector');

describe('Civic Mesh Traversal', () => {
  beforeEach(() => {
    mockHydrate.mockReset();

    // Set up mock neighborhoods
    mockHydrate.mockImplementation(async (nodeId: string) => {
      switch (nodeId) {
        case 'rep:A':
          return makeNeighborhood(repA, [edgeServesOn, edgeDonatedTo], [cmteX, orgY]);
        case 'cmte:X':
          return makeNeighborhood(cmteX, [edgeServesOn, edgeOversees], [repA, agencyZ]);
        case 'org:Y':
          return makeNeighborhood(orgY, [edgeDonatedTo, edgeInSector], [repA, sectorD]);
        case 'agency:Z':
          return makeNeighborhood(agencyZ, [edgeOversees], [cmteX]);
        case 'sector:D':
          return makeNeighborhood(sectorD, [edgeInSector], [orgY]);
        default:
          return null;
      }
    });
  });

  it('returns null for non-existent origin', async () => {
    mockHydrate.mockResolvedValue(null);
    const result = await traverseMesh('rep:NONEXISTENT');
    expect(result).toBeNull();
  });

  it('discovers immediate neighbors at depth 1', async () => {
    const result = await traverseMesh('rep:A', { maxDepth: 1 });
    expect(result).not.toBeNull();
    expect(result!.origin.id).toBe('rep:A');
    expect(result!.nodes.length).toBe(2); // cmte:X and org:Y
    expect(result!.nodes.map(n => n.id).sort()).toEqual(['cmte:X', 'org:Y']);
  });

  it('discovers 2-hop neighbors at depth 2', async () => {
    const result = await traverseMesh('rep:A', { maxDepth: 2 });
    expect(result).not.toBeNull();
    // Depth 1: cmte:X, org:Y
    // Depth 2: agency:Z (via cmte:X), sector:D (via org:Y)
    expect(result!.nodes.length).toBe(4);
    expect(result!.nodes.map(n => n.id).sort()).toEqual([
      'agency:Z',
      'cmte:X',
      'org:Y',
      'sector:D',
    ]);
  });

  it('records correct depths in depthMap', async () => {
    const result = await traverseMesh('rep:A', { maxDepth: 2 });
    expect(result).not.toBeNull();
    expect(result!.depthMap['cmte:X']).toBe(1);
    expect(result!.depthMap['org:Y']).toBe(1);
    expect(result!.depthMap['agency:Z']).toBe(2);
    expect(result!.depthMap['sector:D']).toBe(2);
  });

  it('filters by edge type', async () => {
    const result = await traverseMesh('rep:A', {
      maxDepth: 2,
      edgeTypes: ['serves_on', 'oversees'],
    });
    expect(result).not.toBeNull();
    // Only follows serves_on and oversees edges:
    // rep:A → serves_on → cmte:X → oversees → agency:Z
    expect(result!.nodes.map(n => n.id).sort()).toEqual(['agency:Z', 'cmte:X']);
  });

  it('filters by node type', async () => {
    const result = await traverseMesh('rep:A', {
      maxDepth: 2,
      nodeTypes: ['committee', 'agency'],
    });
    expect(result).not.toBeNull();
    // Only collects committees and agencies, but still traverses through org:Y
    const nodeIds = result!.nodes.map(n => n.id).sort();
    expect(nodeIds).toContain('cmte:X');
    expect(nodeIds).toContain('agency:Z');
    expect(nodeIds).not.toContain('org:Y');
    expect(nodeIds).not.toContain('sector:D');
  });

  it('filters by minimum confidence', async () => {
    // Make one edge low confidence
    const lowConfEdge = { ...edgeDonatedTo, confidence: 0.3 };
    mockHydrate.mockImplementation(async (nodeId: string) => {
      if (nodeId === 'rep:A') {
        return makeNeighborhood(repA, [edgeServesOn, lowConfEdge], [cmteX, orgY]);
      }
      if (nodeId === 'cmte:X') {
        return makeNeighborhood(cmteX, [edgeServesOn, edgeOversees], [repA, agencyZ]);
      }
      return null;
    });

    const result = await traverseMesh('rep:A', { maxDepth: 2, minConfidence: 0.5 });
    expect(result).not.toBeNull();
    // Only follows high-confidence edges: serves_on to cmte:X, oversees to agency:Z
    // donated_to from org:Y has 0.3 confidence, filtered out
    const nodeIds = result!.nodes.map(n => n.id);
    expect(nodeIds).toContain('cmte:X');
    expect(nodeIds).toContain('agency:Z');
    expect(nodeIds).not.toContain('org:Y');
  });

  it('respects limit and sets truncated flag', async () => {
    const result = await traverseMesh('rep:A', { maxDepth: 2, limit: 2 });
    expect(result).not.toBeNull();
    expect(result!.nodes.length).toBe(2);
    expect(result!.truncated).toBe(true);
  });

  it('caps maxDepth at 4', async () => {
    const result = await traverseMesh('rep:A', { maxDepth: 10 });
    expect(result).not.toBeNull();
    // Should not crash — caps internally at 4
  });

  it('collects edges between discovered nodes', async () => {
    const result = await traverseMesh('rep:A', { maxDepth: 1 });
    expect(result).not.toBeNull();
    expect(result!.edges.length).toBeGreaterThan(0);
    const edgeTypes = result!.edges.map(e => e.type);
    expect(edgeTypes).toContain('serves_on');
    expect(edgeTypes).toContain('donated_to');
  });

  it('does not include origin in nodes list', async () => {
    const result = await traverseMesh('rep:A', { maxDepth: 1 });
    expect(result).not.toBeNull();
    expect(result!.nodes.find(n => n.id === 'rep:A')).toBeUndefined();
    expect(result!.origin.id).toBe('rep:A');
  });

  it('sets truncated and truncatedAt when node count hits absolute max limit', async () => {
    // Build a dense graph: hub connects to 210 orgs at depth 1,
    // each org connects to a sector at depth 2
    const hub = makeNode('rep:HUB', 'representative', 'Hub Rep');
    const orgs: GraphNode[] = [];
    const hubEdges: GraphEdge[] = [];

    for (let i = 0; i < 210; i++) {
      const org = makeNode(`org:O${i}`, 'organization', `Org ${i}`);
      orgs.push(org);
      hubEdges.push(makeEdge('rep:HUB', `org:O${i}`, 'donated_to'));
    }

    mockHydrate.mockImplementation(async (nodeId: string) => {
      if (nodeId === 'rep:HUB') {
        return makeNeighborhood(hub, hubEdges, orgs);
      }
      // Each org connects back to hub only
      const idx = nodeId.startsWith('org:O') ? parseInt(nodeId.slice(5), 10) : -1;
      if (idx >= 0 && idx < orgs.length) {
        const org = orgs[idx]!;
        return makeNeighborhood(org, [hubEdges[idx]!], [hub]);
      }
      return null;
    });

    // Use maxDepth 2 and no explicit limit (defaults to 50, but use absolute max)
    const result = await traverseMesh('rep:HUB', { maxDepth: 2, limit: 200 });
    expect(result).not.toBeNull();
    expect(result!.truncated).toBe(true);
    expect(result!.truncatedAt).toBe(1);
    expect(result!.nodes.length).toBe(200);
    expect(result!.totalDiscovered).toBeGreaterThan(200);
  });
});
