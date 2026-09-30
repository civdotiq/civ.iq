'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * The "find your representatives" bar (homepage and /your-reps).
 *
 * Address, not ZIP (PLAN-search-growth-2026-09.md, decision 7): a ZIP code
 * crosses district lines, so a bare ZIP is answered with a request for the
 * street address rather than with representatives. The answer — members of
 * Congress and state legislators together — shows under the bar, so the
 * visitor's address never goes into a URL, browser history or request log.
 * "Use my location" sends the device's coordinates, not an IP-based guess.
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { SearchIcon } from '@/components/icons/AicherIcons';
import AddressAutocomplete from '@/components/search/AddressAutocomplete';
import { AddressLookupResults } from '@/components/lookup/AddressLookupResults';
import type { UnifiedGeocodeResult } from '@/types/unified-geocode';

type FederalRepresentatives = NonNullable<UnifiedGeocodeResult['federalRepresentatives']>;

interface SearchFormProps {
  /** Rendered under the members of Congress once an address resolves. */
  renderFederalExtras?: (federal: FederalRepresentatives) => ReactNode;
}

const ZIP_ONLY = /^\d{5}(-\d{4})?$/;
const LOOKUP_FAILED = 'The lookup didn’t finish. Please try again in a moment.';

async function lookup(body: object): Promise<UnifiedGeocodeResult> {
  const res = await fetch('/api/unified-geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  return (await res.json()) as UnifiedGeocodeResult;
}

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 5 * 60_000,
    })
  );
}

export default function SearchForm({ renderFederalExtras }: SearchFormProps) {
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<{
    result: UnifiedGeocodeResult;
    fromLocation: boolean;
  } | null>(null);

  async function run(body: object, fromLocation: boolean) {
    setError(null);
    setAnswer(null);
    try {
      const result = await lookup(body);
      if (!result.success) {
        setError(
          result.error?.userMessage ??
            'We couldn’t find that address. Check the street, city and state and try again.'
        );
        return;
      }
      setAnswer({ result, fromLocation });
    } catch {
      setError(LOOKUP_FAILED);
    }
  }

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const address = searchInput.trim();
    if (!address || isLoading) return;

    if (ZIP_ONLY.test(address)) {
      setAnswer(null);
      setError(
        'Add your street address. A ZIP code can cross district lines, so it can give the wrong representatives.'
      );
      return;
    }
    if (address.length < 8 || !/\d/.test(address)) {
      setAnswer(null);
      setError(
        'Enter your home street address with city and state, like 123 Main St, Detroit, MI.'
      );
      return;
    }

    setIsLoading(true);
    await run({ address }, false);
    setIsLoading(false);
  };

  const handleGeolocation = async () => {
    if (!('geolocation' in navigator)) {
      setError('This browser can’t share your location. Enter your address instead.');
      return;
    }
    setIsGeolocating(true);
    setError(null);
    try {
      const { coords } = await currentPosition();
      await run({ lat: coords.latitude, lon: coords.longitude }, true);
    } catch {
      setAnswer(null);
      setError('We couldn’t get your location. Enter your address instead.');
    } finally {
      setIsGeolocating(false);
    }
  };

  const federal = answer?.result.federalRepresentatives ?? [];

  return (
    <div className="mb-grid-2 sm:mb-grid-6 px-grid-2 sm:px-0">
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSearch} className="relative">
          <div className="relative border-2 border-black">
            <div className="absolute inset-y-0 left-0 pl-grid-2 flex items-center pointer-events-none z-10">
              <SearchIcon className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400" />
            </div>
            <AddressAutocomplete
              onSelect={address => {
                setSearchInput(address);
              }}
              onChange={value => {
                setSearchInput(value);
              }}
              placeholder="Enter your home address"
              disabled={isLoading}
              defaultValue={searchInput}
              ariaLabel="Your home address"
              className="pl-grid-4 sm:pl-grid-5 pr-grid-8 sm:pr-grid-12"
            />
            <button
              type="submit"
              disabled={!searchInput.trim() || isLoading}
              className="absolute inset-y-0 right-0 flex items-center px-grid-2 sm:px-grid-4 text-white bg-civiq-blue hover:bg-civiq-blue-hover disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-bold text-xs sm:text-base border-l-2 border-black tracking-wide uppercase"
            >
              {isLoading ? (
                <>
                  <span className="sr-only">Finding your representatives…</span>
                  <div className="animate-spin h-4 sm:h-5 w-4 sm:w-5 border-2 border-white border-t-transparent"></div>
                </>
              ) : (
                'SEARCH'
              )}
            </button>
          </div>
        </form>

        {/* Geolocation Button */}
        <div className="mt-grid-2 text-center">
          <button
            type="button"
            onClick={handleGeolocation}
            disabled={isGeolocating || isLoading}
            className="inline-flex items-center justify-center space-x-2 px-grid-2 py-grid-2 text-xs sm:text-sm font-bold uppercase tracking-aicher text-civiq-blue bg-white border-2 border-civiq-blue hover:bg-civiq-blue hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] w-full sm:w-auto"
          >
            {isGeolocating ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-civiq-blue border-t-transparent"></div>
                <span>Finding your location…</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>Use my location</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mt-grid-1 sm:mt-grid-2 px-grid-1">
          Try: &ldquo;123 Main St, Detroit, MI&rdquo; or &ldquo;1600 Pennsylvania Ave, Washington,
          DC&rdquo;
        </p>
      </div>

      <div aria-live="polite" className="max-w-4xl mx-auto">
        {error && (
          <p className="mt-grid-2 border-l-4 border-amber-600 bg-amber-50 p-3 text-sm text-gray-900 text-left max-w-2xl mx-auto">
            {error}
          </p>
        )}
        {answer && (
          <AddressLookupResults
            result={answer.result}
            fromLocation={answer.fromLocation}
            federalExtras={
              renderFederalExtras && federal.length > 0 ? renderFederalExtras(federal) : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
