/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Every state committee detail page returned 404: getCommitteeById asked the
 * /committees list endpoint for per_page=100 (upstream max is 20), the request
 * failed, and the page turned any failure into notFound(). These tests pin the
 * request shape and keep "not found" apart from "upstream unavailable".
 */

import { openStatesAPI, type OpenStatesCommittee } from '@/lib/openstates-api';
import { lookupStateCommittee } from '@/lib/state-committee-lookup';

// Keep the daily-quota flag out of the shared cache between tests.
jest.mock('@/lib/cache', () => ({
  cache: { get: jest.fn(async () => null), set: jest.fn(async () => true) },
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const ORG_ID = 'ocd-organization/7120f672-fb5b-44ad-86a1-6d94e52b8d17';
const ENCODED_ID = Buffer.from(ORG_ID).toString('base64url');

function committee(id: string, name: string): OpenStatesCommittee {
  return {
    id,
    name,
    classification: 'committee',
    chamber: 'upper',
    parent_id: null,
    memberships: [{ person_name: 'Jane Doe', role: 'Chair', person_id: 'ocd-person/1' }],
    links: [],
    sources: [{ url: 'https://example.gov/committee', note: null }],
  } as unknown as OpenStatesCommittee;
}

function page(results: OpenStatesCommittee[], pageNum: number, maxPage: number) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      results,
      pagination: { per_page: 20, page: pageNum, max_page: maxPage, total_items: 0 },
    }),
  };
}

describe('openStatesAPI.getCommitteeById', () => {
  const originalFetch = global.fetch;

  beforeEach(() => openStatesAPI.clearCache());
  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('pages the list endpoint at per_page=20 and finds the committee on a later page', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(page([committee('ocd-organization/other', 'Other')], 1, 2))
      .mockResolvedValueOnce(page([committee(ORG_ID, 'Senate Finance')], 2, 2));
    global.fetch = fetchMock as unknown as typeof fetch;

    const found = await openStatesAPI.getCommitteeById(ORG_ID, true, 'AL');

    expect(found?.name).toBe('Senate Finance');
    for (const call of fetchMock.mock.calls) {
      const url = new URL((call as [string])[0]);
      expect(url.searchParams.get('per_page')).toBe('20');
      expect(url.searchParams.get('jurisdiction')).toBe('al');
      expect(url.searchParams.get('include')).toBe('memberships');
    }
  });

  it('returns null when upstream answered and the committee is absent', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        page([committee('ocd-organization/other', 'Other')], 1, 1)
      ) as unknown as typeof fetch;

    await expect(openStatesAPI.getCommitteeById(ORG_ID, true, 'al')).resolves.toBeNull();
  });

  it('throws (does not return null) when upstream is over quota', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: async () => '{"detail":"exceeded limit of 1000/day"}',
    }) as unknown as typeof fetch;

    const pending = openStatesAPI.getCommitteeById(ORG_ID, true, 'al');
    const assertion = expect(pending).rejects.toThrow('HTTP 429');
    await jest.runAllTimersAsync();
    await assertion;
  });
});

describe('lookupStateCommittee', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns found with the transformed committee', async () => {
    jest
      .spyOn(openStatesAPI, 'getCommitteeById')
      .mockResolvedValue(committee(ORG_ID, 'Senate Finance'));

    const result = await lookupStateCommittee('al', ENCODED_ID);

    expect(result.status).toBe('found');
    if (result.status !== 'found') return;
    expect(result.committee.name).toBe('Senate Finance');
    expect(result.committee.state).toBe('AL');
    expect(result.committee.members?.[0]?.legislator_name).toBe('Jane Doe');
  });

  it('returns not_found when upstream answered without the committee', async () => {
    jest.spyOn(openStatesAPI, 'getCommitteeById').mockResolvedValue(null);
    await expect(lookupStateCommittee('al', ENCODED_ID)).resolves.toEqual({
      status: 'not_found',
    });
  });

  it('returns unavailable (not not_found) when upstream fails', async () => {
    jest
      .spyOn(openStatesAPI, 'getCommitteeById')
      .mockRejectedValue(new Error('HTTP 429: Too Many Requests'));
    await expect(lookupStateCommittee('al', ENCODED_ID)).resolves.toEqual({
      status: 'unavailable',
    });
  });

  it('rejects malformed ids and states without calling upstream', async () => {
    const spy = jest.spyOn(openStatesAPI, 'getCommitteeById');
    const notAnOrg = Buffer.from('ocd-person/123').toString('base64url');

    await expect(lookupStateCommittee('al', notAnOrg)).resolves.toEqual({ status: 'not_found' });
    await expect(lookupStateCommittee('alabama', ENCODED_ID)).resolves.toEqual({
      status: 'not_found',
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
