/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect } from 'react';
import { TrendingUp, Wifi, Building, Users } from 'lucide-react';
import type { EconomicProfile } from '@/types/district-enhancements';

interface EconomicProfileProps {
  districtId: string;
}

interface EconomicData {
  districtId: string;
  economic: EconomicProfile;
  metadata: {
    timestamp: string;
    dataSources: {
      bls: string;
      fcc: string;
      infrastructure: string;
    };
    notes: string[];
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatLargeNumber(num: number): string {
  if (num === 0) {
    return 'N/A';
  }
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(0)}K`;
  }
  return formatCurrency(num);
}

export default function EconomicProfile({ districtId }: EconomicProfileProps) {
  const [data, setData] = useState<EconomicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEconomicData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/districts/${districtId}/economic-profile`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch economic data');
        }

        const economicData = await response.json();
        setData(economicData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load economic data');
      } finally {
        setLoading(false);
      }
    }

    if (districtId) {
      fetchEconomicData();
    }
  }, [districtId]);

  if (loading) {
    return (
      <div className="aicher-card p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aicher-card p-6 h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="aicher-card p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Economic & Infrastructure</h3>
        <div className="bg-white p-6 text-center">
          <p className="text-gray-600">Economic data not available for this district</p>
          <p className="text-sm text-gray-500 mt-2">
            {error || 'Unable to load data from government APIs'}
          </p>
        </div>
      </div>
    );
  }

  const { economic } = data;

  return (
    <div className="bg-white rounded-2xl border-2 border-black border border-gray-100 p-8">
      <h3 className="aicher-heading text-lg text-gray-900 mb-6">
        Economic & Infrastructure Health
      </h3>

      {/* Employment Metrics */}
      <div className="mb-8">
        <h4 className="aicher-heading text-md text-gray-800 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
          Employment & Economy
        </h4>
        <div className="aicher-grid aicher-grid-3 gap-6">
          <div className="aicher-card aicher-status-success p-6">
            <div className="text-2xl font-bold text-green-900">
              {formatPercentage(economic.employment.unemploymentRate)}
            </div>
            <p className="text-sm text-green-700 mt-1">Unemployment Rate</p>
            <p className="text-xs text-green-600 mt-1">
              {economic.employment.unemploymentRate <= 4
                ? '🟢 Low'
                : economic.employment.unemploymentRate <= 6
                  ? '🟡 Moderate'
                  : '🔴 High'}
            </p>
          </div>

          <div className="aicher-card aicher-status-info p-6">
            <div className="text-2xl font-bold text-blue-900">
              {formatPercentage(economic.employment.laborForceParticipation)}
            </div>
            <p className="text-sm text-blue-700 mt-1">Labor Force Participation</p>
            <p className="text-xs text-blue-600 mt-1">Working age population</p>
          </div>

          <div className="aicher-card aicher-border bg-purple-100 p-6">
            <div className="text-2xl font-bold text-purple-900">
              {formatCurrency(economic.employment.averageWage)}
            </div>
            <p className="text-sm text-purple-700 mt-1">Average Wage</p>
            <p className="text-xs text-purple-600 mt-1">Annual median income</p>
          </div>
        </div>

        {economic.employment.majorIndustries.length > 0 && (
          <div className="mt-4 p-4 bg-white">
            <p className="text-sm font-medium text-gray-700 mb-2">Major Industries:</p>
            <div className="flex flex-wrap gap-2">
              {economic.employment.majorIndustries.map((industry, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {industry}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Infrastructure Metrics - Only show if any infrastructure data exists */}
      {(economic.infrastructure.bridgeConditionRating > 0 ||
        economic.infrastructure.highwayFunding > 0 ||
        economic.infrastructure.publicTransitAccessibility > 0) && (
        <div className="mb-8">
          <h4 className="aicher-heading text-md text-gray-800 mb-4 flex items-center">
            <Building className="w-5 h-5 mr-2 text-orange-600" />
            Infrastructure
          </h4>
          <div className="aicher-grid aicher-grid-3 gap-6">
            {economic.infrastructure.bridgeConditionRating > 0 && (
              <div className="aicher-card aicher-status-error p-6">
                <div className="text-2xl font-bold text-orange-900">
                  {economic.infrastructure.bridgeConditionRating}/100
                </div>
                <p className="text-sm text-orange-700 mt-1">Bridge Condition Rating</p>
                <p className="text-xs text-orange-600 mt-1">
                  {economic.infrastructure.bridgeConditionRating >= 80
                    ? '🟢 Excellent'
                    : economic.infrastructure.bridgeConditionRating >= 60
                      ? '🟡 Good'
                      : '🔴 Needs Work'}
                </p>
              </div>
            )}

            {economic.infrastructure.highwayFunding > 0 && (
              <div className="aicher-card aicher-border bg-teal-100 p-6">
                <div className="text-2xl font-bold text-teal-900">
                  {formatLargeNumber(economic.infrastructure.highwayFunding)}
                </div>
                <p className="text-sm text-teal-700 mt-1">Annual Highway Funding</p>
                <p className="text-xs text-teal-600 mt-1">Federal investment</p>
              </div>
            )}

            {economic.infrastructure.publicTransitAccessibility > 0 && (
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6">
                <div className="text-2xl font-bold text-indigo-900">
                  {economic.infrastructure.publicTransitAccessibility}/100
                </div>
                <p className="text-sm text-indigo-700 mt-1">Transit Accessibility</p>
                <p className="text-xs text-indigo-600 mt-1">Public transportation access</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connectivity Metrics */}
      <div className="mb-6">
        <h4 className="aicher-heading text-md text-gray-800 mb-4 flex items-center">
          <Wifi className="w-5 h-5 mr-2 text-blue-600" />
          Digital Connectivity
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-6">
            <div className="text-2xl font-bold text-cyan-900">
              {formatPercentage(economic.connectivity.fiberAvailability)}
            </div>
            <p className="text-sm text-cyan-700 mt-1">Fiber Availability</p>
          </div>

          <div className="bg-gradient-to-br from-sky-50 to-sky-100 p-6">
            <div className="text-2xl font-bold text-sky-900">
              {economic.connectivity.averageDownloadSpeed} Mbps
            </div>
            <p className="text-sm text-sky-700 mt-1">Avg Download Speed</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6">
            <div className="text-2xl font-bold text-emerald-900">
              {economic.connectivity.averageUploadSpeed} Mbps
            </div>
            <p className="text-sm text-emerald-700 mt-1">Avg Upload Speed</p>
          </div>

          <div className="bg-gradient-to-br from-violet-50 to-violet-100 p-6">
            <div className="text-2xl font-bold text-violet-900">
              {economic.connectivity.digitalDivideIndex}/100
            </div>
            <p className="text-sm text-violet-700 mt-1">Digital Equity Index</p>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="border-t pt-4">
        <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
          <Users className="w-4 h-4 mr-2" />
          Data Sources
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
          <div>
            <strong>Employment:</strong>{' '}
            <a
              href={data.metadata.dataSources.bls}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              Bureau of Labor Statistics
            </a>
          </div>
          <div>
            <strong>Connectivity:</strong>{' '}
            <a
              href={data.metadata.dataSources.fcc}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              Federal Communications Commission
            </a>
          </div>
          <div>
            <strong>Infrastructure:</strong>{' '}
            <span className="text-red-600">{data.metadata.dataSources.infrastructure}</span>
          </div>
        </div>

        {data.metadata.notes.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            <p>
              <strong>Notes:</strong> {data.metadata.notes.join(' • ')}
            </p>
          </div>
        )}

        <div className="mt-2 text-xs text-gray-400">
          Last updated: {new Date(data.metadata.timestamp).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
