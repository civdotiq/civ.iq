/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Everyone who represents an address, from one /api/unified-geocode answer:
 * members of Congress first, then each state legislative seat with every
 * member who holds it (multi-member districts, DC and Puerto Rico at-large).
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { getPartyTextClass } from '@/lib/party-colors';
import { buildRepresentativeUrl, buildStateLegislatorUrl } from '@/lib/helpers/url-builders';
import { formatStateDistrict, getLegislatorRoleTitle } from '@/types/state-legislature';
import { rosterPartyLabel } from '@/lib/state-hub/hub-copy';
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

export function AddressLookupResults({
  result,
  fromLocation = false,
  federalExtras,
}: AddressLookupResultsProps) {
  const state = result.districts?.federal.state ?? '';
  const federal = result.federalRepresentatives ?? [];
  const seats = result.stateSeats ?? [];

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

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Your members of Congress</h3>
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
                  <span className={getPartyTextClass(rep.party)}>{rep.party}</span> · {rep.title}
                </p>
                <ContactLinks phone={rep.phone} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {seats.map(seat => {
        const chamber = seat.members[0]?.chamber ?? seat.censusChamber;
        const title = getLegislatorRoleTitle(state, chamber);
        const holders = seat.members.filter(m => !m.atLarge).length;
        return (
          <section key={seat.censusChamber}>
            <h3 className="text-lg font-semibold text-gray-900">
              Your {holders > 1 ? `${title}s` : title}
            </h3>
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
                  const party = rosterPartyLabel(m.party);
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
                        {formatStateDistrict(m.district)}
                      </p>
                      <ContactLinks phone={m.phone} email={m.email} />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      {federalExtras}

      {state && (
        <p className="text-sm">
          <Link
            href={`/state-legislature/${state.toLowerCase()}`}
            className="text-civiq-blue underline"
          >
            See every {state} state legislator
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
