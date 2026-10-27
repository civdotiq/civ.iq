/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Former members of Congress. CIV.IQ covers current members, but every
 * Bioguide ID in congress-legislators resolves to a profile, so a former
 * member's page must not read as a sitting member's: no current term, next
 * election, office phone or address.
 *
 * Two kinds:
 * - served in a Congress whose votes the site still serves (see
 *   isServedCongress): the page stays indexable and links those votes and
 *   bills. Members who leave when a new Congress convenes stay in this group
 *   while the previous Congress is still served;
 * - everyone else (e.g. Lazarus Shoemaker, House 1871–1875): a short,
 *   noindexed page that points to the Biographical Directory.
 */

import { getCongressDateRange, getServedCongressRange } from '@/lib/data/congressional-constants';
import { analyzeTenure, type ServiceRun, type TenureTerm } from './tenure';

type MemberStatus =
  'active' | 'pending_resignation' | 'resigned' | 'expelled' | 'deceased' | 'retired';

/** True once a member has left office (a pending resignation still serves). */
export function isFormerMember(status: MemberStatus | undefined): boolean {
  return !!status && status !== 'active' && status !== 'pending_resignation';
}

/**
 * Question pages a former member keeps when the site has their record; every
 * other member page redirects to the short profile.
 */
export const FORMER_MEMBER_RECORD_QUESTIONS: readonly string[] = [
  'voting-record',
  'bills-sponsored',
];

export interface FormerMemberInput {
  chamber: 'House' | 'Senate';
  /** congress-legislators terms, most recent first. */
  terms: readonly TenureTerm[];
  /** The member's last term; congress-legislators sets `end` to the day they left. */
  currentTerm?: { start: string; end: string };
  /** Vacancy date, for a departure the roster hasn't recorded yet. */
  statusEffectiveDate?: string | null;
}

export interface FormerMemberFacts {
  /** Served in a Congress whose votes and bills the site serves. */
  hasRecordOnSite: boolean;
  /** The latest such Congress (e.g. 119), or null. */
  recordCongress: number | null;
  /** Day they left office (YYYY-MM-DD), only when they have a record on the site; null if unknown. */
  leftOffice: string | null;
  /** Service by chamber, oldest first ("House 2009–2025"). */
  service: ServiceRun[];
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const day = (d: Date): string => d.toISOString().slice(0, 10);

export function formerMemberFacts(
  member: FormerMemberInput,
  now: Date = new Date()
): FormerMemberFacts {
  const tenure = analyzeTenure(member.terms, { chamber: member.chamber });
  const service = tenure ? [...tenure.earlier, tenure.now] : [];

  // The last term overlaps a served Congress. A term that ended on a Congress's
  // convening day belongs to the Congress before it.
  const start = member.currentTerm?.start;
  const end = member.currentTerm?.end;
  let recordCongress: number | null = null;
  if (start && end && ISO_DAY.test(start) && ISO_DAY.test(end)) {
    const { first, last } = getServedCongressRange(now);
    for (let congress = last; congress >= first && recordCongress === null; congress--) {
      const range = getCongressDateRange(congress);
      if (end > day(range.start) && start < day(range.end)) recordCongress = congress;
    }
  }
  const hasRecordOnSite = recordCongress !== null;

  const today = day(now);
  let leftOffice: string | null = null;
  if (hasRecordOnSite) {
    if (end && end <= today) {
      leftOffice = end;
    } else if (
      member.statusEffectiveDate &&
      ISO_DAY.test(member.statusEffectiveDate) &&
      member.statusEffectiveDate <= today
    ) {
      leftOffice = member.statusEffectiveDate;
    }
  }

  return { hasRecordOnSite, recordCongress, leftOffice, service };
}

/** "U.S. House of Representatives" or "U.S. Senate". */
export function chamberName(chamber: 'House' | 'Senate'): string {
  return chamber === 'Senate' ? 'U.S. Senate' : 'U.S. House of Representatives';
}
