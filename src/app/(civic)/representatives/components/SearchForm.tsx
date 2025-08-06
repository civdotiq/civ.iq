'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState } from 'react';
import { DataQualityIndicator, DataSourceBadge } from '@/components/ui/DataQualityIndicator';
import { InlineQualityScore, DataTrustIndicator } from '@/shared/components/ui/DataQualityDashboard';

interface ApiMetadata {
  dataQuality?: 'high' | 'medium' | 'low' | 'unavailable';
  dataSource: string;
  freshness?: string;
  validationScore?: number;
  timestamp: string;
  validationStatus?: string;
}

interface SearchFormProps {
  onSearch: (zipCode: string) => void;
  apiMetadata?: ApiMetadata;
}

export function SearchForm({ onSearch, apiMetadata }: SearchFormProps) {
  const [zipCode, setZipCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (zipCode.trim()) {
      setLoading(true);
      await onSearch(zipCode.trim());
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <input
              type="text"
              value={zipCode}
              onChange={e => setZipCode(e.target.value)}
              placeholder="Enter ZIP code to find your representatives..."
              pattern="\d{5}(-\d{4})?"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
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
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

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
