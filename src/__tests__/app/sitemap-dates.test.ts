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
 * Profiles are dated since 2026-10-30 (real-dates PR 3).
 */

jest.mock('@/lib/questions/stock-trades', () => ({
  getMembersWithStockTrades: jest.fn().mockResolvedValue({ senate: [], house: [] }),
}));
jest.mock('@/lib/data-sources/bill-policy-areas/load', () => ({
  getBillsByPolicyArea: jest.fn().mockResolvedValue({ total: 1 }),
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
        representatives: [{ bioguideId: 'S001208', chamber: 'Senate', state: 'MI' }],
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

  it('lists committees and districts without a date', async () => {
    const entries = await sitemap();
    for (const path of ['/committee/SSJU', '/districts/MI-06']) {
      const entry = entries.find(e => e.url.endsWith(path));
      expect(entry).toBeDefined();
      expect(entry?.lastModified).toBeUndefined();
    }
  });
});
