/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type {
  CongressLegislator,
  CongressLegislatorTerm,
} from '@/features/representatives/services/congress.service';
import type { EnhancedRepresentative } from '@/types/representative';

/**
 * Check if a representative is a current member of the 119th Congress
 * 119th Congress: January 3, 2025 - January 3, 2027
 *
 * Congress boundary dates use an explicit T00:00:00Z suffix. Per the
 * ECMAScript spec a date-ONLY string ('2025-01-03') already parses as UTC
 * midnight, so this is intent-documentation, not a behavior change — but a
 * datetime string WITHOUT the Z ('2025-01-03T00:00:00') would parse as
 * LOCAL time and make comparisons timezone-dependent. Keep the Z.
 */
export function isCurrentMember(
  representative: CongressLegislator | EnhancedRepresentative
): boolean {
  // Handle EnhancedRepresentative type
  if ('currentTerm' in representative && representative.currentTerm) {
    const termEnd = representative.currentTerm.end
      ? new Date(representative.currentTerm.end)
      : null;
    const congressStart = new Date('2025-01-03T00:00:00Z');

    // Current if no end date or end date is in the future
    return !termEnd || termEnd >= congressStart;
  }

  // Handle CongressLegislator type
  if ('terms' in representative && representative.terms && representative.terms.length > 0) {
    const latestTerm = representative.terms[representative.terms.length - 1];
    if (latestTerm && 'end' in latestTerm) {
      const termEnd = latestTerm.end ? new Date(latestTerm.end) : null;
      const congressStart = new Date('2025-01-03T00:00:00Z');

      // Current if no end date or end date is in the future
      return !termEnd || termEnd >= congressStart;
    }
  }

  return false;
}

/**
 * Filter array of representatives to only include current 119th Congress members
 */
export function filterCurrent119thCongress<T extends CongressLegislator | EnhancedRepresentative>(
  members: T[]
): T[] {
  return members.filter(isCurrentMember);
}

/**
 * Check if a term is for the 119th Congress (2025-2027)
 */
export function is119thCongressTerm(term: CongressLegislatorTerm): boolean {
  const termStart = new Date(term.start);
  const congress119Start = new Date('2025-01-03T00:00:00Z');
  const congress119End = new Date('2027-01-03T00:00:00Z');

  // Term is in 119th Congress if it starts exactly on or after Jan 3, 2025
  // and starts before Jan 3, 2027 (start of 120th Congress)
  return termStart >= congress119Start && termStart < congress119End;
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
      const congressStart = new Date('2025-01-03T00:00:00Z');
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
        const congressStart = new Date('2025-01-03T00:00:00Z');
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
