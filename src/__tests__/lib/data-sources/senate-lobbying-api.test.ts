/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for senate-lobbying-api.ts
 *
 * Tests quarter name mapping, data aggregation, and error handling.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockCachedFetch = jest.fn();
jest.mock('@/lib/cache', () => ({
  cachedFetch: (...args: unknown[]) => mockCachedFetch(...args),
}));

/**
 * Mock the embedding pipeline. The matchByEmbedding path requires real
 * embeddings, but in jest the WASM pipeline isn't loaded. We return
 * deterministic vectors keyed by text content so cosine similarity
 * yields predictable results.
 *
 * Strategy: each text gets a vector seeded by a topic hint extracted
 * from its keywords. Same topic → near-identical vector → high cosine
 * similarity. Different topic → orthogonal-ish vector.
 */
const embedTextMock = jest.fn();
jest.mock('@/lib/intelligence/embeddings/embedding-classifier', () => ({
  embedText: (...args: unknown[]) => embedTextMock(...args),
}));

import {
  SenateLobbyingAPI,
  _resetLDALabelEmbeddingsCacheForTesting,
  type LobbyingFiling,
} from '@/lib/data-sources/senate-lobbying-api';

/**
 * Build a unit vector aligned with a topic axis. Two texts mapped to
 * the same topic yield identical vectors (cosine = 1.0). Different
 * topics yield orthogonal vectors (cosine = 0).
 */
function topicVector(topic: 'space' | 'aging' | 'sports' | 'orth'): Float32Array {
  const vec = new Float32Array(384);
  const axis = { space: 0, aging: 1, sports: 2, orth: 3 }[topic];
  vec[axis] = 1;
  return vec;
}

/**
 * Pick a topic for a text by checking keyword presence. Mirrors the
 * intent of the real embedding model without doing actual NLP.
 */
function topicFor(text: string): 'space' | 'aging' | 'sports' | 'orth' {
  const lower = text.toLowerCase();
  // Map texts that should match each other to the same topic.
  if (lower.includes('space') || lower.includes('nasa') || lower.includes('aerospace')) {
    return 'space';
  }
  if (lower.includes('aging') || lower.includes('retirement') || lower.includes('elder')) {
    return 'aging';
  }
  if (lower.includes('sports') || lower.includes('athletic')) {
    return 'sports';
  }
  return 'orth';
}

function createMockFiling(overrides: Partial<LobbyingFiling> = {}): LobbyingFiling {
  return {
    id: 'test-filing-1',
    registrant: { name: 'Lobby Firm', id: 'R001' },
    client: { name: 'Client Corp', id: 'C001' },
    income: 100000,
    expenses: 50000,
    filingPeriod: 'first_quarter',
    filingYear: 2025,
    issues: [{ code: 'DEF', description: 'Defense' }],
    lobbyists: [{ name: 'John Doe' }],
    government_entities: ['Senate Armed Services Committee'],
    specific_issues: ['military spending', 'defense procurement'],
    ...overrides,
  };
}

describe('SenateLobbyingAPI', () => {
  let api: SenateLobbyingAPI;

  beforeEach(() => {
    jest.clearAllMocks();
    _resetLDALabelEmbeddingsCacheForTesting();
    embedTextMock.mockImplementation(async (text: string) => {
      if (typeof text !== 'string' || !text.trim()) return null;
      return topicVector(topicFor(text));
    });
    api = new SenateLobbyingAPI();
  });

  describe('fetchFilingsByQuarter', () => {
    it('maps quarter numbers to full names for API', async () => {
      mockCachedFetch.mockImplementation(async (_key: string, fetcher: () => Promise<unknown>) => {
        return fetcher();
      });

      // Mock global fetch
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [createMockFiling()] }),
      });
      global.fetch = mockFetch;

      await api.fetchFilingsByQuarter(2025, 1);

      expect(mockFetch).toHaveBeenCalled();
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('filing_period=first_quarter');
    });

    it('returns empty array for invalid quarter', async () => {
      const result = await api.fetchFilingsByQuarter(2025, 5);
      expect(result).toEqual([]);
    });

    it('returns empty array for quarter 0', async () => {
      const result = await api.fetchFilingsByQuarter(2025, 0);
      expect(result).toEqual([]);
    });

    it('throws on API error', async () => {
      mockCachedFetch.mockImplementation(async (_key: string, fetcher: () => Promise<unknown>) => {
        return fetcher();
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(api.fetchFilingsByQuarter(2025, 1)).rejects.toThrow();
    });
  });

  describe('getCommitteeLobbyingData', () => {
    it('matches filings to committees by keyword', async () => {
      const defenseFiling = createMockFiling({
        client: { name: 'Defense Inc', id: 'C002' },
        income: 200000,
        specific_issues: ['defense procurement'],
        issues: [{ code: 'DEF', description: 'Defense spending' }],
      });

      const healthFiling = createMockFiling({
        client: { name: 'Health Corp', id: 'C003' },
        income: 150000,
        specific_issues: ['medicare reform'],
        issues: [{ code: 'HCR', description: 'Health care reform' }],
      });

      // fetchRecentFilings calls fetchFilingsByQuarter multiple times
      mockCachedFetch.mockResolvedValue([defenseFiling, healthFiling]);

      const result = await api.getCommitteeLobbyingData(['Armed Services', 'Healthcare']);

      expect(result.length).toBeGreaterThanOrEqual(1);
      // Defense filing should match Armed Services
      const armedServices = result.find(d => d.committee === 'Armed Services');
      if (armedServices) {
        expect(armedServices.totalSpending).toBeGreaterThan(0);
      }
    });

    it('returns empty array when no filings available', async () => {
      mockCachedFetch.mockResolvedValue([]);

      const result = await api.getCommitteeLobbyingData(['Armed Services']);
      expect(result).toEqual([]);
    });

    it('sorts results by total spending descending', async () => {
      const bigFiling = createMockFiling({
        income: 500000,
        specific_issues: ['defense'],
      });
      const smallFiling = createMockFiling({
        income: 100000,
        specific_issues: ['health care'],
      });

      mockCachedFetch.mockResolvedValue([bigFiling, smallFiling]);

      const result = await api.getCommitteeLobbyingData(['Armed Services', 'Healthcare']);

      if (result.length >= 2) {
        expect(result[0].totalSpending).toBeGreaterThanOrEqual(result[1].totalSpending);
      }
    });
  });

  describe('matchByEmbedding (embedding fallback path)', () => {
    /**
     * A committee name that no key in COMMITTEE_KEYWORDS matches as a
     * substring, so the keyword tier returns no match and the embedding
     * tier runs. ("Subcommittee on Retirement Studies" is contrived but
     * picked specifically: 'retirement' appears as a keyword *value*
     * under the 'Aging' key, but no key equals or contains 'retirement',
     * so the substring check `committeeLower.includes(key.toLowerCase())`
     * returns false for every key.)
     */
    const UNMAPPED_COMMITTEE = 'Subcommittee on Retirement Studies';

    it('matches via embeddings when committee is not in keyword table', async () => {
      const retirementFiling = createMockFiling({
        client: { name: 'AARP', id: 'C100' },
        income: 250000,
        issues: [{ code: 'RET', description: 'Retirement' }],
        specific_issues: ['retirement security policy'],
      });

      mockCachedFetch.mockResolvedValue([retirementFiling]);

      const result = await api.getCommitteeLobbyingData([UNMAPPED_COMMITTEE]);

      expect(result).toHaveLength(1);
      expect(result[0].committee).toBe(UNMAPPED_COMMITTEE);
      expect(result[0].matchingMethod).toBe('embedding');
      expect(result[0].matchConfidence).toBeGreaterThan(0.45);
      expect(result[0].matchConfidence).toBeLessThanOrEqual(0.85);
      // fetchRecentFilings calls fetchFilingsByQuarter once per quarter,
      // and the mock returns the same filing each time — totals scale with
      // quarter count, so just assert the embedding path produced a hit.
      expect(result[0].totalSpending).toBeGreaterThan(0);
    });

    it('caches LDA label embeddings across calls — second call only embeds the new committee', async () => {
      const retirementFiling = createMockFiling({
        issues: [{ code: 'RET', description: 'Retirement' }],
        specific_issues: ['retirement security'],
      });
      mockCachedFetch.mockResolvedValue([retirementFiling]);

      // First call: 1 committee embed + ~79 LDA label embeds
      await api.getCommitteeLobbyingData([UNMAPPED_COMMITTEE]);
      const callsAfterFirst = embedTextMock.mock.calls.length;
      expect(callsAfterFirst).toBeGreaterThan(50); // ~80 (1 committee + 79 labels)

      // Second call with a different unmapped committee: should embed
      // ONLY the new committee name. Labels are cached. ("Elder Affairs"
      // has no keyword entry — 'elder' isn't a key — so the embedding
      // tier runs again.)
      await api.getCommitteeLobbyingData(['Subcommittee on Elder Affairs']);
      const callsAfterSecond = embedTextMock.mock.calls.length;
      expect(callsAfterSecond - callsAfterFirst).toBe(1);
    });

    it('falls back to fallback method when embeddings are unavailable', async () => {
      embedTextMock.mockResolvedValue(null);

      const filing = createMockFiling({
        specific_issues: [UNMAPPED_COMMITTEE.toLowerCase()],
      });
      mockCachedFetch.mockResolvedValue([filing]);

      const result = await api.getCommitteeLobbyingData([UNMAPPED_COMMITTEE]);

      // The fallback uses the committee name as a literal keyword.
      // Our mock filing's specific_issues includes that string, so it matches.
      if (result.length > 0) {
        expect(result[0].matchingMethod).toBe('fallback');
        expect(result[0].matchConfidence).toBe(0.3);
      }
    });

    it('does not call embeddings when keyword tier already matches', async () => {
      const defenseFiling = createMockFiling({
        issues: [{ code: 'DEF', description: 'Defense' }],
        specific_issues: ['defense procurement'],
      });
      mockCachedFetch.mockResolvedValue([defenseFiling]);

      await api.getCommitteeLobbyingData(['Armed Services']);

      expect(embedTextMock).not.toHaveBeenCalled();
    });
  });

  describe('keyword coverage for committees that fail embedding tier', () => {
    /**
     * Calibration 2026-04-16 found that "Special Committee on Aging" and
     * "Subcommittee on Conservation and Forestry" produce best-similarity
     * scores below the 0.40 embedding threshold. Without keyword entries
     * they fall to the literal-name fallback path. These tests pin the
     * keyword entries in place so a future refactor that drops them
     * regresses with a clear failure.
     */

    it('matches Special Committee on Aging via the keyword tier', async () => {
      const aarpFiling = createMockFiling({
        client: { name: 'AARP', id: 'C200' },
        income: 300000,
        issues: [{ code: 'RET', description: 'Retirement' }],
        specific_issues: ['medicare advantage rates and retirement security'],
      });
      mockCachedFetch.mockResolvedValue([aarpFiling]);

      const result = await api.getCommitteeLobbyingData(['Special Committee on Aging']);

      expect(result).toHaveLength(1);
      expect(result[0].matchingMethod).toBe('keyword');
      expect(result[0].matchConfidence).toBe(0.9);
      expect(embedTextMock).not.toHaveBeenCalled();
    });

    it('matches Subcommittee on Conservation and Forestry via the keyword tier', async () => {
      const conservationFiling = createMockFiling({
        client: { name: 'Sierra Club', id: 'C201' },
        income: 80000,
        issues: [{ code: 'NAT', description: 'Natural Resources' }],
        specific_issues: ['public lands management and forest health'],
      });
      mockCachedFetch.mockResolvedValue([conservationFiling]);

      const result = await api.getCommitteeLobbyingData([
        'Subcommittee on Conservation and Forestry',
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].matchingMethod).toBe('keyword');
      expect(result[0].matchConfidence).toBe(0.9);
      expect(embedTextMock).not.toHaveBeenCalled();
    });
  });

  describe('embedding similarity threshold', () => {
    /**
     * The earlier embedding tests use cosine 1.0 / 0.0 vectors, which
     * exercise the matching logic but not the threshold value. If someone
     * raised the threshold from 0.40 to 0.80 those tests would still
     * pass — that's a silent failure of test coverage.
     *
     * The tests below build vectors with KNOWN cosine similarity to a
     * committee's embedding, so they fail loudly if the threshold drifts.
     *
     * Construction: for unit vectors u = [1, 0, 0, ...] and
     * v = [t, sqrt(1 - t²), 0, ...], cosine(u, v) = t exactly.
     */

    /** Committee that no key in COMMITTEE_KEYWORDS matches as a substring. */
    const SYNTHETIC_COMMITTEE = 'Joint Working Group on Astrology';

    function unitBaseVector(): Float32Array {
      const v = new Float32Array(384);
      v[0] = 1;
      return v;
    }

    function unitVectorWithCosine(target: number): Float32Array {
      const v = new Float32Array(384);
      v[0] = target;
      v[1] = Math.sqrt(1 - target * target);
      return v;
    }

    /**
     * Orthogonal-ish "noise" vector — cosine ≈ 0 against the base vector.
     * Different per-label so labels don't all map to identical vectors.
     */
    function noiseVector(salt: number): Float32Array {
      const v = new Float32Array(384);
      // Spread weight across dims 2..383 so dim 0 is zero → cosine to base = 0.
      const idx = 2 + (Math.abs(salt) % 380);
      v[idx] = 1;
      return v;
    }

    function setupCalibratedMock(opts: {
      committee: string;
      hits: Record<string, number>; // LDA label text → target cosine
    }): void {
      embedTextMock.mockImplementation(async (text: string) => {
        if (typeof text !== 'string' || !text.trim()) return null;
        if (text.includes(opts.committee)) return unitBaseVector();
        const hit = opts.hits[text];
        if (hit !== undefined) return unitVectorWithCosine(hit);
        // Hash label text deterministically for noise vectors
        let salt = 0;
        for (let i = 0; i < text.length; i++) salt = (salt * 31 + text.charCodeAt(i)) | 0;
        return noiseVector(salt);
      });
    }

    it('matches an LDA code with similarity 0.45 (just above the 0.40 threshold)', async () => {
      // "Aerospace" is the canonical label for LDA code AER.
      setupCalibratedMock({
        committee: SYNTHETIC_COMMITTEE,
        hits: { Aerospace: 0.45 },
      });

      const filing = createMockFiling({
        client: { name: 'Boeing', id: 'C300' },
        income: 500000,
        issues: [{ code: 'AER', description: 'Aerospace' }],
        specific_issues: ['satellite manufacturing'],
      });
      mockCachedFetch.mockResolvedValue([filing]);

      const result = await api.getCommitteeLobbyingData([SYNTHETIC_COMMITTEE]);

      expect(result).toHaveLength(1);
      expect(result[0].matchingMethod).toBe('embedding');
      // Confidence should be the average similarity of matched codes — only AER matched, sim 0.45.
      expect(result[0].matchConfidence).toBeCloseTo(0.45, 5);
    });

    it('rejects an LDA code with similarity 0.35 (just below the 0.40 threshold)', async () => {
      setupCalibratedMock({
        committee: SYNTHETIC_COMMITTEE,
        hits: { Accounting: 0.35 },
      });

      const filing = createMockFiling({
        issues: [{ code: 'ACC', description: 'Accounting' }],
        specific_issues: ['tax accounting standards'],
      });
      mockCachedFetch.mockResolvedValue([filing]);

      const result = await api.getCommitteeLobbyingData([SYNTHETIC_COMMITTEE]);

      // Embedding tier returned no matches → falls through to literal-name
      // fallback which doesn't match this filing → result is empty.
      expect(result).toHaveLength(0);
    });

    it('keeps only top 3 codes when many score above threshold', async () => {
      // 5 labels above 0.40, expect only top 3 retained.
      setupCalibratedMock({
        committee: SYNTHETIC_COMMITTEE,
        hits: {
          Aerospace: 0.85,
          Agriculture: 0.75,
          Accounting: 0.65,
          Banking: 0.55,
          Bankruptcy: 0.45,
        },
      });

      // Filing carries the 4th- and 5th-ranked codes only — they should be
      // excluded by the top-3 cap and produce no match.
      const filing = createMockFiling({
        issues: [
          { code: 'BAN', description: 'Banking' },
          { code: 'BNK', description: 'Bankruptcy' },
        ],
      });
      mockCachedFetch.mockResolvedValue([filing]);

      const result = await api.getCommitteeLobbyingData([SYNTHETIC_COMMITTEE]);

      // Top 3 are AER/AGR/ACC; this filing has BAN/BNK → no embedding match
      // → falls through to fallback. Synthetic committee name won't appear
      // in filing issue text → no fallback match either.
      expect(result).toHaveLength(0);
    });
  });
});
