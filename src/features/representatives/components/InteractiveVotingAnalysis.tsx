'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, memo, useMemo, useCallback } from 'react';
import useSWR from 'swr';

interface PartyAlignmentData {
  loyaltyScore: number;
  bipartisanVotes: number;
  totalVotes: number;
  recentAlignment: number;
  dataSource: string;
  error?: string;
}

interface InteractiveVotingAnalysisProps {
  bioguideId: string;
  representative: {
    name: string;
    party: string;
    state: string;
    chamber: string;
  };
}

const fetcher = async (url: string): Promise<PartyAlignmentData> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

export const InteractiveVotingAnalysis = memo(function InteractiveVotingAnalysis({
  bioguideId,
  representative,
}: InteractiveVotingAnalysisProps) {
  const [error, setError] = useState<string | null>(null);

  const {
    data,
    error: swrError,
    isLoading,
  } = useSWR(`/api/representative/${bioguideId}/party-alignment`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 300000, // 5 minutes - standardized across all profile components
    errorRetryCount: 2,
    errorRetryInterval: 5000,
    onError: err => {
      setError(err.message || 'Failed to load party alignment data');
    },
    onSuccess: () => {
      setError(null);
    },
  });

  // Memoized color calculation functions - must be before early returns
  const getPartyColor = useCallback((party: string) => {
    const normalizedParty = party.toLowerCase();
    if (normalizedParty.includes('democrat')) return 'bg-blue-500';
    if (normalizedParty.includes('republican')) return 'bg-red-500';
    return 'bg-white0';
  }, []);

  const getAlignmentColor = useCallback((score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }, []);

  // Memoized calculations
  const bipartisanPercentage = useMemo(() => {
    return data && data.totalVotes > 0
      ? Math.min((data.bipartisanVotes / data.totalVotes) * 100, 100)
      : 0;
  }, [data]);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-white border-2 border-gray-300 rounded w-full"></div>
            <div className="h-4 bg-white border-2 border-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-white border-2 border-gray-300 rounded w-1/2"></div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="h-20 bg-white border-2 border-gray-300 rounded"></div>
            <div className="h-20 bg-white border-2 border-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error || swrError) {
    return (
      <div className="bg-white border border-gray-200 p-6">
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Party Alignment Data Unavailable
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {error || swrError?.message || 'Unable to load voting alignment data at this time.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Handle no data available
  if (!data || (data.totalVotes === 0 && data.dataSource === 'unavailable')) {
    return (
      <div className="bg-white border border-gray-200 p-6">
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-white border-2 border-gray-300 rounded-full">
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Voting Data Available</h3>
          <p className="text-sm text-gray-600">
            No voting records were found for {representative.name}. This could be because they are a
            new member or voting data has not been processed yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 p-8">
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Party Alignment Analysis</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          Analysis based on {data.totalVotes} voting records from {data.dataSource}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Party Loyalty Score */}
        <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-700">Party Loyalty Score</span>
            <span className={`text-2xl font-bold ${getAlignmentColor(data.loyaltyScore)}`}>
              {data.loyaltyScore.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${getPartyColor(representative.party)}`}
              style={{ width: `${Math.min(data.loyaltyScore, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Percentage of votes aligned with {representative.party} party majority
          </p>
        </div>

        {/* Bipartisan Votes */}
        <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-700">Bipartisan Votes</span>
            <span className="text-2xl font-bold text-purple-600">{data.bipartisanVotes}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
            <div
              className="bg-purple-500 h-3 rounded-full transition-all duration-500"
              style={{
                width: `${bipartisanPercentage}%`,
              }}
            />
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Votes where both parties had significant support
          </p>
        </div>

        {/* Recent Alignment */}
        <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-700">Recent Alignment</span>
            <span className={`text-2xl font-bold ${getAlignmentColor(data.recentAlignment)}`}>
              {data.recentAlignment.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${getPartyColor(representative.party)}`}
              style={{ width: `${Math.min(data.recentAlignment, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Party alignment in most recent 20 votes
          </p>
        </div>

        {/* Total Votes */}
        <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-700">Total Votes Analyzed</span>
            <span className="text-2xl font-bold text-gray-900">{data.totalVotes}</span>
          </div>
          <div className="flex items-center mb-3">
            <div
              className={`w-3 h-3 rounded-full mr-3 ${
                data.dataSource === 'congress.gov'
                  ? 'bg-green-500'
                  : data.dataSource === 'unavailable'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
              }`}
            />
            <span className="text-xs text-gray-600 capitalize font-medium">
              Data source: {data.dataSource.replace('.gov', ' API')}
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Recent voting records from official sources
          </p>
        </div>
      </div>

      {/* Analysis Summary */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-600 space-y-3">
          <p className="leading-relaxed">
            <strong className="text-gray-900">{representative.name}</strong> has voted with the{' '}
            {representative.party} party majority{' '}
            <span className={`font-bold ${getAlignmentColor(data.loyaltyScore)}`}>
              {data.loyaltyScore.toFixed(1)}%
            </span>{' '}
            of the time based on {data.totalVotes} analyzed votes.
          </p>
          {data.bipartisanVotes > 0 && (
            <p className="leading-relaxed">
              They have participated in <strong>{data.bipartisanVotes}</strong> bipartisan votes
              where both parties had significant representation.
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 leading-relaxed">
          * Party alignment calculated by comparing individual votes with the majority position of
          the representative&apos;s party. Data refreshed every hour from official congressional
          records.
        </p>
      </div>
    </div>
  );
});
