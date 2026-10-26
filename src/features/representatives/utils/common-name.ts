/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import { MEMBER_NAMES } from '@/data/member-names';

/** ", Jr.", " Sr.", " III" at the end of an official name. */
const GENERATIONAL_SUFFIX = /,?\s+(?:Jr\.?|Sr\.?|II|III|IV|V)$/;

/** congress-legislators name fields. */
export interface LegislatorNameParts {
  first: string;
  middle?: string;
  last: string;
  suffix?: string;
  nickname?: string;
  official_full?: string;
}

/**
 * The name a member goes by, from congress-legislators data only:
 *
 * - a listed nickname with the last name: "Bernie Sanders", "Maggie Hassan";
 * - otherwise the official full name Congress publishes, without lone
 *   initials: "Eleanor Holmes Norton", "Morgan Griffith" (H. Morgan Griffith),
 *   "Richard Durbin" (Richard J. Durbin);
 * - otherwise first and last name.
 *
 * Generational suffixes are left off ("Angus King", not "Angus King, Jr.");
 * the official full name keeps them.
 *
 * People search for and are reported under this name, so headings, titles and
 * lists use it. The official full name stays available as an alternate name.
 */
export function goesByName(n: LegislatorNameParts, bioguideId?: string): string {
  // A name checked against the member's own site wins (src/data/member-names.ts).
  const checked = bioguideId ? MEMBER_NAMES[bioguideId.toUpperCase()]?.name : undefined;
  if (checked) return checked;

  const nickname = n.nickname?.trim();
  const last = n.last?.trim();
  if (nickname && last) return `${nickname} ${last}`;

  const official = n.official_full?.trim().replace(GENERATIONAL_SUFFIX, '');
  if (official) {
    const withoutInitials = official
      .split(/\s+/)
      .filter(word => !/^[A-Z]\.$/.test(word))
      .join(' ');
    if (withoutInitials) return withoutInitials;
  }
  return [n.first?.trim(), last].filter(Boolean).join(' ');
}

/**
 * goesByName for a representative record, whose name fields live under
 * `fullName` (with `official` for official_full). Falls back to `name`.
 */
export function commonName(rep: {
  bioguideId?: string;
  name: string;
  fullName?: {
    first?: string;
    middle?: string;
    last: string;
    suffix?: string;
    nickname?: string;
    official?: string;
  };
}): string {
  const checked = rep.bioguideId ? MEMBER_NAMES[rep.bioguideId.toUpperCase()]?.name : undefined;
  if (checked) return checked;
  const f = rep.fullName;
  // Without a nickname or an official name there is nothing better than `name`.
  if (!f?.last?.trim() || (!f.nickname?.trim() && !f.official?.trim())) return rep.name;
  return (
    goesByName({
      first: f.first ?? '',
      middle: f.middle,
      last: f.last,
      suffix: f.suffix,
      nickname: f.nickname,
      official_full: f.official,
    }) || rep.name
  );
}

/**
 * The official full name when it differs from the name used on the page, for
 * structured data's alternateName ("Bernard Sanders" for "Bernie Sanders").
 */
export function officialNameIfDifferent(rep: Parameters<typeof commonName>[0]): string | undefined {
  const official = rep.fullName?.official?.trim();
  return official && official !== commonName(rep) ? official : undefined;
}
