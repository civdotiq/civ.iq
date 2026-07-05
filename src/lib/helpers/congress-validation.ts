/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type {
  CongressLegislator,
  CongressLegislatorTerm,
} from '@/features/representatives/services/congress.service';
import type { EnhancedRepresentative } from '@/types/representative';
import { getCurrentCongressNumber, getCongressDateRange } from '@/lib/data/congressional-constants';

/**
 * Check if a representative is a current member of the sitting Congress.
 *
 * Boundary dates are derived from the January 3 rule (20th Amendment) via
 * getCongressDateRange — never hardcoded — and are UTC instants. Term
 * date strings from the congress-legislators dataset are date-only
 * ('2025-01-03'), which the ECMAScript spec parses as UTC midnight, so
 * comparisons are timezone-independent. A datetime string WITHOUT a Z
 * ('2025-01-03T00:00:00') would parse as LOCAL time — don't introduce one.
 */
export function isCurrentMember(
  representative: CongressLegislator | EnhancedRepresentative
): boolean {
  const congressStart = getCongressDateRange(getCurrentCongressNumber()).start;

  // Handle EnhancedRepresentative type
  if ('currentTerm' in representative && representative.currentTerm) {
    const termEnd = representative.currentTerm.end
      ? new Date(representative.currentTerm.end)
      : null;

    // Current if no end date or end date is in the future
    return !termEnd || termEnd >= congressStart;
  }

  // Handle CongressLegislator type
  if ('terms' in representative && representative.terms && representative.terms.length > 0) {
    const latestTerm = representative.terms[representative.terms.length - 1];
    if (latestTerm && 'end' in latestTerm) {
      const termEnd = latestTerm.end ? new Date(latestTerm.end) : null;

      // Current if no end date or end date is in the future
      return !termEnd || termEnd >= congressStart;
    }
  }

  return false;
}

/**
 * Filter array of representatives to only include current members of the
 * sitting Congress
 */
export function filterCurrentCongress<T extends CongressLegislator | EnhancedRepresentative>(
  members: T[]
): T[] {
  return members.filter(isCurrentMember);
}

/**
 * Check if a term belongs to the currently sitting Congress: it starts on
 * or after the current Congress's convening date and before the next
 * Congress convenes.
 */
export function isCurrentCongressTerm(term: CongressLegislatorTerm): boolean {
  const { start, end } = getCongressDateRange(getCurrentCongressNumber());
  const termStart = new Date(term.start);
  return termStart >= start && termStart < end;
}

/**
 * Get debugging information about why a member was filtered
 */
export function getMemberFilterDebugInfo(
  representative: CongressLegislator | EnhancedRepresentative
): {
  name: string;
  bioguideId: string;
  latestTermEnd?: string;
  isCurrentMember: boolean;
  reason: string;
} {
  const congressStart = getCongressDateRange(getCurrentCongressNumber()).start;

  let name: string;
  let bioguideId: string;

  if ('bioguideId' in representative) {
    // EnhancedRepresentative type
    name = representative.name;
    bioguideId = representative.bioguideId;
  } else {
    // CongressLegislator type
    name = `${representative.name.first} ${representative.name.last}`;
    bioguideId = representative.id.bioguide;
  }

  let latestTermEnd: string | undefined;
  let reason = 'No terms found';

  if ('currentTerm' in representative && representative.currentTerm) {
    latestTermEnd = representative.currentTerm.end;
    if (!latestTermEnd) {
      reason = 'Current member (no end date)';
    } else {
      const endDate = new Date(latestTermEnd);
      reason = endDate >= congressStart ? 'Current member' : `Term ended ${latestTermEnd}`;
    }
  } else if ('terms' in representative && representative.terms && representative.terms.length > 0) {
    const latestTerm = representative.terms[representative.terms.length - 1];
    if (latestTerm && 'end' in latestTerm) {
      latestTermEnd = latestTerm.end;
      if (!latestTermEnd) {
        reason = 'Current member (no end date)';
      } else {
        const endDate = new Date(latestTermEnd);
        reason = endDate >= congressStart ? 'Current member' : `Term ended ${latestTermEnd}`;
      }
    }
  }

  return {
    name,
    bioguideId,
    latestTermEnd,
    isCurrentMember: isCurrentMember(representative),
    reason,
  };
}
