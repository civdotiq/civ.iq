/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Sitemap <lastmod> guards. Until 2026-10-27 almost every URL carried the
 * time the sitemap was generated, committees carried the date a script pulled
 * their Wikipedia text, and bills fell back to "now" because the code read
 * `latestAction.date` where Congress.gov sends `latestAction.actionDate`.
 * A date is only listed when the data gives one for the page's facts.
 * Profiles are dated since 2026-10-30 (real-dates PR 3), district pages by
 * their member's roster change (PR 4).
 */

jest.mock('@/lib/questions/stock-trades', () => ({
  getMembersWithStockTrades: jest.fn().mockResolvedValue({ senate: [], house: [] }),
}));
jest.mock('@/lib/data-sources/bill-policy-areas/load', () => ({
  getBillsByPolicyArea: jest.fn().mockResolvedValue({
    total: 1,
    congress: 119,
    generatedAt: '2026-10-28T13:35:01.291Z',
    bills: [
      { id: '119-hr-1', introducedDate: '2026-01-03', latestActionDate: '2026-10-22' },
      { id: '119-hr-2', introducedDate: '2026-02-03', latestActionDate: null },
    ],
  }),
}));
jest.mock('@/lib/data-sources/lda-corpus/load', () => ({
  getCorpusMeta: jest.fn().mockResolvedValue({
    quarters: ['2026-Q2', '2026-Q3'],
    generatedAt: '2026-10-26T15:49:15.771Z',
    latestFilingPosted: '2026-10-26T11:35:18-04:00',
  }),
}));
const savedQuestionDates = new Map<string, Map<string, unknown>>();
const savedIssueDates = new Map<string, unknown>();
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    mget: jest.fn(async (keys: string[]) =>
      keys.map(key => {
        const question = /^question:dates:v1:([^:]+):(.+)$/.exec(key);
        if (question)
          return savedQuestionDates.get(question[1] ?? '')?.get(question[2] ?? '') ?? null;
        return savedIssueDates.get(key) ?? null;
      })
    ),
    get: jest.fn(async () => null),
    set: jest.fn(async () => true),
  }),
}));
jest.mock('@/features/representatives/services/congress.service', () => ({
  legislatorsFileCheckedAt: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/features/representatives/services/profile-dates', () => ({
  ...jest.requireActual('@/features/representatives/services/profile-dates'),
  chamberVoteDates: jest.fn(async (chamber: string) => ({
    source: 'votes',
    date: chamber === 'Senate' ? '2026-09-30' : '2026-09-16',
    checkedAt: '2026-10-30T14:17:12Z',
  })),
}));
jest.mock('@/lib/sitemap/state-district-urls', () => ({
  firstDistrictPerChamber: jest.fn().mockResolvedValue([{ chamber: 'upper', district: '1' }]),
}));

import sitemap from '@/app/sitemap';

const FIXED_NOW = new Date('2026-10-27T12:00:00Z');

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as unknown as Response;
}

beforeEach(() => {
  jest.useFakeTimers({ now: FIXED_NOW, doNotFake: ['setTimeout', 'nextTick', 'setImmediate'] });
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/representatives/all')) {
      return jsonResponse({
        representatives: [
          { bioguideId: 'S001208', chamber: 'Senate', state: 'MI' },
          { bioguideId: 'D000624', chamber: 'House', state: 'MI', district: '6' },
        ],
      });
    }
    if (url.includes('/api/bills/latest')) {
      return jsonResponse({
        bills: [
          {
            congress: 119,
            type: 'HRES',
            number: '1629',
            latestAction: { actionDate: '2026-10-19', text: 'Referred.' },
          },
          { congress: 119, type: 'HR', number: '10', latestAction: { text: 'No date.' } },
        ],
      });
    }
    return { ok: false, json: async () => ({}) } as unknown as Response;
  }) as jest.Mock;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('sitemap lastModified', () => {
  it('never stamps a URL with the generation time', async () => {
    const entries = await sitemap();
    expect(entries.length).toBeGreaterThan(100);
    const stampedNow = entries.filter(
      e => e.lastModified && new Date(e.lastModified).getTime() === FIXED_NOW.getTime()
    );
    expect(stampedNow).toEqual([]);
  });

  it("dates a bill by its latest action, and leaves an undated bill's lastmod out", async () => {
    const entries = await sitemap();
    const dated = entries.find(e => e.url.endsWith('/bill/119-hres-1629'));
    const undated = entries.find(e => e.url.endsWith('/bill/119-hr-10'));
    expect(dated?.lastModified).toEqual(new Date('2026-10-19'));
    expect(undated).toBeDefined();
    expect(undated?.lastModified).toBeUndefined();
  });

  it("dates a profile by its chamber's newest roll call, or a newer roster change", async () => {
    const entries = await sitemap();
    const profile = entries.find(e => e.url.endsWith('/representative/S001208'));
    // Slotkin's roster entry last changed 2025-04-04; the Senate voted 2026-09-30.
    expect(profile?.lastModified).toEqual(new Date('2026-09-30'));
  });

  it("dates a district by its member's roster change, and leaves an empty seat undated", async () => {
    const entries = await sitemap();
    const district = entries.find(e => e.url.endsWith('/districts/MI-06'));
    // Dingell's roster entry last changed 2025-01-04 (the new term's entry).
    expect(district?.lastModified).toEqual(new Date('2025-01-04'));
    // No MI-07 member in this roster.
    expect(entries.find(e => e.url.endsWith('/districts/MI-07'))?.lastModified).toBeUndefined();
  });

  it('dates a committee and a subcommittee by when their upstream facts last changed', async () => {
    const entries = await sitemap();
    // src/data/committee-roster-history.json: Judiciary's roster changed
    // 2026-07-15; its Antitrust subcommittee (SSJU01) last changed 2025-04-04.
    expect(entries.find(e => e.url.endsWith('/committee/SSJU'))?.lastModified).toEqual(
      new Date('2026-07-15')
    );
    expect(entries.find(e => e.url.endsWith('/committee/SSJU01'))?.lastModified).toEqual(
      new Date('2025-04-04')
    );
  });

  it('dates representative question pages the way each page dates itself', async () => {
    savedQuestionDates.set(
      'campaign-contributions',
      new Map([['S001208', { latestRecord: '2026-10-14', checkedAt: '2026-10-31T20:00:00Z' }]])
    );
    const entries = await sitemap();
    const find = (path: string) => entries.find(e => e.url.endsWith(path));
    // voting-record: the chamber's newest roll call.
    expect(find('/ask/voting-record/S001208')?.lastModified).toEqual(new Date('2026-09-30'));
    expect(find('/ask/voting-record/D000624')?.lastModified).toEqual(new Date('2026-09-16'));
    // contact-info: the member's roster change.
    expect(find('/ask/contact-info/S001208')?.lastModified).toEqual(new Date('2025-04-04'));
    // campaign-contributions: the date the page saved; undated until it renders.
    expect(find('/ask/campaign-contributions/S001208')?.lastModified).toEqual(
      new Date('2026-10-14')
    );
    expect(find('/ask/campaign-contributions/D000624')).toBeDefined();
    expect(find('/ask/campaign-contributions/D000624')?.lastModified).toBeUndefined();
    expect(find('/ask/bills-sponsored/S001208')?.lastModified).toBeUndefined();
    // donor-voting-alignment carries no date.
    expect(find('/ask/donor-voting-alignment/S001208')).toBeDefined();
    expect(find('/ask/donor-voting-alignment/S001208')?.lastModified).toBeUndefined();
    savedQuestionDates.clear();
  });

  it('dates topic and committee question pages from the corpora and the committee history', async () => {
    const entries = await sitemap();
    const topics = entries.filter(e => e.url.includes('/ask/topic-bills/'));
    expect(topics.length).toBeGreaterThan(0);
    // Newest action among the (mocked) bills shown.
    expect(new Set(topics.map(e => e.lastModified?.toString()))).toEqual(
      new Set([new Date('2026-10-22').toString()])
    );
    const find = (path: string) => entries.find(e => e.url.endsWith(path));
    expect(find('/ask/committee-members/SSJU')?.lastModified).toEqual(new Date('2026-07-15'));
    // The LDA corpus's newest filing (mocked), posted Oct 26 Eastern.
    expect(find('/ask/committee-lobbying/SSJU')?.lastModified).toEqual(new Date('2026-10-26'));
    // No saved activity date for this committee.
    expect(find('/ask/committee-activity/SSJU')).toBeDefined();
    expect(find('/ask/committee-activity/SSJU')?.lastModified).toBeUndefined();
  });

  it('dates a digest issue only when a re-assembly changed it, and never its archive page', async () => {
    // FIXED_NOW is Tue Oct 27; the newest complete week is 2026-W43 (Oct 19–25).
    savedIssueDates.set('digest:issue-dates:v1:MI:2026-W42', {
      latestRecord: '2026-10-17',
      checkedAt: '2026-11-20T06:10:00.000Z',
      modifiedAt: '2026-11-20T06:10:00.000Z',
      fingerprint: 'f',
    });
    savedIssueDates.set('digest:issue-dates:v1:MI:2026-W43', {
      latestRecord: '2026-10-24',
      checkedAt: '2026-10-26T06:10:00.000Z',
      modifiedAt: null,
      fingerprint: 'g',
    });
    const entries = await sitemap();
    const find = (path: string) => entries.find(e => e.url.endsWith(path));
    expect(find('/digest/mi/2026-W42')?.lastModified).toEqual(new Date('2026-11-20'));
    expect(find('/digest/mi/2026-W43')).toBeDefined();
    expect(find('/digest/mi/2026-W43')?.lastModified).toBeUndefined();
    expect(find('/digest/ca/2026-W43')?.lastModified).toBeUndefined();
    expect(find('/digest/mi')?.lastModified).toBeUndefined();
    savedIssueDates.clear();
  });
});
