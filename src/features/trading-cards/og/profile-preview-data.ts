/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Data for the Congress profile share image (og:image). Social scrapers give
 * up after a few seconds, so this reads only what is already stored: the
 * roster, the chamber vote baselines (read-only, cron-built) and the cached
 * profile summary. It never computes the Record Card or calls Congress.gov
 * or FEC. A number that isn't cached is left off, never estimated.
 */

import type { EnhancedRepresentative } from '@/types/representative';
import type { ChamberBaselines } from '@/lib/intelligence/analyzers/chamber-baselines';
import { getStateName } from '@/lib/data/us-states';

export interface CachedSummary {
  billsSponsored?: number;
  totalRaised?: number;
  financeCycle?: number;
  financeUnavailable?: boolean;
  legislationUnavailable?: boolean;
}

export interface PreviewStat {
  value: number;
  label: string;
  /** Period the number covers, e.g. "119th Congress to date". */
  period: string;
  kind: 'count' | 'money';
}

export interface ProfilePreview {
  name: string;
  party: string;
  role: string;
  place: string;
  phone?: string;
  stats: PreviewStat[];
  /** Where the shown facts come from; only the sources actually used. */
  sources: string[];
}

/** Seats whose holder is not styled "Representative". */
const NON_VOTING_ROLE: Record<string, string> = {
  DC: 'Delegate to the U.S. House',
  AS: 'Delegate to the U.S. House',
  GU: 'Delegate to the U.S. House',
  MP: 'Delegate to the U.S. House',
  VI: 'Delegate to the U.S. House',
  PR: 'Resident Commissioner',
};

function ordinal(n: number): string {
  const rem10 = n % 10;
  const rem100 = n % 100;
  if (rem10 === 1 && rem100 !== 11) return `${n}st`;
  if (rem10 === 2 && rem100 !== 12) return `${n}nd`;
  if (rem10 === 3 && rem100 !== 13) return `${n}rd`;
  return `${n}th`;
}

function roleAndPlace(rep: EnhancedRepresentative): { role: string; place: string } {
  const stateName = getStateName(rep.state) ?? rep.state;
  if (rep.chamber === 'Senate') return { role: 'U.S. Senator', place: stateName };
  const nonVoting = NON_VOTING_ROLE[rep.state];
  if (nonVoting) return { role: nonVoting, place: stateName };
  const district = Number.parseInt(rep.district ?? '', 10);
  return Number.isFinite(district) && district > 0
    ? { role: 'U.S. Representative', place: `${stateName}'s ${ordinal(district)} District` }
    : { role: 'U.S. Representative', place: `${stateName} at large` };
}

export function buildProfilePreview(
  rep: EnhancedRepresentative,
  baselines: ChamberBaselines | null,
  summary: CachedSummary | null,
  currentCongress: number
): ProfilePreview {
  const stats: PreviewStat[] = [];
  const sources = ['congress-legislators'];

  // Only a full-Congress sweep has an honest period label. Delegates and the
  // resident commissioner vote only in some proceedings, so their count
  // would read as absenteeism next to a voting member's; leave it off.
  const nonVoting = rep.chamber === 'House' && rep.state in NON_VOTING_ROLE;
  const cast =
    baselines?.fullCoverage && !nonVoting ? baselines.members[rep.bioguideId]?.cast : undefined;
  if (typeof cast === 'number' && cast > 0) {
    stats.push({
      value: cast,
      label: 'Roll-call votes cast',
      period: baselines?.coverageLabel || `${ordinal(currentCongress)} Congress to date`,
      kind: 'count',
    });
    sources.push(rep.chamber === 'Senate' ? 'Senate roll calls' : 'House Clerk');
  }

  if (summary && !summary.legislationUnavailable && typeof summary.billsSponsored === 'number') {
    stats.push({
      value: summary.billsSponsored,
      label: 'Bills sponsored',
      period: `${ordinal(currentCongress)} Congress`,
      kind: 'count',
    });
    sources.push('Congress.gov');
  }

  if (
    summary &&
    !summary.financeUnavailable &&
    typeof summary.totalRaised === 'number' &&
    summary.totalRaised > 0 &&
    summary.financeCycle
  ) {
    stats.push({
      value: summary.totalRaised,
      label: 'Raised',
      period: `${summary.financeCycle} cycle (FEC)`,
      kind: 'money',
    });
    sources.push('FEC');
  }

  return {
    // "Eleanor Holmes Norton", not the roster's short "Eleanor Norton".
    name: rep.fullName?.official || rep.name,
    party: rep.party,
    ...roleAndPlace(rep),
    phone: rep.currentTerm?.phone || rep.phone || undefined,
    stats,
    sources,
  };
}
