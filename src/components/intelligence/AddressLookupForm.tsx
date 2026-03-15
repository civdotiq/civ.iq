/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import { MoneyReportCard } from './MoneyReportCard';
import type { MoneyReportCardInsight } from '@/lib/intelligence/types';

interface AddressLookupFormProps {
  className?: string;
}

type LookupMode = 'address' | 'zip';

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

export function AddressLookupForm({ className = '' }: AddressLookupFormProps) {
  const [mode, setMode] = useState<LookupMode>('address');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [zipOnly, setZipOnly] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<MoneyReportCardInsight | null>(null);

  function canSubmitAddress(): boolean {
    return street.trim().length > 0 && city.trim().length > 0 && state.length > 0;
  }

  function canSubmitZip(): boolean {
    return zipOnly.trim().length > 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInsight(null);
    setLoading(true);

    try {
      let response: Response;

      if (mode === 'address') {
        response = await fetch('/api/intelligence/address/money-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            street: street.trim(),
            city: city.trim(),
            state,
            zip: zip.trim() || undefined,
          }),
        });
      } else {
        response = await fetch(
          `/api/intelligence/address/money-report?zip=${encodeURIComponent(zipOnly.trim())}`
        );
      }

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          (body as Record<string, unknown> | null)?.error ?? `Request failed (${response.status})`;
        throw new Error(String(message));
      }

      const data: MoneyReportCardInsight = await response.json();
      setInsight(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
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
      {/* Mode toggle */}
      <div className="flex gap-0 mb-4">
        <button
          type="button"
          onClick={() => setMode('address')}
          className={`px-4 py-3 min-h-[44px] type-sm aicher-heading border-2 ${
            mode === 'address'
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-300 bg-white text-gray-700'
          }`}
        >
          Full Address
        </button>
        <button
          type="button"
          onClick={() => setMode('zip')}
          className={`px-4 py-3 min-h-[44px] type-sm aicher-heading border-2 border-l-0 ${
            mode === 'zip'
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-300 bg-white text-gray-700'
          }`}
        >
          Quick ZIP Lookup
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === 'address' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="sm:col-span-2">
              <label htmlFor="addr-street" className={labelClasses}>
                Street Address
              </label>
              <input
                id="addr-street"
                type="text"
                value={street}
                onChange={e => setStreet(e.target.value)}
                placeholder="123 Main St"
                className={inputClasses}
                required
              />
            </div>
            <div>
              <label htmlFor="addr-city" className={labelClasses}>
                City
              </label>
              <input
                id="addr-city"
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Washington"
                className={inputClasses}
                required
              />
            </div>
            <div>
              <label htmlFor="addr-state" className={labelClasses}>
                State
              </label>
              <select
                id="addr-state"
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
              <label htmlFor="addr-zip" className={labelClasses}>
                ZIP Code (optional)
              </label>
              <input
                id="addr-zip"
                type="text"
                value={zip}
                onChange={e => setZip(e.target.value)}
                placeholder="20001"
                className={inputClasses}
              />
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <label htmlFor="zip-only" className={labelClasses}>
              ZIP Code
            </label>
            <input
              id="zip-only"
              type="text"
              value={zipOnly}
              onChange={e => setZipOnly(e.target.value)}
              placeholder="20001"
              className={`${inputClasses} max-w-xs`}
              required
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (mode === 'address' ? !canSubmitAddress() : !canSubmitZip())}
          className={buttonClasses}
        >
          {mode === 'address' ? 'Analyze My Representatives' : 'Look Up by ZIP'}
        </button>
      </form>

      {/* Loading state */}
      {loading && (
        <div className="border-2 border-gray-200 p-4 mt-4">
          <p className="type-sm text-gray-600 animate-pulse">
            Analyzing your representatives&apos; financial patterns...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="border-2 border-[#e11d07] p-4 mt-4">
          <p className="type-sm text-[#e11d07]">{error}</p>
        </div>
      )}

      {/* Results */}
      {insight && <MoneyReportCard insight={insight} className="mt-4" />}
    </div>
  );
}
