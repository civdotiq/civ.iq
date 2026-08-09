/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Accessors over the hand-verified 2026 voter-registration corpus
 * (src/data/voter-registration-2026.ts). Shared by the how-to-vote page,
 * state-page election calendar, and record-card ballot surfaces so the
 * deadline phrasing is identical everywhere.
 */

import {
  VOTER_REGISTRATION_2026,
  type StateVoterRegistration2026,
} from '@/data/voter-registration-2026';

export type { StateVoterRegistration2026 };

export function getVoterRegistration2026(stateCode: string): StateVoterRegistration2026 | null {
  return VOTER_REGISTRATION_2026[stateCode.toUpperCase()] ?? null;
}

export function formatDeadlineDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * One-line deadline summary for cards, e.g.
 * "Online by Oct 19, 2026 · By mail by Oct 19, 2026 (postmarked) · In person through Election Day".
 * Returns null when nothing is verified — callers must fall back to a
 * "check your state's site" link, never a guessed date.
 */
export function summarizeRegistrationDeadline(row: StateVoterRegistration2026): string | null {
  if (!row.registrationRequired) {
    return 'No voter registration required';
  }
  const parts: string[] = [];
  const online = formatDeadlineDate(row.onlineDeadline);
  if (row.onlineRegistrationAvailable) {
    if (online) {
      parts.push(`Online by ${online}`);
    } else if (row.onlineNoDeadline) {
      // The state itself says online registration has no cutoff (Hawaii).
      parts.push('Online any time');
    }
  }
  const mail = formatDeadlineDate(row.mailDeadline);
  if (mail) {
    const suffix = row.mailDeadlineType === 'postmarked' ? ' (postmarked)' : '';
    parts.push(`By mail by ${mail}${suffix}`);
  }
  const inPerson = formatDeadlineDate(row.inPersonDeadline);
  if (row.sameDayScope === 'through-election-day') {
    // Covers both "no in-person deadline" states and states like
    // Wisconsin where a clerk-office cutoff exists but the polls still
    // register voters on Election Day (details live in sameDayNotes).
    parts.push('In person through Election Day');
  } else if (row.sameDayScope === 'early-voting-only') {
    if (inPerson) parts.push(`In person by ${inPerson}`);
    parts.push('Same-day registration during early voting');
  } else if (inPerson) {
    parts.push(`In person by ${inPerson}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}
