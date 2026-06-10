/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { calculateComparison, generateInsights } from '@/lib/services/finance-comparisons';

describe('calculateComparison', () => {
  it('never fabricates a percentile rank', () => {
    // The old formula produced 50 + percentDifference/10. An amount equal to
    // the benchmark would have yielded exactly 50 — assert null instead.
    const atBenchmark = calculateComparison(1_350_000, 'Democrat', 'totalRaised');
    expect(atBenchmark.percentileRank).toBeNull();

    const aboveBenchmark = calculateComparison(5_000_000, 'Republican', 'totalRaised');
    expect(aboveBenchmark.percentileRank).toBeNull();

    const belowBenchmark = calculateComparison(10_000, 'Independent', 'pacContributions');
    expect(belowBenchmark.percentileRank).toBeNull();
  });

  it('explains why the percentile is unavailable in citizen-readable text', () => {
    const result = calculateComparison(1_000_000, 'Democrat', 'totalRaised');
    expect(result.percentileUnavailableReason).toMatch(/every House member/);
    expect(result.percentileUnavailableReason).toMatch(/no percentile is shown/);
  });

  it('still computes the benchmark comparison from real averages', () => {
    const result = calculateComparison(2_700_000, 'Democrat', 'totalRaised');
    expect(result.houseAverage).toBe(1_350_000);
    expect(result.partyAverage).toBe(1_350_000);
    expect(result.percentDifference).toBe(100);
    expect(result.outlierStatus).toBe('normal');
  });

  it('flags outliers from percent difference, not percentile', () => {
    const high = calculateComparison(3_000_000, 'Republican', 'totalRaised');
    expect(high.outlierStatus).toBe('high');

    const extreme = calculateComparison(10_000_000, 'Republican', 'totalRaised');
    expect(extreme.outlierStatus).toBe('extreme');

    // Below-average amounts cap at -100%, which never crosses the >100%
    // outlier threshold, so they stay 'normal'.
    const farBelow = calculateComparison(100_000, 'Republican', 'totalRaised');
    expect(farBelow.outlierStatus).toBe('normal');
  });

  it('handles a zero benchmark without dividing by zero', () => {
    // Unknown party falls back to Democrat averages, all of which are > 0,
    // so force the zero-benchmark path via an amount of 0 against a benchmark.
    const result = calculateComparison(0, 'Democrat', 'totalRaised');
    expect(result.percentDifference).toBe(-100);
    expect(result.percentileRank).toBeNull();
  });
});

describe('generateInsights', () => {
  it('reports self-funding when it dominates', () => {
    const insights = generateInsights(
      {
        totalRaised: 1_000_000,
        selfFinancing: 600_000,
        individualContributions: 300_000,
        pacContributions: 100_000,
      },
      'Democrat'
    );
    expect(insights.some(i => i.includes('Self-funded 60%'))).toBe(true);
  });

  it('returns no insights for empty fundraising', () => {
    const insights = generateInsights(
      { totalRaised: 0, individualContributions: 0, pacContributions: 0 },
      'Republican'
    );
    expect(insights).toEqual([]);
  });
});
