/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Turn an address lookup's state-legislator answer into everyone who
 * represents that address in a chamber.
 *
 * /api/unified-geocode returns at most one senator and one representative,
 * but ten jurisdictions elect several members per district (Arizona and New
 * Jersey two House members, Maryland up to three Delegates, New Hampshire up
 * to eleven) and DC and Puerto Rico add at-large members for every address.
 * The hub already holds the full roster, so the one member the API names is
 * used to find their district, and the roster supplies the rest.
 */

import type { HubMember } from './types';

/** The legislator shape /api/unified-geocode returns per chamber. */
export interface LookupLegislator {
  id: string;
  name: string;
  party: string;
  district: string;
  email?: string;
  phone?: string;
}

export interface SeatMatch {
  /** The district as the roster spells it; null when it couldn't be placed. */
  district: string | null;
  members: HubMember[];
}

function numericDistrict(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value.trim())) return null;
  return Number.parseInt(value, 10);
}

/**
 * Everyone representing the address in one chamber.
 *
 * @param roster       The state's full roster (empty when the address turned
 *                     out to be in another state — the API's own answer is
 *                     then shown as-is).
 * @param chamber      Which chamber to answer for.
 * @param fromApi      The legislator the lookup returned for this chamber.
 * @param censusNumber The Census district code for this chamber ("081"),
 *                     used only when the API returned nobody.
 * @param profileUrl   Builds a profile link for an API legislator the roster
 *                     doesn't hold.
 */
export function membersForSeat(
  roster: HubMember[],
  chamber: 'upper' | 'lower',
  fromApi: LookupLegislator | undefined,
  censusNumber: string | undefined,
  profileUrl: (legislator: LookupLegislator) => string
): SeatMatch {
  const inChamber = roster.filter(m => m.chamber === chamber);
  const atLarge = inChamber.filter(m => m.atLarge);

  let district: string | null = null;
  const anchor = fromApi ? inChamber.find(m => m.id === fromApi.id) : undefined;
  if (anchor && !anchor.atLarge) {
    district = anchor.district;
  } else if (!fromApi) {
    const wanted = numericDistrict(censusNumber);
    if (wanted !== null) {
      district = inChamber.find(m => numericDistrict(m.district) === wanted)?.district ?? null;
    }
  }

  const members = district ? inChamber.filter(m => !m.atLarge && m.district === district) : [];

  // The API named someone the roster doesn't hold (a mid-session change the
  // committed corpus hasn't picked up yet): show them rather than drop them.
  if (fromApi && !anchor) {
    members.push({
      id: fromApi.id,
      name: fromApi.name,
      district: fromApi.district,
      party: fromApi.party,
      chamber,
      phone: fromApi.phone,
      email: fromApi.email,
      url: profileUrl(fromApi),
      atLarge: false,
    });
    district = fromApi.district;
  }

  const seen = new Set(members.map(m => m.id));
  for (const m of atLarge) if (!seen.has(m.id)) members.push(m);

  return { district, members };
}
