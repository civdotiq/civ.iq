/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { EnhancedRepresentative } from '@/types/representative';
import type { ChamberBaselines } from '@/lib/intelligence/analyzers/chamber-baselines';
import { buildProfilePreview } from '../profile-preview-data';

function rep(overrides: Partial<EnhancedRepresentative>): EnhancedRepresentative {
  return {
    bioguideId: 'T000481',
    name: 'Rashida Tlaib',
    party: 'Democrat',
    state: 'MI',
    district: '12',
    chamber: 'House',
    currentTerm: { start: '2025-01-03', end: '2027-01-03', phone: '202-225-5126' },
    ...overrides,
  } as EnhancedRepresentative;
}

function baselines(fullCoverage: boolean, cast?: number): ChamberBaselines {
  return {
    fullCoverage,
    coverageLabel: fullCoverage ? '119th Congress to date' : 'recent sample',
    members: cast === undefined ? {} : { T000481: { cast } },
  } as unknown as ChamberBaselines;
}

const summary = { billsSponsored: 48, totalRaised: 2_800_000, financeCycle: 2026 };

describe('buildProfilePreview', () => {
  it('labels every number with its period', () => {
    const p = buildProfilePreview(rep({}), baselines(true, 660), summary, 119);
    expect(p.role).toBe('U.S. Representative');
    expect(p.place).toBe("Michigan's 12th District");
    expect(p.phone).toBe('202-225-5126');
    expect(p.stats.map(s => [s.label, s.value, s.period])).toEqual([
      ['Roll-call votes cast', 660, '119th Congress to date'],
      ['Bills sponsored', 48, '119th Congress'],
      ['Raised', 2_800_000, '2026 cycle (FEC)'],
    ]);
    expect(p.sources).toEqual(['congress-legislators', 'House Clerk', 'Congress.gov', 'FEC']);
  });

  it('leaves off numbers that are not cached instead of guessing', () => {
    const p = buildProfilePreview(rep({}), null, null, 119);
    expect(p.stats).toEqual([]);
    expect(p.sources).toEqual(['congress-legislators']);
  });

  it('drops votes from a partial sweep and flagged-unavailable summary fields', () => {
    const p = buildProfilePreview(
      rep({}),
      baselines(false, 300),
      { ...summary, financeUnavailable: true, legislationUnavailable: true },
      119
    );
    expect(p.stats).toEqual([]);
  });

  it('uses the official name when the roster has one', () => {
    const norton = rep({
      name: 'Eleanor Norton',
      fullName: { first: 'Eleanor', last: 'Norton', official: 'Eleanor Holmes Norton' },
    });
    expect(buildProfilePreview(norton, null, null, 119).name).toBe('Eleanor Holmes Norton');
  });

  it('names senators, at-large seats and non-voting seats correctly', () => {
    expect(
      buildProfilePreview(rep({ chamber: 'Senate', state: 'VT' }), null, null, 119)
    ).toMatchObject({ role: 'U.S. Senator', place: 'Vermont' });
    expect(buildProfilePreview(rep({ state: 'WY', district: '0' }), null, null, 119)).toMatchObject(
      {
        role: 'U.S. Representative',
        place: 'Wyoming at large',
      }
    );
    expect(buildProfilePreview(rep({ state: 'PR', district: '0' }), null, null, 119)).toMatchObject(
      {
        role: 'Resident Commissioner',
      }
    );
    expect(buildProfilePreview(rep({ state: 'MI', district: '1' }), null, null, 119).place).toBe(
      "Michigan's 1st District"
    );
  });
});
