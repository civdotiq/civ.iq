/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useMemo } from 'react';
import { EnhancedFECData } from '@/types/fec';
import logger from '@/lib/logging/simple-logger';
import { getIndustryColor, getIndustryIcon } from '@/lib/fec/industryMapper';

interface IndustryBreakdownProps {
  data: EnhancedFECData;
  className?: string;
}

interface SortOption {
  value: 'amount' | 'percentage' | 'count';
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'amount', label: 'Amount' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'count', label: 'Contributors' },
];

export function IndustryBreakdown({ data, className = '' }: IndustryBreakdownProps) {
  const [sortBy, setSortBy] = useState<'amount' | 'percentage' | 'count'>('amount');
  const [expandedIndustry, setExpandedIndustry] = useState<string | null>(null);
  const [showAllIndustries, setShowAllIndustries] = useState(false);

  // Debug logging to check data structure
  if (process.env.NODE_ENV === 'development') {
    logger.debug('IndustryBreakdown received data', {
      component: 'IndustryBreakdown',
      metadata: {
        hasData: !!data,
        hasIndustries: !!data?.industries,
        industriesLength: data?.industries?.length || 0,
      },
    });
  }

  const sortedIndustries = useMemo(() => {
    // Safety check for data structure
    if (!data || !data.industries || !Array.isArray(data.industries)) {
      logger.warn('Invalid or missing industries data', {
        component: 'IndustryBreakdown',
        metadata: {
          hasData: !!data,
          hasIndustries: !!data?.industries,
          isArray: Array.isArray(data?.industries),
        },
      });
      return [];
    }

    const sorted = [...data.industries].sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return (b.amount || 0) - (a.amount || 0);
        case 'percentage':
          return (b.percentage || 0) - (a.percentage || 0);
        case 'count':
          return (b.contributorCount || 0) - (a.contributorCount || 0);
        default:
          return (b.amount || 0) - (a.amount || 0);
      }
    });

    return showAllIndustries ? sorted : sorted.slice(0, 10);
  }, [data, sortBy, showAllIndustries]);

  const maxAmount = useMemo(() => {
    if (!data || !data.industries || data.industries.length === 0) {
      return 0;
    }
    return Math.max(...data.industries.map(i => i.amount || 0));
  }, [data]);

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <span className="text-green-500">↗️</span>;
      case 'down':
        return <span className="text-red-500">↘️</span>;
      default:
        return <span className="text-gray-400">→</span>;
    }
  };

  const handleIndustryClick = (industryName: string) => {
    setExpandedIndustry(expandedIndustry === industryName ? null : industryName);
  };

  if (!data.industries || data.industries.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md border p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Industry Breakdown</h3>
        <div className="text-center py-8 text-gray-500">
          <p>No industry data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Industry Breakdown</h3>
          <p className="text-sm text-gray-600">Top funding sources by industry sector</p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sort by:</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'amount' | 'percentage' | 'count')}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SORT_OPTIONS.map(option => (
              <option key={`sort-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Industry List */}
      <div className="space-y-3">
        {sortedIndustries.map((industry, index) => (
          <div
            key={`industry-${index}-${industry.name}`}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* Main Industry Row */}
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => handleIndustryClick(industry.name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {/* Rank & Icon */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                    <span className="text-xl">
                      {getIndustryIcon(industry.name.toLowerCase().replace(/\s+/g, '-'))}
                    </span>
                  </div>

                  {/* Industry Name & Trend */}
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{industry.name}</span>
                    {getTrendIcon(industry.trend)}
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(industry.amount)}
                    </div>
                    <div className="text-gray-500">{industry.percentage.toFixed(1)}%</div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{industry.contributorCount}</div>
                    <div className="text-gray-500">contributors</div>
                  </div>

                  <div className="w-4 h-4 flex items-center justify-center">
                    <span className="text-gray-400">
                      {expandedIndustry === industry.name ? '▼' : '▶'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${(industry.amount / maxAmount) * 100}%`,
                      backgroundColor: getIndustryColor(
                        industry.name.toLowerCase().replace(/\s+/g, '-')
                      ),
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedIndustry === industry.name && (
              <div className="px-4 pb-4 border-t bg-gray-50">
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Top Employers in {industry.name}
                  </h4>

                  {industry.topEmployers && industry.topEmployers.length > 0 ? (
                    <div className="space-y-2">
                      {industry.topEmployers.map((employer, empIndex) => (
                        <div
                          key={`${industry.name}-employer-${empIndex}-${employer.name || empIndex}`}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm text-gray-700">
                            {employer.name || 'Unknown Employer'}
                          </span>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-medium text-gray-900">
                              {formatCurrency(employer.amount || 0)}
                            </span>
                            <span className="text-gray-500">
                              {employer.count || 0} contributions
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No employer data available</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show More/Less Toggle */}
      {data.industries.length > 10 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAllIndustries(!showAllIndustries)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showAllIndustries ? 'Show Less' : `Show All ${data.industries.length} Industries`}
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">{data.industries.length}</div>
            <div className="text-sm text-gray-500">Industries</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(data.industries.reduce((sum, i) => sum + i.amount, 0))}
            </div>
            <div className="text-sm text-gray-500">Total Amount</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {data.industries.reduce((sum, i) => sum + i.contributorCount, 0)}
            </div>
            <div className="text-sm text-gray-500">Contributors</div>
          </div>
        </div>
      </div>
    </div>
  );
}
