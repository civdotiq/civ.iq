import { describe, it, expect } from 'vitest';
import {
  correlation,
  peerComparison,
  peerComparisonWithAnomalies,
  confidenceScore,
  meetsSampleSize,
  mean,
  sampleStandardDeviation,
  MIN_VOTES_PER_SECTOR,
  MIN_QUARTERS_TEMPORAL,
  MIN_TRADES_STOCK,
  MIN_FILINGS_LOBBYING,
  MIN_PAC_RECIPIENTS,
  MIN_RELEVANT_VOTES,
  MIN_PEERS,
} from '../src/index';

// ── Constants ────────────────────────────────────────────────────────

describe('constants', () => {
  it('exports minimum sample sizes', () => {
    expect(MIN_VOTES_PER_SECTOR).toBe(10);
    expect(MIN_QUARTERS_TEMPORAL).toBe(4);
    expect(MIN_TRADES_STOCK).toBe(3);
    expect(MIN_FILINGS_LOBBYING).toBe(5);
    expect(MIN_PAC_RECIPIENTS).toBe(3);
    expect(MIN_RELEVANT_VOTES).toBe(3);
    expect(MIN_PEERS).toBe(5);
  });
});

// ── correlation() ────────────────────────────────────────────────────

describe('correlation', () => {
  it('defaults to Spearman rank correlation', () => {
    const x = Array.from({ length: 12 }, (_, i) => i);
    const y = Array.from({ length: 12 }, (_, i) => i * 2);
    const result = correlation(x, y);
    expect(result).not.toBeNull();
    expect(result!.method).toBe('spearman');
    expect(result!.coefficient).toBeCloseTo(1.0, 2);
    expect(result!.sampleSize).toBe(12);
    expect(result!.meetsMinimum).toBe(true);
  });

  it('computes Pearson when specified', () => {
    const x = Array.from({ length: 12 }, (_, i) => i);
    const y = Array.from({ length: 12 }, (_, i) => i * 3 + 1);
    const result = correlation(x, y, { method: 'pearson' });
    expect(result).not.toBeNull();
    expect(result!.method).toBe('pearson');
    expect(result!.coefficient).toBeCloseTo(1.0, 2);
  });

  it('returns null below minimum sample size', () => {
    expect(correlation([1, 2, 3], [4, 5, 6])).toBeNull();
  });

  it('respects custom minimum sample size', () => {
    const result = correlation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10], { minimumSampleSize: 3 });
    expect(result).not.toBeNull();
    expect(result!.meetsMinimum).toBe(true);
  });

  it('returns null for mismatched lengths', () => {
    expect(
      correlation(
        Array.from({ length: 12 }, (_, i) => i),
        Array.from({ length: 10 }, (_, i) => i)
      )
    ).toBeNull();
  });

  it('returns null for zero variance in x', () => {
    expect(
      correlation(
        Array.from({ length: 12 }, () => 5),
        Array.from({ length: 12 }, (_, i) => i)
      )
    ).toBeNull();
  });

  it('returns null for zero variance in y', () => {
    expect(
      correlation(
        Array.from({ length: 12 }, (_, i) => i),
        Array.from({ length: 12 }, () => 5)
      )
    ).toBeNull();
  });

  it('detects negative correlation', () => {
    const x = Array.from({ length: 12 }, (_, i) => i);
    const y = Array.from({ length: 12 }, (_, i) => 12 - i);
    const result = correlation(x, y);
    expect(result).not.toBeNull();
    expect(result!.coefficient).toBeCloseTo(-1.0, 2);
  });

  it('returns low coefficient for uncorrelated data', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const y = [6, 1, 8, 3, 10, 5, 12, 7, 2, 9, 4, 11];
    const result = correlation(x, y);
    expect(result).not.toBeNull();
    expect(Math.abs(result!.coefficient)).toBeLessThan(0.5);
  });
});

// ── peerComparison() ─────────────────────────────────────────────────

describe('peerComparison', () => {
  it('returns percentile rank, average, and count', () => {
    const peers = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const result = peerComparison(75, peers, 'test group');
    expect(result).not.toBeNull();
    expect(result!.value).toBe(75);
    expect(result!.peerAverage).toBe(55);
    expect(result!.peerCount).toBe(10);
    expect(result!.peerGroupLabel).toBe('test group');
    expect(result!.percentileRank).toBeGreaterThan(50);
    expect(result!.lowPeerCount).toBeUndefined();
  });

  it('returns null for fewer than 2 peers', () => {
    expect(peerComparison(50, [60], 'too small')).toBeNull();
    expect(peerComparison(50, [], 'empty')).toBeNull();
  });

  it('flags low peer count when below MIN_PEERS but >= 2', () => {
    const result = peerComparison(50, [40, 60, 70], 'small group');
    expect(result).not.toBeNull();
    expect(result!.lowPeerCount).toBe(true);
    expect(result!.peerCount).toBe(3);
  });

  it('omits lowPeerCount flag when >= MIN_PEERS', () => {
    const result = peerComparison(35, [10, 20, 30, 40, 50], 'adequate group');
    expect(result).not.toBeNull();
    expect(result!.lowPeerCount).toBeUndefined();
  });

  it('returns 0 percentile when below all peers', () => {
    const result = peerComparison(1, [10, 20, 30, 40, 50], 'group');
    expect(result).not.toBeNull();
    expect(result!.percentileRank).toBe(0);
  });

  it('returns 100 percentile when above all peers', () => {
    const result = peerComparison(100, [10, 20, 30, 40, 50], 'group');
    expect(result).not.toBeNull();
    expect(result!.percentileRank).toBe(100);
  });
});

// ── confidenceScore() ────────────────────────────────────────────────

describe('confidenceScore', () => {
  it('returns 0 when all factors are zero', () => {
    expect(
      confidenceScore({
        sampleSize: 0,
        minimumSampleSize: 10,
        dataCompleteness: 0,
        peerCount: 0,
      })
    ).toBe(0);
  });

  it('returns 1.0 when all factors are maxed', () => {
    expect(
      confidenceScore({
        sampleSize: 100,
        minimumSampleSize: 10,
        dataCompleteness: 1.0,
        peerCount: 50,
      })
    ).toBe(1.0);
  });

  it('weights sample size at 50%', () => {
    expect(
      confidenceScore({
        sampleSize: 30,
        minimumSampleSize: 10,
        dataCompleteness: 0,
        peerCount: 0,
      })
    ).toBe(0.5);
  });

  it('weights data completeness at 30%', () => {
    expect(
      confidenceScore({
        sampleSize: 0,
        minimumSampleSize: 10,
        dataCompleteness: 1.0,
        peerCount: 0,
      })
    ).toBe(0.3);
  });

  it('weights peer count at 20%', () => {
    expect(
      confidenceScore({
        sampleSize: 0,
        minimumSampleSize: 10,
        dataCompleteness: 0,
        peerCount: 20,
      })
    ).toBe(0.2);
  });

  it('clamps completeness above 1', () => {
    expect(
      confidenceScore({
        sampleSize: 0,
        minimumSampleSize: 10,
        dataCompleteness: 2.0,
        peerCount: 0,
      })
    ).toBe(0.3);
  });

  it('rounds to 2 decimal places', () => {
    const score = confidenceScore({
      sampleSize: 7,
      minimumSampleSize: 10,
      dataCompleteness: 0.333,
      peerCount: 3,
    });
    const decimals = score.toString().split('.')[1]?.length ?? 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });
});

// ── meetsSampleSize() ────────────────────────────────────────────────

describe('meetsSampleSize', () => {
  it('enforces votes threshold (10)', () => {
    expect(meetsSampleSize(9, 'votes')).toBe(false);
    expect(meetsSampleSize(10, 'votes')).toBe(true);
  });

  it('enforces quarters threshold (4)', () => {
    expect(meetsSampleSize(3, 'quarters')).toBe(false);
    expect(meetsSampleSize(4, 'quarters')).toBe(true);
  });

  it('enforces trades threshold (3)', () => {
    expect(meetsSampleSize(2, 'trades')).toBe(false);
    expect(meetsSampleSize(3, 'trades')).toBe(true);
  });

  it('enforces peers threshold (5)', () => {
    expect(meetsSampleSize(4, 'peers')).toBe(false);
    expect(meetsSampleSize(5, 'peers')).toBe(true);
  });

  it('enforces filings threshold (5)', () => {
    expect(meetsSampleSize(4, 'filings')).toBe(false);
    expect(meetsSampleSize(5, 'filings')).toBe(true);
  });

  it('enforces recipients threshold (3)', () => {
    expect(meetsSampleSize(2, 'recipients')).toBe(false);
    expect(meetsSampleSize(3, 'recipients')).toBe(true);
  });
});

// ── Re-exported utilities ────────────────────────────────────────────

describe('re-exported utilities', () => {
  it('exports mean()', () => {
    expect(mean([10, 20, 30])).toBe(20);
  });

  it('exports sampleStandardDeviation()', () => {
    expect(sampleStandardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.0, 0);
  });
});
