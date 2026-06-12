/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Regression test for the committee chair bug: Vice Chair titles were
 * being normalized to "Chair" because the substring check
 * `title.includes('Chair')` also matches "Vice Chair". This caused the
 * leadership pod to overwrite the real chair with the vice chair, and
 * the member list to tag two members as "Chair".
 */

import { getCommitteeDataService } from '@/lib/services/committee.service';

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((_key: string, fetcher: () => Promise<unknown>) => fetcher()),
  cache: { delete: jest.fn() },
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    metric: jest.fn(),
  },
}));

jest.mock('@/lib/data/committee-jurisdictions', () => ({
  getCommitteeJurisdiction: jest.fn().mockReturnValue(undefined),
}));

jest.mock('@/features/representatives/services/congress.service', () => ({
  fetchCommittees: jest.fn().mockResolvedValue([
    {
      thomas_id: 'HSIF',
      name: 'House Committee on Energy and Commerce',
      type: 'house',
      jurisdiction: 'Commerce',
      subcommittees: [],
    },
  ]),
  fetchCommitteeMemberships: jest.fn().mockResolvedValue([
    {
      bioguide: 'G000558',
      committees: [{ thomas_id: 'HSIF', title: 'Chair', party: 'majority', rank: 1 }],
    },
    {
      bioguide: 'D000628',
      committees: [{ thomas_id: 'HSIF', title: 'Vice Chair', party: 'majority', rank: 8 }],
    },
    {
      bioguide: 'P000034',
      committees: [{ thomas_id: 'HSIF', title: 'Ranking Member', party: 'minority', rank: 1 }],
    },
  ]),
  getAllEnhancedRepresentatives: jest.fn().mockResolvedValue([
    {
      bioguideId: 'G000558',
      name: 'Brett Guthrie',
      firstName: 'Brett',
      lastName: 'Guthrie',
      party: 'Republican',
      state: 'KY',
      district: '2',
      chamber: 'House',
    },
    {
      bioguideId: 'D000628',
      name: 'Neal P. Dunn',
      firstName: 'Neal',
      lastName: 'Dunn',
      party: 'Republican',
      state: 'FL',
      district: '2',
      chamber: 'House',
    },
    {
      bioguideId: 'P000034',
      name: 'Frank Pallone, Jr.',
      firstName: 'Frank',
      lastName: 'Pallone',
      party: 'Democratic',
      state: 'NJ',
      district: '6',
      chamber: 'House',
    },
  ]),
}));

describe('committee.service — chair normalization', () => {
  it('keeps Vice Chair out of the Chair slot and tags exactly one member as Chair', async () => {
    const result = await getCommitteeDataService('HSIF');

    expect(result).not.toBeNull();
    expect(result!.leadership.chair?.representative.bioguideId).toBe('G000558');
    expect(result!.leadership.rankingMember?.representative.bioguideId).toBe('P000034');

    const chairs = result!.members.filter(m => m.role === 'Chair');
    expect(chairs).toHaveLength(1);
    expect(chairs[0]!.representative.bioguideId).toBe('G000558');

    const viceChairs = result!.members.filter(m => m.role === 'Vice Chair');
    expect(viceChairs).toHaveLength(1);
    expect(viceChairs[0]!.representative.bioguideId).toBe('D000628');
  });
});
