/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Code Splitting Utilities
 *
 * Centralized utilities for optimizing bundle size through strategic code splitting.
 * Provides consistent loading states and error handling across the application.
 */

import React from 'react';
import dynamic from 'next/dynamic';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  className = 'py-8',
}) => (
  <div className={`flex items-center justify-center ${className}`}>
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  </div>
);

interface CardLoadingSpinnerProps extends LoadingSpinnerProps {
  height?: string;
}

export const CardLoadingSpinner: React.FC<CardLoadingSpinnerProps> = ({
  message = 'Loading...',
  height = 'h-96',
}) => (
  <div className={`flex items-center justify-center ${height} bg-white rounded-lg shadow`}>
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  </div>
);

/**
 * Creates a dynamically imported component with consistent loading state
 */
export function createLazyComponent<T extends React.ComponentType<Record<string, unknown>>>(
  importFn: () => Promise<{ default: T } | T>,
  options: {
    loadingMessage?: string;
    loadingComponent?: () => React.ReactElement;
    ssr?: boolean;
    height?: string;
  } = {}
) {
  const {
    loadingMessage = 'Loading component...',
    loadingComponent,
    ssr = false,
    height = 'h-96',
  } = options;

  return dynamic(importFn, {
    loading:
      loadingComponent || (() => <CardLoadingSpinner message={loadingMessage} height={height} />),
    ssr,
  });
}

/**
 * Creates a lazy tab component optimized for tab-based interfaces
 */
export function createLazyTab<T extends React.ComponentType<Record<string, unknown>>>(
  importFn: () => Promise<{ default: T } | T>,
  tabName: string
) {
  return createLazyComponent(importFn, {
    loadingMessage: `Loading ${tabName} data...`,
    ssr: false,
    height: 'py-8',
  });
}

/**
 * Creates a lazy chart component with appropriate loading state for data visualizations
 */
export function createLazyChart<T extends React.ComponentType<Record<string, unknown>>>(
  importFn: () => Promise<{ default: T } | T>,
  chartName: string
) {
  return createLazyComponent(importFn, {
    loadingMessage: `Loading ${chartName} chart...`,
    ssr: false,
    height: 'h-64',
  });
}

/**
 * Route-based code splitting for page components
 */
export function createLazyPage<T extends React.ComponentType<Record<string, unknown>>>(
  importFn: () => Promise<{ default: T } | T>,
  pageName: string
) {
  return createLazyComponent(importFn, {
    loadingMessage: `Loading ${pageName} page...`,
    ssr: false,
    height: 'min-h-screen',
  });
}

/**
 * Pre-configured loading components for common use cases
 */
export const TabLoadingSpinner = () => (
  <div className="flex items-center justify-center py-8">
    <div className="text-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
      <p className="text-sm text-gray-600">Loading...</p>
    </div>
  </div>
);

export const ChartLoadingSpinner = () => (
  <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
      <p className="text-sm text-gray-600">Loading chart...</p>
    </div>
  </div>
);

export const MapLoadingSpinner = () => (
  <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
      <p className="text-sm text-gray-600">Loading map...</p>
    </div>
  </div>
);

/**
 * Bundle size optimization configurations
 */
export const CODE_SPLITTING_CONFIG = {
  // Components that should always be code split due to size
  HEAVY_COMPONENTS: [
    'CampaignFinanceVisualizer',
    'InteractiveVotingAnalysis',
    'RealDistrictMapContainer',
    'AdvancedDashboard',
  ],

  // Routes that should use code splitting
  SPLIT_ROUTES: ['/analytics', '/districts', '/representative/[bioguideId]'],

  // Third-party libraries that should be lazy loaded
  LAZY_LIBRARIES: [
    'recharts', // Charts library
    'leaflet', // Maps library
    'd3', // Data visualization
  ],
} as const;
