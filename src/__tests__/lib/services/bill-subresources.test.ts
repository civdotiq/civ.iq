/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Congress.gov's bill detail returns committees, related bills, and summaries
 * only as `{ count, url }` pointers. Reading them off the detail rendered
 * "no committees", "no related bills", and "no summary published" on every
 * bill. They must come from their sub-endpoints.
 */

import { fetchBillFromCongress } from '@/lib/services/bill.service';

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((_key: string, fn: () => Promise<unknown>) => fn()),
}));
jest.mock('@/features/legislation/services/rollcall-parser', () => ({
  parseRollCallXML: jest.fn(async () => null),
}));

const pointer = (path: string) => ({
  count: 2,
  url: `https://api.congress.gov/v3/bill/119/hconres/89/${path}?format=json`,
});

const responses: Record<string, unknown> = {
  '/bill/119/hconres/89?': {
    bill: {
      congress: 119,
      type: 'HCONRES',
      number: '89',
      title: 'Directing the President to remove United States Armed Forces from hostilities',
      originChamber: 'House',
      introducedDate: '2026-04-22',
      sponsors: [],
      committees: pointer('committees'),
      relatedBills: pointer('relatedbills'),
      summaries: pointer('summaries'),
    },
  },
  '/committees?': {
    committees: [{ systemCode: 'hsfa00', name: 'Foreign Affairs Committee', chamber: 'House' }],
  },
  '/relatedbills?': {
    relatedBills: [
      {
        congress: 119,
        type: 'HCONRES',
        number: 87,
        title: 'Related war powers resolution',
        relationshipDetails: [{ type: 'Related bill', identifiedBy: 'CRS' }],
      },
      {
        congress: 118,
        type: 'SCONRES',
        number: 12,
        title: 'Identical measure',
        relationshipDetails: [{ type: 'Identical bill', identifiedBy: 'House' }],
      },
    ],
  },
  // Real shape from S. 3362 (119th): Congress.gov lists a bare "Intro-S" code
  // with no text beside "Introduced in Senate". It crashed the bill page.
  '/actions?': {
    actions: [
      {
        actionDate: '2026-04-22',
        type: 'IntroReferral',
        text: 'Referred to the House Committee on Foreign Affairs.',
      },
      { actionDate: '2026-04-22', type: 'IntroReferral', actionCode: 'Intro-H' },
      {
        actionDate: '2026-04-22',
        type: 'IntroReferral',
        actionCode: '1000',
        text: 'Introduced in House',
      },
    ],
  },
  '/summaries?': {
    summaries: [
      { actionDate: '2026-04-22', versionCode: '00', text: '<p>Introduced version.</p>' },
      {
        actionDate: '2026-07-23',
        versionCode: '53',
        actionDesc: 'Passed House',
        text: '<p>Passed House version.</p>',
      },
    ],
  },
};

beforeAll(() => {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const match = Object.keys(responses).find(k => url.includes(k));
    const body = match ? responses[match] : {};
    return {
      ok: true,
      status: 200,
      url,
      json: async () => body,
    } as Response;
  });
});

describe('fetchBillFromCongress sub-resources', () => {
  it('fills committees, related bills, and the latest summary from their endpoints', async () => {
    const bill = await fetchBillFromCongress('119-hconres-89');
    expect(bill).not.toBeNull();

    expect(bill?.committees).toEqual([
      expect.objectContaining({ committeeId: 'hsfa00', name: 'Foreign Affairs Committee' }),
    ]);

    expect(bill?.relatedBills).toEqual([
      expect.objectContaining({ id: '119-hconres-87', relationship: 'related' }),
      expect.objectContaining({ id: '118-sconres-12', relationship: 'identical' }),
    ]);

    expect(bill?.summary?.version).toBe('Passed House');
    expect(bill?.summary?.text).toContain('Passed House version.');

    // Every item, not the default page of 20.
    const urls = (global.fetch as jest.Mock).mock.calls.map(([u]) => String(u));
    for (const path of ['committees', 'relatedbills', 'summaries']) {
      expect(urls.find(u => u.includes(`/${path}?`))).toContain('limit=250');
    }
  });

  it('drops actions Congress.gov lists without text', async () => {
    const bill = await fetchBillFromCongress('119-hconres-89');

    expect(bill?.status.timeline.map(a => a.description)).toEqual([
      'Referred to the House Committee on Foreign Affairs.',
      'Introduced in House',
    ]);
  });
});
