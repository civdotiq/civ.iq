/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * @jest-environment node
 */

/**
 * Tests for the Address Money Report API route.
 *
 * Validates POST (address resolution) and GET (ZIP fallback) handlers,
 * including input validation, caching, geocoder errors, and partial
 * analyzer failures.
 */

// ── Mocks (factory style to prevent transitive module loading) ────

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockRedisGet = jest.fn().mockResolvedValue(null);
const mockRedisSet = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  }),
}));

const mockGeocodeAddress = jest.fn();
jest.mock('@/services/geocoding/census-geocoder.service', () => ({
  CensusGeocoderService: {
    geocodeAddress: (...args: unknown[]) => mockGeocodeAddress(...args),
  },
}));

const mockGetAllDistrictsForZip = jest.fn();
jest.mock('@/lib/data/zip-district-mapping-119th', () => ({
  getAllDistrictsForZip: (...args: unknown[]) => mockGetAllDistrictsForZip(...args),
}));

const mockGetAllRepresentatives = jest.fn();
jest.mock('@/services/core/representatives-core.service', () => ({
  RepresentativesCoreService: {
    getAllRepresentatives: (...args: unknown[]) => mockGetAllRepresentatives(...args),
  },
}));

const mockAnalyzeVoteFinance = jest.fn();
jest.mock('@/lib/intelligence/analyzers/vote-finance-analyzer', () => ({
  analyzeVoteFinance: (...args: unknown[]) => mockAnalyzeVoteFinance(...args),
}));

const mockAnalyzeFinanceJurisdiction = jest.fn();
jest.mock('@/lib/intelligence/analyzers/finance-jurisdiction-analyzer', () => ({
  analyzeFinanceJurisdiction: (...args: unknown[]) => mockAnalyzeFinanceJurisdiction(...args),
}));

const mockAnalyzeVotePrediction = jest.fn();
jest.mock('@/lib/intelligence/analyzers/vote-prediction-analyzer', () => ({
  analyzeVotePrediction: (...args: unknown[]) => mockAnalyzeVotePrediction(...args),
}));

const mockAnalyzeInfluenceChains = jest.fn();
jest.mock('@/lib/intelligence/analyzers/influence-chain-analyzer', () => ({
  analyzeInfluenceChains: (...args: unknown[]) => mockAnalyzeInfluenceChains(...args),
}));

const mockGenerateInsightNarrative = jest.fn();
const mockWithTimeout = jest.fn();
jest.mock('@/lib/intelligence/analyzers/shared', () => ({
  generateInsightNarrative: (...args: unknown[]) => mockGenerateInsightNarrative(...args),
  withTimeout: (...args: unknown[]) => mockWithTimeout(...args),
}));

const mockConfidenceScore = jest.fn();
const mockMean = jest.fn();
jest.mock('@/lib/intelligence/statistics/civic-stats', () => ({
  confidenceScore: (...args: unknown[]) => mockConfidenceScore(...args),
  mean: (...args: unknown[]) => mockMean(...args),
}));

jest.mock('@/lib/ai/plain-language', () => ({ PLAIN_LANGUAGE_RULES: 'test rules' }));

// ── Imports (after mocks) ─────────────────────────────────────────

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/intelligence/address/money-report/route';

// ── Helpers ───────────────────────────────────────────────────────

function postRequest(body: Record<string, unknown>): NextRequest {
  const req = new NextRequest('http://localhost:3000/api/intelligence/address/money-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  // Override json() to return the body directly, avoiding stream issues in test env
  req.json = () => Promise.resolve(body);
  return req;
}

function getRequest(params?: string): NextRequest {
  const url = params
    ? `http://localhost:3000/api/intelligence/address/money-report?${params}`
    : 'http://localhost:3000/api/intelligence/address/money-report';
  return new NextRequest(url);
}

const DEFAULT_REPS = [
  {
    bioguideId: 'B001234',
    name: 'Rep Smith',
    party: 'D',
    state: 'IL',
    district: '13',
    chamber: 'House',
  },
  { bioguideId: 'S001234', name: 'Sen Johnson', party: 'R', state: 'IL', chamber: 'Senate' },
  { bioguideId: 'S005678', name: 'Sen Williams', party: 'D', state: 'IL', chamber: 'Senate' },
];

function setDefaultMocks(): void {
  mockRedisGet.mockResolvedValue(null);
  mockRedisSet.mockResolvedValue(undefined);

  mockGeocodeAddress.mockResolvedValue({
    matchedAddress: '123 MAIN ST, SPRINGFIELD, IL 62701',
    coordinates: { lat: 39.78, lon: -89.65 },
    congressionalDistrict: { number: '13', geoid: '1713', name: 'Congressional District 13' },
  });

  mockGetAllDistrictsForZip.mockReturnValue([{ state: 'IL', district: '13', primary: true }]);

  mockGetAllRepresentatives.mockResolvedValue(DEFAULT_REPS);

  mockAnalyzeVoteFinance.mockResolvedValue({ overallCorrelation: 0.45 });
  mockAnalyzeFinanceJurisdiction.mockResolvedValue({ overlapScore: 0.6 });
  mockAnalyzeVotePrediction.mockResolvedValue({ independenceScore: { score: 0.3 } });
  mockAnalyzeInfluenceChains.mockResolvedValue({ chains: [1, 2, 3] });

  mockGenerateInsightNarrative.mockResolvedValue({
    narrative: 'Test narrative',
    source: 'statistical-fallback' as const,
  });
  mockWithTimeout.mockImplementation((promise: Promise<unknown>) => promise);

  mockConfidenceScore.mockReturnValue(0.75);
  mockMean.mockImplementation(
    (arr: number[]) => arr.reduce((a: number, b: number) => a + b, 0) / arr.length
  );
}

// ── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  setDefaultMocks();
});

describe('POST /api/intelligence/address/money-report', () => {
  it('returns 400 when street is missing', async () => {
    const req = postRequest({ city: 'Springfield', state: 'IL' });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/street/i);
  });

  it('resolves address and returns money report', async () => {
    const req = postRequest({ street: '123 Main St', city: 'Springfield', state: 'IL' });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGeocodeAddress).toHaveBeenCalledWith(
      expect.objectContaining({ street: '123 Main St', city: 'Springfield', state: 'IL' })
    );
    expect(data.state).toBe('IL');
    expect(data.district).toBe('13');
    expect(data.multiDistrict).toBe(false);
    expect(data.representatives).toHaveLength(3);
    expect(data.narrative).toBe('Test narrative');
    expect(data.confidence).toBe(0.75);
    expect(data.disclaimer).toBeTruthy();
    expect(data.methodology).toBeTruthy();
    expect(data.aggregates).toBeDefined();
    expect(data.aggregates.averageCorrelation).toBe(0.45);
  });

  it('returns cached report on cache hit', async () => {
    const cachedReport = {
      state: 'IL',
      district: '13',
      multiDistrict: false,
      representatives: [],
      aggregates: { averageCorrelation: 0.5 },
      narrative: 'Cached narrative',
      confidence: 0.8,
      dataAsOf: '2026-01-01T00:00:00.000Z',
      methodology: 'cached',
      disclaimer: 'cached',
      lastAnalyzedAt: '2026-01-01T00:00:00.000Z',
      source: 'statistical-fallback',
    };
    mockRedisGet.mockResolvedValue(cachedReport);

    const req = postRequest({ street: '123 Main St', city: 'Springfield', state: 'IL' });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.narrative).toBe('Cached narrative');
    // Analyzers should not have been called when cache hits
    expect(mockAnalyzeVoteFinance).not.toHaveBeenCalled();
    expect(mockAnalyzeFinanceJurisdiction).not.toHaveBeenCalled();
  });

  it('handles geocoder error gracefully', async () => {
    mockGeocodeAddress.mockRejectedValue(new Error('Geocoder service unavailable'));

    const req = postRequest({ street: '123 Main St', city: 'Springfield', state: 'IL' });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('handles partial analyzer results on timeout', async () => {
    mockAnalyzeVoteFinance.mockRejectedValue(new Error('Timeout'));

    const req = postRequest({ street: '123 Main St', city: 'Springfield', state: 'IL' });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.representatives).toHaveLength(3);
    // voteFinanceCorrelation should be null for all reps since the analyzer rejected
    for (const rep of data.representatives) {
      expect(rep.voteFinanceCorrelation).toBeNull();
    }
    // Other analyzers should still have produced values
    for (const rep of data.representatives) {
      expect(rep.financeJurisdictionOverlap).toBe(0.6);
      expect(rep.independenceScore).toBe(0.3);
      expect(rep.influenceChainCount).toBe(3);
    }
  });
});

describe('GET /api/intelligence/address/money-report', () => {
  it('returns 400 when zip is missing', async () => {
    const req = getRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/zip/i);
  });

  it('resolves ZIP and returns money report', async () => {
    const req = getRequest('zip=62701');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetAllDistrictsForZip).toHaveBeenCalledWith('62701');
    expect(data.state).toBe('IL');
    expect(data.district).toBe('13');
    expect(data.multiDistrict).toBe(false);
    expect(data.representatives).toHaveLength(3);
    expect(data.narrative).toBe('Test narrative');
    expect(data.confidence).toBe(0.75);
    expect(data.disclaimer).toBeTruthy();
  });

  it('flags multi-district ZIP', async () => {
    mockGetAllDistrictsForZip.mockReturnValue([
      { state: 'IL', district: '13', primary: true },
      { state: 'IL', district: '14', primary: false },
    ]);

    const req = getRequest('zip=62701');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.multiDistrict).toBe(true);
    expect(data.district).toBe('13');
  });

  it('returns 404 when ZIP not found', async () => {
    mockGetAllDistrictsForZip.mockReturnValue([]);

    const req = getRequest('zip=00000');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toMatch(/no congressional district/i);
  });
});
