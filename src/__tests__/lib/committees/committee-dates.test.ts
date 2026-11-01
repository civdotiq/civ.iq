/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Committee page dates (src/lib/committees/committee-dates.ts) and sources
 * list: Latest record from the committee history file, Checked from the
 * files' saved download times, never the render time.
 */

jest.mock('@/data/committee-roster-history.json', () => ({
  throughCommit: 'abc',
  throughDate: '2026-09-02T17:40:14Z',
  source: 'test',
  committees: {
    SSJU: { fingerprint: 'x', changedOn: '2026-07-15' },
    SSJU01: { fingerprint: 'y', changedOn: '2025-04-04' },
  },
}));

const committeeFilesCheckedAt = jest.fn<Promise<string | null>, []>();
jest.mock('@/features/representatives/services/congress.service', () => ({
  committeeFilesCheckedAt: () => committeeFilesCheckedAt(),
}));

import { committeeChangedOn, getCommitteeDates } from '@/lib/committees/committee-dates';
import { committeePageSources } from '@/lib/provenance/page-sources';

describe('committeeChangedOn', () => {
  it('reads the history by ID, case-insensitively, and is null for an unknown ID', () => {
    expect(committeeChangedOn('SSJU')).toBe('2026-07-15');
    expect(committeeChangedOn('ssju01')).toBe('2025-04-04');
    expect(committeeChangedOn('ZZZZ99')).toBeNull();
    expect(committeeChangedOn(null)).toBeNull();
  });
});

describe('getCommitteeDates', () => {
  it('pairs the history date with the files’ saved download time', async () => {
    committeeFilesCheckedAt.mockResolvedValue('2026-11-01T09:02:58Z');
    const dates = await getCommitteeDates('SSJU');
    expect(dates.latestRecord).toBe('2026-07-15');
    expect(dates.checkedAt).toBe('2026-11-01T09:02:58Z');
  });

  it('leaves Checked out when no download time is saved, and both out for an unknown committee', async () => {
    committeeFilesCheckedAt.mockResolvedValue(null);
    expect(await getCommitteeDates('SSJU')).toMatchObject({
      latestRecord: '2026-07-15',
      checkedAt: null,
    });
    expect(await getCommitteeDates('ZZZZ99')).toMatchObject({
      latestRecord: null,
      checkedAt: null,
    });
  });
});

describe('committeePageSources', () => {
  it('lists the two files, Congress.gov, and the browser-loaded sections, dating only the files', () => {
    const sources = committeePageSources({
      checkedAt: '2026-11-01T09:02:58Z',
      congressGovUrl: 'https://www.congress.gov/committee/senate-judiciary-committee/ssju00',
    });
    expect(sources.map(s => s.shortName)).toEqual([
      'congress-legislators',
      'Congress.gov',
      'GovInfo',
      'Federal Register',
    ]);
    expect(sources[0]?.fetchedAt).toBe('2026-11-01T09:02:58Z');
    expect(sources[1]?.href).toBe(
      'https://www.congress.gov/committee/senate-judiciary-committee/ssju00'
    );
    expect(sources.slice(1).every(s => !s.fetchedAt && !s.asOf)).toBe(true);
  });

  it('carries no date when the download time is not saved', () => {
    const sources = committeePageSources({ checkedAt: null });
    expect(sources.every(s => !s.fetchedAt && !s.asOf)).toBe(true);
  });
});
