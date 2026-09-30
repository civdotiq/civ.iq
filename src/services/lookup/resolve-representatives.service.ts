/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Address → everyone who represents it: two US Senators, the House member or
 * delegate, and every state legislator for the address's districts.
 *
 * The one resolver behind /api/unified-geocode,
 * /api/intelligence/address/representatives and the MCP lookup_representatives
 * tool, which each used to match districts their own way (and each dropped DC's
 * delegate, whose Census district is 98 while the roster stores 0).
 *
 * Address only: a ZIP code is not a location (PLAN-search-growth-2026-09.md,
 * decision 7). The Census geocoder turns the address into districts; the
 * committed OpenStates corpus names the state members, through GEOID keys built
 * against that corpus (src/data/sld-district-keys.json). There is no live
 * OpenStates call on this path, so lookups never spend the 1,000/day quota.
 */

import { censusGeocoder } from '@/services/geocoding/census-geocoder.service';
import {
  CensusGeocoderError,
  CensusGeocoderException,
  type ParsedDistrictInfo,
} from '@/services/geocoding/census-geocoder.types';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import { getJurisdictionRoster } from '@/lib/data-sources/openstates-people/load-people';
import type { CorpusPerson } from '@/lib/data-sources/openstates-people/people-corpus';
import { chamberBucket } from '@/lib/data-sources/openstates-people/adapt';
import {
  corpusDistrictsForGeoid,
  SLD_KEYS_VINTAGE,
  type SldChamber,
} from '@/lib/data-sources/sld-district-keys';
import {
  resolveBallotDistrict2026,
  type BallotDistrict2026,
} from '@/lib/data-sources/cd120-districts';
import { censusCongressionalDistrictCode, STATE_FIPS_TO_CODE } from '@/lib/data/us-states';
import logger from '@/lib/logging/simple-logger';

/**
 * A street address in parts, the same address on one line (Census splits it),
 * or a point from a device's location. Never a ZIP code alone.
 */
export type ResolveAddressInput =
  | {
      street: string;
      city: string;
      /** USPS code the person entered; the geocoder's answer wins when they differ. */
      state: string;
      zip?: string;
    }
  | { address: string }
  | { lat: number; lon: number };

function geocode(input: ResolveAddressInput): Promise<ParsedDistrictInfo> {
  if ('address' in input) return censusGeocoder.geocodeOneLineAddress(input.address);
  if ('lat' in input) return censusGeocoder.geographiesAtPoint(input.lat, input.lon);
  return censusGeocoder.geocodeAddress({
    street: input.street,
    city: input.city,
    state: input.state,
    zip: input.zip,
  });
}

export interface FederalMember {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  phone?: string;
  website?: string;
  /** The member's official web contact form (congress-legislators `contact_form`). */
  contactForm?: string;
  imageUrl?: string;
}

export interface StateMember {
  /** `ocd-person/<uuid>`. */
  id: string;
  name: string;
  /** Upstream party name, un-normalized ("Democratic-Farmer-Labor"). */
  party: string;
  district: string;
  /** The app's upper/lower bucket (DC's council sorts as lower, Nebraska's as upper). */
  chamber: 'upper' | 'lower';
  /** Serves every address in the jurisdiction (DC at-large and chair, Puerto Rico at-large). */
  atLarge: boolean;
  email?: string;
  phone?: string;
  website?: string;
  image?: string;
}

/**
 * - `found`: at least one sitting member holds the district.
 * - `vacant`: the district is known but no sitting member holds it.
 * - `unmapped`: the Census district can't be tied to a corpus district, so
 *   members can't be listed. The district itself is still shown.
 * - `unavailable`: the roster corpus couldn't be read.
 */
export type SeatStatus = 'found' | 'vacant' | 'unmapped' | 'unavailable';

export interface StateSeat {
  /** Which Census layer the district came from. Nebraska and DC use `upper`. */
  censusChamber: SldChamber;
  census: { geoid: string; number: string; name: string };
  /** The district as the legislature names it; empty when unmapped. */
  districts: string[];
  /** Everyone holding the district, then the jurisdiction's at-large members. */
  members: StateMember[];
  status: SeatStatus;
  /** A plain-language caveat for this seat, when one applies. */
  note?: string;
}

export interface ResolvedAddress {
  matchedAddress: string;
  coordinates: { lat: number; lon: number };
  /** USPS code, from the Census GEOID. */
  state: string;
  /** The sitting (119th) Congress district; null when the geocoder named none. */
  congressionalDistrict: { number: string; geoid: string; name: string } | null;
  /** Senators and the House member or delegate; null when the roster couldn't be read. */
  federal: FederalMember[] | null;
  stateSeats: StateSeat[];
  /** The district on the Nov 3, 2026 ballot; null when the CD120 corpus has no answer. */
  ballotDistrict2026: BallotDistrict2026 | null;
}

/**
 * Seats a Census district can't fully describe. New Hampshire's House also
 * elects members from floterial districts drawn over groups of base districts;
 * the Census layer holds only the base districts.
 */
const SEAT_NOTES: Record<string, string> = {
  'NH-lower':
    'New Hampshire also elects some House members from larger "floterial" districts that overlap this one. They are not listed here.',
};

function isAtLarge(district: string): boolean {
  return /^(at-large|chairman)$/i.test(district.trim());
}

function censusChamberHolds(census: SldChamber, person: CorpusPerson): boolean {
  // Unicameral bodies (Nebraska, DC) appear in the Census upper-chamber layer only.
  return census === 'upper'
    ? person.chamber === 'upper' || person.chamber === 'legislature'
    : person.chamber === 'lower';
}

function toStateMember(person: CorpusPerson): StateMember {
  return {
    id: person.id,
    name: person.name,
    party: person.party,
    district: person.district,
    chamber: chamberBucket(person),
    atLarge: isAtLarge(person.district),
    email: person.email,
    phone: person.phone,
    website: person.links[0],
    image: person.image,
  };
}

function stateFromGeoid(geoid: string | undefined): string | undefined {
  return geoid ? STATE_FIPS_TO_CODE[geoid.slice(0, 2)] : undefined;
}

/** Everyone holding one Census district, from the corpus only. */
export function resolveSeat(
  state: string,
  censusChamber: SldChamber,
  census: { geoid: string; number: string; name: string },
  sldVintage: string | undefined,
  roster: CorpusPerson[] | null
): StateSeat {
  const note = SEAT_NOTES[`${state}-${censusChamber}`];
  const base = { censusChamber, census, ...(note ? { note } : {}) };

  if (!roster) return { ...base, districts: [], members: [], status: 'unavailable' };

  const inChamber = roster.filter(p => censusChamberHolds(censusChamber, p));
  const atLarge = inChamber.filter(p => isAtLarge(p.district)).map(toStateMember);

  // GEOIDs are only comparable within one Census vintage: a geocoder answer
  // from another vintage must not be read against these keys.
  const districts =
    sldVintage === SLD_KEYS_VINTAGE ? corpusDistrictsForGeoid(censusChamber, census.geoid) : null;
  if (!districts) {
    logger.warn('[resolveSeat] Census district not keyed', {
      state,
      censusChamber,
      geoid: census.geoid,
      sldVintage,
      keysVintage: SLD_KEYS_VINTAGE,
    });
    return { ...base, districts: [], members: atLarge, status: 'unmapped' };
  }

  const holders = inChamber.filter(p => districts.includes(p.district)).map(toStateMember);
  return {
    ...base,
    districts,
    members: [...holders, ...atLarge],
    status: holders.length > 0 ? 'found' : 'vacant',
  };
}

/** The state's senators and the House member or delegate for one district. */
async function federalMembers(
  state: string,
  congressionalGeoid: string | undefined
): Promise<FederalMember[] | null> {
  try {
    const all = await RepresentativesCoreService.getAllRepresentatives();
    // Census codes: "00" at-large, "98" delegate seat, else zero-padded.
    const cdCode = congressionalGeoid ? congressionalGeoid.slice(2) : null;
    return all
      .filter(
        rep =>
          rep.state === state &&
          (rep.chamber === 'Senate' ||
            (cdCode !== null &&
              censusCongressionalDistrictCode(state, rep.district ?? '') === cdCode))
      )
      .map(rep => ({
        bioguideId: rep.bioguideId,
        name: rep.name,
        party: rep.party,
        state: rep.state,
        district: rep.district,
        chamber: rep.chamber,
        title: rep.title,
        // The roster keeps office contact details on the current term; the
        // top-level fields are unset for every member.
        phone: rep.currentTerm?.phone ?? rep.phone,
        website: rep.currentTerm?.website ?? rep.website,
        contactForm: rep.currentTerm?.contactForm,
        imageUrl: rep.imageUrl,
      }));
  } catch (error) {
    logger.error('[resolveByAddress] Federal roster unavailable', error as Error, { state });
    return null;
  }
}

/**
 * Resolve a street address. Geocoder failures propagate as
 * CensusGeocoderException so each caller keeps its own error envelope.
 */
export async function resolveByAddress(input: ResolveAddressInput): Promise<ResolvedAddress> {
  const info = await geocode(input);

  const state =
    stateFromGeoid(info.congressionalDistrict?.geoid) ??
    stateFromGeoid(info.upperDistrict?.geoid) ??
    stateFromGeoid(info.lowerDistrict?.geoid) ??
    ('state' in input ? input.state.toUpperCase() : undefined);
  if (!state) {
    // A point offshore or outside the US: no district layer answered.
    throw new CensusGeocoderException(
      CensusGeocoderError.MISSING_DISTRICT_DATA,
      'No congressional or state legislative district at this location'
    );
  }

  const [federal, roster, ballotDistrict2026] = await Promise.all([
    federalMembers(state, info.congressionalDistrict?.geoid),
    getJurisdictionRoster(state),
    resolveBallotDistrict2026(
      info.coordinates.lon,
      info.coordinates.lat,
      info.congressionalDistrict
        ? { state, district: info.congressionalDistrict.number }
        : undefined
    ),
  ]);

  const stateSeats: StateSeat[] = [];
  if (info.upperDistrict) {
    stateSeats.push(resolveSeat(state, 'upper', info.upperDistrict, info.sldVintage, roster));
  }
  if (info.lowerDistrict) {
    stateSeats.push(resolveSeat(state, 'lower', info.lowerDistrict, info.sldVintage, roster));
  }

  return {
    matchedAddress: info.matchedAddress,
    coordinates: info.coordinates,
    state,
    congressionalDistrict: info.congressionalDistrict ?? null,
    federal,
    stateSeats,
    ballotDistrict2026,
  };
}

/** Every state member across the seats, grouped by the app's chamber bucket, without repeats. */
export function stateMembersByBucket(seats: StateSeat[]): {
  upper: StateMember[];
  lower: StateMember[];
} {
  const seen = new Set<string>();
  const out = { upper: [] as StateMember[], lower: [] as StateMember[] };
  for (const seat of seats) {
    for (const m of seat.members) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out[m.chamber].push(m);
    }
  }
  return out;
}
