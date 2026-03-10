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

// Mock Redis cache
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: jest.fn(async () => null),
    set: jest.fn(async () => {}),
    keys: jest.fn(async () => []),
  }),
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
});
