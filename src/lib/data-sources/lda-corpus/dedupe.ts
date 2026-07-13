/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { CompactFiling } from './types';

/** Group key for one registrant reporting one client for one period. */
function reportKey(f: CompactFiling): string {
  return `${f.registrantId}|${f.clientId}|${f.filingYear}|${f.filingPeriod}`;
}

/**
 * Collapse amendments: an amended quarterly report supersedes the original for
 * the same (registrant, client, year, period). Keep only the latest-posted
 * filing per group so summing does not double- or triple-count (the LOC NATION
 * crank filed three $20M amendments for one quarter). Ties on dt_posted fall
 * back to the lexically greatest filing_uuid for determinism.
 */
export function dedupeAmendments(filings: CompactFiling[]): CompactFiling[] {
  const latest = new Map<string, CompactFiling>();

  for (const f of filings) {
    const key = reportKey(f);
    const current = latest.get(key);
    if (!current) {
      latest.set(key, f);
      continue;
    }
    const posted = Date.parse(f.dtPosted);
    const currentPosted = Date.parse(current.dtPosted);
    if (posted > currentPosted || (posted === currentPosted && f.filingUuid > current.filingUuid)) {
      latest.set(key, f);
    }
  }

  return Array.from(latest.values());
}
