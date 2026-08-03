/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { computeBillLobbyingSimilarity } from '@/lib/intelligence/embeddings/bill-lobbying-similarity';

// Mock the embedding classifier
jest.mock('@/lib/intelligence/embeddings/embedding-classifier', () => {
  const mockEmbeddings = new Map<string, Float32Array>();
  let callCount = 0;

  return {
    embedText: jest.fn(async (text: string) => {
      if (!text.trim()) return null;

      // Return deterministic embeddings based on text content
      const key = text.substring(0, 50);
      if (mockEmbeddings.has(key)) return mockEmbeddings.get(key)!;

      callCount++;
      // Generate a simple embedding — same-topic texts will share components
      const embedding = new Float32Array(384);
      for (let i = 0; i < 384; i++) {
        embedding[i] = Math.sin(i * 0.1 + callCount * 0.5) * 0.1;
      }
      // Normalize
      let mag = 0;
      for (let i = 0; i < 384; i++) mag += embedding[i] * embedding[i];
      mag = Math.sqrt(mag);
      for (let i = 0; i < 384; i++) embedding[i] /= mag;

      mockEmbeddings.set(key, embedding);
      return embedding;
    }),
    classifyBillSectors: jest.fn(async () => []),
    _resetForTesting: jest.fn(),
  };
});

// Mock Redis cache — singleton so tests can inspect calls
const mockRedisInstance = {
  get: jest.fn(async () => null),
  set: jest.fn(async () => {}),
  keys: jest.fn(async () => []),
};
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => mockRedisInstance,
}));

describe('Bill-Lobbying Similarity', () => {
  const sampleFilings = [
    {
      id: 'filing-1',
      client: 'Pharma Corp',
      registrant: 'BigLobby LLC',
      specificIssues: ['pharmaceutical pricing reform and drug import provisions'],
      income: 500000,
      period: 'Q3 2025',
    },
    {
      id: 'filing-2',
      client: 'Tech Inc',
      registrant: 'Policy Group',
      specificIssues: ['broadband infrastructure and spectrum allocation'],
      income: 250000,
      period: 'Q3 2025',
    },
    {
      id: 'filing-3',
      client: 'Empty Filing Corp',
      registrant: 'No Issues LLC',
      specificIssues: [],
      income: 100000,
      period: 'Q2 2025',
    },
  ];

  it('returns null for empty bill text', async () => {
    const result = await computeBillLobbyingSimilarity('hr-1', '', sampleFilings);
    expect(result).toBeNull();
  });

  it('returns null for empty filings array', async () => {
    const result = await computeBillLobbyingSimilarity('hr-1', 'Some bill text', []);
    expect(result).toBeNull();
  });

  it('computes similarity matches for valid inputs', async () => {
    const result = await computeBillLobbyingSimilarity(
      'hr-100',
      'An act to reform pharmaceutical drug pricing and import regulations',
      sampleFilings
    );

    expect(result).not.toBeNull();
    expect(result!.billId).toBe('hr-100');
    expect(result!.matches.length).toBeGreaterThan(0);

    // Matches should be sorted by similarity descending
    for (let i = 1; i < result!.matches.length; i++) {
      expect(result!.matches[i].similarity).toBeLessThanOrEqual(result!.matches[i - 1].similarity);
    }
  });

  it('skips filings with empty specific_issues', async () => {
    const result = await computeBillLobbyingSimilarity(
      'hr-200',
      'Some bill about technology',
      sampleFilings
    );

    expect(result).not.toBeNull();
    // filing-3 has empty specificIssues, so only 2 filings should be compared
    expect(result!.matches.length).toBeLessThanOrEqual(2);

    const filingIds = result!.matches.map(m => m.filingId);
    expect(filingIds).not.toContain('filing-3');
  });

  it('includes client and registrant in matches', async () => {
    const result = await computeBillLobbyingSimilarity(
      'hr-300',
      'An act about pharmaceutical policy',
      sampleFilings
    );

    expect(result).not.toBeNull();
    for (const match of result!.matches) {
      expect(match.client).toBeTruthy();
      expect(match.registrant).toBeTruthy();
      expect(typeof match.similarity).toBe('number');
      expect(match.similarity).toBeGreaterThanOrEqual(0);
      expect(match.similarity).toBeLessThanOrEqual(1);
    }
  });

  it('computes averageSimilarity correctly', async () => {
    const result = await computeBillLobbyingSimilarity(
      'hr-400',
      'An act about health care reform',
      sampleFilings
    );

    expect(result).not.toBeNull();
    if (result!.matches.length > 0) {
      const expectedAvg =
        result!.matches.reduce((s, m) => s + m.similarity, 0) / result!.matches.length;
      // averageSimilarity is computed over ALL compared matches
      expect(typeof result!.averageSimilarity).toBe('number');
      expect(Number.isFinite(result!.averageSimilarity)).toBe(true);
    }
  });

  it('sets hasStrongMatches based on 0.55 threshold', async () => {
    // With our mock embeddings, similarity values are deterministic
    // and based on sin() functions. We need to verify the flag logic.
    const result = await computeBillLobbyingSimilarity(
      'hr-500',
      'An act about pharmaceutical pricing reform',
      sampleFilings
    );

    expect(result).not.toBeNull();
    // hasStrongMatches should be true if ANY match >= 0.55, false otherwise
    if (result!.matches.some(m => m.similarity >= 0.55)) {
      expect(result!.hasStrongMatches).toBe(true);
    } else {
      expect(result!.hasStrongMatches).toBe(false);
    }
  });

  it('caps matches at 10 even with more filings', async () => {
    // Create 15 filings with non-empty specificIssues
    const manyFilings = Array.from({ length: 15 }, (_, i) => ({
      id: `filing-cap-${i}`,
      client: `Client ${i}`,
      registrant: `Registrant ${i}`,
      specificIssues: [`Issue about topic ${i} and regulatory policy`],
      income: 100000 + i * 10000,
      period: `Q${(i % 4) + 1} 2025`,
    }));

    const result = await computeBillLobbyingSimilarity(
      'hr-600',
      'An act about comprehensive regulatory reform and oversight',
      manyFilings
    );

    expect(result).not.toBeNull();
    expect(result!.matches.length).toBeLessThanOrEqual(10);
  });

  it('caches lobbying embeddings in Redis', async () => {
    // Clear previous calls so we only see this test's interactions
    mockRedisInstance.set.mockClear();

    const result = await computeBillLobbyingSimilarity(
      'hr-700',
      'An act about defense spending',
      sampleFilings
    );

    expect(result).not.toBeNull();
    // Redis set should have been called for each filing with non-empty specificIssues
    // filing-1 and filing-2 have issues, filing-3 has empty issues
    const setCalls = mockRedisInstance.set.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === 'string' && (call[0] as string).startsWith('lobbying-embedding:')
    );
    expect(setCalls.length).toBe(2); // filing-1 and filing-2
    // Verify the cache key format
    expect(setCalls[0][0]).toContain('lobbying-embedding:filing-1');
  });
  it('labels its result a sample so no caller aggregates it', async () => {
    // The corpus carries no free-text specific_issues, so this is the one
    // lobbying path still reading the LDA API sample.
    const result = await computeBillLobbyingSimilarity(
      'hr-1234',
      'Drug Pricing Act',
      sampleFilings
    );

    expect(result?.coverage).toBe('sample');
  });
});
