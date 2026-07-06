/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for BillSummaryCache (Redis-backed AI summary cache).
 *
 * Redis is replaced with an in-memory Map so tests exercise the real
 * key layout, TTL selection, hash validation, and index maintenance.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockStore = new Map<string, unknown>();
const mockCache = {
  get: jest.fn(async (key: string) => (mockStore.has(key) ? mockStore.get(key) : null)),
  set: jest.fn(async (key: string, value: unknown, _ttlSeconds?: number) => {
    mockStore.set(key, value);
    return true;
  }),
  delete: jest.fn(async (key: string) => mockStore.delete(key)),
};

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => mockCache,
}));

import { BillSummaryCache } from '@/features/legislation/services/ai/bill-summary-cache';
import type { BillSummary } from '@/features/legislation/services/ai/bill-summarizer';

const DAY = 24 * 60 * 60;

function makeSummary(overrides: Partial<BillSummary> = {}): BillSummary {
  return {
    billId: 'hr-1234-119',
    title: 'Test Bill Act',
    summary: 'A plain-language summary.',
    keyPoints: ['Point one'],
    whoItAffects: ['Everyone'],
    whatItDoes: 'It does a thing.',
    whyItMatters: 'It matters.',
    affectedIndustries: [],
    readingLevel: 7.5,
    confidence: 0.8,
    lastUpdated: '2026-07-01T00:00:00.000Z',
    source: 'ai-generated',
    ...overrides,
  };
}

/** TTL a storeSummary call passed for the main summary key. */
function ttlForKey(key: string): number | undefined {
  const call = mockCache.set.mock.calls.find(([k]) => k === key);
  return call?.[2] as number | undefined;
}

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
});

describe('BillSummaryCache', () => {
  describe('storeSummary / getSummary round-trip', () => {
    it('stores and retrieves a summary by billId', async () => {
      const summary = makeSummary();
      await BillSummaryCache.storeSummary('hr-1234-119', summary, 'hash-1');

      const retrieved = await BillSummaryCache.getSummary('hr-1234-119');
      expect(retrieved).toEqual(summary);
    });

    it('returns null on a cache miss', async () => {
      const retrieved = await BillSummaryCache.getSummary('s-999-119');
      expect(retrieved).toBeNull();
    });

    it('increments accessCount on each retrieval', async () => {
      await BillSummaryCache.storeSummary('hr-1-119', makeSummary(), 'h');
      await BillSummaryCache.getSummary('hr-1-119');
      await BillSummaryCache.getSummary('hr-1-119');

      const metadata = mockStore.get('bill-summary-meta:hr-1-119') as { accessCount: number };
      expect(metadata.accessCount).toBe(2);
    });
  });

  describe('TTL selection', () => {
    it('uses the 30-day TTL for high-confidence summaries', async () => {
      await BillSummaryCache.storeSummary('hr-2-119', makeSummary({ confidence: 0.95 }), 'h');
      expect(ttlForKey('bill-summary:hr-2-119')).toBe(30 * DAY);
    });

    it('uses the 6-hour TTL for high-priority summaries', async () => {
      await BillSummaryCache.storeSummary('hr-3-119', makeSummary({ confidence: 0.8 }), 'h', {
        priority: 'high',
      });
      expect(ttlForKey('bill-summary:hr-3-119')).toBe(6 * 60 * 60);
    });

    it('confidence wins over priority (stable summaries stay cached)', async () => {
      await BillSummaryCache.storeSummary('hr-4-119', makeSummary({ confidence: 0.95 }), 'h', {
        priority: 'high',
      });
      expect(ttlForKey('bill-summary:hr-4-119')).toBe(30 * DAY);
    });

    it('falls back to the 7-day default TTL', async () => {
      await BillSummaryCache.storeSummary('hr-5-119', makeSummary({ confidence: 0.7 }), 'h');
      expect(ttlForKey('bill-summary:hr-5-119')).toBe(7 * DAY);
    });
  });

  describe('isSummaryValid', () => {
    it('is valid while the bill text hash matches', async () => {
      await BillSummaryCache.storeSummary('hr-6-119', makeSummary(), 'hash-abc');
      await expect(BillSummaryCache.isSummaryValid('hr-6-119', 'hash-abc')).resolves.toBe(true);
    });

    it('is invalid once the bill text changes', async () => {
      await BillSummaryCache.storeSummary('hr-6-119', makeSummary(), 'hash-abc');
      await expect(BillSummaryCache.isSummaryValid('hr-6-119', 'hash-XYZ')).resolves.toBe(false);
    });

    it('is invalid when nothing is cached', async () => {
      await expect(BillSummaryCache.isSummaryValid('hr-7-119', 'any')).resolves.toBe(false);
    });
  });

  describe('invalidateSummary', () => {
    it('removes the summary, metadata, hash, and index entry', async () => {
      await BillSummaryCache.storeSummary('hr-8-119', makeSummary(), 'h');
      await BillSummaryCache.invalidateSummary('hr-8-119');

      await expect(BillSummaryCache.getSummary('hr-8-119')).resolves.toBeNull();
      expect(mockStore.has('bill-summary-meta:hr-8-119')).toBe(false);
      expect(mockStore.has('bill-text-hash:hr-8-119')).toBe(false);
      expect(mockStore.get('bill-summary-index')).toEqual([]);
    });
  });

  describe('getBatchSummaries', () => {
    it('returns only the summaries that are cached', async () => {
      await BillSummaryCache.storeSummary('hr-10-119', makeSummary({ billId: 'hr-10-119' }), 'h');
      await BillSummaryCache.storeSummary('hr-11-119', makeSummary({ billId: 'hr-11-119' }), 'h');

      const results = await BillSummaryCache.getBatchSummaries([
        'hr-10-119',
        'hr-11-119',
        'hr-12-119',
      ]);

      expect(results.size).toBe(2);
      expect(results.get('hr-10-119')?.billId).toBe('hr-10-119');
      expect(results.has('hr-12-119')).toBe(false);
    });
  });

  describe('cache index', () => {
    it('tracks stored bills without duplicating entries', async () => {
      await BillSummaryCache.storeSummary('hr-20-119', makeSummary(), 'h1');
      await BillSummaryCache.storeSummary('hr-21-119', makeSummary(), 'h2');
      await BillSummaryCache.storeSummary('hr-20-119', makeSummary(), 'h3'); // re-store

      expect(mockStore.get('bill-summary-index')).toEqual(['hr-20-119', 'hr-21-119']);
    });
  });

  describe('cleanupCache', () => {
    it('removes entries older than maxAge and below minConfidence', async () => {
      await BillSummaryCache.storeSummary('hr-old-119', makeSummary({ confidence: 0.9 }), 'h');
      await BillSummaryCache.storeSummary('hr-weak-119', makeSummary({ confidence: 0.3 }), 'h');
      await BillSummaryCache.storeSummary('hr-good-119', makeSummary({ confidence: 0.9 }), 'h');

      // Age the first entry past the cutoff by editing its stored metadata.
      const oldMeta = mockStore.get('bill-summary-meta:hr-old-119') as { createdAt: string };
      const stale = new Date();
      stale.setDate(stale.getDate() - 60);
      oldMeta.createdAt = stale.toISOString();

      const result = await BillSummaryCache.cleanupCache({ maxAge: 30, minConfidence: 0.5 });

      expect(result).toEqual({ removed: 2, retained: 1 });
      await expect(BillSummaryCache.getSummary('hr-old-119')).resolves.toBeNull();
      await expect(BillSummaryCache.getSummary('hr-weak-119')).resolves.toBeNull();
      await expect(BillSummaryCache.getSummary('hr-good-119')).resolves.not.toBeNull();
    });
  });

  describe('generateTextHash', () => {
    it('is deterministic for identical text', () => {
      expect(BillSummaryCache.generateTextHash('SECTION 1. Short title.')).toBe(
        BillSummaryCache.generateTextHash('SECTION 1. Short title.')
      );
    });

    it('changes when the text changes', () => {
      expect(BillSummaryCache.generateTextHash('version one')).not.toBe(
        BillSummaryCache.generateTextHash('version two')
      );
    });
  });
});
