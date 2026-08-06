/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Detroit City Council roster — committed corpus.
 *
 * Detroit has no live legislative API: its Legistar client is frozen at
 * 2018, so the shared Legistar fetch path returns nothing. This roster is
 * verified by hand against detroitmi.gov (the member-page URL slugs encode
 * district and leadership title) and must be re-verified after each
 * odd-year council election (next: November 2029) and after any vacancy.
 *
 * Nine seats: seven districts plus two at-large. Every Detroit resident is
 * represented by their district member and both at-large members.
 */

import type { CouncilMember } from '@/types/legistar';

export const DETROIT_ROSTER_META = {
  verifiedAt: '2026-08-06',
  source: 'https://detroitmi.gov/government/city-council',
  termEndsAfterElection: 2029,
} as const;

export interface DetroitCouncilSeat {
  name: string;
  firstName: string;
  lastName: string;
  /** 1-7 for district seats, null for at-large */
  district: number | null;
  /** Leadership title, if any */
  title: 'City Council President' | 'City Council President Pro Tem' | null;
  website: string;
}

export const DETROIT_COUNCIL_SEATS: DetroitCouncilSeat[] = [
  {
    name: 'James Tate',
    firstName: 'James',
    lastName: 'Tate',
    district: 1,
    title: 'City Council President',
    website: 'https://detroitmi.gov/government/city-council/city-council-president-district-1',
  },
  {
    name: 'Angela Whitfield-Calloway',
    firstName: 'Angela',
    lastName: 'Whitfield-Calloway',
    district: 2,
    title: null,
    website: 'https://detroitmi.gov/government/city-council/city-council-district-2',
  },
  {
    name: 'Scott Benson',
    firstName: 'Scott',
    lastName: 'Benson',
    district: 3,
    title: null,
    website: 'https://detroitmi.gov/government/city-council/city-council-district-3',
  },
  {
    name: 'Latisha Johnson',
    firstName: 'Latisha',
    lastName: 'Johnson',
    district: 4,
    title: null,
    website: 'https://detroitmi.gov/government/city-council/city-council-district-4',
  },
  {
    name: 'Renata Miller',
    firstName: 'Renata',
    lastName: 'Miller',
    district: 5,
    title: null,
    website: 'https://detroitmi.gov/government/city-council/city-council-district-5',
  },
  {
    name: 'Gabriela Santiago-Romero',
    firstName: 'Gabriela',
    lastName: 'Santiago-Romero',
    district: 6,
    title: null,
    website: 'https://detroitmi.gov/government/city-council/city-council-district-6',
  },
  {
    name: 'Denzel Anton McCampbell',
    firstName: 'Denzel',
    lastName: 'McCampbell',
    district: 7,
    title: null,
    website: 'https://detroitmi.gov/government/city-council/city-council-district-7-0',
  },
  {
    name: 'Coleman A. Young II',
    firstName: 'Coleman',
    lastName: 'Young II',
    district: null,
    title: 'City Council President Pro Tem',
    website: 'https://detroitmi.gov/government/city-council/city-council-president-pro-tem-large',
  },
  {
    name: 'Mary Waters',
    firstName: 'Mary',
    lastName: 'Waters',
    district: null,
    title: null,
    website: 'https://detroitmi.gov/government/city-council/city-council-large',
  },
];

/**
 * Members representing a given council district: the district seat plus
 * both at-large seats. Returns [] for a district number Detroit doesn't
 * have, so callers surface "data unavailable" rather than a wrong match.
 */
export function getDetroitMembersForDistrict(district: number): DetroitCouncilSeat[] {
  const districtSeat = DETROIT_COUNCIL_SEATS.find(seat => seat.district === district);
  if (!districtSeat) return [];
  return [districtSeat, ...DETROIT_COUNCIL_SEATS.filter(seat => seat.district === null)];
}

/**
 * Full roster in the shape the /api/city/[cityId]/council route serves.
 * The numeric ids are corpus ordinals (1-9), not Legistar person ids —
 * Detroit's Legistar database is dead and has no current ids to use.
 */
export function getDetroitCouncilMembers(): CouncilMember[] {
  return DETROIT_COUNCIL_SEATS.map((seat, index) => ({
    id: index + 1,
    name: seat.name,
    firstName: seat.firstName,
    lastName: seat.lastName,
    active: true,
    title: seat.title,
    bodyName: 'City Council',
    district: seat.district === null ? 'At-Large' : `District ${seat.district}`,
    startDate: null,
    endDate: null,
    address: null,
    city: 'Detroit',
    state: 'MI',
    zip: null,
    phone: null,
    email: null,
    website: seat.website,
  }));
}
