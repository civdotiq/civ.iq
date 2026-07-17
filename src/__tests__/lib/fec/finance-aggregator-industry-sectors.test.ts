/**
 * Tests for getTopIndustrySectorsFromAggregates — the pure, network-free helper
 * that turns FEC's pre-aggregated by_employer + by_occupation totals into a
 * sector/category industry breakdown. Uses the REAL entity-resolution taxonomy;
 * only the FEC service module is mocked so importing the aggregator has no side
 * effects.
 */

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

jest.mock('@/lib/fec/fec-api-service', () => ({
  fecApiService: {},
  FECContribution: {},
}));

import { getTopIndustrySectorsFromAggregates } from '@/lib/fec/finance-aggregator';

describe('getTopIndustrySectorsFromAggregates', () => {
  it('categorizes informative employers into sectors with exact percentage math', () => {
    const byEmployer = [
      { employer: 'LOCKHEED MARTIN', total: 500_000, count: 200 },
      { employer: 'GOLDMAN SACHS', total: 300_000, count: 120 },
      { employer: 'JOHNS HOPKINS HOSPITAL', total: 200_000, count: 80 },
    ];

    const result = getTopIndustrySectorsFromAggregates(byEmployer, [], 10);

    const sectors = result.map(r => r.sector);
    expect(sectors).toContain('Defense');
    expect(sectors).toContain('Finance/Insurance/Real Estate');
    expect(sectors).toContain('Health');

    // Sorted by amount desc → Defense (500k) first.
    expect(result[0]?.sector).toBe('Defense');
    expect(result[0]?.amount).toBe(500_000);
    expect(result[0]?.contributionCount).toBe(200);
    // Percentage over ALL categorized dollars: 500k / 1,000,000 = 50%.
    expect(result[0]?.percentage).toBeCloseTo(50, 5);

    // Each bucket carries a non-empty category alongside its sector.
    expect(result[0]?.category).toBeTruthy();

    // Percentages sum to 100 (no residual in this scenario).
    const totalPct = result.reduce((s, r) => s + r.percentage, 0);
    expect(totalPct).toBeCloseTo(100, 5);
  });

  it('buckets the non-informative-employer residual into "Unaffiliated / Non-employed" when no occupation signal exists', () => {
    const byEmployer = [
      { employer: 'N/A', total: 2_000_000, count: 50_000 },
      { employer: 'RETIRED', total: 500_000, count: 20_000 },
      { employer: 'LOCKHEED MARTIN', total: 100_000, count: 50 },
    ];

    const result = getTopIndustrySectorsFromAggregates(byEmployer, [], 10);

    const residual = result.find(r => r.sector === 'Unaffiliated / Non-employed');
    expect(residual).toBeDefined();
    expect(residual!.amount).toBe(2_500_000);
    expect(residual!.contributionCount).toBe(70_000);

    const defense = result.find(r => r.sector === 'Defense');
    expect(defense?.amount).toBe(100_000);

    // Denominator = all categorized dollars incl. residual (2.6M).
    expect(defense?.percentage).toBeCloseTo((100_000 / 2_600_000) * 100, 5);
  });

  it('recovers the "extra" occupation signal from blank-employer rows into industries', () => {
    // $100k LOCKHEED (informative) + $2.9M N/A. Occupation shows $2M RETIRED +
    // $800k ATTORNEY + $100k ENGINEER. Informative-occupation total ($900k)
    // exceeds informative-employer total ($100k) by $800k → that extra signal is
    // distributed proportionally across ATTORNEY + ENGINEER.
    const byEmployer = [
      { employer: 'LOCKHEED MARTIN', total: 100_000, count: 50 },
      { employer: 'N/A', total: 2_900_000, count: 60_000 },
    ];
    const byOccupation = [
      { occupation: 'RETIRED', total: 2_000_000, count: 50_000 },
      { occupation: 'ATTORNEY', total: 800_000, count: 4_000 },
      { occupation: 'ENGINEER', total: 100_000, count: 200 },
    ];

    const result = getTopIndustrySectorsFromAggregates(byEmployer, byOccupation, 10);
    const bySector = Object.fromEntries(result.map(r => [r.sector, r]));

    // Defense keeps its direct employer attribution.
    expect(bySector['Defense']?.amount).toBe(100_000);

    // Lawyers gets the ATTORNEY share of the $800k extra signal.
    // scale = 800k / 900k → ATTORNEY ≈ 711,111.
    expect(bySector['Lawyers & Lobbyists']?.amount).toBeGreaterThan(700_000);
    expect(bySector['Lawyers & Lobbyists']?.amount).toBeLessThan(720_000);

    // Unrecoverable residual drops from $2.9M to $2.1M.
    expect(bySector['Unaffiliated / Non-employed']?.amount).toBe(2_100_000);

    // Everything still sums to $3M (amounts are unrounded floats).
    const total = result.reduce((s, r) => s + r.amount, 0);
    expect(total).toBeCloseTo(3_000_000, -1);
  });

  it('respects topN slicing and returns rows sorted by amount desc', () => {
    // Four distinct-sector buckets (3 employers + a residual); topN caps at 2.
    const byEmployer = [
      { employer: 'LOCKHEED MARTIN', total: 500_000, count: 200 },
      { employer: 'GOLDMAN SACHS', total: 300_000, count: 120 },
      { employer: 'JOHNS HOPKINS HOSPITAL', total: 200_000, count: 80 },
      { employer: 'N/A', total: 50_000, count: 1_000 },
    ];

    const result = getTopIndustrySectorsFromAggregates(byEmployer, [], 2);

    expect(result).toHaveLength(2);
    // Descending by amount → Defense (500k) then Finance (300k).
    expect(result[0]!.sector).toBe('Defense');
    expect(result[1]!.sector).toBe('Finance/Insurance/Real Estate');
    expect(result[0]!.amount).toBeGreaterThanOrEqual(result[1]!.amount);
  });

  it('returns an empty array when there are no aggregate rows', () => {
    expect(getTopIndustrySectorsFromAggregates([], [], 10)).toEqual([]);
  });
});
