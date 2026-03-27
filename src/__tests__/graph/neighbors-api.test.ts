/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/graph/neighbors/[...nodeId]/route';
import { NextRequest } from 'next/server';
import * as hydrator from '@/lib/graph/hydrator';
import type { GraphNeighborhood } from '@/types/graph';

jest.mock('@/lib/graph/hydrator');
jest.mock('@/lib/intelligence/analyzers/shared', () => ({
  withTimeout: jest.fn(<T>(p: Promise<T>) => p),
  ANALYZER_TIMEOUT_MS: 55_000,
  classifySignal: jest.fn(() => 'pattern' as const),
  SourceCollector: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    toSources: jest.fn(() => []),
    count: 0,
  })),
}));
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockHydrate = hydrator.hydrateNeighborhood as jest.MockedFunction<
  typeof hydrator.hydrateNeighborhood
>;

function makeRequest(path: string, params: string = ''): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${path}${params ? '?' + params : ''}`));
}

const mockNeighborhood: GraphNeighborhood = {
  center: {
    id: 'rep:P000197',
    type: 'representative',
    label: 'Nancy Pelosi (D-CA)',
    properties: { name: 'Nancy Pelosi', party: 'D', state: 'CA' },
    dataAsOf: '2026-03-10T00:00:00Z',
  },
  edges: [
    {
      id: 'rep:P000197->serves_on->cmte:SSAS',
      type: 'serves_on',
      sourceId: 'rep:P000197',
      targetId: 'cmte:SSAS',
      label: 'Serves on Armed Services',
      properties: {},
      weight: 0.5,
      confidence: 1.0,
      dataAsOf: '2026-03-10T00:00:00Z',
    },
    {
      id: 'org:lockheed->donated_to->rep:P000197',
      type: 'donated_to',
      sourceId: 'org:lockheed',
      targetId: 'rep:P000197',
      label: '$50,000 from Lockheed',
      properties: { amount: 50000 },
      weight: 0.8,
      confidence: 0.9,
      dataAsOf: '2026-03-10T00:00:00Z',
    },
  ],
  connectedNodes: [
    {
      id: 'cmte:SSAS',
      type: 'committee',
      label: 'Armed Services',
      properties: { name: 'Armed Services' },
      dataAsOf: '2026-03-10T00:00:00Z',
    },
    {
      id: 'org:lockheed',
      type: 'organization',
      label: 'Lockheed Martin',
      properties: { name: 'Lockheed Martin' },
      dataAsOf: '2026-03-10T00:00:00Z',
    },
  ],
  completeness: 'complete',
  failedSources: [],
};

describe('GET /api/graph/neighbors/[...nodeId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for missing colon in node ID', async () => {
    const request = makeRequest('/api/graph/neighbors/invalid');
    const response = await GET(request, { params: Promise.resolve({ nodeId: ['invalid'] }) });
    expect(response.status).toBe(400);
  });

  it('returns 404 when node not found', async () => {
    mockHydrate.mockResolvedValue(null);
    const request = makeRequest('/api/graph/neighbors/rep:XXXXXX');
    const response = await GET(request, {
      params: Promise.resolve({ nodeId: ['rep:XXXXXX'] }),
    });
    expect(response.status).toBe(404);
  });

  it('returns neighborhood for valid node', async () => {
    mockHydrate.mockResolvedValue(mockNeighborhood);
    const request = makeRequest('/api/graph/neighbors/rep:P000197');
    const response = await GET(request, {
      params: Promise.resolve({ nodeId: ['rep:P000197'] }),
    });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.center.id).toBe('rep:P000197');
    expect(data.edges).toHaveLength(2);
    expect(data.connectedNodes).toHaveLength(2);
  });

  it('filters by edgeTypes', async () => {
    mockHydrate.mockResolvedValue(mockNeighborhood);
    const request = makeRequest('/api/graph/neighbors/rep:P000197', 'edgeTypes=serves_on');
    const response = await GET(request, {
      params: Promise.resolve({ nodeId: ['rep:P000197'] }),
    });
    const data = await response.json();
    expect(data.edges).toHaveLength(1);
    expect(data.edges[0].type).toBe('serves_on');
    // org:lockheed should be pruned since donated_to was filtered out
    expect(data.connectedNodes).toHaveLength(1);
    expect(data.connectedNodes[0].id).toBe('cmte:SSAS');
  });

  it('returns 400 for invalid edge type', async () => {
    const request = makeRequest('/api/graph/neighbors/rep:P000197', 'edgeTypes=fake_type');
    const response = await GET(request, {
      params: Promise.resolve({ nodeId: ['rep:P000197'] }),
    });
    expect(response.status).toBe(400);
  });

  it('filters by minConfidence', async () => {
    mockHydrate.mockResolvedValue(mockNeighborhood);
    const request = makeRequest('/api/graph/neighbors/rep:P000197', 'minConfidence=0.95');
    const response = await GET(request, {
      params: Promise.resolve({ nodeId: ['rep:P000197'] }),
    });
    const data = await response.json();
    // Only serves_on has confidence 1.0; donated_to has 0.9
    expect(data.edges).toHaveLength(1);
    expect(data.edges[0].type).toBe('serves_on');
  });

  it('returns 200 with correct response shape', async () => {
    mockHydrate.mockResolvedValue(mockNeighborhood);
    const request = makeRequest('/api/graph/neighbors/rep:P000197');
    const response = await GET(request, {
      params: Promise.resolve({ nodeId: ['rep:P000197'] }),
    });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('center');
    expect(data).toHaveProperty('edges');
    expect(data).toHaveProperty('connectedNodes');
    expect(data).toHaveProperty('completeness');
    expect(data).toHaveProperty('failedSources');
  });
});
