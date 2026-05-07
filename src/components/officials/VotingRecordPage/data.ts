/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { ApiVote, FilterState, VoteCategory, VotePosition } from './types';

const CATEGORY_ORDER: VoteCategory[] = [
  'Budget',
  'Healthcare',
  'Defense',
  'Judiciary',
  'Foreign Affairs',
  'Other',
];

const POSITION_ORDER: VotePosition[] = ['Yea', 'Nay', 'Present', 'Not Voting'];

export function categoryOf(vote: ApiVote): VoteCategory {
  return vote.category ?? 'Other';
}

export function yearOf(vote: ApiVote): string {
  if (!vote.date) return '—';
  const m = vote.date.match(/^(\d{4})/);
  return m ? (m[1] ?? '—') : '—';
}

export function passed(vote: ApiVote): boolean {
  const r = (vote.result ?? '').toLowerCase();
  if (!r || r === 'unknown') return false;
  return r.includes('passed') || r.includes('agreed') || r.includes('confirmed');
}

export function applyFilters(votes: ApiVote[], filters: FilterState): ApiVote[] {
  return votes.filter(v => {
    if (filters.category !== 'All' && categoryOf(v) !== filters.category) return false;
    if (filters.position !== 'All' && v.position !== filters.position) return false;
    if (filters.year !== 'All' && yearOf(v) !== filters.year) return false;
    if (filters.result !== 'All') {
      const wantPassed = filters.result === 'Passed';
      if (passed(v) !== wantPassed) return false;
    }
    if (filters.keyVote !== 'All') {
      const wantKey = filters.keyVote === 'Key';
      if (Boolean(v.isKeyVote) !== wantKey) return false;
    }
    return true;
  });
}

export function categoryCounts(votes: ApiVote[]): Array<{ category: VoteCategory; count: number }> {
  const map = new Map<VoteCategory, number>();
  for (const v of votes) {
    const c = categoryOf(v);
    map.set(c, (map.get(c) ?? 0) + 1);
  }
  return CATEGORY_ORDER.filter(c => (map.get(c) ?? 0) > 0).map(c => ({
    category: c,
    count: map.get(c) ?? 0,
  }));
}

export function positionCounts(
  votes: ApiVote[]
): Array<{ position: VotePosition; count: number; pct: number }> {
  const map = new Map<VotePosition, number>();
  for (const v of votes) {
    map.set(v.position, (map.get(v.position) ?? 0) + 1);
  }
  const total = votes.length || 1;
  return POSITION_ORDER.map(p => {
    const count = map.get(p) ?? 0;
    return { position: p, count, pct: (count / total) * 100 };
  });
}

export function yearCounts(
  votes: ApiVote[]
): Array<{ year: string; count: number; yea: number; nay: number }> {
  const buckets = new Map<string, { count: number; yea: number; nay: number }>();
  for (const v of votes) {
    const y = yearOf(v);
    const cur = buckets.get(y) ?? { count: 0, yea: 0, nay: 0 };
    cur.count += 1;
    if (v.position === 'Yea') cur.yea += 1;
    if (v.position === 'Nay') cur.nay += 1;
    buckets.set(y, cur);
  }
  return Array.from(buckets.entries())
    .filter(([y]) => y !== '—')
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([year, data]) => ({ year, ...data }));
}

export function uniqueYears(votes: ApiVote[]): string[] {
  const set = new Set<string>();
  for (const v of votes) {
    const y = yearOf(v);
    if (y !== '—') set.add(y);
  }
  return Array.from(set).sort((a, b) => Number(b) - Number(a));
}

export function uniqueCategories(votes: ApiVote[]): VoteCategory[] {
  const set = new Set<VoteCategory>();
  for (const v of votes) set.add(categoryOf(v));
  return CATEGORY_ORDER.filter(c => set.has(c));
}

export function formatVoteDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function shortResult(result: string | undefined): string {
  if (!result) return '—';
  if (result.length <= 24) return result;
  return result.slice(0, 22) + '…';
}

export function billLabel(vote: ApiVote): string {
  const num = vote.bill?.number;
  if (!num || num === 'N/A') return `Roll #${vote.rollNumber || '—'}`;
  return num;
}

export function tabularZero(n: number): string {
  return n.toLocaleString('en-US');
}
