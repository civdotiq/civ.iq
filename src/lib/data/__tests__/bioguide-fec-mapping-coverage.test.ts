/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * FEC-mapping staleness canary.
 *
 * `bioguideToFECMapping` (synced from FEC into @civiq/entity-resolution) maps
 * every current member of Congress to their FEC candidate ID. If a sitting
 * member is missing from that table, their Campaign Finance tab renders
 * SILENTLY EMPTY even though FEC has full data. This test catches that gap.
 *
 * Canonical current-members source: `data/legislators-current.yaml`
 * (unitedstates/congress-legislators), read via `getLegislatorInfoMap()` —
 * the same parser the app uses. Every entry in that file is, by definition,
 * a current member, so it is the authoritative "who should have a mapping"
 * list. No data is fabricated here.
 *
 * When this fails, the message lists the unmapped bioguideIds + names so a
 * human can add them (open a PR against the package JSON, or let the weekly
 * `.github/workflows/sync-bioguide-fec.yml` sync pick them up).
 */

// Quiet the YAML loader's logger; keep console clean for the coverage report.
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { bioguideToFECMapping } from '@/lib/data/bioguide-fec-mapping';
import { getLegislatorInfoMap, type LegislatorInfo } from '@/lib/data/legislator-mappings';

/**
 * Bioguide IDs of current members who legitimately have NO FEC candidate ID
 * (e.g. a member seated too recently for FEC committee registration to have
 * propagated). Add sparingly and ALWAYS with a dated reason — an over-broad
 * allowlist defeats the canary. Every entry is verified below to be both a
 * current member AND actually absent from the mapping, so stale entries fail.
 */
const NO_FEC_ALLOWLIST: Record<string, string> = {
  // (bioguideId): 'reason (YYYY-MM-DD)'
};

describe('bioguide -> FEC mapping coverage (Campaign Finance tab canary)', () => {
  let currentMembers: LegislatorInfo[];

  beforeAll(async () => {
    const infoMap = await getLegislatorInfoMap();
    currentMembers = Array.from(infoMap.values());
  });

  it('loads a non-empty current-members list and a non-empty mapping table', () => {
    // Guard against a silent parse failure that would make the canary pass
    // vacuously (empty list => nothing missing).
    expect(currentMembers.length).toBeGreaterThan(500);
    expect(Object.keys(bioguideToFECMapping).length).toBeGreaterThan(500);
  });

  it('has an FEC mapping for every current member of Congress', () => {
    const missing = currentMembers.filter(
      m => !bioguideToFECMapping[m.bioguideId] && !(m.bioguideId in NO_FEC_ALLOWLIST)
    );

    const total = currentMembers.length;
    const mapped = total - missing.length - Object.keys(NO_FEC_ALLOWLIST).length;
    const coveragePct = ((total - missing.length) / total) * 100;

    // Reported so the number is visible even when the test passes.

    console.info(
      `[FEC-mapping canary] coverage ${coveragePct.toFixed(2)}% ` +
        `(${mapped} mapped + ${Object.keys(NO_FEC_ALLOWLIST).length} allowlisted / ${total} current members)`
    );

    const report = missing
      .map(
        m =>
          `  - ${m.bioguideId}  ${m.fullName} (${m.chamber} ${m.state}${m.district ? '-' + m.district : ''})`
      )
      .join('\n');

    if (missing.length > 0) {
      throw new Error(
        `${missing.length} current member(s) of Congress are MISSING from bioguideToFECMapping ` +
          `(coverage ${coveragePct.toFixed(2)}%).\n` +
          `Their Campaign Finance tab will render silently empty. Add them to the mapping\n` +
          `(packages/entity-resolution/data/bioguide-fec-mapping.json) or the NO_FEC_ALLOWLIST\n` +
          `with a documented reason:\n${report}`
      );
    }

    expect(missing).toEqual([]);
  });

  it('keeps the NO_FEC_ALLOWLIST honest (every entry is current AND actually unmapped)', () => {
    const currentIds = new Set(currentMembers.map(m => m.bioguideId));

    for (const [bioguideId, reason] of Object.entries(NO_FEC_ALLOWLIST)) {
      expect(typeof reason).toBe('string');
      expect(reason.length).toBeGreaterThan(0);
      // Not a current member anymore -> remove the stale allowlist entry.
      expect(currentIds.has(bioguideId)).toBe(true);
      // Now has a mapping -> remove it from the allowlist so the canary is strict.
      expect(bioguideToFECMapping[bioguideId]).toBeUndefined();
    }
  });
});
