/**
 * Tests for aggregateFinanceDataFromAggregates — verifies that the aggregate-
 * endpoint path makes a fixed number of FEC calls regardless of candidate size,
 * categorizes employer aggregates correctly, and handles non-informative
 * employer rows without crashing.
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

const mockGetFinancialSummary = jest.fn();
const mockGetPrincipalCommitteeId = jest.fn();
const mockGetByEmployer = jest.fn();
const mockGetByOccupation = jest.fn();
const mockGetByState = jest.fn();

jest.mock('@/lib/fec/fec-api-service', () => ({
  fecApiService: {
    getFinancialSummary: (...a: unknown[]) => mockGetFinancialSummary(...a),
    getPrincipalCommitteeId: (...a: unknown[]) => mockGetPrincipalCommitteeId(...a),
    getContributionsByEmployer: (...a: unknown[]) => mockGetByEmployer(...a),
    getContributionsByOccupation: (...a: unknown[]) => mockGetByOccupation(...a),
    getContributionsByState: (...a: unknown[]) => mockGetByState(...a),
  },
  FECContribution: {},
}));

import { aggregateFinanceDataFromAggregates } from '@/lib/fec/finance-aggregator';

const FINANCIAL_SUMMARY = {
  total_receipts: 10_000_000,
  receipts: 10_000_000,
  total_disbursements: 9_000_000,
  disbursements: 9_000_000,
  cash_on_hand_end_period: 1_000_000,
  last_cash_on_hand_end_period: 1_000_000,
  individual_contributions: 7_500_000,
  other_political_committee_contributions: 2_000_000,
  political_party_committee_contributions: 400_000,
  candidate_contribution: 100_000,
};

describe('aggregateFinanceDataFromAggregates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFinancialSummary.mockResolvedValue(FINANCIAL_SUMMARY);
    mockGetPrincipalCommitteeId.mockResolvedValue('C00213512');
    mockGetByEmployer.mockResolvedValue([]);
    mockGetByOccupation.mockResolvedValue([]);
    mockGetByState.mockResolvedValue([]);
  });

  it('makes exactly 5 FEC calls regardless of candidate size', async () => {
    mockGetByEmployer.mockResolvedValue(
      Array.from({ length: 100 }, (_, i) => ({
        employer: `COMPANY ${i}`,
        total: 10_000 - i * 10,
        count: 50,
      }))
    );

    await aggregateFinanceDataFromAggregates('H8CA05035', 2024, 'CA');

    expect(mockGetFinancialSummary).toHaveBeenCalledTimes(1);
    expect(mockGetPrincipalCommitteeId).toHaveBeenCalledTimes(1);
    expect(mockGetByEmployer).toHaveBeenCalledTimes(1);
    expect(mockGetByOccupation).toHaveBeenCalledTimes(1);
    expect(mockGetByState).toHaveBeenCalledTimes(1);
  });

  it('returns null when financial summary is missing', async () => {
    mockGetFinancialSummary.mockResolvedValue(null);

    const result = await aggregateFinanceDataFromAggregates('H8CA05035', 2024, 'CA');

    expect(result).toBeNull();
  });

  it('categorizes informative employer rows into industry sectors', async () => {
    mockGetByEmployer.mockResolvedValue([
      { employer: 'LOCKHEED MARTIN', total: 500_000, count: 200 },
      { employer: 'GOLDMAN SACHS', total: 300_000, count: 120 },
      { employer: 'JOHNS HOPKINS HOSPITAL', total: 200_000, count: 80 },
    ]);
    mockGetByState.mockResolvedValue([
      { state: 'CA', stateFull: 'California', total: 600_000, count: 250 },
      { state: 'NY', stateFull: 'New York', total: 400_000, count: 150 },
    ]);

    const result = await aggregateFinanceDataFromAggregates('H8CA05035', 2024, 'CA');

    expect(result).not.toBeNull();
    const sectors = result!.industryBreakdown.map(b => b.industry);
    expect(sectors).toContain('Defense');
    expect(sectors).toContain('Finance/Insurance/Real Estate');
    expect(sectors).toContain('Health');

    const defense = result!.industryBreakdown.find(b => b.industry === 'Defense');
    expect(defense?.amount).toBe(500_000);
    expect(defense?.topEmployers[0]?.name).toBe('LOCKHEED MARTIN');
  });

  it('buckets non-informative employers into "Unaffiliated / Non-employed" when no occupation signal is available', async () => {
    mockGetByEmployer.mockResolvedValue([
      { employer: 'N/A', total: 2_000_000, count: 50_000 },
      { employer: 'RETIRED', total: 500_000, count: 20_000 },
      { employer: 'SELF-EMPLOYED', total: 300_000, count: 5_000 },
      { employer: 'LOCKHEED MARTIN', total: 100_000, count: 50 },
    ]);
    // No occupation data → no extra-signal redistribution.
    mockGetByOccupation.mockResolvedValue([]);

    const result = await aggregateFinanceDataFromAggregates('H8CA05035', 2024, 'CA');

    const unaffiliated = result!.industryBreakdown.find(
      b => b.industry === 'Unaffiliated / Non-employed'
    );
    expect(unaffiliated).toBeDefined();
    expect(unaffiliated!.amount).toBe(2_800_000);
    expect(unaffiliated!.count).toBe(75_000);

    expect(result!.dataQuality.industry.totalContributionsAnalyzed).toBe(75_050);
    expect(result!.dataQuality.industry.contributionsWithEmployer).toBe(50);
  });

  it('redistributes the "extra" occupation signal from non-informative-employer rows into industries', async () => {
    // Scenario: $3M total. $100k from LOCKHEED (informative employer). $2.9M
    // from N/A employer. Occupation data shows $2M RETIRED + $800k ATTORNEY +
    // $100k ENGINEER. Informative-occupation total ($900k) exceeds
    // informative-employer total ($100k) by $800k. That $800k is the "extra
    // signal" from non-informative-employer donors who listed an occupation,
    // distributed proportionally across ATTORNEY and ENGINEER.
    mockGetByEmployer.mockResolvedValue([
      { employer: 'LOCKHEED MARTIN', total: 100_000, count: 50 },
      { employer: 'N/A', total: 2_900_000, count: 60_000 },
    ]);
    mockGetByOccupation.mockResolvedValue([
      { occupation: 'RETIRED', total: 2_000_000, count: 50_000 },
      { occupation: 'ATTORNEY', total: 800_000, count: 4_000 },
      { occupation: 'ENGINEER', total: 100_000, count: 200 },
    ]);

    const result = await aggregateFinanceDataFromAggregates('H8CA05035', 2024, 'CA');
    const byIndustry = Object.fromEntries(result!.industryBreakdown.map(b => [b.industry, b]));

    // Defense still gets its direct employer attribution.
    expect(byIndustry['Defense']?.amount).toBe(100_000);

    // Legal gets the ATTORNEY share of the $800k extra signal.
    // scale = 800_000 / 900_000; ATTORNEY share = 800_000 * scale ≈ 711_111.
    expect(byIndustry['Lawyers & Lobbyists']?.amount).toBeGreaterThan(700_000);
    expect(byIndustry['Lawyers & Lobbyists']?.amount).toBeLessThan(720_000);
    expect(byIndustry['Lawyers & Lobbyists']?.topEmployers[0]?.name).toBe(
      '(via occupation: ATTORNEY)'
    );

    // Residual (unrecoverable) drops from $2.9M to $2.9M - $800k = $2.1M.
    const unaffiliated = byIndustry['Unaffiliated / Non-employed'];
    expect(unaffiliated?.amount).toBe(2_100_000);

    // Accounting: industries should sum to $3M (within rounding).
    const total = result!.industryBreakdown.reduce((s, b) => s + b.amount, 0);
    expect(total).toBeCloseTo(3_000_000, -1);
  });

  it('flags isHomeState for the representative state', async () => {
    mockGetByState.mockResolvedValue([
      { state: 'CA', stateFull: 'California', total: 600_000, count: 250 },
      { state: 'NY', stateFull: 'New York', total: 400_000, count: 150 },
      { state: 'TX', stateFull: 'Texas', total: 200_000, count: 80 },
    ]);

    const result = await aggregateFinanceDataFromAggregates('H8CA05035', 2024, 'CA');

    const california = result!.geographicBreakdown.find(b => b.state === 'CA');
    const newYork = result!.geographicBreakdown.find(b => b.state === 'NY');
    expect(california?.isHomeState).toBe(true);
    expect(newYork?.isHomeState).toBe(false);
  });

  it('returns high confidence when aggregates are non-empty, low when empty', async () => {
    mockGetByEmployer.mockResolvedValue([{ employer: 'ACME', total: 1_000, count: 1 }]);
    let result = await aggregateFinanceDataFromAggregates('H8CA05035', 2024, 'CA');
    expect(result!.dataQuality.overallDataConfidence).toBe('high');

    mockGetByEmployer.mockResolvedValue([]);
    mockGetByState.mockResolvedValue([]);
    result = await aggregateFinanceDataFromAggregates('H8CA05035', 2024, 'CA');
    expect(result!.dataQuality.overallDataConfidence).toBe('low');
  });

  it('links contributions source URL to the by_employer aggregate endpoint', async () => {
    mockGetPrincipalCommitteeId.mockResolvedValue('C00213512');
    mockGetByEmployer.mockResolvedValue([{ employer: 'ACME', total: 1_000, count: 1 }]);

    const result = await aggregateFinanceDataFromAggregates('H8CA05035', 2024, 'CA');

    expect(result!.fecDataSources.contributions).toContain('by_employer');
    expect(result!.fecDataSources.contributions).toContain('committee_id=C00213512');
  });
});
