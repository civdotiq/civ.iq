/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State committee pages called the OpenStates /committees endpoint (20 per
 * page) against a 1,000/day key that was over quota. They now read a
 * committed corpus built from openstates/people committee YAML. These tests
 * pin the encoding and that the real artifact serves pages with no API call.
 */

import {
  buildCommitteesCorpus,
  decodeCommitteeRow,
} from '@/lib/data-sources/openstates-people/index';
import { getJurisdictionCommittees } from '@/lib/data-sources/openstates-people/load-committees';
import { openStatesAPI } from '@/lib/openstates-api';
import { lookupStateCommittee } from '@/lib/state-committee-lookup';

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/cache', () => ({
  cache: { get: jest.fn(async () => null), set: jest.fn(async () => true) },
}));

describe('buildCommitteesCorpus', () => {
  const corpus = buildCommitteesCorpus({
    byJurisdiction: new Map([
      [
        'MI',
        [
          {
            id: 'ocd-organization/bbb',
            name: 'Senate Finance',
            classification: 'committee',
            chamber: 'upper',
            links: [{ url: 'https://senate.mi.gov/finance' }],
            members: [
              { name: 'Jane Doe', role: 'chair', person_id: 'ocd-person/p1' },
              { name: 'No Id', role: 'member' },
            ],
          },
          {
            id: 'ocd-organization/aaa',
            name: 'Appropriations Subcommittee on K-12',
            classification: 'subcommittee',
            chamber: 'lower',
            parent: 'ocd-organization/zzz',
          },
          { name: 'No id — skipped' },
        ],
      ],
    ]),
    generatedAt: '2026-09-23T00:00:00Z',
    upstreamCommit: 'abc',
    upstreamCommittedAt: '2026-09-22T00:00:00Z',
  });

  it('keeps committees with ids, sorted by name, grouped per jurisdiction', () => {
    expect(corpus.rows.map(r => r[1])).toEqual([
      'Appropriations Subcommittee on K-12',
      'Senate Finance',
    ]);
    expect(corpus.jurisdictions).toEqual([['MI', 0, 2]]);
    expect(corpus.meta).toMatchObject({ committees: 2, memberships: 2 });
  });

  it('round-trips ids, parent, roles and person ids', () => {
    const [sub, finance] = corpus.rows.map(r => decodeCommitteeRow(corpus, r, 'MI'));
    expect(sub).toMatchObject({
      id: 'ocd-organization/aaa',
      classification: 'subcommittee',
      chamber: 'lower',
      parentId: 'ocd-organization/zzz',
    });
    expect(finance?.members).toEqual([
      { name: 'Jane Doe', role: 'chair', personId: 'ocd-person/p1' },
      { name: 'No Id', role: 'member', personId: null },
    ]);
    expect(finance?.links).toEqual(['https://senate.mi.gov/finance']);
  });
});

describe('committed committee corpus (data/openstates-committees.json.br)', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('covers the states', async () => {
    const mi = await getJurisdictionCommittees('mi');
    expect(mi?.length).toBeGreaterThan(20);
    expect(await getJurisdictionCommittees('zz')).toBeNull();
  });

  it('serves the committee list and a detail page without calling OpenStates', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const committees = await openStatesAPI.getCommittees('mi');
    const withMembers = committees.find(c => (c.memberships?.length ?? 0) > 0);
    expect(withMembers).toBeDefined();
    if (!withMembers) return;

    // Members carry party from the roster corpus, as the API's person block did.
    expect(withMembers.memberships?.some(m => m.person?.party)).toBe(true);

    const encoded = Buffer.from(withMembers.id).toString('base64url');
    const result = await lookupStateCommittee('mi', encoded);
    expect(result.status).toBe('found');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('applies the chamber filter', async () => {
    const upper = await openStatesAPI.getCommittees('mi', 'upper');
    expect(upper.length).toBeGreaterThan(0);
    expect(upper.every(c => c.chamber === 'upper')).toBe(true);
  });
});
