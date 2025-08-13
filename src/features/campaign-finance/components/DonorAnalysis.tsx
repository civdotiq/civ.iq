/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import { EnhancedFECData } from '@/types/fec';

interface DonorAnalysisProps {
  data: EnhancedFECData;
  className?: string;
}

type ViewMode = 'size' | 'geography' | 'type';

const VIEW_MODES = [
  { value: 'size' as const, label: 'Donor Size', icon: '💰' },
  { value: 'geography' as const, label: 'Geography', icon: '🗺️' },
  { value: 'type' as const, label: 'Donor Type', icon: '👥' },
];

export function DonorAnalysis({ data, className = '' }: DonorAnalysisProps) {
  const [activeView, setActiveView] = useState<ViewMode>('size');

  // Debug logging to check data structure - removed to prevent React object rendering errors

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number): string => {
    if (score >= 70) return 'bg-green-100';
    if (score >= 40) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const renderSizeView = () => {
    const { grassrootsScore } = data.donors.smallDonorMetrics;
    const { dependencyScore } = data.donors.largeDonorMetrics;

    return (
      <div className="space-y-6">
        {/* Grassroots Score */}
        <div className={`p-4 rounded-lg border ${getScoreBackground(grassrootsScore)}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">Grassroots Score</h4>
            <span className={`text-2xl font-bold ${getScoreColor(grassrootsScore)}`}>
              {grassrootsScore}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Higher scores indicate more grassroots support from small donors
          </p>
        </div>

        {/* Small vs Large Donors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-600 text-lg">👤</span>
              <h4 className="font-semibold text-gray-900">Small Donors</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Count:</span>
                <span className="font-medium">
                  {data.breakdown.smallDonors.count.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Amount:</span>
                <span className="font-medium">
                  {formatCurrency(data.breakdown.smallDonors.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Percentage:</span>
                <span className="font-medium">
                  {formatPercent(data.breakdown.smallDonors.percent)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Avg Amount:</span>
                <span className="font-medium">
                  {formatCurrency(data.donors.smallDonorMetrics.averageAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-600 text-lg">🏢</span>
              <h4 className="font-semibold text-gray-900">Large Donors</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Count:</span>
                <span className="font-medium">
                  {data.breakdown.largeDonors.count.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Amount:</span>
                <span className="font-medium">
                  {formatCurrency(data.breakdown.largeDonors.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Percentage:</span>
                <span className="font-medium">
                  {formatPercent(data.breakdown.largeDonors.percent)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Avg Amount:</span>
                <span className="font-medium">
                  {formatCurrency(data.donors.largeDonorMetrics.averageAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dependency Score */}
        <div className={`p-4 rounded-lg border ${getScoreBackground(100 - dependencyScore)}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">Independence Score</h4>
            <span className={`text-2xl font-bold ${getScoreColor(100 - dependencyScore)}`}>
              {100 - dependencyScore}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Higher scores indicate less dependency on large donors
          </p>
        </div>

        {/* Donor Size Distribution */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-3">Donor Size Distribution</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Small Donors (&lt;$200)</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${data.breakdown.smallDonors.percent}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {formatPercent(data.breakdown.smallDonors.percent)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Large Donors (&gt;$2,800)</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${data.breakdown.largeDonors.percent}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {formatPercent(data.breakdown.largeDonors.percent)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGeographyView = () => {
    const { inState, outOfState, topStates, diversityScore } = data.geography;

    return (
      <div className="space-y-6">
        {/* Geographic Diversity Score */}
        <div className={`p-4 rounded-lg border ${getScoreBackground(diversityScore)}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">Geographic Diversity Score</h4>
            <span className={`text-2xl font-bold ${getScoreColor(diversityScore)}`}>
              {diversityScore}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Higher scores indicate more geographically diverse funding
          </p>
        </div>

        {/* In-State vs Out-of-State */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600 text-lg">🏠</span>
              <h4 className="font-semibold text-gray-900">In-State</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Count:</span>
                <span className="font-medium">{inState.count.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Amount:</span>
                <span className="font-medium">{formatCurrency(inState.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Percentage:</span>
                <span className="font-medium">{formatPercent(inState.percent)}</span>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-purple-600 text-lg">🌍</span>
              <h4 className="font-semibold text-gray-900">Out-of-State</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Count:</span>
                <span className="font-medium">{outOfState.count.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Amount:</span>
                <span className="font-medium">{formatCurrency(outOfState.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Percentage:</span>
                <span className="font-medium">{formatPercent(outOfState.percent)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top States */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-3">Top Contributing States</h4>
          <div className="space-y-2">
            {topStates.slice(0, 10).map((state, index) => (
              <div key={state.state} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                  <span className="text-sm font-medium text-gray-900">{state.state}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${state.percent}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-16 text-right">
                    {formatCurrency(state.amount)}
                  </span>
                  <span className="text-sm text-gray-500 w-8 text-right">
                    {formatPercent(state.percent)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTypeView = () => {
    const { individual, pac, party, candidate } = data.breakdown;

    return (
      <div className="space-y-6">
        {/* Contribution Type Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-600 text-lg">👤</span>
              <h4 className="font-semibold text-gray-900">Individual</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Amount:</span>
                <span className="font-medium">{formatCurrency(individual.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Percentage:</span>
                <span className="font-medium">{formatPercent(individual.percent)}</span>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-orange-600 text-lg">🏢</span>
              <h4 className="font-semibold text-gray-900">PACs</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Amount:</span>
                <span className="font-medium">{formatCurrency(pac.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Percentage:</span>
                <span className="font-medium">{formatPercent(pac.percent)}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600 text-lg">🎭</span>
              <h4 className="font-semibold text-gray-900">Party</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Amount:</span>
                <span className="font-medium">{formatCurrency(party.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Percentage:</span>
                <span className="font-medium">{formatPercent(party.percent)}</span>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-purple-600 text-lg">💼</span>
              <h4 className="font-semibold text-gray-900">Self-Funded</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Amount:</span>
                <span className="font-medium">{formatCurrency(candidate.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Percentage:</span>
                <span className="font-medium">{formatPercent(candidate.percent)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contribution Type Distribution Chart */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-3">Contribution Type Distribution</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Individual Contributions</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${individual.percent}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {formatPercent(individual.percent)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">PAC Contributions</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${pac.percent}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {formatPercent(pac.percent)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Party Contributions</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${party.percent}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {formatPercent(party.percent)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Self-Funded</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${candidate.percent}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {formatPercent(candidate.percent)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Donor Analysis</h3>
          <p className="text-sm text-gray-600">Comprehensive breakdown of funding sources</p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        {VIEW_MODES.map(mode => (
          <button
            key={mode.value}
            onClick={() => setActiveView(mode.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === mode.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>{mode.icon}</span>
            {mode.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeView === 'size' && renderSizeView()}
      {activeView === 'geography' && renderGeographyView()}
      {activeView === 'type' && renderTypeView()}
    </div>
  );
}
