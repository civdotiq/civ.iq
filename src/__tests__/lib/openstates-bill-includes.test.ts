/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * OpenStates v3 returns a bare bill unless each nested block is named in an
 * `include` parameter — no error, just an absent key that reads downstream as
 * "this bill has no sponsors". Every state bill surface rendered that empty
 * default until the includes were added, so these tests assert the parameters
 * are on the wire rather than that some helper returns them.
 */

import { openStatesAPI } from '@/lib/openstates-api';

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const billFixture = {
  id: 'ocd-bill/test-1',
  identifier: 'HB 1234',
  title: 'A test bill',
  session: '2025-2026',
  from_organization: { id: 'org-1', name: 'House', classification: 'lower' },
  sponsorships: [
    {
      id: 's1',
      name: 'Primary Sponsor',
      entity_type: 'person',
      classification: 'primary',
      primary: true,
    },
    {
      id: 's2',
      name: 'Co Sponsor',
      entity_type: 'person',
      classification: 'cosponsor',
      primary: false,
    },
  ],
  actions: [{ description: 'Introduced', date: '2025-01-10', classification: ['introduction'] }],
  versions: [{ url: 'https://example.gov/hb1234.pdf', note: 'Introduced' }],
};

/** Every `include` value on the request URL, in order. */
function includesFor(call: unknown): string[] {
  const url = new URL((call as [string])[0]);
  return url.searchParams.getAll('include');
}

function mockBillResponse(body: unknown) {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  });
}

describe('OpenStates bill requests carry the include parameters', () => {
  afterEach(() => jest.restoreAllMocks());

  it('asks for sponsorships when filtering bills by sponsor', async () => {
    const fetchMock = mockBillResponse({
      results: [{ ...billFixture, id: 'ocd-bill/sponsor-path' }],
      pagination: { per_page: 20, page: 1, max_page: 1, total_items: 1 },
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const bills = await openStatesAPI.getBillsBySponsor(
      'ocd-person/include-test-sponsor',
      'mi',
      undefined,
      20
    );

    expect(includesFor(fetchMock.mock.calls[0])).toEqual(
      expect.arrayContaining(['sponsorships', 'abstracts', 'actions'])
    );
    // A sponsor query whose bills carry no sponsorships cannot answer the
    // question it was asked — the network and the sponsored/cosponsored split
    // are both derived from this list.
    expect(bills[0]?.sponsorships).toHaveLength(2);
  });

  it('asks for the full bill on a single-bill lookup, versions included', async () => {
    const fetchMock = mockBillResponse({ ...billFixture, id: 'ocd-bill/detail-path' });
    global.fetch = fetchMock as unknown as typeof fetch;

    const bill = await openStatesAPI.getBillById('ocd-bill/detail-path');

    // `versions` is where the bill text links live; without it the bill text
    // route has nothing to serve.
    expect(includesFor(fetchMock.mock.calls[0])).toEqual(
      expect.arrayContaining([
        'sponsorships',
        'abstracts',
        'actions',
        'sources',
        'documents',
        'versions',
        'votes',
        'related_bills',
      ])
    );
    expect(bill?.versions).toHaveLength(1);
  });

  it('asks for sponsorships when listing a jurisdiction bills', async () => {
    const fetchMock = mockBillResponse({
      results: [{ ...billFixture, id: 'ocd-bill/list-path' }],
      pagination: { per_page: 20, page: 1, max_page: 1, total_items: 1 },
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await openStatesAPI.getBills('mi', undefined, undefined, undefined, 20);

    expect(includesFor(fetchMock.mock.calls[0])).toEqual(
      expect.arrayContaining(['sponsorships', 'abstracts', 'actions'])
    );
  });

  it('repeats include once per block instead of comma-joining them', async () => {
    const fetchMock = mockBillResponse({ ...billFixture, id: 'ocd-bill/encoding-path' });
    global.fetch = fetchMock as unknown as typeof fetch;

    await openStatesAPI.getBillById('ocd-bill/encoding-path');

    // A comma-joined value is rejected outright by the API (422, "value is not
    // a valid enumeration member"), so the encoding is part of the contract.
    const values = includesFor(fetchMock.mock.calls[0]);
    expect(values.length).toBeGreaterThan(1);
    expect(values.some(value => value.includes(','))).toBe(false);
  });
});
