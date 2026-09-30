import type { Bill, BillStatus, BillVote } from '@/types/bill';
import { formatDateOnly } from '@/lib/utils/date-only';
import type { CqChipVariant } from '@/components/cq';

export interface StatusBadge {
  label: string;
  variant: CqChipVariant;
  filled: boolean;
}

const STATUS_LABELS: Record<BillStatus, string> = {
  introduced: 'Introduced',
  referred: 'In committee',
  reported: 'Reported out',
  passed_house: 'Passed House',
  passed_senate: 'Passed Senate',
  passed_both: 'Passed both chambers',
  failed: 'Failed',
  enacted: 'Became law',
  vetoed: 'Vetoed',
  pocket_vetoed: 'Pocket vetoed',
};

/**
 * Maps a bill status to a non-partisan chip badge.
 * Party colors (Republican red, Democrat blue) mark party breakdowns only — never status.
 */
export function getStatusBadge(status: BillStatus): StatusBadge {
  const label = STATUS_LABELS[status] ?? 'Status unavailable';
  switch (status) {
    case 'enacted':
    case 'passed_both':
      return { label, variant: 'info', filled: true };
    case 'passed_house':
    case 'passed_senate':
    case 'reported':
      return { label, variant: 'info', filled: false };
    case 'failed':
    case 'vetoed':
    case 'pocket_vetoed':
      return { label, variant: 'warn', filled: true };
    case 'introduced':
    case 'referred':
    default:
      return { label, variant: 'ink', filled: false };
  }
}

/** Find the latest decisive floor vote for the bill. */
/**
 * Clerk questions that decide a measure itself, not an amendment or motion:
 * "On Passage of the Bill", "On Motion to Suspend the Rules and Pass",
 * "On Motion to Concur in the Senate Amendment", "On Agreeing to the
 * Resolution", "On the Concurrent Resolution", "On Agreeing to the Conference Report".
 */
const DECISIVE_QUESTION =
  /passage|suspend the rules and (pass|agree)|\bconcur|agreeing to the (resolution|concurrent resolution|joint resolution|conference report)|^on the (concurrent |joint )?resolution\b|conference report/i;

export function findFinalPassageVote(votes: BillVote[]): BillVote | null {
  if (!votes || votes.length === 0) return null;
  const decisive = votes.filter(
    v =>
      v.votes &&
      (v.result === 'Passed' || v.result === 'Failed' || v.result === 'Agreed to') &&
      DECISIVE_QUESTION.test(v.question ?? '')
  );
  const pool = decisive.length > 0 ? decisive : votes.filter(v => v.votes);
  if (pool.length === 0) return null;
  return pool.reduce((latest, v) =>
    new Date(v.date).getTime() > new Date(latest.date).getTime() ? v : latest
  );
}

/** Format an ISO/loose date as "Jun 4, 2021" or fallback. */
export function formatDate(value?: string | null): string {
  if (!value) return '—';
  // Date-only strings ("2026-07-22") are formatted in UTC so a US timezone
  // doesn't show the day before.
  return formatDateOnly(value, { month: 'short', day: 'numeric', year: 'numeric' }) || value;
}

/** Days between two ISO dates, clamped >= 0. */
export function daysBetween(startISO?: string, endISO?: string): number | null {
  if (!startISO) return null;
  const start = new Date(startISO).getTime();
  const end = endISO ? new Date(endISO).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  const diff = Math.floor((end - start) / (24 * 60 * 60 * 1000));
  return Math.max(0, diff);
}

/** Compute share of co-sponsors from the minority party (a rough bipartisan proxy). */
export function computeBipartisanShare(bill: Bill): number | null {
  const cosponsors = bill.cosponsors ?? [];
  if (cosponsors.length === 0) return null;
  const sponsorParty = bill.sponsor?.representative?.party?.toUpperCase().charAt(0) ?? '';
  if (sponsorParty !== 'D' && sponsorParty !== 'R') return null;
  const opposite = sponsorParty === 'D' ? 'R' : 'D';
  const oppositeCount = cosponsors.filter(
    c => c.representative.party?.toUpperCase().charAt(0) === opposite
  ).length;
  return Math.round((oppositeCount / cosponsors.length) * 100);
}

/** Pick a sensible "kind" for the timeline dot from a Congress action description. */
export function timelineDotKind(action: {
  description: string;
}): 'pass' | 'fail' | 'sign' | 'intro' | 'cmte' | 'other' {
  const text = (action.description ?? '').toLowerCase();
  if (text.includes('became public law') || text.includes('signed by president')) return 'sign';
  if (text.includes('passed') || text.includes('agreed to')) return 'pass';
  if (text.includes('failed') || text.includes('rejected') || text.includes('vetoed'))
    return 'fail';
  if (text.includes('introduc')) return 'intro';
  if (text.includes('committee') || text.includes('referred') || text.includes('markup'))
    return 'cmte';
  return 'other';
}

/** Format a CBO cost estimate header from the structured array, or null. */
export function pickCboHeadline(bill: Bill): string | null {
  const cbo = bill.cboCostEstimates;
  if (!cbo || cbo.length === 0) return null;
  const latest = cbo[0];
  return latest?.title ?? null;
}
