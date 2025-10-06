/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

/**
 * Finance Loading Skeleton Components
 *
 * Provides visual feedback during data loading with animated skeletons
 * Improves perceived performance and user experience
 */

export function FinanceCardSkeleton() {
  return (
    <div
      className="aicher-card p-6 animate-pulse"
      role="status"
      aria-label="Loading campaign finance data"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="h-px bg-gray-200"></div>

        {/* Content rows */}
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/6"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FinanceChartSkeleton() {
  return (
    <div className="aicher-card p-6 animate-pulse" role="status" aria-label="Loading chart data">
      <div className="space-y-4">
        {/* Title */}
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>

        {/* Chart area */}
        <div className="flex items-center justify-center h-64 bg-gray-100 rounded">
          <div className="w-32 h-32 border-8 border-gray-200 border-t-gray-400 rounded-full animate-spin"></div>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FinanceTableSkeleton() {
  return (
    <div className="aicher-card p-6 animate-pulse" role="status" aria-label="Loading table data">
      <div className="space-y-4">
        {/* Title */}
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {[...Array(4)].map((_, i) => (
                  <th key={i} className="px-4 py-3">
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(4)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function InterestGroupSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading interest group data">
      {/* Metrics Cards */}
      <div className="aicher-card p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="aicher-grid aicher-grid-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-lg">
              <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <FinanceChartSkeleton />

      {/* Table */}
      <FinanceTableSkeleton />
    </div>
  );
}

/**
 * Full Campaign Finance Loading State
 * Shows complete skeleton for entire finance visualizer
 */
export function CampaignFinanceLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tab Navigation Skeleton */}
      <div className="aicher-card aicher-no-radius animate-pulse">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded w-24"></div>
            ))}
          </nav>
        </div>
      </div>

      {/* Content Skeletons */}
      <FinanceCardSkeleton />
      <div className="aicher-grid aicher-grid-2 gap-6">
        <FinanceChartSkeleton />
        <FinanceCardSkeleton />
      </div>
    </div>
  );
}

/**
 * Minimal inline loader for small components
 */
export function InlineLoader({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    medium: 'w-6 h-6 border-2',
    large: 'w-8 h-8 border-4',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-blue-200 border-t-blue-600 rounded-full animate-spin`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
