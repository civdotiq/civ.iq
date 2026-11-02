/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Question page dates (src/lib/questions/question-dates.ts): each template's
 * Latest record is the newest fact its page shows, as the source dates it;
 * Checked is a fetch time saved with the data. Neither is ever the render
 * time, and an unknown date is left out.
 */

const mockCacheSet = jest.fn();
const mockMget = jest.fn();
jest.mock('@/lib/cache', () => ({
  cache: { set: (...args: unknown[]) => mockCacheSet(...args), get: jest.fn() },
}));
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({ mget: (keys: string[]) => mockMget(keys) }),
}));
const mockLegislatorsCheckedAt = jest.fn<Promise<string | null>, []>();
jest.mock('@/features/representatives/services/congress.service', () => ({
  legislatorsFileCheckedAt: () => mockLegislatorsCheckedAt(),
}));
jest.mock('@/lib/committees/committee-dates', () => ({
  getCommitteeDates: jest.fn(async () => ({
    latestRecord: '2026-07-15',
    checkedAt: '2026-11-01T09:02:58Z',
    parts: [],
  })),
}));
const mockChamberVoteDates = jest.fn();
jest.mock('@/features/representatives/services/profile-dates', () => ({
  ...jest.requireActual('@/features/representatives/services/profile-dates'),
  chamberVoteDates: (chamber: string) => mockChamberVoteDates(chamber),
}));
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import {
  billsSponsoredDates,
  campaignContributionsDates,
  committeeActivityDates,
  committeeLobbyingDates,
  committeeMembersDates,
  contactInfoDates,
  dayOf,
  newestDay,
  questionDatesKey,
  readQuestionDates,
  saveQuestionDates,
  stockTradesDates,
  topicBillsDates,
  votingRecordDates,
} from '@/lib/questions/question-dates';
import type { StockTrade } from '@/types/stock-trades';

const FIXED_NOW = new Date('2026-11-01T18:00:00Z');

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: FIXED_NOW, doNotFake: ['setTimeout', 'nextTick', 'setImmediate'] });
  mockCacheSet.mockResolvedValue(true);
});

afterEach(() => {
  jest.useRealTimers();
});

const trade = (overrides: Partial<StockTrade>): StockTrade =>
  ({
    filingId: 'f1',
    bioguideId: 'S000033',
    transactionDate: '2026-09-01',
    filingDate: '2026-09-20',
    ...overrides,
  }) as StockTrade;

describe('dayOf and newestDay', () => {
  it('keeps a bare date, converts a timestamp to its Washington day, and rejects junk', () => {
    expect(dayOf('2026-10-14')).toBe('2026-10-14');
    // 03:00 UTC on Oct 27 is still Oct 26 in Washington.
    expect(dayOf('2026-10-27T03:00:00Z')).toBe('2026-10-26');
    expect(dayOf('2026-10-26T11:35:18-04:00')).toBe('2026-10-26');
    expect(dayOf('not a date')).toBeNull();
    expect(dayOf(undefined)).toBeNull();
  });

  it('picks the newest day and ignores missing values', () => {
    expect(newestDay(['2026-01-03', null, '2026-10-22', undefined, '2026-02-03'])).toBe(
      '2026-10-22'
    );
    expect(newestDay([null, undefined])).toBeNull();
  });
});

describe('representative templates', () => {
  it("voting-record uses the chamber's newest roll call and its check time", async () => {
    mockChamberVoteDates.mockResolvedValue({
      source: 'votes',
      date: '2026-09-30',
      checkedAt: '2026-11-01T12:00:00Z',
    });
    const dates = await votingRecordDates('Senate');
    expect(mockChamberVoteDates).toHaveBeenCalledWith('Senate');
    expect(dates).toMatchObject({ latestRecord: '2026-09-30', checkedAt: '2026-11-01T12:00:00Z' });
  });

  it("contact-info uses the member's roster change and the roster file's saved download time", async () => {
    mockLegislatorsCheckedAt.mockResolvedValue('2026-11-01T06:00:00Z');
    // Slotkin's roster entry last changed 2025-04-04 (member-roster-history.json).
    const dates = await contactInfoDates('S001208');
    expect(dates).toMatchObject({ latestRecord: '2025-04-04', checkedAt: '2026-11-01T06:00:00Z' });

    mockLegislatorsCheckedAt.mockResolvedValue(null);
    expect((await contactInfoDates('S001208')).checkedAt).toBeNull();
  });

  it('campaign-contributions uses the FEC coverage end and the saved breakdown time', () => {
    const dates = campaignContributionsDates({
      finance: { coverageEndDate: '2026-10-14' },
      industries: { metadata: { lastUpdated: '2026-10-31T20:00:00Z' } },
    } as never);
    expect(dates).toMatchObject({ latestRecord: '2026-10-14', checkedAt: '2026-10-31T20:00:00Z' });

    const bare = campaignContributionsDates({
      finance: null,
      industries: null,
      financeUnavailable: true,
      industriesUnavailable: true,
      voteFinance: null,
    });
    expect(bare).toMatchObject({ latestRecord: null, checkedAt: null });
  });

  it('bills-sponsored uses the newest introduction date and the saved list time', () => {
    const dates = billsSponsoredDates({
      bills: [
        { introducedDate: '2026-03-01' },
        { introducedDate: '2026-09-25' },
        { introducedDate: '2025-12-31' },
      ],
      sponsoredCount: 3,
      cosponsoredCount: 0,
      fetchedAt: '2026-11-01T10:00:00.000Z',
    } as never);
    expect(dates).toMatchObject({
      latestRecord: '2026-09-25',
      checkedAt: '2026-11-01T10:00:00.000Z',
    });
    expect(
      billsSponsoredDates({ bills: [], sponsoredCount: 0, cosponsoredCount: 0 })
    ).toMatchObject({ latestRecord: null, checkedAt: null });
  });

  it('stock-trades uses the newest disclosure filing date, not the transaction date', () => {
    const dates = stockTradesDates(
      [
        trade({ transactionDate: '2026-10-01', filingDate: '2026-10-05' }),
        trade({ transactionDate: '2026-09-01', filingDate: '2026-10-20' }),
      ],
      '2026-11-01T01:00:00Z'
    );
    expect(dates).toMatchObject({ latestRecord: '2026-10-20', checkedAt: '2026-11-01T01:00:00Z' });
    expect(stockTradesDates([], null)).toMatchObject({ latestRecord: null, checkedAt: null });
  });
});

describe('committee and topic templates', () => {
  it("committee-members reuses the committee page's dates", async () => {
    expect(await committeeMembersDates('SSJU')).toMatchObject({
      latestRecord: '2026-07-15',
      checkedAt: '2026-11-01T09:02:58Z',
    });
  });

  it('committee-activity uses the newest hearing shown and leaves Checked out with no saved list', () => {
    const base = { bills: [], jurisdiction: '' };
    expect(
      committeeActivityDates({
        ...base,
        meetings: [{ date: '2026-09-10T10:00:00Z' }, { date: '2026-09-24T14:00:00Z' }] as never,
        fetchedAt: '2026-11-01T08:00:00.000Z',
      })
    ).toMatchObject({ latestRecord: '2026-09-24', checkedAt: '2026-11-01T08:00:00.000Z' });
    expect(committeeActivityDates({ ...base, meetings: [], fetchedAt: null })).toMatchObject({
      latestRecord: null,
      checkedAt: null,
    });
  });

  it("committee-lobbying uses the corpus's newest filing and build time", () => {
    expect(
      committeeLobbyingDates({
        quarters: ['2026-Q3'],
        generatedAt: '2026-10-26T15:49:15.771Z',
        latestFilingPosted: '2026-10-26T11:35:18-04:00',
      })
    ).toMatchObject({ latestRecord: '2026-10-26', checkedAt: '2026-10-26T15:49:15.771Z' });
    expect(committeeLobbyingDates(null)).toMatchObject({ latestRecord: null, checkedAt: null });
  });

  it('topic-bills uses the newest action among the bills shown and the corpus build time', () => {
    expect(
      topicBillsDates({
        total: 40,
        congress: 119,
        generatedAt: '2026-10-28T13:35:01.291Z',
        bills: [
          { introducedDate: '2026-01-03', latestActionDate: '2026-10-22' },
          { introducedDate: '2026-10-25', latestActionDate: null },
        ] as never,
      })
    ).toMatchObject({ latestRecord: '2026-10-25', checkedAt: '2026-10-28T13:35:01.291Z' });
    expect(topicBillsDates(null)).toMatchObject({ latestRecord: null, checkedAt: null });
  });
});

describe('saved page dates', () => {
  it('saves both dates under the template and upper-cased ID, and nothing when neither is known', () => {
    saveQuestionDates('bills-sponsored', 's000033', {
      latestRecord: '2026-09-25',
      checkedAt: '2026-11-01T10:00:00.000Z',
    });
    expect(mockCacheSet).toHaveBeenCalledWith(
      'question:dates:v1:bills-sponsored:S000033',
      { latestRecord: '2026-09-25', checkedAt: '2026-11-01T10:00:00.000Z' },
      7 * 24 * 60 * 60
    );
    mockCacheSet.mockClear();
    saveQuestionDates('stock-trades', 'S000033', { latestRecord: null, checkedAt: null });
    expect(mockCacheSet).not.toHaveBeenCalled();
  });

  it('reads many pages back in one batch, keyed by ID, skipping misses', async () => {
    mockMget.mockResolvedValue([{ latestRecord: '2026-10-14', checkedAt: null }, null]);
    const read = await readQuestionDates('campaign-contributions', ['s000033', 'P000595']);
    expect(mockMget).toHaveBeenCalledWith([
      questionDatesKey('campaign-contributions', 'S000033'),
      questionDatesKey('campaign-contributions', 'P000595'),
    ]);
    expect(read.get('S000033')).toEqual({ latestRecord: '2026-10-14', checkedAt: null });
    expect(read.has('P000595')).toBe(false);
    expect(await readQuestionDates('campaign-contributions', [])).toEqual(new Map());
  });

  it('never saves or reads the current time', async () => {
    mockMget.mockResolvedValue([null]);
    const read = await readQuestionDates('stock-trades', ['S000033']);
    expect([...read.values()]).toEqual([]);
    expect(mockCacheSet).not.toHaveBeenCalled();
    expect(JSON.stringify(mockCacheSet.mock.calls)).not.toContain(FIXED_NOW.toISOString());
  });
});
