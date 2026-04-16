/**
 * Tests for scripts/sync-bioguide-fec.ts pure functions.
 *
 * The script itself is not executed (the `main` entry point is gated on
 * process.argv) so these tests only exercise the merge/diff/office-match
 * logic and the FEC candidate scoring/matching helpers.
 */

import {
  buildMappingFromLegislators,
  mergeWithExisting,
  summarizeDiff,
  serialize,
  scoreFecMatch,
  pickBestFecMatch,
  proposeFallbackMappings,
  type Legislator,
  type MappingFile,
  type CongressMember,
  type FECCandidateSearchResult,
} from '../../../scripts/sync-bioguide-fec';

const fixedNow = new Date('2026-04-16T00:00:00Z');

function mkLegislator(overrides: Partial<Legislator> & { bioguide: string }): Legislator {
  const { bioguide, ...rest } = overrides;
  return {
    id: { bioguide, fec: ['H0CA00001'] },
    name: { first: 'Jane', last: 'Doe' },
    terms: [
      {
        type: 'rep',
        state: 'CA',
        district: 1,
        party: 'Democrat',
        start: '2023-01-03',
        end: '2025-01-03',
      },
    ],
    ...rest,
  } as Legislator;
}

describe('buildMappingFromLegislators', () => {
  it('builds an entry keyed by bioguide ID with canonical name format', () => {
    const { mappings } = buildMappingFromLegislators(
      [mkLegislator({ bioguide: 'D000001' })],
      fixedNow
    );
    expect(mappings.D000001).toEqual({
      fecId: 'H0CA00001',
      name: 'DOE, JANE',
      state: 'CA',
      district: '01',
      office: 'H',
      lastUpdated: '2026-04-16',
    });
  });

  it('picks the FEC ID whose chamber prefix matches the current office (House→Senate veterans)', () => {
    // A former House member now serving in the Senate must pick the S-prefix
    // ID, not the stale H-prefix one — regardless of array order.
    const sanders: Legislator = {
      id: { bioguide: 'S000033', fec: ['H8VT01016', 'S4VT00033'] },
      name: { first: 'Bernard', last: 'Sanders' },
      terms: [
        {
          type: 'sen',
          state: 'VT',
          party: 'Independent',
          start: '2019-01-03',
          end: '2025-01-03',
        },
      ],
    };
    const { mappings } = buildMappingFromLegislators([sanders], fixedNow);
    expect(mappings.S000033?.fecId).toBe('S4VT00033');
    expect(mappings.S000033?.office).toBe('S');
  });

  it('falls back to the first valid FEC ID when no chamber-prefix match exists', () => {
    // Unlikely in practice but the fallback keeps the sync resilient to
    // upstream anomalies.
    const weird: Legislator = {
      id: { bioguide: 'X000001', fec: ['P80003023', 'H0CA00001'] },
      name: { first: 'X', last: 'Y' },
      terms: [
        { type: 'sen', state: 'CA', party: 'Democrat', start: '2023-01-03', end: '2029-01-03' },
      ],
    };
    const { mappings } = buildMappingFromLegislators([weird], fixedNow);
    // No S-prefix ID in the array; fallback picks the first format-valid one.
    expect(mappings.X000001?.fecId).toBe('H0CA00001');
  });

  it('zero-pads at-large district numbers to "00"', () => {
    const atLarge: Legislator = {
      id: { bioguide: 'B001318', fec: ['H2VT01076'] },
      name: { first: 'Becca', last: 'Balint' },
      terms: [
        {
          type: 'rep',
          state: 'VT',
          district: 0,
          party: 'Democrat',
          start: '2023-01-03',
          end: '2025-01-03',
        },
      ],
    };
    const { mappings } = buildMappingFromLegislators([atLarge], fixedNow);
    expect(mappings.B001318?.district).toBe('00');
  });

  it('skips members with no FEC ID and reports invalid IDs', () => {
    const noFec: Legislator = {
      id: { bioguide: 'N000001' },
      name: { first: 'N', last: 'O' },
      terms: [{ type: 'rep', state: 'CA', district: 1, start: '2023-01-03', end: '2025-01-03' }],
    };
    const invalid: Legislator = {
      id: { bioguide: 'I000001', fec: ['nonsense'] },
      name: { first: 'I', last: 'V' },
      terms: [{ type: 'rep', state: 'CA', district: 1, start: '2023-01-03', end: '2025-01-03' }],
    };
    const { mappings, skippedNoFec, skippedInvalidFec } = buildMappingFromLegislators(
      [noFec, invalid],
      fixedNow
    );
    expect(mappings.N000001).toBeUndefined();
    expect(mappings.I000001).toBeUndefined();
    expect(skippedNoFec).toBe(1);
    expect(skippedInvalidFec).toEqual(['I000001:nonsense']);
  });
});

describe('mergeWithExisting', () => {
  const todayEntry = (overrides: Partial<MappingFile[string]>) => ({
    fecId: 'H0CA00001',
    name: 'DOE, JANE',
    state: 'CA',
    district: '01',
    office: 'H' as const,
    lastUpdated: '2026-04-16',
    ...overrides,
  });

  it('preserves lastUpdated when all other fields are unchanged', () => {
    const existing: MappingFile = { A000001: todayEntry({ lastUpdated: '2025-09-18' }) };
    const fresh: MappingFile = { A000001: todayEntry({ lastUpdated: '2026-04-16' }) };
    const merged = mergeWithExisting(fresh, existing);
    expect(merged.A000001?.lastUpdated).toBe('2025-09-18');
  });

  it('updates lastUpdated when a core field changes', () => {
    const existing: MappingFile = {
      A000001: todayEntry({ fecId: 'H0CA99999', lastUpdated: '2025-09-18' }),
    };
    const fresh: MappingFile = {
      A000001: todayEntry({ fecId: 'H0CA00001', lastUpdated: '2026-04-16' }),
    };
    const merged = mergeWithExisting(fresh, existing);
    expect(merged.A000001?.fecId).toBe('H0CA00001');
    expect(merged.A000001?.lastUpdated).toBe('2026-04-16');
  });

  it('treats district absence/presence as a field change', () => {
    const existing: MappingFile = {
      A000001: { ...todayEntry({ lastUpdated: '2025-09-18' }), district: undefined } as any,
    };
    const fresh: MappingFile = { A000001: todayEntry({ district: '01' }) };
    const merged = mergeWithExisting(fresh, existing);
    expect(merged.A000001?.lastUpdated).toBe('2026-04-16');
  });

  it('passes through new entries unchanged', () => {
    const merged = mergeWithExisting({ A000001: todayEntry({}) }, null);
    expect(merged.A000001?.lastUpdated).toBe('2026-04-16');
  });
});

describe('summarizeDiff', () => {
  const entry = (overrides: Partial<MappingFile[string]> = {}) => ({
    fecId: 'H0CA00001',
    name: 'DOE, JANE',
    state: 'CA',
    district: '01',
    office: 'H' as const,
    lastUpdated: '2026-04-16',
    ...overrides,
  });

  it('categorizes added, removed, and updated entries', () => {
    const existing: MappingFile = {
      KEEP: entry({}),
      UPDATE: entry({ fecId: 'H0CA99999' }),
      REMOVE: entry({}),
    };
    const fresh: MappingFile = {
      KEEP: entry({}),
      UPDATE: entry({ fecId: 'H0CA00001' }),
      NEW: entry({}),
    };
    const diff = summarizeDiff(fresh, existing);
    expect(diff.added).toEqual(['NEW']);
    expect(diff.removed).toEqual(['REMOVE']);
    expect(diff.updated).toEqual(['UPDATE']);
  });

  it('ignores lastUpdated differences (only core fields matter)', () => {
    const existing: MappingFile = { A: entry({ lastUpdated: '2025-09-18' }) };
    const fresh: MappingFile = { A: entry({ lastUpdated: '2026-04-16' }) };
    const diff = summarizeDiff(fresh, existing);
    expect(diff.updated).toEqual([]);
  });
});

describe('serialize', () => {
  it('sorts entries by bioguide ID and ends with a newline', () => {
    const out = serialize({
      Z000001: {
        fecId: 'H0CA00001',
        name: 'Z',
        state: 'CA',
        office: 'H',
        lastUpdated: '2026-04-16',
      },
      A000001: {
        fecId: 'H0CA00002',
        name: 'A',
        state: 'CA',
        office: 'H',
        lastUpdated: '2026-04-16',
      },
    });
    expect(out.endsWith('\n')).toBe(true);
    const firstKey = out.match(/"([A-Z]\d{6})"/)?.[1];
    expect(firstKey).toBe('A000001');
  });
});

describe('scoreFecMatch', () => {
  const member: CongressMember = {
    bioguideId: 'D000001',
    name: 'Doe, Jane',
    state: 'CA',
    chamber: 'House',
    party: 'Democratic',
  };

  it('awards a perfect 1.0 for a full feature match', () => {
    const fec: FECCandidateSearchResult = {
      candidate_id: 'H0CA00001',
      name: 'DOE, JANE',
      state: 'CA',
      party: 'DEM',
      office: 'H',
    };
    const { score, breakdown } = scoreFecMatch(member, fec);
    expect(score).toBeCloseTo(1.0, 5);
    expect(breakdown).toEqual({
      lastName: 0.4,
      firstName: 0.2,
      state: 0.1,
      office: 0.2,
      party: 0.1,
    });
  });

  it('penalizes a different last name heavily', () => {
    const fec: FECCandidateSearchResult = {
      candidate_id: 'H0CA00001',
      name: 'OTHER, JANE',
      state: 'CA',
      party: 'DEM',
      office: 'H',
    };
    const { score } = scoreFecMatch(member, fec);
    // 0.0 last + 0.2 first + 0.1 state + 0.2 office + 0.1 party = 0.6
    expect(score).toBeCloseTo(0.6, 5);
  });

  it('normalizes party string variants', () => {
    const fec: FECCandidateSearchResult = {
      candidate_id: 'H0CA00001',
      name: 'DOE, JANE',
      state: 'CA',
      party: 'Democratic',
      office: 'H',
    };
    const { breakdown } = scoreFecMatch(member, fec);
    expect(breakdown.party).toBe(0.1);
  });

  it('requires office match even for same-name candidates', () => {
    const fec: FECCandidateSearchResult = {
      candidate_id: 'S0CA00001',
      name: 'DOE, JANE',
      state: 'CA',
      party: 'DEM',
      office: 'S', // candidate is running for Senate; member is in House
    };
    const { breakdown } = scoreFecMatch(member, fec);
    expect(breakdown.office).toBe(0);
  });
});

describe('pickBestFecMatch', () => {
  const member: CongressMember = {
    bioguideId: 'D000001',
    name: 'Doe, Jane',
    state: 'CA',
    chamber: 'House',
    party: 'Democratic',
  };

  it('picks the candidate with highest score, breaking ties on filing recency', () => {
    const results: FECCandidateSearchResult[] = [
      {
        candidate_id: 'H0CA00001',
        name: 'DOE, JANE',
        state: 'CA',
        party: 'DEM',
        office: 'H',
        last_file_date: '2020-01-01',
      },
      {
        candidate_id: 'H0CA00002',
        name: 'DOE, JANE',
        state: 'CA',
        party: 'DEM',
        office: 'H',
        last_file_date: '2024-01-01',
      },
    ];
    const pick = pickBestFecMatch(member, results);
    expect(pick?.candidate.candidate_id).toBe('H0CA00002');
    expect(pick?.score).toBeCloseTo(1.0, 5);
  });

  it('rejects candidates with malformed FEC IDs', () => {
    const results: FECCandidateSearchResult[] = [
      {
        candidate_id: 'not-a-fec-id',
        name: 'DOE, JANE',
        state: 'CA',
        party: 'DEM',
        office: 'H',
      },
    ];
    expect(pickBestFecMatch(member, results)).toBeNull();
  });

  it('returns null when given no results', () => {
    expect(pickBestFecMatch(member, [])).toBeNull();
  });
});

describe('proposeFallbackMappings', () => {
  const member: CongressMember = {
    bioguideId: 'N000001',
    name: 'New, Member',
    state: 'CA',
    district: '01',
    chamber: 'House',
    party: 'Democratic',
  };

  it('auto-applies high-confidence matches to the base mapping', async () => {
    const base: MappingFile = {};
    const search = jest.fn().mockResolvedValue([
      {
        candidate_id: 'H0CA00001',
        name: 'NEW, MEMBER',
        state: 'CA',
        party: 'DEM',
        office: 'H',
        last_file_date: '2026-01-01',
      },
    ]);

    const proposals = await proposeFallbackMappings(base, [member], search, fixedNow);

    expect(proposals).toHaveLength(1);
    expect(proposals[0]!.autoApplied).toBe(true);
    expect(proposals[0]!.confidence).toBeCloseTo(1.0, 5);
    expect(base.N000001?.fecId).toBe('H0CA00001');
    expect(base.N000001?.district).toBe('01');
  });

  it('flags low-confidence matches without writing to the mapping', async () => {
    const base: MappingFile = {};
    const search = jest.fn().mockResolvedValue([
      {
        candidate_id: 'H0CA00001',
        name: 'DIFFERENT, PERSON', // only office + state match → 0.3
        state: 'CA',
        party: 'REP',
        office: 'H',
      },
    ]);

    const proposals = await proposeFallbackMappings(base, [member], search, fixedNow);

    expect(proposals[0]!.autoApplied).toBe(false);
    expect(proposals[0]!.confidence).toBeLessThan(0.9);
    expect(base.N000001).toBeUndefined();
  });

  it('skips members already present in the base mapping', async () => {
    const base: MappingFile = {
      N000001: {
        fecId: 'H0CA99999',
        name: 'NEW, MEMBER',
        state: 'CA',
        office: 'H',
        lastUpdated: '2025-09-18',
      },
    };
    const search = jest.fn();
    const proposals = await proposeFallbackMappings(base, [member], search, fixedNow);
    expect(proposals).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });

  it('is resilient to FEC search failures — reports empty proposal, does not abort', async () => {
    const base: MappingFile = {};
    const search = jest.fn().mockRejectedValue(new Error('FEC down'));
    const proposals = await proposeFallbackMappings(base, [member], search, fixedNow);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]!.fecCandidate).toBeNull();
    expect(proposals[0]!.autoApplied).toBe(false);
    expect(base.N000001).toBeUndefined();
  });
});
