/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Locks the UTC semantics of Congress boundary comparisons (2026-07 audit
 * item 2). Date-only strings parse as UTC midnight per the ECMAScript spec;
 * the boundary constants carry an explicit T00:00:00Z. If someone "fixes"
 * them to a datetime WITHOUT the Z ('2025-01-03T00:00:00'), they become
 * local-time and these boundary-equality tests fail in any timezone west
 * of UTC (TZ is pinned below so the failure is deterministic).
 */

// Pin a west-of-UTC timezone BEFORE the module under test is imported so
// any local-time parsing regression shows up regardless of machine TZ.
process.env.TZ = 'America/Los_Angeles';

import { isCurrentMember, is119thCongressTerm } from '@/lib/helpers/congress-validation';
import type { EnhancedRepresentative } from '@/types/representative';
import type { CongressLegislatorTerm } from '@/features/representatives/services/congress.service';

function repWithTermEnd(end: string | undefined): EnhancedRepresentative {
  return {
    bioguideId: 'T000000',
    name: 'Test Member',
    currentTerm: { start: '2023-01-03', end },
  } as unknown as EnhancedRepresentative;
}

describe('congress-validation UTC boundary semantics', () => {
  describe('isCurrentMember', () => {
    it('treats a term ending exactly on the Congress start date as current (UTC equality)', () => {
      // '2025-01-03' (UTC midnight) >= '2025-01-03T00:00:00Z' — holds only
      // when BOTH sides are UTC. A local-midnight boundary in TZ=LA would be
      // 08:00Z and this comparison would flip to false.
      expect(isCurrentMember(repWithTermEnd('2025-01-03'))).toBe(true);
    });

    it('treats a term ending the day before the Congress start as former', () => {
      expect(isCurrentMember(repWithTermEnd('2025-01-02'))).toBe(false);
    });

    it('treats a missing end date as current', () => {
      expect(isCurrentMember(repWithTermEnd(undefined))).toBe(true);
    });
  });

  describe('is119thCongressTerm', () => {
    const term = (start: string): CongressLegislatorTerm =>
      ({ start, end: undefined }) as unknown as CongressLegislatorTerm;

    it('includes a term starting exactly on 2025-01-03 (UTC equality)', () => {
      expect(is119thCongressTerm(term('2025-01-03'))).toBe(true);
    });

    it('excludes a term starting the day before the 119th', () => {
      expect(is119thCongressTerm(term('2025-01-02'))).toBe(false);
    });

    it('excludes a term starting exactly on the 120th Congress start', () => {
      expect(is119thCongressTerm(term('2027-01-03'))).toBe(false);
    });

    it('includes a mid-Congress start date', () => {
      expect(is119thCongressTerm(term('2026-06-15'))).toBe(true);
    });
  });
});
