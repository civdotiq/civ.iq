/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export interface SponsoredBill {
  sponsorships?: Array<{ name: string; primary?: boolean }>;
}

export interface SponsorshipCounts {
  sponsored: number;
  cosponsored: number;
  /** Bills examined. When it equals the fetch limit, both counts are floors. */
  examined: number;
}

/**
 * Split a sponsor query's bills into primary sponsorships and co-sponsorships.
 * OpenStates returns every bill the member sponsored in any role, so a bill
 * whose sponsor list doesn't name them still counts as theirs — the filter is
 * authoritative, the name match only decides which column.
 */
export function countSponsorships(
  bills: SponsoredBill[],
  name: string,
  lastName?: string
): SponsorshipCounts {
  const full = name.toLowerCase();
  const last = (lastName ?? '').toLowerCase();
  let sponsored = 0;
  let cosponsored = 0;

  for (const bill of bills) {
    const match = bill.sponsorships?.find(s => {
      const sponsor = s.name.toLowerCase();
      return sponsor === full || (last !== '' && sponsor.includes(last)) || full.includes(sponsor);
    });
    if (match && !match.primary) cosponsored++;
    else sponsored++;
  }

  return { sponsored, cosponsored, examined: bills.length };
}
