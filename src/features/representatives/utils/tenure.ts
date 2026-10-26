/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

export interface TenureTerm {
  startYear: string;
  endYear: string;
  chamber?: string;
}

interface ServiceRun {
  chamber: 'House' | 'Senate';
  start: string;
  end: string;
  terms: number;
}

/**
 * Tenure line for a member of Congress, from congress-legislators terms
 * (most recent first). A term's start year is when the member took office.
 *
 *   One chamber:   "Representative since 2015 · current term 2025–2027 · 6 terms total"
 *   First term:    "Senator since 2025 (first term)"
 *   Both chambers: "Senator since 2025 · in Congress since 2019 (House 2019–2025) · current term 2025–2031"
 *   After a gap:   "Representative since 2020 · earlier service: House 1987–1996 · current term 2025–2027"
 *
 * House terms last two years and Senate terms six, so a term count is only
 * given when every term was in the same chamber.
 */
export function describeTenure(
  terms: readonly TenureTerm[],
  current: { chamber: 'House' | 'Senate'; role?: string }
): string | null {
  const chronological = terms.filter(t => /^\d{4}$/.test(t.startYear)).reverse();
  if (chronological.length === 0) return null;

  // Consecutive terms in one chamber form a run; a change of chamber or a
  // gap in service starts a new one.
  const runs: ServiceRun[] = [];
  for (const term of chronological) {
    const chamber =
      term.chamber === 'Senate' || term.chamber === 'House' ? term.chamber : current.chamber;
    const last = runs[runs.length - 1];
    if (last && last.chamber === chamber && last.end === term.startYear) {
      last.end = term.endYear;
      last.terms += 1;
    } else {
      runs.push({ chamber, start: term.startYear, end: term.endYear, terms: 1 });
    }
  }

  const now = runs[runs.length - 1]!;
  const title =
    now.chamber === 'Senate'
      ? 'Senator'
      : current.role === 'Delegate' || current.role === 'Resident Commissioner'
        ? current.role
        : 'Representative';
  const latest = chronological[chronological.length - 1]!;
  const currentTerm = `current term ${latest.startYear}–${latest.endYear}`;

  const earlier = runs.slice(0, -1);
  if (earlier.length === 0) {
    return now.terms === 1
      ? `${title} since ${now.start} (first term)`
      : `${title} since ${now.start} · ${currentTerm} · ${now.terms} terms total`;
  }
  const history = earlier.map(r => `${r.chamber} ${r.start}–${r.end}`).join(', ');
  // "In Congress since" only when service was unbroken; after a gap it would
  // overstate tenure, so earlier stretches are listed on their own.
  const unbroken = runs.every((r, i) => i === 0 || r.start === runs[i - 1]!.end);
  return unbroken
    ? `${title} since ${now.start} · in Congress since ${runs[0]!.start} (${history}) · ${currentTerm}`
    : `${title} since ${now.start} · earlier service: ${history} · ${currentTerm}`;
}
