/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for congress.service.ts — the congress-legislators integration that
 * 60+ modules import. Covers constitutional voting-status rules, the
 * enhanced-representative assembly, committee membership transformation,
 * the historical fallback, and the empty-array cache-poisoning guard.
 *
 * Fixture term dates are derived from the sitting Congress at runtime so
 * the suite never rots across a Congress boundary. GitHub fetches are
 * mocked with YAML fixtures; both cache layers are mocked.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Pass-through so every call exercises the real fetch + parse path.
jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((_key: string, fn: () => unknown) => fn()),
}));

// The service calls getFileCache() at module load, so the mock object must
// be created inside the hoisted factory, not in a test-file const.
jest.mock('@/lib/cache/file-cache', () => {
  const fileCache = { get: jest.fn(), set: jest.fn() };
  return { getFileCache: () => fileCache };
});

import yaml from 'js-yaml';
import { cachedFetch } from '@/lib/cache';
import { getFileCache } from '@/lib/cache/file-cache';
import {
  getEnhancedRepresentative,
  getAllEnhancedRepresentatives,
  fetchCommitteeMemberships,
  getOpenSecretsId,
  getFECIds,
  resetCongressMemos,
  type CongressLegislator,
} from '@/features/representatives/services/congress.service';
import {
  getCurrentCongressNumber,
  getCongressDateRange,
  getNextHouseElection,
  getNextSenateElection,
} from '@/lib/data/congressional-constants';

const mockFileCache = getFileCache() as unknown as { get: jest.Mock; set: jest.Mock };
const mockCachedFetch = cachedFetch as jest.Mock;

const CURRENT_CONGRESS = getCurrentCongressNumber();
const { start: congressStart, end: congressEnd } = getCongressDateRange(CURRENT_CONGRESS);
const TERM_START = congressStart.toISOString().slice(0, 10);
const TERM_END = congressEnd.toISOString().slice(0, 10);

const CURRENT_LEGISLATORS: CongressLegislator[] = [
  {
    id: { bioguide: 'A000001', opensecrets: 'N00000001', fec: ['H0CA00001'], govtrack: 400001 },
    name: { first: 'Alice', last: 'Anderson', official_full: 'Alice B. Anderson' },
    bio: { gender: 'F', birthday: '1960-05-01' },
    terms: [
      {
        type: 'sen',
        start: '2019-01-03',
        end: '2025-01-03',
        state: 'CA',
        party: 'Democrat',
        class: 2,
      },
      {
        type: 'sen',
        start: TERM_START,
        end: TERM_END,
        state: 'CA',
        party: 'Democrat',
        class: 2,
        state_rank: 'junior',
        phone: '202-224-0001',
        url: 'https://anderson.senate.gov',
      },
    ],
  },
  {
    id: { bioguide: 'B000002' },
    name: { first: 'Bob', last: 'Baker' },
    bio: { gender: 'M' },
    terms: [
      {
        type: 'rep',
        start: TERM_START,
        end: TERM_END,
        state: 'TX',
        district: 7,
        party: 'Republican',
      },
    ],
  },
  {
    id: { bioguide: 'C000003' },
    name: { first: 'Carla', last: 'Cruz' },
    bio: { gender: 'F' },
    terms: [
      {
        type: 'rep',
        start: TERM_START,
        end: TERM_END,
        state: 'DC',
        district: 0,
        party: 'Democrat',
      },
    ],
  },
  {
    id: { bioguide: 'D000004' },
    name: { first: 'Diego', last: 'Diaz' },
    bio: { gender: 'M' },
    terms: [
      {
        type: 'rep',
        start: TERM_START,
        end: TERM_END,
        state: 'PR',
        district: 0,
        party: 'Republican',
      },
    ],
  },
];

const HISTORICAL_LEGISLATORS: CongressLegislator[] = [
  {
    id: { bioguide: 'H000005' },
    name: { first: 'Harold', last: 'History' },
    bio: { gender: 'M' },
    terms: [
      {
        type: 'rep',
        start: '2007-01-04',
        end: '2009-01-03',
        state: 'OH',
        district: 3,
        party: 'Democrat',
      },
    ],
  },
];

const SOCIAL_MEDIA = [
  { bioguide: 'A000001', social: { twitter: 'SenAnderson', facebook: 'senanderson' } },
];

// committee-membership-current.yaml is keyed by committee id.
const COMMITTEE_MEMBERSHIP = {
  SSJU: [
    { name: 'Alice Anderson', bioguide: 'A000001', rank: 1, party: 'majority', title: 'Chair' },
    { name: 'Someone Else', bioguide: 'Z000099', rank: 2, party: 'minority' },
  ],
  HSAG: [{ name: 'Bob Baker', bioguide: 'B000002', rank: 5, party: 'majority' }],
};

const COMMITTEES = [
  {
    thomas_id: 'SSJU',
    senate_committee_id: 'JU00',
    type: 'senate',
    name: 'Committee on the Judiciary',
  },
  {
    thomas_id: 'HSAG',
    house_committee_id: 'AG00',
    type: 'house',
    name: 'Committee on Agriculture',
  },
];

function mockGitHubFetch(
  overrides: Partial<
    Record<'current' | 'historical' | 'social' | 'membership' | 'committees', unknown>
  > = {}
) {
  const bodies: Record<string, unknown> = {
    'legislators-current.yaml': overrides.current ?? CURRENT_LEGISLATORS,
    'legislators-historical.yaml': overrides.historical ?? HISTORICAL_LEGISLATORS,
    'legislators-social-media.yaml': overrides.social ?? SOCIAL_MEDIA,
    'committee-membership-current.yaml': overrides.membership ?? COMMITTEE_MEMBERSHIP,
    'committees-current.yaml': overrides.committees ?? COMMITTEES,
  };

  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const file = Object.keys(bodies).find(name => url.endsWith(name));
    if (!file) {
      return { ok: false, status: 404, statusText: 'Not Found' } as Response;
    }
    return {
      ok: true,
      text: async () => yaml.dump(bodies[file]),
    } as Response;
  }) as jest.Mock;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Both memos are module-level and survive between tests, so a stale entry
  // would mask the fetch behaviour each case is asserting on.
  resetCongressMemos();
  mockFileCache.get.mockResolvedValue(null);
  mockFileCache.set.mockResolvedValue(undefined);
  mockGitHubFetch();
});

describe('getEnhancedRepresentative', () => {
  it('assembles a senator with ids, social media, and committee roles', async () => {
    const rep = await getEnhancedRepresentative('A000001');

    expect(rep).not.toBeNull();
    expect(rep?.name).toBe('Alice Anderson');
    expect(rep?.chamber).toBe('Senate');
    expect(rep?.title).toBe('U.S. Senator');
    expect(rep?.state).toBe('CA');
    expect(rep?.party).toBe('Democrat');
    expect(rep?.votingMember).toBe(true);
    expect(rep?.role).toBe('Senator');
    expect(rep?.isHistorical).toBe(false);
    expect(rep?.imageUrl).toBe('/api/representative-photo/A000001');

    // Committee names resolved from committees-current.yaml, role from title.
    // `id` mirrors thomas_id — the site-wide committee URL key — so schema.org
    // memberOf URLs and /committee links always resolve.
    expect(rep?.committees).toEqual([
      { name: 'Committee on the Judiciary', role: 'Chair', thomas_id: 'SSJU', id: 'SSJU' },
    ]);

    expect(rep?.socialMedia?.twitter).toBe('SenAnderson');
    expect(rep?.ids?.opensecrets).toBe('N00000001');
    expect(rep?.ids?.fec).toEqual(['H0CA00001']);
    expect(rep?.currentTerm?.phone).toBe('202-224-0001');
    expect(rep?.currentTerm?.stateRank).toBe('junior');
    expect(Array.isArray(rep?.caucuses)).toBe(true);
  });

  it('derives congress numbers from term start years and sorts terms newest-first', async () => {
    const rep = await getEnhancedRepresentative('A000001');

    expect(rep?.terms?.[0]?.congress).toBe(String(CURRENT_CONGRESS));
    // 2019 start → 116th Congress: floor((2019 - 1789) / 2) + 1
    expect(rep?.terms?.[1]?.congress).toBe('116');
    expect(rep?.terms?.map(t => t.startYear)).toEqual([TERM_START.slice(0, 4), '2019']);
  });

  it('marks state House members as voting Representatives', async () => {
    const rep = await getEnhancedRepresentative('B000002');
    expect(rep?.chamber).toBe('House');
    expect(rep?.votingMember).toBe(true);
    expect(rep?.role).toBe('Representative');
    expect(rep?.district).toBe('7');
  });

  it('marks DC delegates as non-voting per Article IV, Section 3', async () => {
    const rep = await getEnhancedRepresentative('C000003');
    expect(rep?.votingMember).toBe(false);
    expect(rep?.role).toBe('Delegate');
  });

  it('marks the Puerto Rico member as a non-voting Resident Commissioner', async () => {
    const rep = await getEnhancedRepresentative('D000004');
    expect(rep?.votingMember).toBe(false);
    expect(rep?.role).toBe('Resident Commissioner');
  });

  it('falls back to historical data and flags the member as historical', async () => {
    const rep = await getEnhancedRepresentative('H000005');

    expect(rep).not.toBeNull();
    expect(rep?.name).toBe('Harold History');
    expect(rep?.isHistorical).toBe(true);
    expect(rep?.state).toBe('OH');
    // No current-congress term: falls back to the member's last term.
    expect(rep?.currentTerm?.end).toBe('2009-01-03');
  });

  it('returns null when the member exists nowhere — never fabricates', async () => {
    await expect(getEnhancedRepresentative('X999999')).resolves.toBeNull();
  });
});

describe('getAllEnhancedRepresentatives', () => {
  it('returns all current members including non-voting delegates', async () => {
    const reps = await getAllEnhancedRepresentatives();

    expect(reps.map(r => r.bioguideId).sort()).toEqual([
      'A000001',
      'B000002',
      'C000003',
      'D000004',
    ]);

    const delegate = reps.find(r => r.bioguideId === 'C000003');
    expect(delegate?.votingMember).toBe(false);
    expect(delegate?.role).toBe('Delegate');
  });

  it('excludes members whose terms all ended before the sitting Congress', async () => {
    mockGitHubFetch({ current: [...CURRENT_LEGISLATORS, ...HISTORICAL_LEGISLATORS] });

    const reps = await getAllEnhancedRepresentatives();
    expect(reps.find(r => r.bioguideId === 'H000005')).toBeUndefined();
  });

  it('computes tenure and next election for each member', async () => {
    const reps = await getAllEnhancedRepresentatives();

    const senator = reps.find(r => r.bioguideId === 'A000001');
    // Consecutive Senate service since 2019.
    expect(senator?.yearsInOffice).toBe(
      Math.round((Date.now() - new Date('2019-01-03').getTime()) / (1000 * 60 * 60 * 24) / 365.25)
    );
    // Senate class → election year comes from the shared 6-year-cycle helper
    // (covered with fixed dates in congressional-constants.test.ts).
    expect(senator?.nextElection).toBe(getNextSenateElection('CA', 2).toString());

    const houseMember = reps.find(r => r.bioguideId === 'B000002');
    // House members are always up in the next even year.
    expect(houseMember?.nextElection).toBe(getNextHouseElection().toString());
    expect(Number(houseMember?.nextElection) % 2).toBe(0);
  });

  it('returns an empty array when upstream data is unavailable', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable' });

    await expect(getAllEnhancedRepresentatives()).resolves.toEqual([]);
  });
});

describe('fetchCommitteeMemberships', () => {
  it('regroups the committee-keyed YAML by member bioguide', async () => {
    const memberships = await fetchCommitteeMemberships();

    const alice = memberships.find(m => m.bioguide === 'A000001');
    expect(alice?.committees).toEqual([
      { thomas_id: 'SSJU', rank: 1, party: 'majority', title: 'Chair', chamber: 'senate' },
    ]);

    // Chamber is inferred from the committee id prefix (H → house).
    const bob = memberships.find(m => m.bioguide === 'B000002');
    expect(bob?.committees?.[0]).toMatchObject({ thomas_id: 'HSAG', chamber: 'house' });
  });

  it('returns an empty array when the fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Error' });
    await expect(fetchCommitteeMemberships()).resolves.toEqual([]);
  });
});

describe('cache-poisoning guard (persistentCachedFetch)', () => {
  it('serves from the file cache without fetching when it holds data', async () => {
    mockFileCache.get.mockImplementation(async (key: string) => {
      if (key === 'congress-legislators-current') return CURRENT_LEGISLATORS;
      if (key === 'congress-legislators-social-media') return SOCIAL_MEDIA;
      return null;
    });

    const reps = await getAllEnhancedRepresentatives();

    expect(reps).toHaveLength(4);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('treats an empty cached array as a miss and refetches', async () => {
    mockFileCache.get.mockResolvedValue([]);

    const reps = await getAllEnhancedRepresentatives();

    expect(reps).toHaveLength(4);
    expect(global.fetch).toHaveBeenCalled();
    // The fresh non-empty result is persisted.
    expect(mockFileCache.set).toHaveBeenCalledWith(
      'congress-legislators-current',
      expect.arrayContaining([
        expect.objectContaining({
          id: {
            bioguide: 'A000001',
            opensecrets: 'N00000001',
            fec: ['H0CA00001'],
            govtrack: 400001,
          },
        }),
      ]),
      expect.any(Number)
    );
  });

  it('never persists an empty result after a failed fetch', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable' });

    await getAllEnhancedRepresentatives();

    expect(mockFileCache.set).not.toHaveBeenCalled();
  });
});

describe('roster memo (getAllEnhancedRepresentatives)', () => {
  const rosterFetchCount = () =>
    (global.fetch as jest.Mock).mock.calls.filter(([url]) =>
      String(url).endsWith('legislators-current.yaml')
    ).length;

  it('serves a second call from memory without reaching the network', async () => {
    await getAllEnhancedRepresentatives();
    (global.fetch as jest.Mock).mockClear();

    const reps = await getAllEnhancedRepresentatives();

    expect(reps).toHaveLength(4);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('collapses concurrent callers into a single fetch', async () => {
    const results = await Promise.all([
      getAllEnhancedRepresentatives(),
      getAllEnhancedRepresentatives(),
      getAllEnhancedRepresentatives(),
    ]);

    for (const reps of results) {
      expect(reps).toHaveLength(4);
    }
    expect(rosterFetchCount()).toBe(1);
  });

  it('hands out a copy so one caller cannot reorder the roster for others', async () => {
    const first = await getAllEnhancedRepresentatives();
    first.reverse();

    const second = await getAllEnhancedRepresentatives();

    expect(second.map(r => r.bioguideId)).not.toEqual(first.map(r => r.bioguideId));
  });

  it('does not memoise an empty roster after an upstream failure', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable' });

    await expect(getAllEnhancedRepresentatives()).resolves.toEqual([]);

    // Once upstream recovers the next call must go back out, rather than serve
    // the empty array for a full TTL window.
    mockGitHubFetch();
    await expect(getAllEnhancedRepresentatives()).resolves.toHaveLength(4);
  });

  it('resetCongressMemos sends the next call back to the source', async () => {
    await getAllEnhancedRepresentatives();
    (global.fetch as jest.Mock).mockClear();

    resetCongressMemos();
    await getAllEnhancedRepresentatives();

    expect(rosterFetchCount()).toBe(1);
  });
});

describe('blob memo (shared by both representative paths)', () => {
  const rosterFetchCount = () =>
    (global.fetch as jest.Mock).mock.calls.filter(([url]) =>
      String(url).endsWith('legislators-current.yaml')
    ).length;

  it('memoises the roster for the single-representative path too', async () => {
    // getEnhancedRepresentative fetches the four congress blobs directly rather
    // than going through getAllEnhancedRepresentatives, so a memo placed only on
    // the roster builder would miss the hot path for every /representative page.
    await getEnhancedRepresentative('A000001');
    await getEnhancedRepresentative('B000002');

    expect(rosterFetchCount()).toBe(1);
  });

  it('shares one memo between the single and bulk paths', async () => {
    await getEnhancedRepresentative('A000001');
    await getAllEnhancedRepresentatives();

    expect(rosterFetchCount()).toBe(1);
  });

  it('writes the file tier even when the value came from the cache below', async () => {
    // The file-cache write used to live inside the fetchFn handed to
    // cachedFetch, which only runs it on a MISS. With a warm cache below — the
    // normal case in production — the file tier was never written and so could
    // never be hit, no matter where its directory pointed.
    const passThrough = mockCachedFetch.getMockImplementation()!;
    mockCachedFetch.mockImplementation(async (key: string) => {
      if (key === 'congress-legislators-current') return CURRENT_LEGISLATORS;
      if (key === 'congress-legislators-social-media') return SOCIAL_MEDIA;
      return [];
    });

    try {
      await getAllEnhancedRepresentatives();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockFileCache.set).toHaveBeenCalledWith(
        'congress-legislators-current',
        CURRENT_LEGISLATORS,
        expect.any(Number)
      );
    } finally {
      mockCachedFetch.mockImplementation(passThrough);
    }
  });
});

describe('id helpers', () => {
  it('reads ids off an enhanced representative', async () => {
    const rep = await getEnhancedRepresentative('A000001');

    expect(getOpenSecretsId('A000001', rep ?? undefined)).toBe('N00000001');
    expect(getFECIds('A000001', rep ?? undefined)).toEqual(['H0CA00001']);
  });

  it('returns safe empties without enhanced data', () => {
    expect(getOpenSecretsId('A000001')).toBeNull();
    expect(getFECIds('A000001')).toEqual([]);
  });
});
