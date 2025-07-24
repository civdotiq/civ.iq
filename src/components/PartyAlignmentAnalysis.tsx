'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect } from 'react';
import { APIErrorBoundary } from './ErrorBoundary';
import { structuredLogger } from '@/lib/logging/logger-client';

interface PartyAlignment {
  overall_alignment: number;
  party_loyalty_score: number;
  bipartisan_votes: number;
  total_votes_analyzed: number;
  recent_alignment: number;
  alignment_trend: 'increasing' | 'decreasing' | 'stable';
  key_departures: Array<{
    bill_number: string;
    bill_title: string;
    vote_date: string;
    representative_position: string;
    party_majority_position: string;
    significance: 'high' | 'medium' | 'low';
  }>;
  voting_patterns: {
    with_party: number;
    against_party: number;
    bipartisan: number;
    absent: number;
  };
  comparison_to_peers: {
    state_avg_alignment: number;
    party_avg_alignment: number;
    chamber_avg_alignment: number;
  };
  metadata?: {
    dataSource: string;
    note: string;
  };
}

interface PartyAlignmentAnalysisProps {
  bioguideId: string;
  representative: {
    name: string;
    party: string;
    state: string;
    chamber: string;
  };
}

function AlignmentMeter({
  value,
  label,
  comparison,
}: {
  value: number;
  label: string;
  comparison?: number;
}) {
  const getColor = (val: number) => {
    if (val >= 80) return 'bg-green-500';
    if (val >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-lg font-bold text-gray-900">{value.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getColor(value)}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      {comparison && (
        <div className="text-xs text-gray-500 mt-1">
          {value > comparison ? '+' : ''}
          {(value - comparison).toFixed(1)} vs peers
        </div>
      )}
    </div>
  );
}

function TrendIndicator({ trend }: { trend: 'increasing' | 'decreasing' | 'stable' }) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'increasing':
        return <span className="text-green-500">↗ Increasing</span>;
      case 'decreasing':
        return <span className="text-red-500">↘ Decreasing</span>;
      case 'stable':
        return <span className="text-gray-500">→ Stable</span>;
    }
  };

  return (
    <div className="flex items-center text-sm">
      <span className="text-gray-600 mr-2">Trend:</span>
      {getTrendIcon()}
    </div>
  );
}

export function PartyAlignmentAnalysis({
  bioguideId,
  representative,
}: PartyAlignmentAnalysisProps) {
  const [alignmentData, setAlignmentData] = useState<PartyAlignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlignmentData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/representative/${bioguideId}/party-alignment`);
        if (!response.ok) {
          throw new Error('Failed to fetch party alignment data');
        }

        const data = await response.json();
        setAlignmentData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        structuredLogger.error('Error fetching party alignment:', err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlignmentData();
  }, [bioguideId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !alignmentData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="text-gray-600">Party alignment data unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Party Alignment Analysis</h3>
        <p className="text-gray-600">
          Analysis of {representative.name}&apos;s voting patterns and party loyalty
        </p>
        {alignmentData.metadata && (
          <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
            {alignmentData.metadata.note}
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <AlignmentMeter
          value={alignmentData.overall_alignment}
          label="Overall Party Alignment"
          comparison={alignmentData.comparison_to_peers.party_avg_alignment}
        />
        <AlignmentMeter value={alignmentData.party_loyalty_score} label="Party Loyalty Score" />
        <AlignmentMeter
          value={alignmentData.recent_alignment}
          label="Recent Alignment (Last 6 months)"
        />
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Bipartisan Votes</div>
          <div className="text-lg font-bold text-civiq-blue">{alignmentData.bipartisan_votes}</div>
          <div className="text-xs text-gray-500">
            of {alignmentData.total_votes_analyzed} total votes
          </div>
        </div>
      </div>

      {/* Trend */}
      <div className="mb-6">
        <TrendIndicator trend={alignmentData.alignment_trend} />
      </div>

      {/* Voting Patterns Breakdown */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-3">Voting Patterns</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {alignmentData.voting_patterns.with_party}
            </div>
            <div className="text-xs text-green-700">With Party</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {alignmentData.voting_patterns.against_party}
            </div>
            <div className="text-xs text-red-700">Against Party</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {alignmentData.voting_patterns.bipartisan}
            </div>
            <div className="text-xs text-blue-700">Bipartisan</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">
              {alignmentData.voting_patterns.absent}
            </div>
            <div className="text-xs text-gray-700">Absent</div>
          </div>
        </div>
      </div>

      {/* Comparison to Peers */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-3">Comparison to Peers</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">State Average ({representative.state})</span>
            <span className="font-medium">
              {alignmentData.comparison_to_peers.state_avg_alignment.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Party Average ({representative.party})</span>
            <span className="font-medium">
              {alignmentData.comparison_to_peers.party_avg_alignment.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600">Chamber Average ({representative.chamber})</span>
            <span className="font-medium">
              {alignmentData.comparison_to_peers.chamber_avg_alignment.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Key Departures */}
      {alignmentData.key_departures.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-3">
            Notable Departures from Party Line
          </h4>
          <div className="space-y-3">
            {alignmentData.key_departures.map((departure, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{departure.bill_number}</div>
                    <div className="text-sm text-gray-600 mb-1">{departure.bill_title}</div>
                    <div className="text-xs text-gray-500">{departure.vote_date}</div>
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      departure.significance === 'high'
                        ? 'bg-red-100 text-red-800'
                        : departure.significance === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {departure.significance} impact
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <div>
                    <span className="text-gray-500">Representative:</span>
                    <span className="ml-1 font-medium">{departure.representative_position}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Party Majority:</span>
                    <span className="ml-1 font-medium">{departure.party_majority_position}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper with error boundary
export default function PartyAlignmentAnalysisWithErrorBoundary(
  props: PartyAlignmentAnalysisProps
) {
  return (
    <APIErrorBoundary>
      <PartyAlignmentAnalysis {...props} />
    </APIErrorBoundary>
  );
}
