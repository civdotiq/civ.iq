/**
 * News Filters Component
 * Phase 3: Advanced filtering and view controls
 *
 * Provides comprehensive filtering options and view mode selection.
 */

'use client';

import React, { useState } from 'react';
import { NewsFilters as NewsFiltersType, NewsViewMode } from './GoogleNewsStyleFeed';
import { NewsCluster } from '../services/article-clustering-engine';
import { SearchDimension } from '../services/gdelt-query-builder-v2';

export interface NewsFiltersProps {
  filters: NewsFiltersType;
  onFiltersChange: (filters: NewsFiltersType) => void;
  viewMode: NewsViewMode;
  onViewModeChange: (mode: NewsViewMode) => void;
  clusters: NewsCluster[];
  className?: string;
}

export function NewsFilters({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  clusters,
  className = '',
}: NewsFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update filter helper
  const updateFilter = <K extends keyof NewsFiltersType>(key: K, value: NewsFiltersType[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Get view mode options
  const viewModeOptions: Array<{ value: NewsViewMode; label: string; icon: string }> = [
    { value: 'headlines', label: 'Headlines', icon: '📰' },
    { value: 'topics', label: 'Topics', icon: '🏷️' },
    { value: 'timeline', label: 'Timeline', icon: '⏰' },
    { value: 'coverage', label: 'Coverage', icon: '📊' },
  ];

  // Get timeframe options
  const timeframeOptions = [
    { value: 'realtime' as const, label: 'Real-time', count: 0 },
    { value: '24h' as const, label: 'Last 24h', count: 0 },
    { value: '7d' as const, label: 'Last 7 days', count: 0 },
    { value: '30d' as const, label: 'Last 30 days', count: 0 },
  ];

  // Get story type options with counts
  const storyTypeOptions = [
    {
      value: 'all' as const,
      label: 'All Stories',
      count: clusters.length,
    },
    {
      value: 'breaking' as const,
      label: '🚨 Breaking',
      count: clusters.filter(c => c.topicType === 'breaking').length,
    },
    {
      value: 'developing' as const,
      label: '📈 Developing',
      count: clusters.filter(c => c.topicType === 'developing').length,
    },
    {
      value: 'ongoing' as const,
      label: '📰 Ongoing',
      count: clusters.filter(c => c.topicType === 'ongoing').length,
    },
  ].filter(option => option.count > 0);

  // Get dimension options with counts
  const dimensionOptions: Array<{ value: 'all' | SearchDimension; label: string; count: number }> =
    [{ value: 'all' as const, label: 'All Topics', count: clusters.length }];

  // Add dimension counts
  const dimensionCounts = new Map<SearchDimension, number>();
  clusters.forEach(cluster => {
    cluster.metadata.dimensions.forEach(dim => {
      dimensionCounts.set(dim, (dimensionCounts.get(dim) || 0) + 1);
    });
  });

  dimensionCounts.forEach((count, dimension) => {
    if (count >= 2) {
      dimensionOptions.push({
        value: dimension,
        label: formatDimensionLabel(dimension),
        count,
      });
    }
  });

  // Format dimension labels
  function formatDimensionLabel(dimension: SearchDimension): string {
    const labels: Record<SearchDimension, string> = {
      [SearchDimension.IDENTITY]: 'Direct Mentions',
      [SearchDimension.COMMITTEE]: 'Committee Work',
      [SearchDimension.POLICY]: 'Policy Issues',
      [SearchDimension.GEOGRAPHIC]: 'State/District',
      [SearchDimension.TEMPORAL]: 'Current Events',
      [SearchDimension.LEADERSHIP]: 'Leadership',
      [SearchDimension.PARTY]: 'Party Politics',
      [SearchDimension.CROSS_REF]: 'Related',
    };
    return labels[dimension] || dimension;
  }

  // Get sort options
  const sortOptions = [
    { value: 'relevance' as const, label: 'Relevance', icon: '⭐' },
    { value: 'recency' as const, label: 'Most Recent', icon: '🕐' },
    { value: 'activity' as const, label: 'Most Active', icon: '🔥' },
  ];

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Main Filter Bar */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          {/* View Mode Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">View:</label>
            <div className="flex rounded-lg border border-gray-300 bg-gray-50">
              {viewModeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => onViewModeChange(option.value)}
                  className={`
                    px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                    flex items-center space-x-1
                    ${
                      viewMode === option.value
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                    }
                  `}
                  title={option.label}
                >
                  <span>{option.icon}</span>
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center space-x-4">
            {/* Timeframe */}
            <select
              value={filters.timeframe}
              onChange={e => updateFilter('timeframe', e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {timeframeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Story Type */}
            <select
              value={filters.storyType}
              onChange={e => updateFilter('storyType', e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {storyTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>

            {/* Sort By */}
            <select
              value={filters.sortBy}
              onChange={e => updateFilter('sortBy', e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Advanced Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
          >
            <span>{showAdvanced ? 'Hide' : 'More'} Filters</span>
            <svg
              className={`w-4 h-4 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="p-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Dimension Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Topic Focus</label>
              <select
                value={filters.dimension}
                onChange={e => updateFilter('dimension', e.target.value as any)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {dimensionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Source Quality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Source Quality</label>
              <select
                value={filters.sources}
                onChange={e => updateFilter('sources', e.target.value as any)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Sources</option>
                <option value="top-tier">Top-Tier Only</option>
                <option value="diverse">Diverse Sources</option>
              </select>
            </div>

            {/* Additional Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.storyType === 'breaking'}
                    onChange={e => updateFilter('storyType', e.target.checked ? 'breaking' : 'all')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Breaking News Only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Filter Summary */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {clusters.length} story clusters
                {filters.dimension !== 'all' && (
                  <span>
                    {' '}
                    • Filtered by {formatDimensionLabel(filters.dimension as SearchDimension)}
                  </span>
                )}
                {filters.storyType !== 'all' && <span> • {filters.storyType} stories only</span>}
              </div>

              {(filters.dimension !== 'all' ||
                filters.storyType !== 'all' ||
                filters.sources !== 'all') && (
                <button
                  onClick={() =>
                    onFiltersChange({
                      timeframe: filters.timeframe,
                      sources: 'all',
                      storyType: 'all',
                      dimension: 'all',
                      sortBy: filters.sortBy,
                    })
                  }
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Bar */}
      {clusters.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center space-x-6 text-xs text-gray-600">
            <span>📊 {clusters.reduce((sum, c) => sum + c.articles.length, 0)} total articles</span>
            <span>
              🌐 {new Set(clusters.flatMap(c => c.articles.map(a => a.source))).size} unique sources
            </span>
            <span>
              ⏱️ Latest:{' '}
              {Math.min(
                ...clusters.map(
                  c => (Date.now() - new Date(c.timeline.lastUpdate).getTime()) / (1000 * 60)
                )
              ).toFixed(0)}
              m ago
            </span>
            <span>
              🚨 {clusters.filter(c => c.topicType === 'breaking').length} breaking stories
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default NewsFilters;
