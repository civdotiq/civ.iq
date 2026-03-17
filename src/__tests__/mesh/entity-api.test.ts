/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Civic Mesh Unified Entity API (Phase 5).
 *
 * Tests parseMeshId(), resolveEntity(), and response shape validation.
 */

// Mock logger before anything imports it
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock hydrateNeighborhood (must come before entity-api import to avoid TransformStream)
jest.mock('@/lib/graph/hydrator', () => ({
  hydrateNeighborhood: jest.fn(),
}));

// Mock mesh init to avoid importing hydrators (which pull in AI SDK → TransformStream)
jest.mock('@/lib/mesh/init', () => ({
  ensureMeshInitialized: jest.fn(),
}));

// Mock temporal
jest.mock('@/lib/mesh/temporal', () => ({
  buildTemporalProfile: jest.fn().mockResolvedValue(null),
}));

// Mock district profile
jest.mock('@/lib/mesh/district-profile', () => ({
  buildDistrictProfile: jest.fn().mockResolvedValue(null),
}));

// Mock redis
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock fetch for insight endpoints
global.fetch = jest.fn().mockResolvedValue({
  ok: false,
  json: jest.fn().mockResolvedValue(null),
});

import { parseMeshId, resolveEntity } from '@/lib/mesh/protocol/entity-api';
import { hydrateNeighborhood } from '@/lib/graph/hydrator';
import type { GraphNeighborhood } from '@/types/graph';

const mockHydrate = hydrateNeighborhood as jest.MockedFunction<typeof hydrateNeighborhood>;

describe('parseMeshId', () => {
  it('parses representative ID', () => {
    const result = parseMeshId('rep:A000360');
    expect(result).toEqual({ type: 'representative', identifier: 'A000360' });
  });

  it('parses bill ID', () => {
    const result = parseMeshId('bill:119-hr-1234');
    expect(result).toEqual({ type: 'bill', identifier: '119-hr-1234' });
  });

  it('parses committee ID', () => {
    const result = parseMeshId('cmte:SSFI');
    expect(result).toEqual({ type: 'committee', identifier: 'SSFI' });
  });

  it('parses sector ID', () => {
    const result = parseMeshId('sector:defense');
    expect(result).toEqual({ type: 'sector', identifier: 'defense' });
  });

  it('returns null for invalid format (no colon)', () => {
    expect(parseMeshId('invalid')).toBeNull();
  });

  it('returns null for empty identifier', () => {
    expect(parseMeshId('rep:')).toBeNull();
  });

  it('returns null for unknown prefix', () => {
    expect(parseMeshId('unknown:foo')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseMeshId('')).toBeNull();
  });

  it('handles all 8 entity prefixes', () => {
    const prefixes = [
      { prefix: 'rep', type: 'representative' },
      { prefix: 'bill', type: 'bill' },
      { prefix: 'cmte', type: 'committee' },
      { prefix: 'agency', type: 'agency' },
      { prefix: 'org', type: 'organization' },
      { prefix: 'sector', type: 'sector' },
      { prefix: 'contract', type: 'contract' },
      { prefix: 'reg', type: 'regulation' },
    ];

    for (const { prefix, type } of prefixes) {
      const result = parseMeshId(`${prefix}:test-id`);
      expect(result).toEqual({ type, identifier: 'test-id' });
    }
  });
});

describe('resolveEntity', () => {
  const mockNeighborhood: GraphNeighborhood = {
    center: {
      id: 'rep:A000360',
      type: 'representative',
      label: 'Lamar Alexander',
      properties: { party: 'R', state: 'TN', chamber: 'Senate' },
      dataAsOf: '2026-03-17T00:00:00Z',
    },
    edges: [
      {
        id: 'rep:A000360->serves_on->cmte:SSFI',
        type: 'serves_on',
        sourceId: 'rep:A000360',
        targetId: 'cmte:SSFI',
        label: 'Serves on Finance',
        properties: {},
        weight: 1,
        confidence: 0.95,
        dataAsOf: '2026-03-17T00:00:00Z',
        sourceLabel: 'Congress.gov',
      },
    ],
    connectedNodes: [
      {
        id: 'cmte:SSFI',
        type: 'committee',
        label: 'Finance',
        properties: {},
        dataAsOf: '2026-03-17T00:00:00Z',
      },
    ],
    completeness: 'complete',
    failedSources: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null for invalid ID', async () => {
    const result = await resolveEntity('invalid');
    expect(result).toBeNull();
  });

  it('returns null when hydration fails', async () => {
    mockHydrate.mockResolvedValue(null);
    const result = await resolveEntity('rep:UNKNOWN');
    expect(result).toBeNull();
  });

  it('returns full entity response for valid representative', async () => {
    mockHydrate.mockResolvedValue(mockNeighborhood);

    const result = await resolveEntity('rep:A000360');
    expect(result).not.toBeNull();

    // Entity identity
    expect(result!.entity.id).toBe('rep:A000360');
    expect(result!.entity.type).toBe('representative');
    expect(result!.entity.label).toBe('Lamar Alexander');
    expect(result!.entity.schema).toBeDefined();
    expect(result!.entity.schema.nodeType).toBe('representative');

    // Neighborhood
    expect(result!.neighborhood.edges).toHaveLength(1);
    expect(result!.neighborhood.nodes).toHaveLength(1);
    expect(result!.neighborhood.completeness).toBe('complete');

    // Intelligence
    expect(result!.intelligence.insights).toBeDefined();

    // Meta
    expect(result!.meta.meshVersion).toBe('1.0.0');
    expect(result!.meta.cacheStatus).toBe('fresh');
    expect(result!.meta.generatedAt).toBeDefined();
    expect(result!.meta.dataSources).toContain('Congress.gov');
  });

  it('includes schema in response for self-description', async () => {
    mockHydrate.mockResolvedValue(mockNeighborhood);

    const result = await resolveEntity('rep:A000360');
    const schema = result!.entity.schema;

    expect(schema.displayName).toBe('Representative');
    expect(schema.primaryKey).toBe('bioguideId');
    expect(schema.properties).toHaveProperty('name');
    expect(schema.properties).toHaveProperty('party');
    expect(schema.relationships.length).toBeGreaterThan(0);
  });

  it('collects data sources from edge sourceLabels', async () => {
    mockHydrate.mockResolvedValue(mockNeighborhood);

    const result = await resolveEntity('rep:A000360');
    expect(result!.meta.dataSources).toEqual(['Congress.gov']);
  });
});
