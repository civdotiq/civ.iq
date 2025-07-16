'use client';


/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Users, Calendar, DollarSign, FileText, X } from 'lucide-react';

interface SearchFilters {
  query: string;
  party: 'all' | 'D' | 'R' | 'I';
  chamber: 'all' | 'House' | 'Senate';
  state: string;
  committee: string;
  votingPattern: 'all' | 'progressive' | 'conservative' | 'moderate';
  experienceYears: [number, number];
  campaignFinance: [number, number];
  billsSponsoredRange: [number, number];
}

interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  yearsInOffice: number;
  committees: string[];
  billsSponsored: number;
  votingScore: number;
  fundraisingTotal: number;
  imageUrl?: string;
}

export function AdvancedSearch() {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    party: 'all',
    chamber: 'all',
    state: '',
    committee: '',
    votingPattern: 'all',
    experienceYears: [0, 30],
    campaignFinance: [0, 10000000],
    billsSponsoredRange: [0, 500]
  });

  const [results, setResults] = useState<Representative[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [resultCount, setResultCount] = useState(0);

  // Mock data for demonstration
  const mockResults: Representative[] = [
    {
      bioguideId: 'P000595',
      name: 'Gary Peters',
      party: 'D',
      state: 'MI',
      chamber: 'Senate',
      yearsInOffice: 12,
      committees: ['Armed Services', 'Commerce', 'Homeland Security'],
      billsSponsored: 145,
      votingScore: 72.5,
      fundraisingTotal: 8500000
    },
    {
      bioguideId: 'S000770',
      name: 'Debbie Stabenow',
      party: 'D',
      state: 'MI',
      chamber: 'Senate',
      yearsInOffice: 24,
      committees: ['Agriculture', 'Budget', 'Finance'],
      billsSponsored: 234,
      votingScore: 78.2,
      fundraisingTotal: 12300000
    },
    {
      bioguideId: 'L000263',
      name: 'Sander Levin',
      party: 'D',
      state: 'MI',
      district: '9',
      chamber: 'House',
      yearsInOffice: 18,
      committees: ['Ways and Means', 'Joint Economic'],
      billsSponsored: 89,
      votingScore: 85.1,
      fundraisingTotal: 3200000
    }
  ];

  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  const committees = [
    'Agriculture', 'Appropriations', 'Armed Services', 'Banking', 'Budget',
    'Commerce', 'Education', 'Energy', 'Environment', 'Ethics',
    'Finance', 'Foreign Affairs', 'Homeland Security', 'Intelligence',
    'Judiciary', 'Natural Resources', 'Oversight', 'Rules', 'Science',
    'Small Business', 'Transportation', 'Veterans Affairs', 'Ways and Means'
  ];

  useEffect(() => {
    handleSearch();
  }, [filters]);

  const handleSearch = async () => {
    setLoading(true);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (filters.query) params.append('query', filters.query);
      if (filters.party !== 'all') params.append('party', filters.party);
      if (filters.chamber !== 'all') params.append('chamber', filters.chamber);
      if (filters.state) params.append('state', filters.state);
      if (filters.committee) params.append('committee', filters.committee);
      if (filters.votingPattern !== 'all') params.append('votingPattern', filters.votingPattern);
      
      params.append('experienceYearsMin', filters.experienceYears[0].toString());
      params.append('experienceYearsMax', filters.experienceYears[1].toString());
      params.append('campaignFinanceMin', filters.campaignFinance[0].toString());
      params.append('campaignFinanceMax', filters.campaignFinance[1].toString());
      params.append('billsSponsoredMin', filters.billsSponsoredRange[0].toString());
      params.append('billsSponsoredMax', filters.billsSponsoredRange[1].toString());
      
      // Fetch from API
      const response = await fetch(`/api/search?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      
      setResults(data.results || []);
      setResultCount(data.totalResults || 0);
      
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setResultCount(0);
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      party: 'all',
      chamber: 'all',
      state: '',
      committee: '',
      votingPattern: 'all',
      experienceYears: [0, 30],
      campaignFinance: [0, 10000000],
      billsSponsoredRange: [0, 500]
    });
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Advanced Representative Search</h2>
        <p className="text-gray-600">Find representatives by multiple criteria including voting patterns, committee membership, and more</p>
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
          onChange={(e) => updateFilter('query', e.target.value)}
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          Advanced Filters
        </button>
        
        <select
          value={filters.party}
          onChange={(e) => updateFilter('party', e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Parties</option>
          <option value="D">Democrat</option>
          <option value="R">Republican</option>
          <option value="I">Independent</option>
        </select>

        <select
          value={filters.chamber}
          onChange={(e) => updateFilter('chamber', e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Both Chambers</option>
          <option value="House">House</option>
          <option value="Senate">Senate</option>
        </select>

        <select
          value={filters.state}
          onChange={(e) => updateFilter('state', e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All States</option>
          {states.map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>

        {(filters.query || filters.party !== 'all' || filters.chamber !== 'all' || filters.state) && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Committee Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Committee</label>
              <select
                value={filters.committee}
                onChange={(e) => updateFilter('committee', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any Committee</option>
                {committees.map(committee => (
                  <option key={committee} value={committee}>{committee}</option>
                ))}
              </select>
            </div>

            {/* Voting Pattern */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Voting Pattern</label>
              <select
                value={filters.votingPattern}
                onChange={(e) => updateFilter('votingPattern', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Patterns</option>
                <option value="progressive">Progressive (80%+ liberal votes)</option>
                <option value="moderate">Moderate (40-80% liberal votes)</option>
                <option value="conservative">Conservative (40%+ conservative votes)</option>
              </select>
            </div>

            {/* Years in Office Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Years in Office: {filters.experienceYears[0]} - {filters.experienceYears[1]}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={filters.experienceYears[0]}
                  onChange={(e) => updateFilter('experienceYears', [parseInt(e.target.value), filters.experienceYears[1]])}
                  className="flex-1"
                />
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={filters.experienceYears[1]}
                  onChange={(e) => updateFilter('experienceYears', [filters.experienceYears[0], parseInt(e.target.value)])}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Campaign Finance Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Fundraising: {formatCurrency(filters.campaignFinance[0])} - {formatCurrency(filters.campaignFinance[1])}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="10000000"
                  step="100000"
                  value={filters.campaignFinance[0]}
                  onChange={(e) => updateFilter('campaignFinance', [parseInt(e.target.value), filters.campaignFinance[1]])}
                  className="flex-1"
                />
                <input
                  type="range"
                  min="0"
                  max="10000000"
                  step="100000"
                  value={filters.campaignFinance[1]}
                  onChange={(e) => updateFilter('campaignFinance', [filters.campaignFinance[0], parseInt(e.target.value)])}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Bills Sponsored Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bills Sponsored: {filters.billsSponsoredRange[0]} - {filters.billsSponsoredRange[1]}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="500"
                  value={filters.billsSponsoredRange[0]}
                  onChange={(e) => updateFilter('billsSponsoredRange', [parseInt(e.target.value), filters.billsSponsoredRange[1]])}
                  className="flex-1"
                />
                <input
                  type="range"
                  min="0"
                  max="500"
                  value={filters.billsSponsoredRange[1]}
                  onChange={(e) => updateFilter('billsSponsoredRange', [filters.billsSponsoredRange[0], parseInt(e.target.value)])}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {loading ? 'Searching...' : `${resultCount} representative${resultCount !== 1 ? 's' : ''} found`}
        </h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Sort by:</span>
          <select className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Relevance</option>
            <option>Name (A-Z)</option>
            <option>Years in Office</option>
            <option>Voting Score</option>
            <option>Fundraising Total</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No representatives found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or filters</p>
          </div>
        ) : (
          results.map((rep) => (
            <div key={rep.bioguideId} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  {rep.imageUrl ? (
                    <img src={rep.imageUrl} alt={rep.name} className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <span className="text-lg font-medium text-gray-600">
                      {rep.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">{rep.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          rep.party === 'D' ? 'bg-blue-100 text-blue-700' : 
                          rep.party === 'R' ? 'bg-red-100 text-red-700' : 
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {rep.party === 'D' ? 'Democrat' : rep.party === 'R' ? 'Republican' : 'Independent'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {rep.state}{rep.district ? `-${rep.district}` : ''} • {rep.chamber}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {rep.yearsInOffice} years
                        </span>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      View Profile
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span>{rep.billsSponsored} bills sponsored</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span>{formatCurrency(rep.fundraisingTotal)} raised</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-4 h-4 rounded bg-blue-600"></div>
                      <span>{rep.votingScore}% voting score</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Committees:</span> {rep.committees.slice(0, 3).join(', ')}
                    {rep.committees.length > 3 && <span> and {rep.committees.length - 3} more</span>}
                  </div>
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
            <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50" disabled>
              Previous
            </button>
            <span className="px-3 py-1 bg-blue-600 text-white rounded text-sm">1</span>
            <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}