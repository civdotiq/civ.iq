/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Member → bills-and-resolutions-introduced counts for the current Congress
 * (data/member-sponsored-counts.json), derived from the same GovInfo BILLSTATUS
 * pass as the bill policy-area corpus. Feeds the /api/search bills filter.
 *
 * "Introduced" matches the Record Card (features/record-card/legislation-rollup):
 * every bill and resolution a member sponsored this Congress — all eight
 * BILLSTATUS types, amendments excluded. Unlike the policy-area corpus, bills
 * CRS has not yet assigned a policy area still count here.
 *
 * Shape and builder only, no runtime imports, so the request-time reader stays
 * light and the build script can import it without the loader.
 */

import { BILLSTATUS_TYPES } from '../bill-policy-areas/corpus';
import type { BillStatusType } from '../bill-policy-areas/corpus';

export interface MemberSponsoredCount {
  introduced: number;
  /** Only types the member actually sponsored appear. */
  byType: Partial<Record<BillStatusType, number>>;
}

export interface MemberSponsoredCountsFile {
  congress: number;
  generatedAt: string;
  /** YYYY-MM-DD after which the counts should be treated as stale. */
  staleAfter: string;
  sources: string[];
  /** Keyed by bioguide id, sorted for stable weekly diffs. */
  counts: Record<string, MemberSponsoredCount>;
  meta: {
    /** Bills parsed per type for this Congress, sponsored or not. */
    parsed: Record<BillStatusType, number>;
    /** Bills whose BILLSTATUS names no sponsor (not attributed to anyone). */
    noSponsor: number;
  };
}

export interface SponsoredBill {
  congress: number;
  type: BillStatusType;
  sponsorBioguideId: string | null;
}

export interface BuildCountsInput {
  congress: number;
  bills: SponsoredBill[];
  generatedAt: string;
  staleAfter: string;
  sources: string[];
}

export function buildMemberSponsoredCounts(input: BuildCountsInput): MemberSponsoredCountsFile {
  const parsed = Object.fromEntries(BILLSTATUS_TYPES.map(t => [t, 0])) as Record<
    BillStatusType,
    number
  >;
  const counts = new Map<string, MemberSponsoredCount>();
  let noSponsor = 0;

  for (const bill of input.bills) {
    if (bill.congress !== input.congress) continue;
    parsed[bill.type]++;
    if (!bill.sponsorBioguideId) {
      noSponsor++;
      continue;
    }
    const entry = counts.get(bill.sponsorBioguideId) ?? { introduced: 0, byType: {} };
    entry.introduced++;
    entry.byType[bill.type] = (entry.byType[bill.type] ?? 0) + 1;
    counts.set(bill.sponsorBioguideId, entry);
  }

  const sorted = [...counts.keys()].sort((a, b) => a.localeCompare(b));
  return {
    congress: input.congress,
    generatedAt: input.generatedAt,
    staleAfter: input.staleAfter,
    sources: input.sources,
    counts: Object.fromEntries(sorted.map(id => [id, counts.get(id)!])),
    meta: { parsed, noSponsor },
  };
}
