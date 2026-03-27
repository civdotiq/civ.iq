/**
 * Tests for signal taxonomy: classifySignal() and SourceCollector
 *
 * These test the signal classification and source collection utilities
 * from the intelligence shared module. We mock heavy transitive deps
 * (AI provider, Redis) to avoid Node.js environment issues in test.
 */

// Mock heavy transitive dependencies
jest.mock('@/lib/ai/provider', () => ({}));
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: jest.fn(() => null),
}));

import { classifySignal, SourceCollector } from '@/lib/intelligence/analyzers/shared';

describe('classifySignal', () => {
  it('returns alert when hasAnomaly is true', () => {
    expect(classifySignal({ confidence: 0.3, hasAnomaly: true })).toBe('alert');
  });

  it('returns alert when percentileRank >= 90', () => {
    expect(classifySignal({ confidence: 0.8, percentileRank: 95 })).toBe('alert');
  });

  it('returns alert when percentileRank <= 10', () => {
    expect(classifySignal({ confidence: 0.8, percentileRank: 5 })).toBe('alert');
  });

  it('returns alert when value >= 2x peer average', () => {
    expect(classifySignal({ confidence: 0.8, value: 0.8, peerAverage: 0.35 })).toBe('alert');
  });

  it('returns alert for volatile trend', () => {
    expect(classifySignal({ confidence: 0.6, trend: 'volatile' })).toBe('alert');
  });

  it('returns pattern for high confidence without anomaly', () => {
    expect(classifySignal({ confidence: 0.75 })).toBe('pattern');
  });

  it('returns tracking for moderate confidence', () => {
    expect(classifySignal({ confidence: 0.55 })).toBe('tracking');
  });

  it('returns baseline for low confidence', () => {
    expect(classifySignal({ confidence: 0.3 })).toBe('baseline');
  });

  it('does not alert when value < 2x peer average', () => {
    expect(classifySignal({ confidence: 0.8, value: 0.5, peerAverage: 0.35 })).toBe('pattern');
  });

  it('handles zero peer average without division error', () => {
    expect(classifySignal({ confidence: 0.8, value: 0.5, peerAverage: 0 })).toBe('pattern');
  });

  it('prioritizes hasAnomaly over percentileRank', () => {
    expect(classifySignal({ confidence: 0.3, hasAnomaly: true, percentileRank: 50 })).toBe('alert');
  });

  it('stable trend with moderate confidence returns tracking', () => {
    expect(classifySignal({ confidence: 0.55, trend: 'stable' })).toBe('tracking');
  });

  it('increasing trend with high confidence returns pattern', () => {
    expect(classifySignal({ confidence: 0.75, trend: 'increasing' })).toBe('pattern');
  });
});

describe('SourceCollector', () => {
  it('collects sources', () => {
    const sc = new SourceCollector();
    sc.add('FEC filings', 'Q3-Q4 2025', 847);
    sc.add('Congress.gov', '119th Congress');

    const sources = sc.toSources();
    expect(sources).toHaveLength(2);
    expect(sources[0]).toEqual({
      name: 'FEC filings',
      period: 'Q3-Q4 2025',
      recordCount: 847,
    });
    expect(sources[1]).toEqual({
      name: 'Congress.gov',
      period: '119th Congress',
    });
  });

  it('deduplicates by name', () => {
    const sc = new SourceCollector();
    sc.add('FEC filings', 'Q3 2025', 400);
    sc.add('FEC filings', 'Q3-Q4 2025', 847);

    const sources = sc.toSources();
    expect(sources).toHaveLength(1);
    expect(sources[0]!.period).toBe('Q3-Q4 2025');
    expect(sources[0]!.recordCount).toBe(847);
  });

  it('reports correct count', () => {
    const sc = new SourceCollector();
    expect(sc.count).toBe(0);
    sc.add('FEC filings', '2025');
    expect(sc.count).toBe(1);
    sc.add('Congress.gov', '119th');
    expect(sc.count).toBe(2);
    // Duplicate doesn't increase count
    sc.add('FEC filings', '2025-2026');
    expect(sc.count).toBe(2);
  });

  it('returns a copy, not a reference', () => {
    const sc = new SourceCollector();
    sc.add('FEC', '2025');
    const a = sc.toSources();
    const b = sc.toSources();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('handles recordCount of zero', () => {
    const sc = new SourceCollector();
    sc.add('Empty source', '2025', 0);
    expect(sc.toSources()[0]!.recordCount).toBe(0);
  });
});
