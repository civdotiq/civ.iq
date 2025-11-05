/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import type {
  StateChamber,
  StateBillClassification,
  StateBillStatus,
} from '@/types/state-legislature';

export interface BillSearchFilterValues {
  searchQuery: string;
  chamber: StateChamber | 'all';
  classification: StateBillClassification | 'all';
  status: StateBillStatus | 'all';
  subject: string;
}

interface BillSearchFiltersProps {
  filters: BillSearchFilterValues;
  onChange: (filters: BillSearchFilterValues) => void;
  onClear: () => void;
}

const CHAMBER_OPTIONS: Array<{ value: StateChamber | 'all'; label: string }> = [
  { value: 'all', label: 'All Chambers' },
  { value: 'upper', label: 'Senate (Upper)' },
  { value: 'lower', label: 'House (Lower)' },
];

const CLASSIFICATION_OPTIONS: Array<{ value: StateBillClassification | 'all'; label: string }> = [
  { value: 'all', label: 'All Types' },
  { value: 'bill', label: 'Bill' },
  { value: 'resolution', label: 'Resolution' },
  { value: 'concurrent resolution', label: 'Concurrent Resolution' },
  { value: 'joint resolution', label: 'Joint Resolution' },
  { value: 'constitutional amendment', label: 'Constitutional Amendment' },
  { value: 'memorial', label: 'Memorial' },
  { value: 'proclamation', label: 'Proclamation' },
];

const STATUS_OPTIONS: Array<{ value: StateBillStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'introduced', label: 'Introduced' },
  { value: 'in_committee', label: 'In Committee' },
  { value: 'passed_lower', label: 'Passed Lower Chamber' },
  { value: 'passed_upper', label: 'Passed Upper Chamber' },
  { value: 'passed_legislature', label: 'Passed Legislature' },
  { value: 'signed', label: 'Signed into Law' },
  { value: 'vetoed', label: 'Vetoed' },
  { value: 'failed', label: 'Failed' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const COMMON_SUBJECTS = [
  'Education',
  'Healthcare',
  'Budget',
  'Taxation',
  'Criminal Justice',
  'Environment',
  'Transportation',
  'Housing',
  'Labor',
  'Agriculture',
  'Elections',
  'Civil Rights',
];

export const BillSearchFilters: React.FC<BillSearchFiltersProps> = ({
  filters,
  onChange,
  onClear,
}) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const handleFilterChange = (key: keyof BillSearchFilterValues, value: string) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  const hasActiveFilters =
    filters.searchQuery !== '' ||
    filters.chamber !== 'all' ||
    filters.classification !== 'all' ||
    filters.status !== 'all' ||
    filters.subject !== '';

  return (
    <div className="bg-white border-2 border-black p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Filter className="w-5 h-5 text-civiq-blue" />
          Search Filters
        </h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear Filters
          </button>
        )}
      </div>

      {/* Search Query */}
      <div className="mb-4">
        <label htmlFor="searchQuery" className="block text-sm font-semibold text-gray-700 mb-2">
          Keywords
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="searchQuery"
            type="text"
            value={filters.searchQuery}
            onChange={e => handleFilterChange('searchQuery', e.target.value)}
            placeholder="Search bill titles, descriptions..."
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 focus:border-civiq-blue focus:outline-none"
          />
        </div>
      </div>

      {/* Chamber Filter */}
      <div className="mb-4">
        <label htmlFor="chamber" className="block text-sm font-semibold text-gray-700 mb-2">
          Chamber
        </label>
        <select
          id="chamber"
          value={filters.chamber}
          onChange={e => handleFilterChange('chamber', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-300 focus:border-civiq-blue focus:outline-none bg-white"
        >
          {CHAMBER_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Advanced Filters Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full mb-4 text-sm font-medium text-civiq-blue hover:text-blue-700 flex items-center justify-center gap-2 py-2 border-2 border-gray-300 hover:border-civiq-blue transition-colors"
      >
        {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
        <svg
          className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t-2 border-gray-200">
          {/* Classification Filter */}
          <div>
            <label
              htmlFor="classification"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Bill Type
            </label>
            <select
              id="classification"
              value={filters.classification}
              onChange={e => handleFilterChange('classification', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-civiq-blue focus:outline-none bg-white"
            >
              {CLASSIFICATION_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              value={filters.status}
              onChange={e => handleFilterChange('status', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-civiq-blue focus:outline-none bg-white"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
              Subject
            </label>
            <select
              id="subject"
              value={filters.subject}
              onChange={e => handleFilterChange('subject', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-civiq-blue focus:outline-none bg-white"
            >
              <option value="">All Subjects</option>
              {COMMON_SUBJECTS.map(subject => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-600 mt-1">
              Common subjects. More specific filtering available after searching.
            </p>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t-2 border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Active Filters:</h4>
          <div className="flex flex-wrap gap-2">
            {filters.searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-800 border border-blue-600 text-xs">
                Keywords: {filters.searchQuery}
              </span>
            )}
            {filters.chamber !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-800 border border-green-600 text-xs">
                {CHAMBER_OPTIONS.find(o => o.value === filters.chamber)?.label}
              </span>
            )}
            {filters.classification !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-800 border border-purple-600 text-xs">
                {CLASSIFICATION_OPTIONS.find(o => o.value === filters.classification)?.label}
              </span>
            )}
            {filters.status !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-800 border border-yellow-600 text-xs">
                {STATUS_OPTIONS.find(o => o.value === filters.status)?.label}
              </span>
            )}
            {filters.subject && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-pink-50 text-pink-800 border border-pink-600 text-xs">
                Subject: {filters.subject}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
