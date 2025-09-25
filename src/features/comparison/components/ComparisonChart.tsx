'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import dynamic from 'next/dynamic';

// Dynamically import D3 to reduce bundle size
const D3Chart = dynamic(() => import('./D3ComparisonChart'), {
  ssr: false,
  loading: () => (
    <div className="bg-white border border-gray-200 p-6 rounded-lg animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-16 h-3 bg-gray-200 rounded"></div>
            <div className="flex-1 h-6 bg-gray-100 rounded"></div>
            <div className="w-12 h-3 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  ),
});

interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  yearsInOffice: number;
  committees: Array<{ name: string }>;
  votingRecord: {
    totalVotes: number;
    partyLineVotes: number;
    missedVotes: number;
  };
  billsSponsored: number;
  billsCosponsored: number;
}

interface ComparisonChartProps {
  representatives: Representative[];
  chartType: 'voting' | 'committees' | 'bills' | 'overview';
}

export default function ComparisonChart({ representatives, chartType }: ComparisonChartProps) {
  if (representatives.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data to Display</h3>
        <p className="text-gray-500">
          Select at least one representative to see comparison charts.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 capitalize">
          {chartType === 'overview' ? 'Performance Overview' : `${chartType} Comparison`}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Comparing {representatives.length} representative{representatives.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="p-6">
        <D3Chart representatives={representatives} chartType={chartType} />
      </div>
    </div>
  );
}
