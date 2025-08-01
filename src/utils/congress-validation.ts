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
 */
export function isCurrentMember(
  representative: CongressLegislator | EnhancedRepresentative
): boolean {
  // Handle EnhancedRepresentative type
  if ('currentTerm' in representative && representative.currentTerm) {
    const termEnd = representative.currentTerm.end
      ? new Date(representative.currentTerm.end)
      : null;
    const congressStart = new Date('2025-01-03');

    // Current if no end date or end date is in the future
    return !termEnd || termEnd >= congressStart;
  }

  // Handle CongressLegislator type
  if ('terms' in representative && representative.terms && representative.terms.length > 0) {
    const latestTerm = representative.terms[representative.terms.length - 1];
    if (latestTerm && 'end' in latestTerm) {
      const termEnd = latestTerm.end ? new Date(latestTerm.end) : null;
      const congressStart = new Date('2025-01-03');

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
 * Check if a term is for the 119th Congress
 */
export function is119thCongressTerm(term: CongressLegislatorTerm): boolean {
  const termStart = new Date(term.start);
  const termEnd = term.end ? new Date(term.end) : null;
  const congress119Start = new Date('2025-01-03');
  const congress119End = new Date('2027-01-03');

  // Term is in 119th Congress if:
  // 1. Started on or after Jan 3, 2025, OR
  // 2. Started before but hasn't ended yet (or ends after Jan 3, 2025)
  return (
    (termStart >= congress119Start || !termEnd || termEnd >= congress119Start) &&
    termStart < congress119End
  );
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
      const congressStart = new Date('2025-01-03');
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
        const congressStart = new Date('2025-01-03');
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
