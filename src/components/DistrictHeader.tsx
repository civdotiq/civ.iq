/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { getStateName } from '@/lib/data/us-states';

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

/**
 * Convert Cook PVI to plain language that citizens understand
 * e.g. "D+15" → "Strongly Democratic"
 * e.g. "R+3" → "Leans Republican"
 * e.g. "EVEN" → "Competitive"
 */
function getDistrictLean(pvi: string): string {
  if (!pvi || pvi === 'EVEN') {
    return 'Competitive';
  }

  const match = pvi.match(/^([DR])\+(\d+)/);
  if (!match || !match[1] || !match[2]) {
    return 'Competitive';
  }

  const party = match[1];
  const margin = parseInt(match[2], 10);
  const partyName = party === 'D' ? 'Democratic' : 'Republican';

  if (margin >= 15) {
    return `Strongly ${partyName}`;
  } else if (margin >= 5) {
    return `Typically ${partyName}`;
  } else {
    return `Leans ${partyName}`;
  }
}

function formatDistrictName(state: string, district: string): string {
  // Use centralized state name lookup from @/lib/data/us-states
  const stateName = getStateName(state) || state;
  // At-large districts arrive as "AL", "0", "00", or empty depending on the
  // source, so normalize all of them — otherwise a single-district state renders
  // as "...'s 0 Congressional District".
  const normalized = district?.trim() ?? '';
  const isAtLarge = normalized === 'AL' || normalized === '' || parseInt(normalized, 10) === 0;
  return isAtLarge
    ? `${stateName} At-Large District`
    : `${stateName}'s ${district} Congressional District`;
}

/**
 * Normalize a party value to a display label. The data source supplies full
 * names ("Republican", "Democrat"/"Democratic") in some paths and single
 * letters ("R"/"D"/"I") in others; matching only single letters mislabeled
 * full-name parties as "Independent". Unknown values pass through unchanged
 * rather than being forced to "Independent".
 */
function formatParty(party: string): string {
  const p = (party ?? '').trim().toUpperCase();
  if (p === 'D' || p.startsWith('DEMOCRAT')) return 'Democrat';
  if (p === 'R' || p.startsWith('REPUBLICAN')) return 'Republican';
  if (p === 'I' || p.startsWith('INDEPENDENT')) return 'Independent';
  return party;
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
      <div className="mb-4 p-4 bg-civiq-blue/10 border border-civiq-blue">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-civiq-blue" />
          <h4 className="font-medium text-civiq-blue">Multiple Districts Found</h4>
        </div>
        <p className="text-sm text-civiq-blue mb-3">
          ZIP code {zipCode} spans multiple congressional districts. Select the one that best
          represents your area:
        </p>
        <div className="space-y-2">
          {districtOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setSelectedDistrict(option.value)}
              className={`w-full p-3 text-left border transition-colors min-h-[44px] ${
                selectedDistrict === option.value || (selectedDistrict === null && option.isPrimary)
                  ? 'bg-civiq-blue/10 border-civiq-blue'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{option.label}</span>
                <div className="flex items-center gap-2">
                  {option.isPrimary && (
                    <span className="px-2 py-1 bg-civiq-blue/10 text-civiq-blue text-xs">
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

  // Enhanced loading state with timeout failsafe
  if (loading && !districtData) {
    return (
      <div
        className={`bg-gradient-to-r from-civiq-green/10 to-emerald-50 border border-civiq-green p-6 mb-6 transition-all duration-300 ${className}`}
      >
        <div className="animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 bg-civiq-green/10"></div>
            <div className="w-80 h-6 bg-civiq-green/10"></div>
          </div>
          <div className="w-full h-4 bg-civiq-green/10 mb-4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-full h-16 bg-civiq-green/10"></div>
            ))}
          </div>
          {cacheStatus.hasData && (
            <div className="mt-2 text-xs text-civiq-green flex items-center gap-1">
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
        className={`bg-civiq-red/10 border border-civiq-red p-6 mb-6 transition-all duration-300 ${className}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-civiq-red" />
            <h3 className="text-lg font-semibold text-civiq-red">
              {error.includes('404') ? 'District Not Found' : 'Unable to Load District Information'}
            </h3>
          </div>
          {showRetryButton && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex items-center gap-2 px-4 py-2 bg-civiq-red/10 text-civiq-red hover:bg-civiq-red/10 disabled:opacity-50 transition-colors min-h-[44px]"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
          )}
        </div>
        <p className="text-sm text-civiq-red mb-2">
          {error.includes('404')
            ? 'This ZIP code may not be mapped to a congressional district yet.'
            : error.includes('timeout')
              ? 'The request took too long. Please try again.'
              : error || 'Could not determine district information for this ZIP code.'}
        </p>
        {error.includes('404') && (
          <p className="text-xs text-civiq-red">
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
          Enter your address to see congressional district information.
        </p>
      </div>
    );
  }

  // Main component render with enhanced data
  return (
    <div
      className={`bg-gradient-to-r from-civiq-green/10 to-emerald-50 border border-civiq-green p-6 mb-6 transition-all duration-300 ${className}`}
    >
      {/* Multi-district selector */}
      <MultiDistrictSelector />

      {/* Stale data indicator */}
      {error && districtData && (
        <div className="mb-4 p-3 bg-gray-100 border border-gray-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">Using cached data (connection issues)</span>
            </div>
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="text-xs text-gray-600 hover:text-gray-600 underline"
            >
              {isRetrying ? 'Retrying...' : 'Try to refresh'}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-civiq-green" />
            <h3 className="text-xl font-semibold text-civiq-green">
              {formatDistrictName(districtData.state, districtData.number)}
            </h3>
            <span className="px-2 py-1 bg-civiq-blue/10 text-civiq-blue text-xs font-medium">
              119th Congress
            </span>
          </div>
          <p className="text-sm text-civiq-green mb-4">
            Congressional district serving ZIP code {zipCode} • Represented by{' '}
            {districtData.representative.name} ({districtData.representative.party})
          </p>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Population */}
            <div className="bg-white p-4 border border-civiq-green">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-civiq-green" />
                <span className="text-sm font-medium text-civiq-green">Population</span>
              </div>
              <p className="text-2xl font-bold text-civiq-green">
                {districtData.demographics?.population
                  ? formatPopulation(districtData.demographics.population)
                  : 'N/A'}
              </p>
              <p className="text-xs text-civiq-green">District residents</p>
            </div>

            {/* Median Income */}
            <div className="bg-white p-4 border border-civiq-green">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-civiq-green" />
                <span className="text-sm font-medium text-civiq-green">Median Income</span>
              </div>
              <p className="text-2xl font-bold text-civiq-green">
                {districtData.demographics?.medianIncome
                  ? formatCurrency(districtData.demographics.medianIncome)
                  : 'N/A'}
              </p>
              <p className="text-xs text-civiq-green">Household income</p>
            </div>

            {/* Political Lean - Plain language instead of Cook PVI jargon */}
            <div className="bg-white p-4 border border-civiq-green">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-civiq-green" />
                <span className="text-sm font-medium text-civiq-green">Political Lean</span>
              </div>
              <p className="text-2xl font-bold text-civiq-green">
                {getDistrictLean(districtData.political.cookPVI)}
              </p>
              <p className="text-xs text-civiq-green">Based on recent elections</p>
            </div>

            {/* Representative */}
            <div className="bg-white p-4 border border-civiq-green">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-civiq-green" />
                <span className="text-sm font-medium text-civiq-green">Representative</span>
              </div>
              <p className="text-lg font-bold text-civiq-green">
                {districtData.representative.name}
              </p>
              <p className="text-xs text-civiq-green">
                {formatParty(districtData.representative.party)}
              </p>
            </div>
          </div>

          {/* Enhanced Geographic Information */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-civiq-green" />
              <span className="text-civiq-green">Showing representatives for ZIP {zipCode}</span>
            </div>
            {districtData.geography.majorCities.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-civiq-green">
                  Major cities: {districtData.geography.majorCities.slice(0, 2).join(', ')}
                  {districtData.geography.majorCities.length > 2 &&
                    ` and ${districtData.geography.majorCities.length - 2} more`}
                </span>
              </div>
            )}
            {districtData.geography.realCounties &&
              districtData.geography.realCounties.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-civiq-green">
                    Counties: {districtData.geography.realCounties.slice(0, 2).join(', ')}
                    {districtData.geography.realCounties.length > 2 &&
                      ` and ${districtData.geography.realCounties.length - 2} more`}
                  </span>
                </div>
              )}
          </div>

          {/* Learn More Link */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-civiq-green">
              {cacheStatus.hasData && (
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Cached data available
                </span>
              )}
            </div>

            <a
              href={`/districts/${districtData.id}`}
              className="flex items-center gap-1 text-sm text-civiq-green hover:text-civiq-green font-medium transition-colors"
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
