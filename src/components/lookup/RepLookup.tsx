'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Address → your state legislators and members of Congress.
 *
 * Address, not ZIP: a ZIP spans more than one state house district for two
 * in three people, so only a street address places someone reliably. The
 * lookup posts to the robots-blocked /api/unified-geocode, so it runs for
 * visitors and never for a crawler rendering the page.
 */

import { useId, useState, useSyncExternalStore, type FormEvent } from 'react';
import Link from 'next/link';
import { getPartyTextClass } from '@/lib/party-colors';
import { buildRepresentativeUrl, buildStateLegislatorUrl } from '@/lib/helpers/url-builders';
import { formatStateDistrict } from '@/types/state-legislature';
import { membersForSeat, type LookupLegislator } from '@/lib/state-hub/lookup-match';
import type { HubMember } from '@/lib/state-hub/types';
import { ContactLinks } from './ContactLinks';

export interface RepLookupChamber {
  key: 'upper' | 'lower';
  name: string;
  roleTitle: string;
}

interface RepLookupProps {
  stateCode: string;
  stateName: string;
  chambers: RepLookupChamber[];
  /** The state's full roster, used to list every member of a multi-member district. */
  roster: HubMember[];
}

interface FederalRep {
  bioguideId: string;
  name: string;
  party: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  phone?: string;
}

interface GeocodeResponse {
  success: boolean;
  matchedAddress?: string;
  districts?: {
    federal: { state: string; district: string };
    stateSenate?: { number: string; name: string };
    stateHouse?: { number: string; name: string };
  };
  federalRepresentatives?: FederalRep[];
  stateLegislators?: { senator?: LookupLegislator; representative?: LookupLegislator };
  error?: { message: string; userMessage?: string };
}

interface LookupResult {
  matchedAddress?: string;
  addressState: string;
  seats: Array<{
    chamber: RepLookupChamber;
    district: string | null;
    members: HubMember[];
    /** True when the address couldn't be placed in a district of this chamber. */
    unplaced: boolean;
  }>;
  federal: FederalRep[];
}

const inputClasses =
  'border-2 border-gray-300 p-2 text-base w-full rounded-sm focus:border-gray-900 outline-none';
const labelClasses = 'type-xs text-gray-600 aicher-heading-wide mb-1 block';

const noopSubscribe = () => () => {};

/**
 * False in server HTML and until hydration. The submit button stays disabled
 * until then: a click before React attaches would do a native GET submit and
 * put the visitor's street address in the URL (and every log that records it).
 * A form whose only submit button is disabled can't be submitted with Enter
 * either.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

export function RepLookup({ stateCode, stateName, chambers, roster }: RepLookupProps) {
  const formId = useId();
  const hydrated = useHydrated();
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!street.trim() || !city.trim()) {
      setError('Enter your street address and city.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/unified-geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          street: street.trim(),
          city: city.trim(),
          state: stateCode,
          zip: zip.trim() || undefined,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = (await res.json()) as GeocodeResponse;
      if (!data.success) {
        setError(
          data.error?.userMessage ??
            'We couldn’t find that address. Check the street and city and try again.'
        );
        return;
      }
      setResult(toResult(data, stateCode, chambers, roster));
    } catch {
      setError('The lookup didn’t finish. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby={`${formId}-heading`} className="border-2 border-black p-4 sm:p-6">
      <h2 id={`${formId}-heading`} className="text-xl font-bold text-gray-900 mb-1">
        Find your legislators by address
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Use your home address. ZIP codes often cross district lines, so they can give the wrong
        answer.
      </p>
      <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-6 gap-3" noValidate>
        <div className="sm:col-span-3">
          <label htmlFor={`${formId}-street`} className={labelClasses}>
            Street address
          </label>
          <input
            id={`${formId}-street`}
            name="street"
            autoComplete="address-line1"
            className={inputClasses}
            value={street}
            onChange={e => setStreet(e.target.value)}
            placeholder="123 Main St"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${formId}-city`} className={labelClasses}>
            City
          </label>
          <input
            id={`${formId}-city`}
            name="city"
            autoComplete="address-level2"
            className={inputClasses}
            value={city}
            onChange={e => setCity(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor={`${formId}-zip`} className={labelClasses}>
            ZIP (optional)
          </label>
          <input
            id={`${formId}-zip`}
            name="zip"
            autoComplete="postal-code"
            inputMode="numeric"
            className={inputClasses}
            value={zip}
            onChange={e => setZip(e.target.value)}
          />
        </div>
        <div className="sm:col-span-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading || !hydrated}
            className="border-2 border-gray-900 bg-gray-900 text-white px-4 py-3 min-h-[44px] rounded-sm type-sm aicher-heading hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Looking up your districts…' : 'Find my legislators'}
          </button>
          <span className="text-sm text-gray-600">State: {stateName}</span>
        </div>
      </form>

      <div aria-live="polite">
        {error && (
          <p className="mt-4 border-l-4 border-amber-600 bg-amber-50 p-3 text-sm text-gray-900">
            {error}
          </p>
        )}
        {result && <LookupResults result={result} stateCode={stateCode} />}
      </div>
    </section>
  );
}

function toResult(
  data: GeocodeResponse,
  stateCode: string,
  chambers: RepLookupChamber[],
  roster: HubMember[]
): LookupResult {
  const addressState = data.districts?.federal.state?.toUpperCase() || stateCode;
  // An address in another state is answered by the API alone; this state's
  // roster would attach the wrong people.
  const usableRoster = addressState === stateCode ? roster : [];
  const profileUrl = (l: LookupLegislator) => buildStateLegislatorUrl(addressState, l.id, l.name);
  const legislators = data.stateLegislators ?? {};

  const seats = chambers.map(chamber => {
    const fromApi = chamber.key === 'upper' ? legislators.senator : legislators.representative;
    const census =
      chamber.key === 'upper' ? data.districts?.stateSenate : data.districts?.stateHouse;
    const match = membersForSeat(usableRoster, chamber.key, fromApi, census?.number, profileUrl);
    // No district placed: say so, rather than let at-large members alone
    // read as the whole answer (DC, where the API may name only one of them).
    const unplaced =
      match.district === null &&
      (match.members.length === 0 ||
        usableRoster.some(m => m.chamber === chamber.key && !m.atLarge));
    return { chamber, ...match, unplaced };
  });

  return {
    matchedAddress: data.matchedAddress,
    addressState,
    seats,
    federal: data.federalRepresentatives ?? [],
  };
}

function LookupResults({ result, stateCode }: { result: LookupResult; stateCode: string }) {
  const otherState = result.addressState !== stateCode;
  return (
    <div className="mt-6 space-y-6">
      {result.matchedAddress && (
        <p className="text-sm text-gray-600">
          Results for <span className="font-medium text-gray-900">{result.matchedAddress}</span>
        </p>
      )}
      {otherState && (
        <p className="border-l-4 border-amber-600 bg-amber-50 p-3 text-sm text-gray-900">
          That address is outside this state.{' '}
          <Link
            href={`/state-legislature/${result.addressState.toLowerCase()}`}
            className="text-civiq-blue underline"
          >
            See all legislators for {result.addressState}
          </Link>
        </p>
      )}

      {result.seats.map(({ chamber, district, members, unplaced }) => (
        <div key={chamber.key}>
          <h3 className="text-lg font-semibold text-gray-900">
            Your {members.length > 1 ? `${chamber.roleTitle}s` : chamber.roleTitle}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            {chamber.name}
            {district ? ` · ${formatStateDistrict(district)}` : ''}
          </p>
          {unplaced && (
            <p className="mb-3 border-l-4 border-amber-600 bg-amber-50 p-3 text-sm text-gray-900">
              We couldn’t tell which {stateCode === 'DC' ? 'ward' : 'district'} this address is in,
              so your {stateCode === 'DC' ? 'ward' : 'district'} {chamber.roleTitle.toLowerCase()}{' '}
              isn’t shown
              {members.length > 0 ? ' below' : ''}. Find them in the full list on this page.
            </p>
          )}
          {members.length > 0 && (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {members.map(m => (
                <li key={m.id} className="border-2 border-gray-300 p-3">
                  <Link href={m.url} className="font-semibold text-civiq-blue hover:underline">
                    {m.name}
                  </Link>
                  <p className="text-sm text-gray-600">
                    <span className={getPartyTextClass(m.party)}>{m.party}</span> ·{' '}
                    {formatStateDistrict(m.district)}
                  </p>
                  <ContactLinks phone={m.phone} email={m.email} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {result.federal.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Your members of Congress</h3>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {result.federal.map(rep => (
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
        </div>
      )}

      <p className="text-xs text-gray-500">
        Districts from the U.S. Census Bureau geocoder. State legislators from Open States.
      </p>
    </div>
  );
}
