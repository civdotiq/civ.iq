/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Weekly digest issue dates (src/lib/digest/issue-dates.ts): Latest record is
 * the newest fact in the issue, Checked its assembly time, and a modified
 * time exists only when a later assembly changed the content.
 */

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockMget = jest.fn();
jest.mock('@/lib/cache', () => ({
  cache: { get: (key: string) => mockGet(key), set: (...args: unknown[]) => mockSet(...args) },
}));
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({ mget: (keys: string[]) => mockMget(keys) }),
}));
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import {
  issueDatesKey,
  issueFingerprint,
  issueLatestRecord,
  issueModifiedOn,
  readIssueDates,
  recordIssueDates,
} from '@/lib/digest/issue-dates';
import type { DigestIssue } from '@/lib/digest/types';

function issue(overrides: Partial<DigestIssue> = {}): DigestIssue {
  return {
    weekId: '2026-W43',
    weekStart: '2026-10-19T00:00:00.000Z',
    weekEnd: '2026-10-25T23:59:59.999Z',
    state: 'MI',
    stateName: 'Michigan',
    delegation: [],
    votes: [
      {
        voteId: 'house-119-2-430',
        chamber: 'House',
        date: '2026-10-21T18:30:00-04:00',
        question: 'On Passage',
        result: 'Passed',
        yeas: 220,
        nays: 210,
        delegationPositions: [
          { bioguideId: 'D000624', name: 'Dingell', party: 'D', position: 'Yea' },
          { bioguideId: 'B001316', name: 'Bergman', party: 'R', position: 'Nay' },
        ],
      },
    ],
    bills: [
      {
        billId: '119-hr-10874',
        congress: 119,
        type: 'HR',
        number: '10874',
        title: 'A bill',
        latestActionDate: '2026-10-22',
        latestActionText: 'Referred.',
      },
    ],
    filings: [
      {
        fileNumber: 1,
        committeeId: 'C1',
        bioguideId: 'S001208',
        memberName: 'Slotkin',
        party: 'D',
        chamber: 'Senate',
        receiptDate: '2026-10-24T00:00:00',
        fecUrl: 'https://www.fec.gov/data/filings/?file_number=1',
      },
    ],
    unavailable: [],
    generatedAt: '2026-10-26T06:10:00.000Z',
    ...overrides,
  };
}

const FIXED_NOW = new Date('2026-11-01T18:00:00Z');

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: FIXED_NOW, doNotFake: ['setTimeout', 'nextTick', 'setImmediate'] });
  mockGet.mockResolvedValue(null);
  mockSet.mockResolvedValue(true);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('issueLatestRecord', () => {
  it('is the newest of the vote dates, bill action dates and filing receipts', () => {
    expect(issueLatestRecord(issue())).toBe('2026-10-24');
    expect(issueLatestRecord(issue({ filings: [] }))).toBe('2026-10-22');
    expect(issueLatestRecord(issue({ filings: [], bills: [] }))).toBe('2026-10-21');
    expect(issueLatestRecord(issue({ votes: [], bills: [], filings: [] }))).toBeNull();
  });
});

describe('issueFingerprint', () => {
  it('ignores order and AI meanings, and changes with the facts', () => {
    const base = issue();
    const reordered = issue({
      votes: base.votes.map(v => ({
        ...v,
        delegationPositions: [...v.delegationPositions].reverse(),
        meaning: {
          decided: 'x',
          yeaMeant: 'y',
          nayMeant: 'n',
          readingLevel: 6,
          confidence: 0.8,
          source: 'ai-generated',
          generatedAt: '2026-10-27T00:00:00Z',
        },
      })),
    });
    expect(issueFingerprint(reordered)).toBe(issueFingerprint(base));

    const flipped = issue({
      votes: base.votes.map(v => ({
        ...v,
        delegationPositions: v.delegationPositions.map(p => ({ ...p, position: 'Yea' })),
      })),
    });
    expect(issueFingerprint(flipped)).not.toBe(issueFingerprint(base));
    expect(issueFingerprint(issue({ bills: [] }))).not.toBe(issueFingerprint(base));
    expect(issueFingerprint(issue({ unavailable: ['filings'] }))).not.toBe(issueFingerprint(base));
  });
});

describe('recordIssueDates', () => {
  const key = issueDatesKey('MI', '2026-W43');

  it('saves a first assembly with no modified time', async () => {
    const dates = await recordIssueDates(issue());
    expect(dates).toMatchObject({
      latestRecord: '2026-10-24',
      checkedAt: '2026-10-26T06:10:00.000Z',
      modifiedAt: null,
    });
    expect(mockSet).toHaveBeenCalledWith(
      key,
      expect.objectContaining({ modifiedAt: null, checkedAt: '2026-10-26T06:10:00.000Z' }),
      90 * 24 * 60 * 60
    );
  });

  it('returns the saved decision for the same assembly without writing', async () => {
    const first = issue();
    mockGet.mockResolvedValue({
      latestRecord: '2026-10-24',
      checkedAt: first.generatedAt,
      modifiedAt: '2026-10-26T06:10:00.000Z',
      fingerprint: issueFingerprint(first),
    });
    const dates = await recordIssueDates(first);
    expect(dates.modifiedAt).toBe('2026-10-26T06:10:00.000Z');
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('keeps no modified time when a re-assembly has the same content', async () => {
    const first = issue();
    mockGet.mockResolvedValue({
      latestRecord: '2026-10-24',
      checkedAt: first.generatedAt,
      modifiedAt: null,
      fingerprint: issueFingerprint(first),
    });
    const again = issue({ generatedAt: '2026-11-25T06:10:00.000Z' });
    const dates = await recordIssueDates(again);
    expect(dates.modifiedAt).toBeNull();
    expect(dates.checkedAt).toBe('2026-11-25T06:10:00.000Z');
    expect(mockSet).toHaveBeenCalledWith(
      key,
      expect.objectContaining({ modifiedAt: null }),
      90 * 24 * 60 * 60
    );
  });

  it('dates a re-assembly with different content by that assembly, never by now', async () => {
    const first = issue();
    mockGet.mockResolvedValue({
      latestRecord: '2026-10-24',
      checkedAt: first.generatedAt,
      modifiedAt: null,
      fingerprint: issueFingerprint(first),
    });
    const changed = issue({ generatedAt: '2026-11-25T06:10:00.000Z', filings: [] });
    const dates = await recordIssueDates(changed);
    expect(dates.modifiedAt).toBe('2026-11-25T06:10:00.000Z');
    expect(issueModifiedOn(dates)).toBe('2026-11-25');
    expect(JSON.stringify(mockSet.mock.calls)).not.toContain(FIXED_NOW.toISOString());
  });

  it('falls back to the issue alone when the cache fails', async () => {
    mockGet.mockRejectedValue(new Error('redis down'));
    const dates = await recordIssueDates(issue());
    expect(dates).toMatchObject({ latestRecord: '2026-10-24', modifiedAt: null });
  });
});

describe('readIssueDates and issueModifiedOn', () => {
  it('reads many issues in one batch and keys them by state and week', async () => {
    mockMget.mockResolvedValue([
      {
        latestRecord: '2026-10-24',
        checkedAt: 'x',
        modifiedAt: '2026-11-25T06:10:00.000Z',
        fingerprint: 'f',
      },
      null,
    ]);
    const read = await readIssueDates([
      { state: 'mi', weekId: '2026-W43' },
      { state: 'CA', weekId: '2026-W42' },
    ]);
    expect(mockMget).toHaveBeenCalledWith([
      'digest:issue-dates:v1:MI:2026-W43',
      'digest:issue-dates:v1:CA:2026-W42',
    ]);
    expect(issueModifiedOn(read.get('MI:2026-W43') ?? null)).toBe('2026-11-25');
    expect(read.has('CA:2026-W42')).toBe(false);
    expect(issueModifiedOn(null)).toBeNull();
  });
});
