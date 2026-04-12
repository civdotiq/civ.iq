/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import * as fs from 'fs';
import { GET } from '@/app/api/representative/[bioguideId]/party-alignment/route';
import { createMockRequest } from '../../utils/test-helpers';
import type { PartyLineInsight } from '@/lib/intelligence/analyzers/party-line-analyzer';

// Mock logger
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    metric: jest.fn(),
  },
}));

// Mock analyzer
const mockAnalyze = jest.fn();
jest.mock('@/lib/intelligence/analyzers/party-line-analyzer', () => ({
  analyzePartyLineAlignment: (...args: unknown[]) => mockAnalyze(...args),
}));

const MOCK_INSIGHT: PartyLineInsight = {
  bioguideId: 'P000197',
  name: 'Nancy Pelosi',
  party: 'Democratic',
  chamber: 'House',
  alignmentRate: 0.923,
  votesAnalyzed: 52,
  votesWithParty: 48,
  votesAgainstParty: 4,
  peerAverageAlignment: 0.897,
  peerCount: 195,
  confidence: 0.87,
  dataAsOf: '2026-04-10',
  methodology: 'Roll-call alignment analysis',
  disclaimer: 'Alignment is not a measure of ideology.',
  lastAnalyzedAt: '2026-04-10T12:00:00Z',
};

function makeParams(bioguideId: string) {
  return { params: Promise.resolve({ bioguideId }) };
}

describe('/api/representative/[bioguideId]/party-alignment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns correct response shape on success', async () => {
    mockAnalyze.mockResolvedValue(MOCK_INSIGHT);

    const request = createMockRequest(
      'http://localhost:3000/api/representative/P000197/party-alignment'
    );
    const response = await GET(request, makeParams('P000197'));
    const data = await response.json();

    expect(response.status).toBe(200);
    // Route rounds to 1 decimal: Math.round(0.923 * 1000) / 10 = 92.3
    expect(data.overall_alignment).toBe(92.3);
    expect(data.votes_with_party).toBe(48);
    expect(data.votes_against_party).toBe(4);
    expect(data.total_votes_analyzed).toBe(52);
    expect(data.peer_average_alignment).toBe(89.7);
    expect(data.peer_count).toBe(195);
    expect(data.confidence).toBe(0.87);
    expect(data.data_as_of).toBe('2026-04-10');
    expect(data.methodology).toBe('Roll-call alignment analysis');
    expect(data.disclaimer).toBe('Alignment is not a measure of ideology.');
    expect(mockAnalyze).toHaveBeenCalledWith('P000197');
  });

  it('returns unavailable response when analyzer returns null', async () => {
    mockAnalyze.mockResolvedValue(null);

    const request = createMockRequest(
      'http://localhost:3000/api/representative/I000024/party-alignment'
    );
    const response = await GET(request, makeParams('I000024'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.overall_alignment).toBe(0);
    expect(data.total_votes_analyzed).toBe(0);
    expect(data.metadata).toBeDefined();
    expect(data.metadata.dataSource).toBe('unavailable');
  });

  it('returns 400 for missing bioguideId', async () => {
    const request = createMockRequest('http://localhost:3000/api/representative//party-alignment');
    const response = await GET(request, makeParams(''));

    expect(response.status).toBe(400);
  });

  it('returns 500 when analyzer throws', async () => {
    mockAnalyze.mockRejectedValue(new Error('Congress API down'));

    const request = createMockRequest(
      'http://localhost:3000/api/representative/P000197/party-alignment'
    );
    const response = await GET(request, makeParams('P000197'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.overall_alignment).toBe(0);
    expect(data.metadata.dataSource).toBe('unavailable');
  });

  it('sets Cache-Control headers (source-level contract check)', () => {
    // jsdom NextResponse doesn't reliably propagate response headers,
    // so we verify at the source level (same pattern as v1-routes.test.ts).
    const source = fs.readFileSync(
      'src/app/api/representative/[bioguideId]/party-alignment/route.ts',
      'utf-8'
    );
    expect(source).toContain("'Cache-Control'");
    expect(source).toContain('s-maxage=3600');
    expect(source).toContain('stale-while-revalidate=7200');
  });
});
