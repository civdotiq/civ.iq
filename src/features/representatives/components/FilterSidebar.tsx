'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, memo } from 'react';
import { Representative } from '@/features/representatives/services/congress-api';
import { FilterState } from '@/types/filters';

interface FilterSidebarProps {
  onFilterChange: (filters: FilterState) => void;
  representatives: Representative[];
  initialFilters?: FilterState;
}

export const FilterSidebar = memo(function FilterSidebar({
  onFilterChange,
  representatives,
  initialFilters,
}: FilterSidebarProps) {
  const [filters, setFilters] = useState<FilterState>(
    initialFilters || {
      chamber: 'all',
      party: 'all',
      state: 'all',
      committee: 'all',
    }
  );

  const states = Array.from(new Set(representatives.map(r => r.state))).sort();
  const committees = Array.from(
    new Set(representatives.flatMap(r => r.committees?.map(c => c.name) || []))
  ).sort();

  const updateFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="bg-white border-2 border-black p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Filters</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Chamber</label>
          <select
            value={filters.chamber}
            onChange={e => updateFilter('chamber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Chambers</option>
            <option value="Senate">Senate</option>
            <option value="House">House</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Party</label>
          <select
            value={filters.party}
            onChange={e => updateFilter('party', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Parties</option>
            <option value="D">Democratic</option>
            <option value="R">Republican</option>
            <option value="I">Independent</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
          <select
            value={filters.state}
            onChange={e => updateFilter('state', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All States</option>
            {states.map(state => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Committee</label>
          <select
            value={filters.committee}
            onChange={e => updateFilter('committee', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Committees</option>
            {committees.map(committee => (
              <option key={committee} value={committee}>
                {committee}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={() => {
          const resetFilters: FilterState = {
            chamber: 'all',
            party: 'all',
            state: 'all',
            committee: 'all',
          };
          setFilters(resetFilters);
          onFilterChange(resetFilters);
        }}
        className="w-full mt-4 px-4 py-2 text-sm text-gray-700 border border-gray-300 hover:bg-white transition-colors"
      >
        Reset Filters
      </button>
    </div>
  );
});
