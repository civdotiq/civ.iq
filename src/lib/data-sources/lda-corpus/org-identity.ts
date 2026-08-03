/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * One definition of "an organization" for everything computed off the LDA
 * corpus.
 *
 * LDA filings carry the client's name exactly as the registrant typed it, so the
 * same company reaches the corpus as several strings — "Acme Corp.", "ACME
 * CORPORATION", "Acme Corp". Grouping on the raw string counts those as
 * different organizations. Measured across a sector's issue codes that inflates
 * the count by 8-10% (health care: 4,125 raw vs 3,810 canonical).
 *
 * The inflation itself is minor. The problem it caused is that surfaces
 * disagreed: the sector page counted organizations one way while the top-orgs
 * list beside it was merged another, so one card carried two definitions of the
 * thing it was counting. Everything now keys through `organizationKey`, which is
 * the same `normalizeCompanyName` the influence-chain analyzer and the corpus
 * organization index already use — so a count here and a lookup there agree.
 */

import { normalizeCompanyName } from '@civiq/entity-resolution';

/**
 * The key an organization's filings group under. Falls back to a trimmed
 * uppercase form when the normalizer cannot make anything of the name, so a row
 * is never silently dropped from a rollup.
 */
export function organizationKey(name: string): string {
  return normalizeCompanyName(name) || name.trim().toUpperCase();
}

/**
 * Which spelling to show for a group of filings that share a key.
 *
 * The most frequently filed variant wins, because that is how the organization
 * usually identifies itself; ties go to the longer string, which is the more
 * complete name ("Acme Corporation" over "Acme Corp"). Callers accumulate
 * `variants` as they stream, so nothing larger than the distinct spellings is
 * held.
 */
export function pickDisplayName(variants: Map<string, number>): string {
  let best = '';
  let bestCount = -1;
  for (const [name, count] of variants) {
    if (count > bestCount || (count === bestCount && name.length > best.length)) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

/** Record one observed spelling against its group. */
export function addVariant(variants: Map<string, number>, name: string): void {
  variants.set(name, (variants.get(name) ?? 0) + 1);
}
