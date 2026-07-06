/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

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
      blsQcew: string;
      connectivity: string;
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
          <div className="h-6 bg-gray-200 w-48 mb-4"></div>
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

  const hasEmploymentData =
    economic.employment.unemploymentRate != null ||
    economic.employment.laborForceParticipation != null ||
    economic.employment.averageWage != null ||
    economic.employment.jobGrowthRate != null;

  const hasInfrastructureData =
    economic.infrastructure.bridgeConditionRating != null ||
    economic.infrastructure.highwayFunding != null ||
    economic.infrastructure.broadbandAvailability != null ||
    economic.infrastructure.publicTransitAccessibility != null;

  const hasConnectivityData =
    economic.connectivity.fiberAvailability != null ||
    economic.connectivity.averageDownloadSpeed != null ||
    economic.connectivity.averageUploadSpeed != null ||
    economic.connectivity.digitalDivideIndex != null;

  // Designed empty state: explain why, never render blank zeros
  if (!hasEmploymentData && !hasInfrastructureData && !hasConnectivityData) {
    return (
      <div className="bg-white border-2 border-black p-8">
        <h3 className="aicher-heading text-lg text-gray-900 mb-4">
          Economic & Infrastructure Health
        </h3>
        <div className="bg-white border border-gray-300 p-6 text-center">
          <p className="text-gray-600">No economic data is available for this district.</p>
          <p className="text-sm text-gray-500 mt-2">
            The federal sources for these metrics (Bureau of Labor Statistics, FCC) are not
            currently providing usable data. CIV.IQ shows real government data only — never
            estimates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-black p-8">
      <h3 className="aicher-heading text-lg text-gray-900 mb-6">
        Economic & Infrastructure Health
      </h3>

      {/* Employment Metrics - Only show cards with real data */}
      {hasEmploymentData && (
        <div className="mb-8">
          <h4 className="aicher-heading text-md text-gray-800 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-civiq-blue" />
            Employment & Economy
          </h4>
          <div className="aicher-grid aicher-grid-3 gap-6">
            {economic.employment.unemploymentRate != null && (
              <div className="aicher-card aicher-status-info p-6">
                <div className="text-2xl font-bold text-civiq-blue">
                  {formatPercentage(economic.employment.unemploymentRate)}
                </div>
                <p className="text-sm text-civiq-blue mt-1">Unemployment Rate</p>
                <p className="text-xs text-civiq-blue mt-1">
                  Statewide ·{' '}
                  {economic.employment.unemploymentRate <= 4
                    ? 'Low'
                    : economic.employment.unemploymentRate <= 6
                      ? 'Moderate'
                      : 'High'}
                </p>
              </div>
            )}

            {economic.employment.laborForceParticipation != null && (
              <div className="aicher-card aicher-status-info p-6">
                <div className="text-2xl font-bold text-civiq-blue">
                  {formatPercentage(economic.employment.laborForceParticipation)}
                </div>
                <p className="text-sm text-civiq-blue mt-1">Labor Force Participation</p>
                <p className="text-xs text-civiq-blue mt-1">Statewide · working age population</p>
              </div>
            )}

            {economic.employment.averageWage != null && (
              <div className="aicher-card aicher-border bg-civiq-blue/10 p-6">
                <div className="text-2xl font-bold text-civiq-blue">
                  {formatCurrency(economic.employment.averageWage)}
                </div>
                <p className="text-sm text-civiq-blue mt-1">Average Wage</p>
                <p className="text-xs text-civiq-blue mt-1">Statewide · annual average</p>
              </div>
            )}
          </div>

          {economic.employment.majorIndustries.length > 0 && (
            <div className="mt-4 p-4 bg-white">
              <p className="text-sm font-medium text-gray-700 mb-2">Major Industries:</p>
              <div className="flex flex-wrap gap-2">
                {economic.employment.majorIndustries.map((industry, index) => (
                  <span key={index} className="px-3 py-1 bg-civiq-blue/10 text-civiq-blue text-sm">
                    {industry}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Infrastructure Metrics - Only show cards with real data */}
      {hasInfrastructureData && (
        <div className="mb-8">
          <h4 className="aicher-heading text-md text-gray-800 mb-4 flex items-center">
            <Building className="w-5 h-5 mr-2 text-gray-700" />
            Infrastructure
          </h4>
          <div className="aicher-grid aicher-grid-3 gap-6">
            {economic.infrastructure.bridgeConditionRating != null && (
              <div className="aicher-card aicher-border p-6">
                <div className="text-2xl font-bold text-gray-900">
                  {economic.infrastructure.bridgeConditionRating}/100
                </div>
                <p className="text-sm text-gray-700 mt-1">Bridge Condition Rating</p>
                <p className="text-xs text-gray-600 mt-1">
                  {economic.infrastructure.bridgeConditionRating >= 80
                    ? 'Excellent'
                    : economic.infrastructure.bridgeConditionRating >= 60
                      ? 'Good'
                      : 'Needs Work'}
                </p>
              </div>
            )}

            {economic.infrastructure.highwayFunding != null && (
              <div className="aicher-card aicher-border p-6">
                <div className="text-2xl font-bold text-gray-900">
                  {formatLargeNumber(economic.infrastructure.highwayFunding)}
                </div>
                <p className="text-sm text-gray-700 mt-1">Annual Highway Funding</p>
                <p className="text-xs text-gray-600 mt-1">Federal investment</p>
              </div>
            )}

            {economic.infrastructure.publicTransitAccessibility != null && (
              <div className="aicher-card aicher-border p-6">
                <div className="text-2xl font-bold text-gray-900">
                  {economic.infrastructure.publicTransitAccessibility}/100
                </div>
                <p className="text-sm text-gray-700 mt-1">Transit Accessibility</p>
                <p className="text-xs text-gray-600 mt-1">Public transportation access</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connectivity Metrics - Only show cards with real data */}
      {hasConnectivityData && (
        <div className="mb-6">
          <h4 className="aicher-heading text-md text-gray-800 mb-4 flex items-center">
            <Wifi className="w-5 h-5 mr-2 text-civiq-blue" />
            Digital Connectivity
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {economic.connectivity.fiberAvailability != null && (
              <div className="aicher-card aicher-status-info p-6">
                <div className="text-2xl font-bold text-civiq-blue">
                  {formatPercentage(economic.connectivity.fiberAvailability)}
                </div>
                <p className="text-sm text-civiq-blue mt-1">Fiber Availability</p>
              </div>
            )}

            {economic.connectivity.averageDownloadSpeed != null && (
              <div className="aicher-card aicher-status-info p-6">
                <div className="text-2xl font-bold text-civiq-blue">
                  {economic.connectivity.averageDownloadSpeed} Mbps
                </div>
                <p className="text-sm text-civiq-blue mt-1">Avg Download Speed</p>
              </div>
            )}

            {economic.connectivity.averageUploadSpeed != null && (
              <div className="aicher-card aicher-status-info p-6">
                <div className="text-2xl font-bold text-civiq-blue">
                  {economic.connectivity.averageUploadSpeed} Mbps
                </div>
                <p className="text-sm text-civiq-blue mt-1">Avg Upload Speed</p>
              </div>
            )}
          </div>
        </div>
      )}

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
              className="text-civiq-blue hover:text-civiq-blue"
            >
              Bureau of Labor Statistics
            </a>
          </div>
          <div>
            <strong>Connectivity:</strong>{' '}
            <span className="text-gray-600">{data.metadata.dataSources.connectivity}</span>
          </div>
          <div>
            <strong>Infrastructure:</strong>{' '}
            <span className="text-gray-600">{data.metadata.dataSources.infrastructure}</span>
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
