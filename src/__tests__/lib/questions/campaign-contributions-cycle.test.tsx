/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * /ask campaign-contributions: totals come from the current cycle, fall back
 * only when it has no filings (and say so), and an FEC error reads as
 * unavailable rather than as an older cycle's money.
 */

const mockSummary = jest.fn();
const mockAggregate = jest.fn();
// Keys cachedFetch would have written (it skips a write when shouldCache says no).
const mockCacheWrites: string[] = [];

jest.mock('@/lib/cache', () => ({
  cachedFetch: async (
    key: string,
    fetcher: () => Promise<unknown>,
    _ttl?: number,
    shouldCache: (data: unknown) => boolean = () => true
  ) => {
    const data = await fetcher();
    if (shouldCache(data)) mockCacheWrites.push(key);
    return data;
  },
}));
jest.mock('@/lib/fec/fec-api-service', () => ({
  fecApiService: { getFinancialSummary: (...a: unknown[]) => mockSummary(...a) },
}));
jest.mock('@/lib/data/bioguide-fec-mapping', () => ({
  getFECIdFromBioguide: () => 'S0ME00000',
}));
jest.mock('@/lib/fec/finance-aggregator', () => ({
  aggregateFinanceDataFromAggregates: (...a: unknown[]) => mockAggregate(...a),
}));
jest.mock('@/lib/intelligence/analyzers/vote-finance-analyzer', () => ({
  analyzeVoteFinance: async () => null,
}));
jest.mock('@/lib/intelligence/analyzers/lobbying-pipeline-analyzer', () => ({
  analyzeLobbyingPipeline: jest.fn(),
}));
jest.mock('@/services/congress/optimized-congress.service', () => ({
  getComprehensiveBillsByMember: jest.fn(),
}));
jest.mock('@/features/representatives/services/batch-voting-service', () => ({
  batchVotingService: {},
}));
jest.mock('@/lib/services/policy-area-search.service', () => ({ searchPolicyArea: jest.fn() }));
jest.mock('@/lib/services/committee.service', () => ({ getCommitteeDataService: jest.fn() }));
jest.mock('@/lib/services/committee-activity.service', () => ({
  fetchCommitteeActivity: jest.fn(),
}));

import { render, screen } from '@testing-library/react';
import { fetchCampaignContributionsData } from '@/lib/questions/template-data-fetchers';
import { recordTransientFecFailure } from '@/lib/fec/fec-failure-scope';
import { getCurrentElectionCycle } from '@/lib/fec/election-cycle';
import { CampaignContributionsAnswer } from '@/components/questions/CampaignContributionsAnswer';

const CURRENT = getCurrentElectionCycle();
const PRIOR = CURRENT - 2;

function summary(receipts: number) {
  return { receipts, disbursements: 1, last_cash_on_hand_end_period: 1 };
}

function industries(cycle: number) {
  return {
    cycle,
    lastUpdated: '2026-09-24',
    industryBreakdown: [{ industry: 'Technology', amount: 5, percentage: 50, count: 1 }],
  };
}

beforeEach(() => {
  mockCacheWrites.length = 0;
  mockSummary.mockReset();
  mockAggregate
    .mockReset()
    .mockImplementation(async (_id: string, cycle: number) => industries(cycle));
});

describe('fetchCampaignContributionsData', () => {
  test('current cycle with filings → current totals and breakdown', async () => {
    mockSummary.mockImplementation(async (_id: string, cycle: number) =>
      cycle === CURRENT ? summary(16_200_000) : summary(1_600_000)
    );
    const data = await fetchCampaignContributionsData('C001035', 'ME');
    expect(data.finance).toMatchObject({
      totalRaised: 16_200_000,
      cycle: CURRENT,
      isCurrentCycle: true,
    });
    expect(data.industries?.metadata.cycle).toBe(CURRENT);
    expect(data.financeUnavailable).toBe(false);
  });

  test('no current-cycle filings → older cycle, labelled, with a matching breakdown', async () => {
    mockSummary.mockImplementation(async (_id: string, cycle: number) =>
      cycle === PRIOR ? summary(1_600_000) : null
    );
    const data = await fetchCampaignContributionsData('C001035', 'ME');
    expect(data.finance).toMatchObject({ cycle: PRIOR, isCurrentCycle: false });
    expect(data.industries?.metadata.cycle).toBe(PRIOR);
  });

  test('FEC error on the current cycle → unavailable, never the older cycle', async () => {
    mockSummary.mockImplementation(async (_id: string, cycle: number) => {
      if (cycle === CURRENT) throw new Error('FEC API error: 429');
      return summary(1_600_000);
    });
    const data = await fetchCampaignContributionsData('C001035', 'ME');
    expect(data.finance).toBeNull();
    expect(data.financeUnavailable).toBe(true);
    expect(mockCacheWrites.some(k => k.includes(`fec-totals:v1:S0ME00000:${CURRENT}`))).toBe(false);
  });

  test('healthy totals and breakdown are both cached', async () => {
    mockSummary.mockResolvedValue(summary(16_200_000));
    const data = await fetchCampaignContributionsData('C001035', 'ME');
    expect(data.industriesUnavailable).toBe(false);
    expect(mockCacheWrites).toEqual(
      expect.arrayContaining([
        `question:fec-totals:v1:S0ME00000:${CURRENT}`,
        `question:industries:v2:C001035:${CURRENT}`,
      ])
    );
  });

  test('a 429 swallowed inside the breakdown reads unavailable and is not cached', async () => {
    mockSummary.mockResolvedValue(summary(16_200_000));
    // What a lower layer does on a 429: record it, hand back an empty breakdown.
    mockAggregate.mockImplementation(async (_id: string, cycle: number) => {
      recordTransientFecFailure();
      return { ...industries(cycle), industryBreakdown: [] };
    });
    const data = await fetchCampaignContributionsData('C001035', 'ME');
    expect(data.finance).toMatchObject({ totalRaised: 16_200_000 });
    expect(data.industries).toBeNull();
    expect(data.industriesUnavailable).toBe(true);
    expect(mockCacheWrites.some(k => k.startsWith('question:industries:'))).toBe(false);
  });

  test('a thrown breakdown error reads unavailable', async () => {
    mockSummary.mockResolvedValue(summary(16_200_000));
    mockAggregate.mockRejectedValue(new Error('FEC API error: 429'));
    const data = await fetchCampaignContributionsData('C001035', 'ME');
    expect(data.industriesUnavailable).toBe(true);
    expect(mockAggregate).toHaveBeenCalledTimes(1);
  });
});

describe('CampaignContributionsAnswer wording', () => {
  const base = {
    totalRaised: 16_200_000,
    totalSpent: 1,
    cashOnHand: 1,
    individualContributions: 0,
    pacContributions: 0,
    partyContributions: 0,
    candidateSelfFunding: 0,
  };
  const label = (c: number) => `${c - 1}–${String(c).slice(2)}`;

  test('"current cycle" only when the data is the current cycle', () => {
    const { unmount } = render(
      <CampaignContributionsAnswer
        finance={{ ...base, cycle: CURRENT, isCurrentCycle: true }}
        financeUnavailable={false}
        industries={null}
        voteFinanceInsight={null}
      />
    );
    expect(screen.getByText(new RegExp(`current ${label(CURRENT)} election cycle`))).toBeTruthy();
    unmount();

    render(
      <CampaignContributionsAnswer
        finance={{ ...base, cycle: PRIOR, isCurrentCycle: false }}
        financeUnavailable={false}
        industries={null}
        voteFinanceInsight={null}
      />
    );
    expect(
      screen.getByText(new RegExp(`${label(PRIOR)} election cycle, the most recent`))
    ).toBeTruthy();
    expect(screen.queryByText(/current .* election cycle/)).toBeNull();
  });

  test('unavailable says so instead of "not yet available"', () => {
    render(
      <CampaignContributionsAnswer
        finance={null}
        financeUnavailable
        industries={null}
        voteFinanceInsight={null}
      />
    );
    expect(screen.getByText(/temporarily unavailable from the FEC/)).toBeTruthy();
    expect(screen.queryByText(/not yet available/)).toBeNull();
  });

  test('an unreachable breakdown never claims donors listed no employer', () => {
    render(
      <CampaignContributionsAnswer
        finance={{ ...base, cycle: CURRENT, isCurrentCycle: true }}
        financeUnavailable={false}
        industries={null}
        industriesUnavailable
        voteFinanceInsight={null}
      />
    );
    expect(screen.getByText(/industry breakdown is temporarily unavailable/)).toBeTruthy();
    expect(screen.queryByText(/did not list an employer/)).toBeNull();
  });
});
