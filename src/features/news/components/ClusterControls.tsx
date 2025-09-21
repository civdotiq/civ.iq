/**
 * ClusterControls - Controls and Filters for News Clusters
 * Phase 3: UI/UX Transformation
 *
 * Provides filtering, view mode selection, and other interactive controls
 * for the clustered news feed with Google News-style interface.
 */

'use client';

import React from 'react';

/**
 * View modes for different display styles
 */
export type NewsViewMode = 'headlines' | 'topics' | 'timeline' | 'coverage';

/**
 * Filter configuration for news display
 */
export interface NewsFilters {
  timeframe: 'realtime' | '24h' | '7d' | '30d';
  sources: 'all' | 'top-tier' | 'diverse';
  storyType: 'all' | 'breaking' | 'developing' | 'ongoing';
  sortBy: 'relevance' | 'recency' | 'activity';
}

/**
 * Props for ClusterControls component
 */
export interface ClusterControlsProps {
  filters: NewsFilters;
  onFiltersChange: (filters: NewsFilters) => void;
  viewMode: NewsViewMode;
  onViewModeChange: (mode: NewsViewMode) => void;
  clustersCount: number;
  onRefresh: () => void;
  isLoading: boolean;
  className?: string;
}

/**
 * ClusterControls component for managing news display options
 */
export function ClusterControls({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  clustersCount,
  onRefresh,
  isLoading,
  className = '',
}: ClusterControlsProps) {
  /**
   * Handle filter change
   */
  const handleFilterChange = (key: keyof NewsFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  /**
   * Get view mode button classes
   */
  const getViewModeButtonClasses = (mode: NewsViewMode): string => {
    const baseClasses = 'px-3 py-2 text-sm font-medium rounded-md transition-all duration-200';
    return viewMode === mode
      ? `${baseClasses} bg-blue-600 text-white shadow-sm`
      : `${baseClasses} text-gray-600 hover:bg-gray-100`;
  };

  /**
   * Get filter button classes
   */
  const getFilterButtonClasses = (isActive: boolean): string => {
    const baseClasses =
      'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 border';
    return isActive
      ? `${baseClasses} bg-blue-100 text-blue-800 border-blue-200`
      : `${baseClasses} bg-white text-gray-600 border-gray-300 hover:bg-gray-50`;
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 space-y-4 ${className}`}>
      {/* Top Row: View Mode and Refresh */}
      <div className="flex items-center justify-between">
        {/* View Mode Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">View:</span>
          <div className="flex rounded-lg border border-gray-300 bg-gray-50">
            {(['headlines', 'topics', 'timeline', 'coverage'] as NewsViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className={getViewModeButtonClasses(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count and Refresh */}
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            {clustersCount} cluster{clustersCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={`flex items-center space-x-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              isLoading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <svg
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Timeframe Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Timeframe</label>
          <div className="flex flex-wrap gap-1">
            {[
              { value: 'realtime', label: 'Live' },
              { value: '24h', label: '24h' },
              { value: '7d', label: '7d' },
              { value: '30d', label: '30d' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => handleFilterChange('timeframe', option.value)}
                className={getFilterButtonClasses(filters.timeframe === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sources Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Sources</label>
          <div className="flex flex-wrap gap-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'top-tier', label: 'Top Tier' },
              { value: 'diverse', label: 'Diverse' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => handleFilterChange('sources', option.value)}
                className={getFilterButtonClasses(filters.sources === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Story Type Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Story Type</label>
          <div className="flex flex-wrap gap-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'breaking', label: '🚨 Breaking' },
              { value: 'developing', label: '📈 Developing' },
              { value: 'ongoing', label: '📰 Ongoing' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => handleFilterChange('storyType', option.value)}
                className={getFilterButtonClasses(filters.storyType === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort By Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
          <div className="flex flex-wrap gap-1">
            {[
              { value: 'relevance', label: 'Relevance' },
              { value: 'recency', label: 'Recent' },
              { value: 'activity', label: 'Activity' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => handleFilterChange('sortBy', option.value)}
                className={getFilterButtonClasses(filters.sortBy === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Summary */}
      <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span>
          Showing {filters.timeframe} news from {filters.sources} sources •{' '}
          {filters.storyType === 'all' ? 'All story types' : filters.storyType} • Sorted by{' '}
          {filters.sortBy}
        </span>
      </div>
    </div>
  );
}

export default ClusterControls;
