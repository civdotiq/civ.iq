/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for @civiq/civic-statistics package.
 * All pure functions — no mocks needed.
 */

import {
  correlation,
  peerComparison,
  confidenceScore,
  meetsSampleSize,
  MIN_VOTES_PER_SECTOR,
  MIN_QUARTERS_TEMPORAL,
  MIN_TRADES_STOCK,
  MIN_FILINGS_LOBBYING,
  MIN_PAC_RECIPIENTS,
  MIN_RELEVANT_VOTES,
  MIN_PEERS,
} from '@civiq/civic-statistics';

describe('civic-statistics package', () => {
  // ── Constants ───────────────────────────────────────────────────

  describe('MIN_* constants', () => {
    it('has expected minimum values', () => {
      expect(MIN_VOTES_PER_SECTOR).toBe(10);
      expect(MIN_QUARTERS_TEMPORAL).toBe(4);
      expect(MIN_TRADES_STOCK).toBe(3);
      expect(MIN_FILINGS_LOBBYING).toBe(5);
      expect(MIN_PAC_RECIPIENTS).toBe(3);
      expect(MIN_RELEVANT_VOTES).toBe(3);
      expect(MIN_PEERS).toBe(5);
    });
  });

  // ── confidenceScore ─────────────────────────────────────────────

  describe('confidenceScore', () => {
    it('returns 0 for zero inputs', () => {
      const score = confidenceScore({
        sampleSize: 0,
        minimumSampleSize: 10,
        dataCompleteness: 0,
        peerCount: 0,
      });
      expect(score).toBe(0);
    });

    it('follows weighted formula: 50% sample + 30% completeness + 20% peer', () => {
      // sampleFactor = min(30 / (10*3), 1) = 1
      // completenessFactor = 1
      // peerFactor = min(20/20, 1) = 1
      // score = 1*0.5 + 1*0.3 + 1*0.2 = 1.0
      const score = confidenceScore({
        sampleSize: 30,
        minimumSampleSize: 10,
        dataCompleteness: 1,
        peerCount: 20,
      });
      expect(score).toBe(1);
    });

    it('caps at 1.0', () => {
      const score = confidenceScore({
        sampleSize: 1000,
        minimumSampleSize: 1,
        dataCompleteness: 1,
        peerCount: 100,
      });
      expect(score).toBeLessThanOrEqual(1);
    });

    it('scales with sample size (maxes at 3x minimum)', () => {
      const low = confidenceScore({
        sampleSize: 3,
        minimumSampleSize: 10,
        dataCompleteness: 0.5,
        peerCount: 0,
      });
      const high = confidenceScore({
        sampleSize: 30,
        minimumSampleSize: 10,
        dataCompleteness: 0.5,
        peerCount: 0,
      });
      expect(high).toBeGreaterThan(low);
    });

    it('returns number between 0 and 1', () => {
      const score = confidenceScore({
        sampleSize: 5,
        minimumSampleSize: 10,
        dataCompleteness: 0.6,
        peerCount: 2,
      });
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('clamps dataCompleteness to 0-1', () => {
      const score = confidenceScore({
        sampleSize: 10,
        minimumSampleSize: 10,
        dataCompleteness: 1.5,
        peerCount: 5,
      });
      // completeness is clamped to 1.0
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  // ── peerComparison ──────────────────────────────────────────────

  describe('peerComparison', () => {
    it('returns null when fewer than 2 peers', () => {
      const result = peerComparison(0.5, [0.3], 'test peers');
      expect(result).toBeNull();
    });

    it('returns result with lowPeerCount flag for 2-4 peers', () => {
      const result = peerComparison(0.7, [0.3, 0.5, 0.6], 'committee peers');
      expect(result).not.toBeNull();
      expect(result!.value).toBe(0.7);
      expect(result!.peerCount).toBe(3);
      expect(result!.peerGroupLabel).toBe('committee peers');
      expect(result!.peerAverage).toBeCloseTo(0.4667, 3);
      expect(result!.percentileRank).toBeGreaterThanOrEqual(0);
      expect(result!.percentileRank).toBeLessThanOrEqual(100);
      expect(result!.lowPeerCount).toBe(true);
    });

    it('returns valid comparison with enough peers (>= MIN_PEERS)', () => {
      const result = peerComparison(0.7, [0.3, 0.4, 0.5, 0.6, 0.8], 'committee peers');
      expect(result).not.toBeNull();
      expect(result!.value).toBe(0.7);
      expect(result!.peerCount).toBe(5);
      expect(result!.lowPeerCount).toBeUndefined();
    });

    it('computes percentile rank correctly', () => {
      // Value is highest → should be high percentile
      const result = peerComparison(1.0, [0.1, 0.2, 0.3, 0.4, 0.5], 'test');
      expect(result!.percentileRank).toBe(100);
    });

    it('computes percentile rank for lowest value', () => {
      const result = peerComparison(0.0, [0.5, 0.6, 0.7, 0.8, 0.9], 'test');
      expect(result!.percentileRank).toBe(0);
    });

    it('handles ties in peer group', () => {
      const result = peerComparison(0.5, [0.5, 0.5, 0.5, 0.5, 0.5], 'test');
      expect(result).not.toBeNull();
      expect(result!.peerAverage).toBe(0.5);
    });
  });

  // ── correlation ─────────────────────────────────────────────────

  describe('correlation', () => {
    it('returns null for insufficient data', () => {
      const result = correlation([1, 2], [3, 4]);
      expect(result).toBeNull();
    });

    it('returns null for mismatched array lengths', () => {
      const result = correlation([1, 2, 3], [4, 5], { minimumSampleSize: 2 });
      expect(result).toBeNull();
    });

    it('defaults to Spearman rank correlation', () => {
      const x = Array.from({ length: 10 }, (_, i) => i);
      const y = Array.from({ length: 10 }, (_, i) => i * 2 + 1);
      const result = correlation(x, y);
      expect(result).not.toBeNull();
      expect(result!.method).toBe('spearman');
      expect(result!.coefficient).toBeCloseTo(1, 2);
    });

    it('supports Pearson option', () => {
      const x = Array.from({ length: 10 }, (_, i) => i);
      const y = Array.from({ length: 10 }, (_, i) => i * 3);
      const result = correlation(x, y, { method: 'pearson' });
      expect(result).not.toBeNull();
      expect(result!.method).toBe('pearson');
      expect(result!.coefficient).toBeCloseTo(1, 2);
    });

    it('respects custom minimumSampleSize', () => {
      const x = [1, 2, 3];
      const y = [4, 5, 6];
      const result = correlation(x, y, { minimumSampleSize: 3 });
      expect(result).not.toBeNull();
      expect(result!.meetsMinimum).toBe(true);
    });

    it('returns null for zero variance', () => {
      const x = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
      const y = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = correlation(x, y);
      expect(result).toBeNull();
    });

    it('detects negative correlation', () => {
      const x = Array.from({ length: 10 }, (_, i) => i);
      const y = Array.from({ length: 10 }, (_, i) => 10 - i);
      const result = correlation(x, y);
      expect(result).not.toBeNull();
      expect(result!.coefficient).toBeCloseTo(-1, 2);
    });
  });

  // ── meetsSampleSize ─────────────────────────────────────────────

  describe('meetsSampleSize', () => {
    it('enforces votes threshold', () => {
      expect(meetsSampleSize(10, 'votes')).toBe(true);
      expect(meetsSampleSize(9, 'votes')).toBe(false);
    });

    it('enforces quarters threshold', () => {
      expect(meetsSampleSize(4, 'quarters')).toBe(true);
      expect(meetsSampleSize(3, 'quarters')).toBe(false);
    });

    it('enforces trades threshold', () => {
      expect(meetsSampleSize(3, 'trades')).toBe(true);
      expect(meetsSampleSize(2, 'trades')).toBe(false);
    });

    it('enforces peers threshold', () => {
      expect(meetsSampleSize(5, 'peers')).toBe(true);
      expect(meetsSampleSize(4, 'peers')).toBe(false);
    });

    it('enforces filings threshold', () => {
      expect(meetsSampleSize(5, 'filings')).toBe(true);
      expect(meetsSampleSize(4, 'filings')).toBe(false);
    });

    it('enforces recipients threshold', () => {
      expect(meetsSampleSize(3, 'recipients')).toBe(true);
      expect(meetsSampleSize(2, 'recipients')).toBe(false);
    });
  });
});
