'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState } from 'react';
import { DataQualityIndicator, DataSourceBadge } from '@/components/shared/ui/DataQualityIndicator';
import {
  InlineQualityScore,
  DataTrustIndicator,
} from '@/shared/components/ui/DataQualityDashboard';

interface ApiMetadata {
  dataQuality?: 'high' | 'medium' | 'low' | 'unavailable';
  dataSource: string;
  freshness?: string;
  validationScore?: number;
  timestamp: string;
  validationStatus?: string;
}

interface SearchFormProps {
  onSearch: (query: string) => void;
  apiMetadata?: ApiMetadata;
}

export function SearchForm({ onSearch, apiMetadata }: SearchFormProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setLoading(true);
      await onSearch(query.trim());
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border-2 border-black p-4 mb-6">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-4 mb-2">
        <div className="flex-1 min-w-full sm:min-w-[300px]">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Enter your full home address, e.g. 123 Main St, Detroit, MI"
              aria-label="Home address or ZIP code"
              title="A full street address finds your exact district. ZIP codes are approximate."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:border-civiq-blue"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-civiq-blue text-white hover:bg-civiq-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      <p className="text-xs text-gray-500 mb-4">
        A full street address finds your exact district. ZIP codes also work but are approximate
        &mdash; about 1 in 5 ZIP codes spans more than one congressional district.
      </p>

      {/* Data Quality Indicator */}
      {apiMetadata && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <DataQualityIndicator
              quality={apiMetadata.dataQuality}
              source={apiMetadata.dataSource}
              freshness={apiMetadata.freshness}
            />
            <DataSourceBadge source={apiMetadata.dataSource} showTrustLevel={true} />
            {apiMetadata.validationScore && (
              <InlineQualityScore
                score={apiMetadata.validationScore}
                label="Validation"
                showTrend={true}
                trend="stable"
              />
            )}
            <DataTrustIndicator sources={[apiMetadata.dataSource]} />
          </div>
          <div className="text-xs text-gray-500">
            Last updated: {new Date(apiMetadata.timestamp).toLocaleString()} •
            {apiMetadata.validationStatus && `Validation: ${apiMetadata.validationStatus}`}
          </div>
        </div>
      )}
    </div>
  );
}
