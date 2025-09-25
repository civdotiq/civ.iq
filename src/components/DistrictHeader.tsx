/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Users,
  DollarSign,
  BarChart3,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { useEnhancedDistrictData } from '@/hooks/useEnhancedDistrictData';

interface DistrictHeaderProps {
  zipCode: string;
  className?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPopulation(population: number): string {
  if (population >= 1000000) {
    return `${(population / 1000000).toFixed(1)}M`;
  }
  if (population >= 1000) {
    return `${Math.round(population / 1000)}K`;
  }
  return population.toString();
}

function formatDistrictName(state: string, district: string): string {
  const stateNames: Record<string, string> = {
    AL: 'Alabama',
    AK: 'Alaska',
    AZ: 'Arizona',
    AR: 'Arkansas',
    CA: 'California',
    CO: 'Colorado',
    CT: 'Connecticut',
    DE: 'Delaware',
    DC: 'District of Columbia',
    FL: 'Florida',
    GA: 'Georgia',
    HI: 'Hawaii',
    ID: 'Idaho',
    IL: 'Illinois',
    IN: 'Indiana',
    IA: 'Iowa',
    KS: 'Kansas',
    KY: 'Kentucky',
    LA: 'Louisiana',
    ME: 'Maine',
    MD: 'Maryland',
    MA: 'Massachusetts',
    MI: 'Michigan',
    MN: 'Minnesota',
    MS: 'Mississippi',
    MO: 'Missouri',
    MT: 'Montana',
    NE: 'Nebraska',
    NV: 'Nevada',
    NH: 'New Hampshire',
    NJ: 'New Jersey',
    NM: 'New Mexico',
    NY: 'New York',
    NC: 'North Carolina',
    ND: 'North Dakota',
    OH: 'Ohio',
    OK: 'Oklahoma',
    OR: 'Oregon',
    PA: 'Pennsylvania',
    RI: 'Rhode Island',
    SC: 'South Carolina',
    SD: 'South Dakota',
    TN: 'Tennessee',
    TX: 'Texas',
    UT: 'Utah',
    VT: 'Vermont',
    VA: 'Virginia',
    WA: 'Washington',
    WV: 'West Virginia',
    WI: 'Wisconsin',
    WY: 'Wyoming',
  };

  const stateName = stateNames[state] || state;
  return district === '00' || district === 'AL'
    ? `${stateName} At-Large District`
    : `${stateName}'s ${district} Congressional District`;
}

export function DistrictHeader({ zipCode, className = '' }: DistrictHeaderProps) {
  // Enhanced district data with production features
  const {
    data: districtData,
    loading,
    error,
    retry,
    multiDistrictInfo,
    isMultiDistrict,
    cacheStatus,
  } = useEnhancedDistrictData(zipCode, {
    enablePrefetch: true,
    enableMultiDistrict: true,
    cacheStrategy: 'stale-while-revalidate',
  });

  // State for user interactions
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  // Show retry button after error for a few seconds
  useEffect(() => {
    if (error) {
      setShowRetryButton(true);
      const timer = setTimeout(() => setShowRetryButton(false), 10000);
      return () => clearTimeout(timer);
    } else {
      setShowRetryButton(false);
      return undefined;
    }
  }, [error]);

  // Handle retry with loading state
  const handleRetry = async () => {
    setIsRetrying(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for UX
    retry();
    setIsRetrying(false);
  };

  // Multi-district ZIP handling
  const districtOptions = useMemo(() => {
    if (!isMultiDistrict || !multiDistrictInfo) return [];
    return multiDistrictInfo.districts.map(d => ({
      value: d.districtId,
      label: formatDistrictName(d.state, d.district),
      isPrimary: d.isPrimary,
      percentage: d.populationPercentage,
    }));
  }, [isMultiDistrict, multiDistrictInfo]);

  // Multi-district ZIP selector component
  const MultiDistrictSelector = () => {
    if (!isMultiDistrict || !multiDistrictInfo) return null;

    return (
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <h4 className="font-medium text-blue-900">Multiple Districts Found</h4>
        </div>
        <p className="text-sm text-blue-700 mb-3">
          ZIP code {zipCode} spans multiple congressional districts. Select the one that best
          represents your area:
        </p>
        <div className="space-y-2">
          {districtOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setSelectedDistrict(option.value)}
              className={`w-full p-2 text-left rounded border transition-colors ${
                selectedDistrict === option.value || (selectedDistrict === null && option.isPrimary)
                  ? 'bg-blue-100 border-blue-300'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{option.label}</span>
                <div className="flex items-center gap-2">
                  {option.isPrimary && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      Primary
                    </span>
                  )}
                  <span className="text-sm text-gray-600">{option.percentage}%</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Enhanced loading skeleton with timeout failsafe
  if (loading && !districtData) {
    return (
      <div
        className={`bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-6 mb-6 transition-all duration-300 ${className}`}
      >
        <div className="animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 bg-green-200 rounded"></div>
            <div className="w-80 h-6 bg-green-200 rounded"></div>
          </div>
          <div className="w-full h-4 bg-green-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-full h-16 bg-green-200 rounded"></div>
            ))}
          </div>
          {cacheStatus.hasData && (
            <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Using cached data while loading fresh information...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Enhanced error state with retry functionality
  if (error && !districtData) {
    return (
      <div
        className={`bg-red-50 border border-red-200 p-6 mb-6 transition-all duration-300 ${className}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">
              {error.includes('404') ? 'District Not Found' : 'Unable to Load District Information'}
            </h3>
          </div>
          {showRetryButton && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
          )}
        </div>
        <p className="text-sm text-red-700 mb-2">
          {error.includes('404')
            ? 'This ZIP code may not be mapped to a congressional district yet.'
            : error.includes('timeout')
              ? 'The request took too long. Please try again.'
              : error || 'Could not determine district information for this ZIP code.'}
        </p>
        {error.includes('404') && (
          <p className="text-xs text-red-600">
            Try a different ZIP code or contact support if you believe this is an error.
          </p>
        )}
      </div>
    );
  }

  // No data state
  if (!districtData) {
    return (
      <div className={`bg-gray-50 border border-gray-200 p-6 mb-6 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">No District Information</h3>
        </div>
        <p className="text-sm text-gray-700">
          Enter a ZIP code to see congressional district information.
        </p>
      </div>
    );
  }

  // Main component render with enhanced data
  return (
    <div
      className={`bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-6 mb-6 transition-all duration-300 ${className}`}
    >
      {/* Multi-district selector */}
      <MultiDistrictSelector />

      {/* Stale data indicator */}
      {error && districtData && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">Using cached data (connection issues)</span>
            </div>
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="text-xs text-yellow-700 hover:text-yellow-900 underline"
            >
              {isRetrying ? 'Retrying...' : 'Try to refresh'}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-green-600" />
            <h3 className="text-xl font-semibold text-green-900">
              {formatDistrictName(districtData.state, districtData.number)}
            </h3>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              119th Congress
            </span>
          </div>
          <p className="text-sm text-green-700 mb-4">
            Congressional district serving ZIP code {zipCode} • Represented by{' '}
            {districtData.representative.name} ({districtData.representative.party})
          </p>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Population */}
            <div className="bg-white p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Population</span>
              </div>
              <p className="text-2xl font-bold text-green-800">
                {districtData.demographics?.population
                  ? formatPopulation(districtData.demographics.population)
                  : 'N/A'}
              </p>
              <p className="text-xs text-green-600">District residents</p>
            </div>

            {/* Median Income */}
            <div className="bg-white p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Median Income</span>
              </div>
              <p className="text-2xl font-bold text-green-800">
                {districtData.demographics?.medianIncome
                  ? formatCurrency(districtData.demographics.medianIncome)
                  : 'N/A'}
              </p>
              <p className="text-xs text-green-600">Household income</p>
            </div>

            {/* Political Lean */}
            <div className="bg-white p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Cook PVI</span>
              </div>
              <p className="text-2xl font-bold text-green-800">{districtData.political.cookPVI}</p>
              <div className="flex items-center gap-1">
                <p className="text-xs text-green-600">Political lean</p>
                {districtData.political.cookPVIConfidence && (
                  <span
                    className={`px-1 py-0.5 text-xs rounded ${
                      districtData.political.cookPVIConfidence === 'HIGH'
                        ? 'bg-green-100 text-green-700'
                        : districtData.political.cookPVIConfidence === 'MEDIUM'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {districtData.political.cookPVIConfidence.toLowerCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Representative */}
            <div className="bg-white p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Representative</span>
              </div>
              <p className="text-lg font-bold text-green-800">{districtData.representative.name}</p>
              <p className="text-xs text-green-600">
                {districtData.representative.party === 'D'
                  ? 'Democrat'
                  : districtData.representative.party === 'R'
                    ? 'Republican'
                    : 'Independent'}
              </p>
            </div>
          </div>

          {/* Enhanced Geographic Information */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="text-green-900">Showing representatives for ZIP {zipCode}</span>
            </div>
            {districtData.geography.majorCities.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-green-900">
                  Major cities: {districtData.geography.majorCities.slice(0, 2).join(', ')}
                  {districtData.geography.majorCities.length > 2 &&
                    ` and ${districtData.geography.majorCities.length - 2} more`}
                </span>
              </div>
            )}
            {districtData.geography.realCounties &&
              districtData.geography.realCounties.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-green-900">
                    Counties: {districtData.geography.realCounties.slice(0, 2).join(', ')}
                    {districtData.geography.realCounties.length > 2 &&
                      ` and ${districtData.geography.realCounties.length - 2} more`}
                  </span>
                </div>
              )}
          </div>

          {/* Learn More Link */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-green-600">
              {cacheStatus.hasData && (
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Cached data available
                </span>
              )}
              {districtData.political.cookPVISource && (
                <span>PVI: {districtData.political.cookPVISource}</span>
              )}
            </div>

            <a
              href={`/districts/${districtData.id}`}
              className="flex items-center gap-1 text-sm text-green-700 hover:text-green-900 font-medium transition-colors"
            >
              Learn more about this district
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
