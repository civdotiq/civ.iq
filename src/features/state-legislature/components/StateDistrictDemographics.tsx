/**
 * State District Demographics Component
 * Ulm School principles: Only show reliable, meaningful Census data
 * Removed: Comparison indicators, Diversity Index, Urban Population (unreliable)
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Users, DollarSign, GraduationCap, TrendingUp } from 'lucide-react';
import type { EnhancedStateLegislator } from '@/types/state-legislature';

interface StateDistrictDemographicsProps {
  legislator: EnhancedStateLegislator;
}

export function StateDistrictDemographics({ legislator }: StateDistrictDemographicsProps) {
  const { demographics } = legislator;

  // If no demographics data, don't show the section at all
  if (!demographics || demographics.population === 0) {
    return null;
  }

  const {
    population,
    medianIncome,
    medianAge,
    white_percent,
    black_percent,
    hispanic_percent,
    asian_percent,
    poverty_rate,
    bachelor_degree_percent,
  } = demographics;

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="bg-white border-2 border-black">
      {/* Header */}
      <div className="bg-gray-50 border-b-2 border-black p-4">
        <h3 className="aicher-heading text-lg">District Demographics</h3>
        <p className="text-xs text-gray-600 mt-1">
          {legislator.state} {legislator.chamber === 'upper' ? 'Senate' : 'House'} District{' '}
          {legislator.district}
        </p>
      </div>

      {/* Key Stats Grid - Only reliable Census data */}
      <div className="grid grid-cols-2 gap-4 p-4 border-b-2 border-gray-200">
        <div className="text-center">
          <Users className="w-5 h-5 text-civiq-blue mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">{population.toLocaleString()}</div>
          <div className="text-xs text-gray-600 uppercase tracking-wide">Population</div>
        </div>

        <div className="text-center">
          <DollarSign className="w-5 h-5 text-civiq-green mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(medianIncome)}</div>
          <div className="text-xs text-gray-600 uppercase tracking-wide">Median Income</div>
        </div>

        <div className="text-center">
          <GraduationCap className="w-5 h-5 text-civiq-blue mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">
            {formatPercent(bachelor_degree_percent)}
          </div>
          <div className="text-xs text-gray-600 uppercase tracking-wide">College Educated</div>
        </div>

        <div className="text-center">
          <TrendingUp className="w-5 h-5 text-civiq-red mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">{medianAge.toFixed(1)}</div>
          <div className="text-xs text-gray-600 uppercase tracking-wide">Median Age</div>
        </div>
      </div>

      {/* Racial Composition */}
      <div className="p-4 border-b-2 border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Racial Composition</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">White</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${white_percent}%` }} />
              </div>
              <span className="text-gray-900 font-medium w-12 text-right">
                {formatPercent(white_percent)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Black</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gray-800" style={{ width: `${black_percent}%` }} />
              </div>
              <span className="text-gray-900 font-medium w-12 text-right">
                {formatPercent(black_percent)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Hispanic</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500" style={{ width: `${hispanic_percent}%` }} />
              </div>
              <span className="text-gray-900 font-medium w-12 text-right">
                {formatPercent(hispanic_percent)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Asian</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500" style={{ width: `${asian_percent}%` }} />
              </div>
              <span className="text-gray-900 font-medium w-12 text-right">
                {formatPercent(asian_percent)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Poverty Rate - verifiable Census data */}
      <div className="p-4">
        <div className="text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Poverty Rate</span>
            <span className="text-gray-900 font-medium">{formatPercent(poverty_rate)}</span>
          </div>
        </div>
      </div>

      {/* Data Source Footer */}
      <div className="bg-gray-50 border-t-2 border-gray-200 px-4 py-3">
        <p className="text-xs text-gray-500">Data: U.S. Census Bureau ACS 5-Year Estimates</p>
      </div>
    </div>
  );
}
