/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Everyone who represents an address, from one /api/unified-geocode answer:
 * members of Congress first, then each state legislative seat with every
 * member who holds it (multi-member districts, DC and Puerto Rico at-large).
 */

import Link from 'next/link';
import { useId, type ReactNode } from 'react';
import { getPartyTextClass } from '@/lib/party-colors';
import {
  buildDistrictUrl,
  buildRepresentativeUrl,
  buildStateDistrictUrl,
  buildStateLegislatorUrl,
} from '@/lib/helpers/url-builders';
import { getStateLegislatureName, getStateName, isTerritory } from '@/lib/data/us-states';
import { formatStateDistrict, getLegislatorRoleTitle } from '@/types/state-legislature';
import { memberPartyLabel } from '@/lib/state-hub/hub-copy';
import { RedistrictingNote } from '@/components/RedistrictingNote';
import type { UnifiedGeocodeResult } from '@/types/unified-geocode';
import type { StateSeat } from '@/services/lookup/resolve-representatives.service';
import { ContactLinks } from './ContactLinks';

interface AddressLookupResultsProps {
  result: UnifiedGeocodeResult;
  /** The answer came from the device's location rather than a typed address. */
  fromLocation?: boolean;
  /**
   * Rendered after every seat (the /your-reps summaries), so long cards don't
   * push the state legislators out of view.
   */
  federalExtras?: ReactNode;
}

const SEAT_STATUS_COPY: Partial<Record<StateSeat['status'], string>> = {
  vacant: 'No one holds this seat in our records right now. It may be vacant.',
  unmapped: 'We found your district but can’t list who represents it yet.',
  unavailable: 'State legislator records are temporarily unavailable. Try again shortly.',
};

type FederalRep = NonNullable<UnifiedGeocodeResult['federalRepresentatives']>[number];

/** "the District of Columbia", "Michigan": a place name that reads after "all of". */
function placeName(state: string): string {
  const name = getStateName(state) ?? state;
  return state === 'DC' ? 'the District of Columbia' : name;
}

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

// What each level of office does, stated as fact rather than ranked: the
// reader sees both levels side by side and can judge what matters to them.
function congressScope(state: string, federal: FederalRep[]): string {
  const base = 'They write federal law and set the federal budget.';
  if (federal.length === 0 || federal.some(r => r.chamber === 'Senate')) {
    return `${base} Senators also confirm judges and approve treaties.`;
  }
  const place = placeName(state);
  const who = nonVotingTitle(state).toLowerCase();
  return `${base} ${place.charAt(0).toUpperCase()}${place.slice(1)} has no senators, and its ${who} can vote in committee but not on the final passage of bills.`;
}

/** DC and the territories send one non-voting member to the House. */
function nonVotingTitle(state: string): string {
  return state === 'PR' ? 'Resident Commissioner' : 'Delegate';
}

function federalTitle(state: string, rep: FederalRep): string {
  return rep.chamber === 'House' && (state === 'DC' || isTerritory(state))
    ? nonVotingTitle(state)
    : rep.title;
}

function stateGroupHeading(state: string): string {
  if (state === 'DC') return 'Your councilmembers';
  return isTerritory(state) ? 'Your legislators' : 'Your state legislators';
}

function legislatureScope(state: string): string {
  const place = placeName(state);
  const body = getStateLegislatureName(state) ?? 'legislature';
  if (state === 'DC') {
    return `The ${body} writes District law, including the District budget, schools and roads. Congress reviews every District law and can block it.`;
  }
  if (isTerritory(state)) {
    return `The ${body} writes ${place} law, including its budget, schools and roads.`;
  }
  return `The ${body} writes ${place} law, including the state budget, schools, roads and election rules.`;
}

/** Who a member of Congress answers to, linked to the page that describes it. */
function FederalConstituency({ state, rep }: { state: string; rep: FederalRep }) {
  const place = placeName(state);
  const districtNumber = Number.parseInt(rep.district ?? '', 10);
  const numbered =
    rep.chamber === 'House' && districtNumber > 0 && districtNumber < 98 ? districtNumber : null;
  const href =
    rep.chamber === 'Senate'
      ? `/states/${state.toLowerCase()}`
      : buildDistrictUrl(state, numbered ? String(numbered) : 'AL');
  return (
    <p className="text-sm text-gray-600">
      Represents{' '}
      {numbered ? (
        <Link href={href} className="text-civiq-blue hover:underline">
          {getStateName(state) ?? state}’s {ordinal(numbered)} District
        </Link>
      ) : (
        <>
          all of{' '}
          <Link href={href} className="text-civiq-blue hover:underline">
            {place}
          </Link>
        </>
      )}
    </p>
  );
}

export function AddressLookupResults({
  result,
  fromLocation = false,
  federalExtras,
}: AddressLookupResultsProps) {
  const state = result.districts?.federal.state ?? '';
  const federal = result.federalRepresentatives ?? [];
  const seats = result.stateSeats ?? [];
  const headingId = useId();

  return (
    <div className="mt-6 space-y-6 text-left">
      <p className="text-sm text-gray-600">
        {fromLocation ? (
          <>
            Results for your device’s location. If you aren’t at home, search your home address
            instead.
          </>
        ) : (
          <>
            Results for <span className="font-medium text-gray-900">{result.matchedAddress}</span>
          </>
        )}
      </p>

      <RedistrictingNote ballotDistrict2026={result.ballotDistrict2026} />

      <section aria-labelledby={`${headingId}-congress`}>
        <h3 id={`${headingId}-congress`} className="text-lg font-semibold text-gray-900">
          Your members of Congress
        </h3>
        <p className="text-sm text-gray-600 mb-3">{congressScope(state, federal)}</p>
        {federal.length === 0 ? (
          <p className="text-sm text-gray-600">
            Member of Congress records are temporarily unavailable. Try again shortly.
          </p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {federal.map(rep => (
              <li key={rep.bioguideId} className="border-2 border-gray-300 p-3">
                <Link
                  href={buildRepresentativeUrl(rep.bioguideId)}
                  className="font-semibold text-civiq-blue hover:underline"
                >
                  {rep.name}
                </Link>
                <p className="text-sm text-gray-600">
                  <span className={getPartyTextClass(rep.party)}>{rep.party}</span> ·{' '}
                  {federalTitle(state, rep)}
                </p>
                <FederalConstituency state={state} rep={rep} />
                <ContactLinks phone={rep.phone} contactForm={rep.contactForm} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {seats.length > 0 && (
        <section aria-labelledby={`${headingId}-state`} className="space-y-5">
          <div>
            <h3 id={`${headingId}-state`} className="text-lg font-semibold text-gray-900">
              {stateGroupHeading(state)}
            </h3>
            <p className="text-sm text-gray-600">{legislatureScope(state)}</p>
          </div>
          {seats.map(seat => {
            const chamber = seat.members[0]?.chamber ?? seat.censusChamber;
            const title = getLegislatorRoleTitle(state, chamber).toLowerCase();
            const holders = seat.members.filter(m => !m.atLarge).length;
            return (
              <div key={seat.censusChamber}>
                <h4 className="text-base font-semibold text-gray-900">
                  Your {holders > 1 ? `${title}s` : title}
                </h4>
                <p className="text-sm text-gray-600 mb-2">{seat.census.name}</p>
                {SEAT_STATUS_COPY[seat.status] && (
                  <p className="mb-3 border-l-4 border-amber-600 bg-amber-50 p-3 text-sm text-gray-900">
                    {SEAT_STATUS_COPY[seat.status]}
                  </p>
                )}
                {seat.note && (
                  <p className="mb-3 border-l-4 border-amber-600 bg-amber-50 p-3 text-sm text-gray-900">
                    {seat.note}
                  </p>
                )}
                {seat.members.length > 0 && (
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {seat.members.map(m => {
                      const party = memberPartyLabel(m.party);
                      return (
                        <li key={m.id} className="border-2 border-gray-300 p-3">
                          <Link
                            href={buildStateLegislatorUrl(state, m.id, m.name)}
                            className="font-semibold text-civiq-blue hover:underline"
                          >
                            {m.name}
                          </Link>
                          <p className="text-sm text-gray-600">
                            <span className={getPartyTextClass(party)}>{party}</span> ·{' '}
                            {m.atLarge ? (
                              formatStateDistrict(m.district)
                            ) : (
                              <Link
                                href={buildStateDistrictUrl(state, m.chamber, m.district)}
                                className="text-civiq-blue hover:underline"
                              >
                                {formatStateDistrict(m.district)}
                              </Link>
                            )}
                          </p>
                          <ContactLinks phone={m.phone} email={m.email} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      )}

      {federalExtras}

      {state && (
        <p className="text-sm">
          <Link
            href={`/state-legislature/${state.toLowerCase()}`}
            className="text-civiq-blue underline"
          >
            See every {state}{' '}
            {state === 'DC'
              ? 'councilmember'
              : isTerritory(state)
                ? 'legislator'
                : 'state legislator'}
          </Link>
        </p>
      )}

      <p className="text-xs text-gray-500">
        Districts from the U.S. Census Bureau geocoder. Members of Congress from the congressional
        legislators roster. State legislators from Open States.
      </p>
    </div>
  );
}
