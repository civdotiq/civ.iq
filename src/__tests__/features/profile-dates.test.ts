/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * A profile's "Latest record" is its newest dated fact as the source dates
 * it, and "Checked" the oldest saved fetch time among its sources. Neither is
 * ever the current time; an unknown date is left out.
 */

const mockBaselines = jest.fn();
const mockFreshness = jest.fn();
const mockCacheGet = jest.fn();
jest.mock('@/lib/intelligence/analyzers/chamber-baselines', () => ({
  getChamberBaselines: () => mockBaselines(),
}));
jest.mock('@/features/representatives/services/senate-vote-freshness', () => ({
  getSenateVoteFreshness: () => mockFreshness(),
}));
jest.mock('@/services/cache', () => ({ govCache: { get: (key: string) => mockCacheGet(key) } }));
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import {
  chamberVoteDates,
  combineProfileDates,
  getProfileDates,
  rosterChangedOn,
} from '@/features/representatives/services/profile-dates';
import { profileDatesLine } from '@/lib/provenance/profile-dates-line';

beforeEach(() => {
  jest.clearAllMocks();
  mockCacheGet.mockResolvedValue(null);
});

describe('combineProfileDates', () => {
  it('takes the newest date and the oldest fetch time', () => {
    const combined = combineProfileDates([
      { source: 'votes', date: '2026-09-30', checkedAt: '2026-10-30T14:17:00Z' },
      { source: 'roster', date: '2026-09-02', checkedAt: null },
      { source: 'fec', date: '2026-09-30', checkedAt: '2026-10-28T09:00:00Z' },
    ]);
    expect(combined.latestRecord).toBe('2026-09-30');
    expect(combined.checkedAt).toBe('2026-10-28T09:00:00Z');
  });

  it('leaves a date out when no source has one', () => {
    expect(combineProfileDates([{ source: 'votes', date: null, checkedAt: null }])).toMatchObject({
      latestRecord: null,
      checkedAt: null,
    });
  });
});

describe('chamberVoteDates', () => {
  it('Senate: the Record check note (newest vote, when last confirmed)', async () => {
    mockFreshness.mockResolvedValue({
      latestVoteDate: '2026-09-30',
      checkedAt: '2026-10-30T14:17:12.000Z',
    });
    expect(await chamberVoteDates('Senate', 119)).toEqual({
      source: 'votes',
      date: '2026-09-30',
      checkedAt: '2026-10-30T14:17:12.000Z',
    });
  });

  it('House: the nightly build (its newest roll call, dated in Washington, and when it ran)', async () => {
    mockBaselines.mockResolvedValue({
      dataAsOf: '2026-10-01T02:10:00.000Z',
      builtAt: '2026-10-30T09:00:21.000Z',
    });
    expect(await chamberVoteDates('House', 119)).toEqual({
      source: 'votes',
      date: '2026-09-30',
      checkedAt: '2026-10-30T09:00:21.000Z',
    });
  });

  it('House: no date when the build fell back to its own time', async () => {
    mockBaselines.mockResolvedValue({
      dataAsOf: '2026-10-30T09:00:21.000Z',
      builtAt: '2026-10-30T09:00:21.000Z',
    });
    expect((await chamberVoteDates('House', 119)).date).toBeNull();
  });

  it('nothing when nothing is stored', async () => {
    mockBaselines.mockResolvedValue(null);
    expect(await chamberVoteDates('House', 119)).toEqual({
      source: 'votes',
      date: null,
      checkedAt: null,
    });
  });
});

describe('getProfileDates', () => {
  it('counts the stored FEC report period and its fetch time', async () => {
    mockFreshness.mockResolvedValue({
      latestVoteDate: '2026-09-30',
      checkedAt: '2026-10-30T14:17:12Z',
    });
    mockCacheGet.mockResolvedValue({
      metadata: { coverageEndDate: '2026-09-30T00:00:00', lastUpdated: '2026-10-29T08:00:00Z' },
    });
    const dates = await getProfileDates('S000033', 'Senate');
    expect(mockCacheGet).toHaveBeenCalledWith('batch-endpoint:S000033:finance');
    expect(dates.latestRecord).toBe('2026-09-30');
    expect(dates.checkedAt).toBe('2026-10-29T08:00:00Z');
  });

  it('ignores a stored finance result with no FEC report (no data found)', async () => {
    mockFreshness.mockResolvedValue({
      latestVoteDate: '2026-09-30',
      checkedAt: '2026-10-30T14:17:12Z',
    });
    mockCacheGet.mockResolvedValue({
      metadata: { note: 'No financial data found in FEC records' },
    });
    const dates = await getProfileDates('S000033', 'Senate');
    expect(dates.checkedAt).toBe('2026-10-30T14:17:12Z');
  });
});

describe('rosterChangedOn', () => {
  it('reads the committed roster history', () => {
    expect(rosterChangedOn('S000033')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(rosterChangedOn('Z999999')).toBeNull();
  });
});

describe('profileDatesLine', () => {
  it('formats both dates, and leaves out what is unknown', () => {
    expect(
      profileDatesLine({ latestRecord: '2026-09-30', checkedAt: '2026-10-30T14:17:12Z' })
    ).toBe('Latest record: Sep 30, 2026 · Checked: Oct 30, 2026');
    expect(profileDatesLine({ latestRecord: '2026-09-30', checkedAt: null })).toBe(
      'Latest record: Sep 30, 2026'
    );
    expect(profileDatesLine({ latestRecord: null, checkedAt: null })).toBeUndefined();
  });
});
