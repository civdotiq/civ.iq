/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import {
  ElectionResultsTable,
  formatDistrictLabel,
} from '@/components/elections/ElectionResultsTable';
import { ElectionSummary } from '@/components/elections/ElectionSummary';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import type { RaceResultFull } from '@/types/elections';
import { ELECTION_2024_METADATA } from '@/data/election-results-metadata';

type FederalTab = 'president' | 'senate' | 'house';

const TABS: { id: FederalTab; label: string }[] = [
  { id: 'president', label: 'President' },
  { id: 'senate', label: 'US Senate' },
  { id: 'house', label: 'US House' },
];

const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

export default function FederalElectionsPage() {
  const [activeTab, setActiveTab] = useState<FederalTab>('president');
  const [stateFilter, setStateFilter] = useState('');
  const [results, setResults] = useState<RaceResultFull[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async (tab: FederalTab, state: string) => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ type: tab });
    if (state) params.set('state', state);

    try {
      const res = await fetch(`/api/elections/2024?${params}`);
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
      const json = await res.json();
      setResults(json.results || (json.result?.dataAvailable ? [json.result] : []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults(activeTab, stateFilter);
  }, [activeTab, stateFilter, fetchResults]);

  const handleTabChange = (tab: FederalTab) => {
    setActiveTab(tab);
    // Reset state filter when switching tabs
    if (tab !== 'house') setStateFilter('');
  };

  const raceLabels: Record<FederalTab, string> = {
    president: 'states',
    senate: 'Senate races',
    house: 'House races',
  };

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Elections', url: '/elections' },
          { name: 'Federal', url: '/elections/federal' },
        ]}
      />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-civiq-blue">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/elections" className="hover:text-civiq-blue">
            Elections
          </Link>
          <span className="mx-2">/</span>
          <span className="text-black dark:text-white">Federal</span>
        </nav>

        <h1 className="text-3xl font-bold mb-2">Federal election results</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          2024 federal race results from MEDSL/Harvard Dataverse.
        </p>

        {/* Tabs */}
        <div className="border-b-2 border-black dark:border-gray-600 mb-6">
          <div className="flex gap-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-3 transition-colors -mb-[2px] ${
                  activeTab === tab.id
                    ? 'border-civiq-blue text-civiq-blue'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* State filter */}
        <div className="flex items-center gap-4 mb-6">
          <label
            htmlFor="state-filter"
            className="text-sm font-medium text-gray-600 dark:text-gray-400"
          >
            Filter by state
          </label>
          <select
            id="state-filter"
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            className="border-2 border-black dark:border-gray-600 bg-white dark:bg-[#222226] px-3 py-1.5 text-sm min-w-[200px]"
          >
            <option value="">All states</option>
            {US_STATES.map(s => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          {stateFilter && (
            <button
              onClick={() => setStateFilter('')}
              className="text-sm text-civiq-blue hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Missing state notice */}
        {stateFilter && ELECTION_2024_METADATA.missingStates.includes(stateFilter) && !loading && (
          <div className="border-2 border-gray-300 dark:border-gray-600 p-8 text-center mb-6">
            <p className="text-gray-600 dark:text-gray-300 font-medium mb-2">
              {US_STATES.find(s => s.code === stateFilter)?.name || stateFilter} is not yet covered
              in this dataset.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              The MIT Election Data and Science Lab (MEDSL) 2024 dataset covers 46 of 51
              jurisdictions. {US_STATES.find(s => s.code === stateFilter)?.name || stateFilter} is
              among 5 states not yet included (AZ, CA, MS, NY, OR). Results will be added when the
              source data is updated.
            </p>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading {TABS.find(t => t.id === activeTab)?.label} results...</span>
          </div>
        ) : error ? (
          <div className="border-2 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-4">
            <p className="text-amber-800 dark:text-amber-200">{error}</p>
          </div>
        ) : stateFilter && ELECTION_2024_METADATA.missingStates.includes(stateFilter) ? null : (
          <>
            <ElectionSummary results={results} raceLabel={raceLabels[activeTab]} />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {results.length} {results.length === 1 ? 'race' : 'races'}
              {stateFilter &&
                ` in ${US_STATES.find(s => s.code === stateFilter)?.name || stateFilter}`}
            </p>
            <ElectionResultsTable results={results} labelFn={formatDistrictLabel} />
          </>
        )}

        {/* Citation */}
        <div className="mt-8 border-t-2 border-black dark:border-gray-600 pt-4">
          <p className="text-xs aicher-heading-wide text-gray-500 dark:text-gray-400 tracking-wider mb-2">
            DATA SOURCE
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            MIT Election Data and Science Lab (MEDSL). &ldquo;U.S. President, U.S. Senate, and U.S.
            House 2024 General Election Results.&rdquo; Harvard Dataverse, 2024.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            DOI: 10.7910/DVN/2024. Coverage: 46 of 51 jurisdictions. Missing: AZ, CA, MS, NY, OR.
          </p>
        </div>
      </div>
    </>
  );
}
