/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoneyReportCard } from '@/components/intelligence/MoneyReportCard';
import type { MoneyReportCardInsight } from '@/lib/intelligence/types';

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

export default function MoneyReportPage() {
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MoneyReportCardInsight | null>(null);

  function canSubmit(): boolean {
    return street.trim().length > 0 && city.trim().length > 0 && state.length > 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch('/api/intelligence/address/money-report', {
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
        // ApiError shape (src/lib/api/error-responses.ts): error is an object, not a string.
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        const message = body?.error?.message ?? `Request failed (${response.status})`;
        throw new Error(message);
      }

      const data: MoneyReportCardInsight = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not generate money report for that address. Please check your address and try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClasses =
    'border-2 border-gray-300 p-2 text-base w-full focus:border-gray-900 outline-none dark:bg-[#1a1a1e] dark:border-[#444] dark:text-gray-100 dark:focus:border-gray-300';
  const labelClasses = 'type-xs text-gray-500 aicher-heading-wide mb-1 block';
  const buttonClasses =
    'border-2 border-gray-900 bg-gray-900 text-white px-4 py-3 min-h-[44px] type-sm aicher-heading hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-300 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200';

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-civiq-blue">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <Link href="/your-reps" className="hover:text-civiq-blue">
            Your Representatives
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">Money Report Card</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Money Report Card
          </h1>
          <p className="type-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            Enter your address to see how campaign contributions correlate with voting patterns for
            all your congressional representatives. This analysis uses public FEC filings,
            congressional voting records, and Senate lobbying disclosures.
          </p>
        </div>

        {/* Address form */}
        <form onSubmit={handleSubmit} className="max-w-2xl mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="sm:col-span-2">
              <label htmlFor="mr-street" className={labelClasses}>
                Street Address
              </label>
              <input
                id="mr-street"
                type="text"
                value={street}
                onChange={e => setStreet(e.target.value)}
                placeholder="123 Main St"
                className={inputClasses}
                required
              />
            </div>
            <div>
              <label htmlFor="mr-city" className={labelClasses}>
                City
              </label>
              <input
                id="mr-city"
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Washington"
                className={inputClasses}
                required
              />
            </div>
            <div>
              <label htmlFor="mr-state" className={labelClasses}>
                State
              </label>
              <select
                id="mr-state"
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
              <label htmlFor="mr-zip" className={labelClasses}>
                ZIP Code (optional)
              </label>
              <input
                id="mr-zip"
                type="text"
                value={zip}
                onChange={e => setZip(e.target.value)}
                placeholder="20001"
                className={inputClasses}
              />
            </div>
          </div>

          <button type="submit" disabled={loading || !canSubmit()} className={buttonClasses}>
            {loading ? 'Analyzing your representatives...' : 'Get Money Report Card'}
          </button>
        </form>

        {/* Loading state */}
        {loading && (
          <div className="border-2 border-gray-200 p-6 max-w-2xl">
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-gray-200 w-3/4" />
              <div className="h-4 bg-gray-200 w-1/2" />
              <div className="h-20 bg-gray-100 mt-4" />
              <div className="h-20 bg-gray-100" />
              <div className="h-20 bg-gray-100" />
            </div>
            <p className="type-sm text-gray-500 mt-4">
              Running 4 analyzers per representative. This may take up to 90 seconds for the initial
              analysis.
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="border-2 border-amber-500 border-l-4 p-4 max-w-2xl">
            <p className="type-sm text-gray-900 dark:text-gray-100">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && <MoneyReportCard insight={result} className="max-w-2xl" />}
      </main>
    </div>
  );
}
