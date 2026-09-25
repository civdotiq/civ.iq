'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Search, Filter, MapPin, Users, Calendar, FileText, DollarSign, X } from 'lucide-react';
import logger from '@/lib/logging/simple-logger';
import { LoadingState } from '@/components/shared/ui/LoadingState';
import { formatCurrency } from '@/lib/utils';

interface SearchFilters {
  query: string;
  party: 'all' | 'D' | 'R' | 'I';
  chamber: 'all' | 'House' | 'Senate';
  state: string;
  committee: string;
  experienceYears: [number, number];
  /** Raw input text; '' means no bound. */
  billsIntroducedMin: string;
  billsIntroducedMax: string;
  /** Raw dollar input text; '' means no bound. */
  raisedMin: string;
  raisedMax: string;
  sort: SortOption;
}

type SortOption = 'name' | 'yearsInOffice' | 'billsIntroduced' | 'raised';

// Counts read best high-to-low; names A-Z.
const SORT_ORDER: Record<SortOption, 'asc' | 'desc'> = {
  name: 'asc',
  yearsInOffice: 'desc',
  billsIntroduced: 'desc',
  raised: 'desc',
};

const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  party: 'all',
  chamber: 'all',
  state: '',
  committee: '',
  experienceYears: [0, 30],
  billsIntroducedMin: '',
  billsIntroducedMax: '',
  raisedMin: '',
  raisedMax: '',
  sort: 'name',
};

/** A whole, non-negative number from a text input, or null for blank/invalid. */
function parseCount(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

/** Whole dollars from input like "1,000,000" or "$250000"; null for blank/invalid. */
function parseDollars(raw: string): number | null {
  return parseCount(raw.replace(/[$,\s]/g, ''));
}

interface FundraisingMeta {
  cycle: number;
  membersCovered: number;
  totalMembers: number;
}

function formatAsOf(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  yearsInOffice: number;
  /** Null when the bills corpus is unavailable, never a stand-in zero. */
  billsIntroduced: number | null;
  /** FEC receipts this cycle; null when unknown or none, never a stand-in zero. */
  raisedThisCycle: number | null;
  raisedThroughDate: string | null;
  committees: string[];
  imageUrl?: string;
}

export function AdvancedSearch() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';

  const [filters, setFilters] = useState<SearchFilters>({
    ...DEFAULT_FILTERS,
    query: initialQuery,
  });

  const [results, setResults] = useState<Representative[]>([]);
  const [billsAsOf, setBillsAsOf] = useState<string | null>(null);
  const [fundraising, setFundraising] = useState<FundraisingMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [resultCount, setResultCount] = useState(0);

  const states = [
    'AL',
    'AK',
    'AZ',
    'AR',
    'CA',
    'CO',
    'CT',
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
  ];

  const committees = [
    'Agriculture',
    'Appropriations',
    'Armed Services',
    'Banking',
    'Budget',
    'Commerce',
    'Education',
    'Energy',
    'Environment',
    'Ethics',
    'Finance',
    'Foreign Affairs',
    'Homeland Security',
    'Intelligence',
    'Judiciary',
    'Natural Resources',
    'Oversight',
    'Rules',
    'Science',
    'Small Business',
    'Transportation',
    'Veterans Affairs',
    'Ways and Means',
  ];

  const handleSearch = useCallback(async () => {
    setLoading(true);

    try {
      // Build query parameters
      const params = new URLSearchParams();

      if (filters.query) params.append('query', filters.query);
      if (filters.party !== 'all') params.append('party', filters.party);
      if (filters.chamber !== 'all') params.append('chamber', filters.chamber);
      if (filters.state) params.append('state', filters.state);
      if (filters.committee) params.append('committee', filters.committee);

      params.append('experienceYearsMin', filters.experienceYears[0].toString());
      params.append('experienceYearsMax', filters.experienceYears[1].toString());

      const billsMin = parseCount(filters.billsIntroducedMin);
      const billsMax = parseCount(filters.billsIntroducedMax);
      if (billsMin !== null) params.append('billsIntroducedMin', billsMin.toString());
      if (billsMax !== null) params.append('billsIntroducedMax', billsMax.toString());

      const raisedMin = parseDollars(filters.raisedMin);
      const raisedMax = parseDollars(filters.raisedMax);
      if (raisedMin !== null) params.append('raisedMin', raisedMin.toString());
      if (raisedMax !== null) params.append('raisedMax', raisedMax.toString());

      params.append('sort', filters.sort);
      params.append('order', SORT_ORDER[filters.sort]);

      // Fetch from API
      const response = await fetch(`/api/search?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();

      setResults(data.data?.results || []);
      setResultCount(data.data?.totalResults || 0);
      setBillsAsOf(data.data?.metadata?.billsIntroducedAsOf ?? null);
      setFundraising(data.data?.metadata?.fundraising ?? null);
    } catch (error) {
      logger.error('Advanced search error', {
        component: 'AdvancedSearch',
        error: error as Error,
        metadata: { filters },
      });
      setResults([]);
      setResultCount(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const updateFilter = (key: keyof SearchFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div className="aicher-card p-6">
      <div className="mb-6">
        <h2 className="aicher-heading text-2xl text-gray-900 mb-2">
          Advanced Representative Search
        </h2>
        <p className="aicher-heading-wide text-gray-600">
          Find representatives by party, chamber, state, committee membership, years in office and
          bills introduced
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by name, state, or keyword..."
          value={filters.query}
          onChange={e => updateFilter('query', e.target.value)}
          className="aicher-button block w-full pl-10 pr-3 py-3 focus:outline-none focus:aicher-focus text-lg"
        />
      </div>

      {/* Quick Filters - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center justify-center gap-2 px-4 py-3 border transition-colors min-h-[44px] ${
            showFilters
              ? 'bg-civiq-blue text-white border-civiq-blue'
              : 'aicher-button text-gray-700 aicher-hover'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="aicher-heading-wide">Advanced Filters</span>
        </button>

        <select
          value={filters.party}
          onChange={e => updateFilter('party', e.target.value)}
          className="aicher-button min-h-[44px] px-4 py-3 focus:outline-none focus:aicher-focus aicher-heading-wide text-gray-700"
        >
          <option value="all">All Parties</option>
          <option value="D">Democrat</option>
          <option value="R">Republican</option>
          <option value="I">Independent</option>
        </select>

        <select
          value={filters.chamber}
          onChange={e => updateFilter('chamber', e.target.value)}
          className="aicher-button min-h-[44px] px-4 py-3 focus:outline-none focus:aicher-focus aicher-heading-wide text-gray-700"
        >
          <option value="all">Both Chambers</option>
          <option value="House">House</option>
          <option value="Senate">Senate</option>
        </select>

        <select
          value={filters.state}
          onChange={e => updateFilter('state', e.target.value)}
          className="aicher-button min-h-[44px] px-4 py-3 focus:outline-none focus:aicher-focus aicher-heading-wide text-gray-700"
        >
          <option value="">All States</option>
          {states.map(state => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>

      {/* Clear All Button */}
      {(filters.query ||
        filters.party !== 'all' ||
        filters.chamber !== 'all' ||
        filters.state ||
        filters.billsIntroducedMin ||
        filters.billsIntroducedMax ||
        filters.raisedMin ||
        filters.raisedMax) && (
        <div className="mb-6">
          <button
            onClick={clearFilters}
            className="aicher-button flex items-center justify-center gap-2 px-4 py-3 text-sm text-gray-600 aicher-hover min-h-[44px] w-full sm:w-auto"
          >
            <X className="w-4 h-4" />
            <span className="aicher-heading-wide">Clear All Filters</span>
          </button>
        </div>
      )}

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="aicher-card aicher-status-info p-6 mb-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Committee Filter */}
            <div>
              <label className="aicher-heading-wide block text-sm text-gray-700 mb-2">
                Committee
              </label>
              <select
                value={filters.committee}
                onChange={e => updateFilter('committee', e.target.value)}
                className="aicher-button w-full px-3 py-2 focus:outline-none focus:aicher-focus"
              >
                <option value="">Any Committee</option>
                {committees.map(committee => (
                  <option key={committee} value={committee}>
                    {committee}
                  </option>
                ))}
              </select>
            </div>

            {/* Years in Office Range */}
            <div>
              <label className="aicher-heading-wide block text-sm text-gray-700 mb-2">
                Years in Office: {filters.experienceYears[0]} - {filters.experienceYears[1]}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={filters.experienceYears[0]}
                  onChange={e =>
                    updateFilter('experienceYears', [
                      parseInt(e.target.value),
                      filters.experienceYears[1],
                    ])
                  }
                  className="flex-1"
                />
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={filters.experienceYears[1]}
                  onChange={e =>
                    updateFilter('experienceYears', [
                      filters.experienceYears[0],
                      parseInt(e.target.value),
                    ])
                  }
                  className="flex-1"
                />
              </div>
            </div>

            {/* Bills Introduced Range */}
            <div>
              <label
                htmlFor="bills-introduced-min"
                className="aicher-heading-wide block text-sm text-gray-700 mb-2"
              >
                Bills introduced
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="bills-introduced-min"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="Min"
                  aria-label="Minimum bills introduced"
                  value={filters.billsIntroducedMin}
                  onChange={e => updateFilter('billsIntroducedMin', e.target.value)}
                  className="aicher-button w-full px-3 py-2 focus:outline-none focus:aicher-focus"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="Max"
                  aria-label="Maximum bills introduced"
                  value={filters.billsIntroducedMax}
                  onChange={e => updateFilter('billsIntroducedMax', e.target.value)}
                  className="aicher-button w-full px-3 py-2 focus:outline-none focus:aicher-focus"
                />
              </div>
              <p className="mt-2 text-xs text-gray-600">
                Bills and resolutions sponsored in the 119th Congress, amendments excluded. Source:
                GovInfo bill status data
                {billsAsOf ? `, as of ${formatAsOf(billsAsOf)}` : ' (currently unavailable)'}.
              </p>
            </div>

            {/* Raised This Cycle Range */}
            <div>
              <label
                htmlFor="raised-min"
                className="aicher-heading-wide block text-sm text-gray-700 mb-2"
              >
                Raised this cycle ($)
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="raised-min"
                  type="text"
                  inputMode="numeric"
                  placeholder="Min"
                  aria-label="Minimum raised this cycle, in dollars"
                  value={filters.raisedMin}
                  onChange={e => updateFilter('raisedMin', e.target.value)}
                  className="aicher-button w-full px-3 py-2 focus:outline-none focus:aicher-focus"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Max"
                  aria-label="Maximum raised this cycle, in dollars"
                  value={filters.raisedMax}
                  onChange={e => updateFilter('raisedMax', e.target.value)}
                  className="aicher-button w-full px-3 py-2 focus:outline-none focus:aicher-focus"
                />
              </div>
              <p className="mt-2 text-xs text-gray-600">
                {fundraising
                  ? `Total receipts in FEC filings for the ${fundraising.cycle - 1}–${String(fundraising.cycle).slice(2)} cycle, as on each Record Card. Senators not up for election file twice a year, so their latest report can be older. Source: FEC. Covers ${fundraising.membersCovered} of ${fundraising.totalMembers} members; the rest are left out of this filter until their data is refreshed.`
                  : 'Total receipts in FEC filings this cycle. Fundraising data is currently unavailable.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {loading
            ? 'Searching...'
            : `${resultCount} representative${resultCount !== 1 ? 's' : ''} found`}
        </h3>
        <div className="flex items-center gap-4">
          <label htmlFor="search-sort" className="text-sm text-gray-600">
            Sort by:
          </label>
          <select
            id="search-sort"
            value={filters.sort}
            onChange={e => updateFilter('sort', e.target.value as SortOption)}
            className="px-3 py-1 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-civiq-blue"
          >
            <option value="name">Name (A-Z)</option>
            <option value="yearsInOffice">Years in office</option>
            <option value="billsIntroduced">Bills introduced</option>
            <option value="raised">Raised this cycle</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {loading ? (
          <LoadingState message="Searching representatives..." />
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No representatives found</h3>
            <p className="aicher-heading-wide text-gray-600">
              Try adjusting your search criteria or filters
            </p>
          </div>
        ) : (
          results.map((rep, index) => (
            <div
              key={rep.bioguideId}
              className="border border-gray-200 p-6 hover:border-gray-400 transition-colors"
            >
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-gray-200 flex items-center justify-center relative overflow-hidden">
                  {rep.imageUrl ? (
                    <Image
                      src={rep.imageUrl}
                      alt={rep.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                      priority={index < 4} // Prioritize first 4 search results
                      loading={index < 4 ? 'eager' : 'lazy'}
                    />
                  ) : (
                    <span className="text-lg font-medium text-gray-600">
                      {rep.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">{rep.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium ${
                            rep.party === 'D'
                              ? 'bg-party-dem/10 text-party-dem'
                              : rep.party === 'R'
                                ? 'bg-civiq-red/10 text-civiq-red'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {rep.party === 'D'
                            ? 'Democrat'
                            : rep.party === 'R'
                              ? 'Republican'
                              : 'Independent'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {rep.state}
                          {rep.district ? `-${rep.district}` : ''} • {rep.chamber}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {rep.yearsInOffice} years
                        </span>
                        {rep.billsIntroduced !== null && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {rep.billsIntroduced} bill{rep.billsIntroduced !== 1 ? 's' : ''}{' '}
                            introduced
                          </span>
                        )}
                        {rep.raisedThisCycle !== null && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {formatCurrency(rep.raisedThisCycle)} raised this cycle
                            {rep.raisedThroughDate
                              ? ` (FEC, through ${formatAsOf(rep.raisedThroughDate)})`
                              : ' (FEC)'}
                          </span>
                        )}
                      </div>
                    </div>
                    <button className="min-h-[44px] px-4 py-3 bg-civiq-blue text-white hover:bg-civiq-blue transition-colors font-medium">
                      View Profile
                    </button>
                  </div>

                  {rep.committees.length > 0 && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Committees:</span>{' '}
                      {rep.committees.slice(0, 3).join(', ')}
                      {rep.committees.length > 3 && (
                        <span> and {rep.committees.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {results.length > 0 && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {results.length} of {resultCount} results
          </p>
          <div className="flex items-center gap-2">
            <button
              className="min-h-[44px] min-w-[44px] px-4 py-3 border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50 font-medium"
              disabled
            >
              Previous
            </button>
            <span className="min-h-[44px] min-w-[44px] px-4 py-3 bg-civiq-blue text-white text-sm font-medium flex items-center justify-center">
              1
            </span>
            <button className="min-h-[44px] min-w-[44px] px-4 py-3 border border-gray-300 text-sm hover:bg-gray-50 font-medium">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
