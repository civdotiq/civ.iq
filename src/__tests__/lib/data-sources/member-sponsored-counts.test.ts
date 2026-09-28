/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { buildMemberSponsoredCounts } from '@/lib/data-sources/member-sponsored-counts/corpus';
import type { SponsoredBill } from '@/lib/data-sources/member-sponsored-counts/corpus';

describe('buildMemberSponsoredCounts', () => {
  const bill = (over: Partial<SponsoredBill>): SponsoredBill => ({
    congress: 119,
    type: 'hr',
    sponsorBioguideId: 'A000001',
    ...over,
  });

  it('counts bills and resolutions per sponsor, this Congress only', () => {
    const file = buildMemberSponsoredCounts({
      congress: 119,
      generatedAt: '2026-09-25T00:00:00.000Z',
      staleAfter: '2026-10-16',
      sources: ['x'],
      bills: [
        bill({ sponsorBioguideId: 'B000002', type: 's' }),
        bill({}),
        bill({ type: 'hres' }),
        bill({ type: 'hconres' }),
        bill({ congress: 118 }),
        bill({ sponsorBioguideId: null }),
      ],
    });

    expect(file.counts).toEqual({
      A000001: { introduced: 3, byType: { hr: 1, hres: 1, hconres: 1 } },
      B000002: { introduced: 1, byType: { s: 1 } },
    });
    // Keys sorted so weekly rebuilds diff cleanly.
    expect(Object.keys(file.counts)).toEqual(['A000001', 'B000002']);
    expect(file.meta.noSponsor).toBe(1);
    expect(file.meta.parsed).toMatchObject({ hr: 2, s: 1, hres: 1, hconres: 1, sres: 0 });
  });
});

describe('getMemberSponsoredCounts (committed corpus)', () => {
  it('loads the corpus with its meta sidecar in agreement', async () => {
    const { getMemberSponsoredCounts } = await import(
      '@/lib/data-sources/member-sponsored-counts/load'
    );
    const meta = (await import('../../../../data/member-sponsored-counts.meta.json')) as {
      generatedAt: string;
      staleAfter: string;
      members: number;
    };
    const file = await getMemberSponsoredCounts();

    expect(file).not.toBeNull();
    expect(file!.generatedAt).toBe(meta.generatedAt);
    expect(file!.staleAfter).toBe(meta.staleAfter);
    expect(Object.keys(file!.counts)).toHaveLength(meta.members);
    expect(meta.members).toBeGreaterThan(400);
    for (const entry of Object.values(file!.counts)) {
      const byTypeSum = Object.values(entry.byType).reduce((a, b) => a + (b ?? 0), 0);
      expect(entry.introduced).toBe(byTypeSum);
    }
  });
});
