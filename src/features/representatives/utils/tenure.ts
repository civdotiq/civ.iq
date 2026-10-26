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

interface Tenure {
  /** "Senator", "Representative", "Delegate" or "Resident Commissioner". */
  title: string;
  /** The current, unbroken stretch in the current chamber. */
  now: ServiceRun;
  /** Stretches before it, oldest first. */
  earlier: ServiceRun[];
  /** True when service never broke, so "in Congress since" is accurate. */
  unbroken: boolean;
  firstYear: string;
  currentTerm: { start: string; end: string };
}

/**
 * Service history from congress-legislators terms (most recent first). A
 * term's start year is when the member took office. Consecutive terms in one
 * chamber form a run; a change of chamber or a gap in service starts a new one.
 */
function analyzeTenure(
  terms: readonly TenureTerm[],
  current: { chamber: 'House' | 'Senate'; role?: string }
): Tenure | null {
  const chronological = terms.filter(t => /^\d{4}$/.test(t.startYear)).reverse();
  if (chronological.length === 0) return null;

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
  const latest = chronological[chronological.length - 1]!;
  return {
    title:
      now.chamber === 'Senate'
        ? 'Senator'
        : current.role === 'Delegate' || current.role === 'Resident Commissioner'
          ? current.role
          : 'Representative',
    now,
    earlier: runs.slice(0, -1),
    unbroken: runs.every((r, i) => i === 0 || r.start === runs[i - 1]!.end),
    firstYear: runs[0]!.start,
    currentTerm: { start: latest.startYear, end: latest.endYear },
  };
}

const runLabel = (r: ServiceRun): string => `${r.chamber} ${r.start}–${r.end}`;

/**
 * Earlier service, or null when there is none. "In Congress since" only when
 * service was unbroken; after a gap it would overstate tenure.
 */
function earlierService(t: Tenure): string | null {
  if (t.earlier.length === 0) return null;
  const history = t.earlier.map(runLabel).join(', ');
  return t.unbroken
    ? `in Congress since ${t.firstYear} (${history})`
    : `earlier service: ${history}`;
}

/**
 * Tenure line for a member of Congress.
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
  const t = analyzeTenure(terms, current);
  if (!t) return null;
  const currentTerm = `current term ${t.currentTerm.start}–${t.currentTerm.end}`;
  const earlier = earlierService(t);
  if (earlier) return `${t.title} since ${t.now.start} · ${earlier} · ${currentTerm}`;
  return t.now.terms === 1
    ? `${t.title} since ${t.now.start} (first term)`
    : `${t.title} since ${t.now.start} · ${currentTerm} · ${t.now.terms} terms total`;
}

/**
 * The profile header's tenure fact, worded like describeTenure:
 *
 *   { label: "In the House",  value: "Since 2015", caption: "6 terms served" }
 *   { label: "In the Senate", value: "Since 2025", caption: "In Congress since 2019 (House 2019–2025)" }
 *   { label: "In the House",  value: "Since 2020", caption: "Earlier service: House 1987–1996" }
 *   { label: "In the Senate", value: "Since 2025", caption: "First term" }
 */
export function tenureFact(
  terms: readonly TenureTerm[],
  current: { chamber: 'House' | 'Senate'; role?: string }
): { label: string; value: string; caption: string } | null {
  const t = analyzeTenure(terms, current);
  if (!t) return null;
  const earlier = earlierService(t);
  return {
    label: t.now.chamber === 'Senate' ? 'In the Senate' : 'In the House',
    value: `Since ${t.now.start}`,
    caption: earlier
      ? earlier.charAt(0).toUpperCase() + earlier.slice(1)
      : t.now.terms === 1
        ? 'First term'
        : `${t.now.terms} terms served`,
  };
}
