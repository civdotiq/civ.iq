/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * The committee list behind /committees and the sitemap is rebuilt from
 * congress-legislators' committees-current.yaml, keeping stored Wikipedia
 * summaries by ID (and under the real ID where the old file used a wrong one).
 */

import {
  buildCommitteeList,
  displayCommitteeName,
  type StoredCommitteeList,
} from '@/lib/data/committee-list-sync';

const previous: StoredCommitteeList = {
  committees: {
    SSJU: {
      committeeId: 'SSJU',
      committeeName: 'Committee on the Judiciary',
      chamber: 'Senate',
      wikipedia: { title: 'United States Senate Committee on the Judiciary' },
      history: 'Established 1816.',
      subcommittees: [
        { code: 'SSJU01', name: 'Antitrust' },
        { code: 'SSJU02', name: 'A subcommittee from an earlier Congress' },
      ],
    },
    SSFO: {
      committeeId: 'SSFO',
      committeeName: 'Committee on Foreign Relations',
      chamber: 'Senate',
      wikipedia: { title: 'United States Senate Committee on Foreign Relations' },
      subcommittees: [],
    },
    HLET: {
      committeeId: 'HLET',
      committeeName: 'Committee on Ethics',
      chamber: 'House',
      subcommittees: [],
    },
  },
  metadata: { generatedAt: '2025-12-15T21:32:32.213Z', totalSubcommittees: 2 },
};

const upstream = [
  {
    thomas_id: 'SSJU',
    type: 'senate' as const,
    name: 'Senate Committee on the Judiciary',
    subcommittees: [
      { thomas_id: '01', name: 'Antitrust, Competition Policy, and Consumer Rights' },
    ],
  },
  { thomas_id: 'SSFR', type: 'senate' as const, name: 'Senate Committee on Foreign Relations' },
  {
    thomas_id: 'HSZS',
    type: 'house' as const,
    name: 'House Select Committee on the Strategic Competition Between the United States and the Chinese Communist Party',
  },
];

describe('buildCommitteeList', () => {
  const list = buildCommitteeList(upstream, previous, new Date('2026-10-30T00:00:00Z'));

  it('lists exactly the current committees and subcommittees, with full IDs', () => {
    expect(Object.keys(list.committees)).toEqual(['SSJU', 'SSFR', 'HSZS']);
    expect(list.committees.SSJU?.subcommittees).toEqual([
      { code: 'SSJU01', name: 'Antitrust, Competition Policy, and Consumer Rights' },
    ]);
    expect(list.metadata.totalSubcommittees).toBe(1);
  });

  it('keeps stored fields by ID, and under the real ID for a renamed one', () => {
    expect(list.committees.SSJU?.history).toBe('Established 1816.');
    expect(list.committees.SSFR?.wikipedia).toEqual({
      title: 'United States Senate Committee on Foreign Relations',
    });
    expect(list.committees.HSZS?.wikipedia).toBeUndefined();
  });

  it('drops committees congress-legislators no longer lists', () => {
    expect(list.committees.SSFO).toBeUndefined();
    expect(list.committees.HLET).toBeUndefined();
  });
});

describe('displayCommitteeName', () => {
  it('drops the chamber the hub already groups by', () => {
    expect(displayCommitteeName('Senate Committee on the Judiciary')).toBe(
      'Committee on the Judiciary'
    );
    expect(displayCommitteeName('House Select Committee on the Strategic Competition')).toBe(
      'Select Committee on the Strategic Competition'
    );
    expect(displayCommitteeName('Commission on Security and Cooperation in Europe')).toBe(
      'Commission on Security and Cooperation in Europe'
    );
  });
});
