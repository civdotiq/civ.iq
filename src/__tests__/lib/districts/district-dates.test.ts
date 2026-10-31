/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * A district page's "Latest record" is when its member's roster entry last
 * changed (the only fact on the page dated to the day); "Checked" is when its
 * Census and Wikidata data were fetched. Neither is ever the current time.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { districtLatestRecord, getDistrictDates } from '@/lib/districts/district-dates';
import type { DistrictDetails } from '@/lib/districts/district-details';
import { profileDatesLine } from '@/lib/provenance/profile-dates-line';

function district(overrides: Partial<DistrictDetails> = {}): DistrictDetails {
  return {
    id: 'mi-06',
    state: 'MI',
    number: '6',
    name: 'MI District 6',
    representative: { name: 'Debbie Dingell', party: 'Democratic', bioguideId: 'D000624' },
    demographics: undefined,
    political: {
      cookPVI: 'Data unavailable',
      lastElection: { winner: 'Data unavailable', margin: 0, turnout: 0 },
      registeredVoters: 0,
    },
    geography: { area: 0, counties: [], majorCities: [] },
    wikidata: {
      wikipediaUrl: 'https://en.wikipedia.org/wiki/Michigan%27s_6th_congressional_district',
    },
    fetchedAt: '2026-10-28T15:04:00.000Z',
    ...overrides,
  };
}

describe('districtLatestRecord', () => {
  it("is the member's roster change date", () => {
    expect(districtLatestRecord('D000624')).toBe('2025-01-04');
    expect(districtLatestRecord('d000624')).toBe('2025-01-04');
  });

  it('is null for an empty seat or an unknown member', () => {
    expect(districtLatestRecord(null)).toBeNull();
    expect(districtLatestRecord('')).toBeNull();
    expect(districtLatestRecord('Z999999')).toBeNull();
  });
});

describe('getDistrictDates', () => {
  it('dates the record by its roster change and checks it by its fetch time', () => {
    const dates = getDistrictDates(district());
    expect(dates.latestRecord).toBe('2025-01-04');
    expect(dates.checkedAt).toBe('2026-10-28T15:04:00.000Z');
    expect(profileDatesLine(dates)).toBe('Latest record: Jan 4, 2025 · Checked: Oct 28, 2026');
  });

  it('leaves Checked out when neither Census nor Wikidata data came back', () => {
    const dates = getDistrictDates(district({ wikidata: null }));
    expect(dates.checkedAt).toBeNull();
    expect(profileDatesLine(dates)).toBe('Latest record: Jan 4, 2025');
  });

  it('leaves Checked out when the fetch time is missing or malformed', () => {
    expect(getDistrictDates(district({ fetchedAt: undefined })).checkedAt).toBeNull();
    expect(getDistrictDates(district({ fetchedAt: 'yesterday' })).checkedAt).toBeNull();
  });

  it('leaves Latest record out when the member has no roster history', () => {
    const dates = getDistrictDates(
      district({ representative: { name: 'X', party: 'Independent', bioguideId: 'Z999999' } })
    );
    expect(dates.latestRecord).toBeNull();
    expect(profileDatesLine(dates)).toBe('Checked: Oct 28, 2026');
  });
});
