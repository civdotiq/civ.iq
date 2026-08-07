/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import { RepBriefSummary } from './RepBriefSummary';
import { AlertSubscribeForm } from '@/components/alerts/AlertSubscribeForm';
import { BallotCard } from '@/features/record-card/components/BallotCard';
import { RedistrictingNote } from '@/components/RedistrictingNote';

interface RepresentativeLookupFormProps {
  className?: string;
}

interface RepIdentity {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district: string | null;
  chamber: 'House' | 'Senate';
}

interface RepresentativesResult {
  representatives: RepIdentity[];
  state: string;
  district: string;
  multiDistrict: boolean;
  /** 2026-ballot (120th Congress) district when it differs from the current one. */
  ballotDistrict2026?: { differsFromCurrent: boolean; note?: string };
}

const US_STATES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DC',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
] as const;

export function RepresentativeLookupForm({ className = '' }: RepresentativeLookupFormProps) {
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RepresentativesResult | null>(null);

  function canSubmit(): boolean {
    return street.trim().length > 0 && city.trim().length > 0 && state.length > 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch('/api/intelligence/address/representatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          street: street.trim(),
          city: city.trim(),
          state,
          zip: zip.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          (body as Record<string, unknown> | null)?.error ?? `Request failed (${response.status})`;
        throw new Error(String(message));
      }

      const data: RepresentativesResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't find representatives for that address. Please check the street address, city, and state."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClasses =
    'border-2 border-gray-300 p-2 text-base w-full focus:border-gray-900 outline-none';
  const labelClasses = 'type-xs text-gray-500 aicher-heading-wide mb-1 block';
  const buttonClasses =
    'border-2 border-gray-900 bg-gray-900 text-white px-4 py-3 min-h-[44px] type-sm aicher-heading hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className={className}>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="sm:col-span-2">
            <label htmlFor="rep-street" className={labelClasses}>
              Street Address
            </label>
            <input
              id="rep-street"
              type="text"
              value={street}
              onChange={e => setStreet(e.target.value)}
              placeholder="123 Main St"
              className={inputClasses}
              required
            />
          </div>
          <div>
            <label htmlFor="rep-city" className={labelClasses}>
              City
            </label>
            <input
              id="rep-city"
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Washington"
              className={inputClasses}
              required
            />
          </div>
          <div>
            <label htmlFor="rep-state" className={labelClasses}>
              State
            </label>
            <select
              id="rep-state"
              value={state}
              onChange={e => setState(e.target.value)}
              className={inputClasses}
              required
            >
              <option value="">Select state</option>
              {US_STATES.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="rep-zip" className={labelClasses}>
              ZIP Code (optional)
            </label>
            <input
              id="rep-zip"
              type="text"
              value={zip}
              onChange={e => setZip(e.target.value)}
              placeholder="20001"
              className={inputClasses}
            />
          </div>
        </div>

        <button type="submit" disabled={loading || !canSubmit()} className={buttonClasses}>
          {loading ? 'Finding your representatives...' : 'Find My Representatives'}
        </button>
      </form>

      {/* Loading state */}
      {loading && (
        <div className="bg-gray-50 p-4 mt-4">
          <p className="type-sm text-gray-600 animate-pulse">
            Looking up your congressional district...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="border-2 border-amber-600 p-4 mt-4">
          <p className="type-sm text-amber-600">{error}</p>
        </div>
      )}

      {/* Results — rep cards with progressive brief loading */}
      {result && (
        <div className="mt-6">
          <p className="type-sm text-gray-500 mb-4">
            {result.state} District {result.district}
            {result.multiDistrict && (
              <span className="text-gray-400"> (multiple districts found — showing primary)</span>
            )}
          </p>

          {/* 2026 redistricting: the ballot district differs from the current rep's */}
          <RedistrictingNote ballotDistrict2026={result.ballotDistrict2026} className="mb-4" />

          {result.representatives.length === 0 && (
            <p className="type-sm text-gray-500">
              No representatives found for this district. This may be a data gap.
            </p>
          )}

          {/* Which of these seats are on the next ballot (additive; fails silent) */}
          {result.representatives.length > 0 && (
            <BallotCard bioguideIds={result.representatives.map(r => r.bioguideId)} />
          )}

          <div className="mt-6 space-y-4">
            {result.representatives.map(rep => (
              <RepBriefSummary
                key={rep.bioguideId}
                bioguideId={rep.bioguideId}
                name={rep.name}
                party={rep.party}
                state={rep.state}
                district={rep.district}
                chamber={rep.chamber}
              />
            ))}
          </div>

          {/* Alert subscription for all found representatives */}
          {result.representatives.length > 0 && (
            <div className="mt-6">
              <AlertSubscribeForm
                entities={result.representatives.map(rep => ({
                  type: 'representative' as const,
                  id: rep.bioguideId,
                  name: rep.name,
                  chamber: rep.chamber,
                }))}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
