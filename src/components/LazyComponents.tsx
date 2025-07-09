'use client';


/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

import { lazy, Suspense, ComponentType, useEffect, useState, useRef } from 'react';
import { Skeleton } from './SkeletonLoader';

// Loading fallback components
const ChartSkeleton = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex-1 h-6 bg-gray-100 rounded-full">
            <div className="h-6 bg-gray-200 rounded-full animate-pulse" style={{ width: `${Math.random() * 80 + 20}%` }}></div>
          </div>
          <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
);

const MapSkeleton = () => (
  <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
    <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100 animate-pulse">
      <div className="absolute top-4 left-4 bg-white rounded-lg p-3 shadow-sm">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
      </div>
      <div className="absolute bottom-4 right-4 bg-white rounded-lg p-2 shadow-sm">
        <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-gray-500 text-center">
        <div className="w-8 h-8 bg-gray-300 rounded-full mx-auto mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div>
      </div>
    </div>
  </div>
);

const NewsFeedSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gray-200 rounded animate-pulse flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const AnalyticsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
        <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
        <div className="mt-4 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        </div>
      </div>
    ))}
  </div>
);

// Lazy loaded components
export const LazyDistrictMap = lazy(() => 
  import('./DistrictMap').then(module => ({ default: module.DistrictMap }))
);

export const LazyInteractiveDistrictMap = lazy(() =>
  import('./InteractiveDistrictMap').then(module => ({ default: module.InteractiveDistrictMap }))
);

// Since Charts exports multiple components, we'll need to import them individually
export const LazyBarChart = lazy(() =>
  import('./Charts').then(module => ({ default: module.BarChart }))
);

export const LazyPieChart = lazy(() =>
  import('./Charts').then(module => ({ default: module.PieChart }))
);

export const LazyDonutChart = lazy(() =>
  import('./Charts').then(module => ({ default: module.DonutChart }))
);

export const LazyEnhancedNewsFeed = lazy(() =>
  import('./EnhancedNewsFeed').then(module => ({ default: module.EnhancedNewsFeed }))
);

export const LazyBillsTracker = lazy(() =>
  import('./BillsTracker').then(module => ({ default: module.BillsTracker }))
);

export const LazyPartyAlignmentAnalysis = lazy(() =>
  import('./PartyAlignmentAnalysis').then(module => ({ default: module.PartyAlignmentAnalysis }))
);

export const LazyVotingTrendsChart = lazy(() =>
  import('./analytics/VotingTrendsChart').then(module => ({ default: module.VotingTrendsChart }))
);

export const LazyCampaignFinanceChart = lazy(() =>
  import('./analytics/CampaignFinanceChart').then(module => ({ default: module.CampaignFinanceChart }))
);

export const LazyEffectivenessChart = lazy(() =>
  import('./analytics/EffectivenessChart').then(module => ({ default: module.EffectivenessChart }))
);

export const LazyCivicEngagementDashboard = lazy(() =>
  import('./dashboard/AdvancedDashboard').then(module => ({ default: module.CivicEngagementDashboard }))
);

export const LazyInteractiveVisualizations = lazy(() =>
  import('./InteractiveVisualizations').then(module => ({ default: module.VotingPatternHeatmap }))
);

export const LazyStateDataVisualizations = lazy(() =>
  import('./StateDataVisualizations')
);

export const LazyAdvancedSearch = lazy(() =>
  import('./AdvancedSearch').then(module => ({ default: module.AdvancedSearch }))
);

// Wrapper components with appropriate loading states
export const DistrictMapWithSuspense = (props: any) => (
  <Suspense fallback={<MapSkeleton />}>
    <LazyDistrictMap {...props} />
  </Suspense>
);

export const InteractiveDistrictMapWithSuspense = (props: any) => (
  <Suspense fallback={<MapSkeleton />}>
    <LazyInteractiveDistrictMap {...props} />
  </Suspense>
);

export const ChartsWithSuspense = (props: any) => (
  <Suspense fallback={<ChartSkeleton />}>
    <LazyBarChart {...props} />
  </Suspense>
);

export const EnhancedNewsFeedWithSuspense = (props: any) => (
  <Suspense fallback={<NewsFeedSkeleton />}>
    <LazyEnhancedNewsFeed {...props} />
  </Suspense>
);

export const BillsTrackerWithSuspense = (props: any) => (
  <Suspense fallback={<div className="animate-pulse bg-gray-200 h-20 rounded" />}>
    <LazyBillsTracker {...props} />
  </Suspense>
);

export const PartyAlignmentAnalysisWithSuspense = (props: any) => (
  <Suspense fallback={<ChartSkeleton />}>
    <LazyPartyAlignmentAnalysis {...props} />
  </Suspense>
);

export const VotingTrendsChartWithSuspense = (props: any) => (
  <Suspense fallback={<ChartSkeleton />}>
    <LazyVotingTrendsChart {...props} />
  </Suspense>
);

export const CampaignFinanceChartWithSuspense = (props: any) => (
  <Suspense fallback={<ChartSkeleton />}>
    <LazyCampaignFinanceChart {...props} />
  </Suspense>
);

export const EffectivenessChartWithSuspense = (props: any) => (
  <Suspense fallback={<ChartSkeleton />}>
    <LazyEffectivenessChart {...props} />
  </Suspense>
);

export const AdvancedDashboardWithSuspense = (props: any) => (
  <Suspense fallback={<AnalyticsSkeleton />}>
    <div className="p-4 text-gray-500">Advanced Dashboard Component</div>
  </Suspense>
);

export const InteractiveVisualizationsWithSuspense = (props: any) => (
  <Suspense fallback={<AnalyticsSkeleton />}>
    <LazyInteractiveVisualizations {...props} />
  </Suspense>
);

export const StateDataVisualizationsWithSuspense = (props: any) => (
  <Suspense fallback={<AnalyticsSkeleton />}>
    <LazyStateDataVisualizations {...props} />
  </Suspense>
);

export const AdvancedSearchWithSuspense = (props: any) => (
  <Suspense fallback={<div className="animate-pulse bg-gray-200 h-12 rounded" />}>
    <LazyAdvancedSearch {...props} />
  </Suspense>
);

// Higher-order component for lazy loading with intersection observer
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  fallback: React.ReactNode = <div className="animate-pulse bg-gray-200 h-20 rounded" />,
  options: IntersectionObserverInit = { threshold: 0.1, rootMargin: '50px' }
) {
  return function LazyLoadedComponent(props: P) {
    const [isVisible, setIsVisible] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasLoaded) {
            setIsVisible(true);
            setHasLoaded(true);
            observer.disconnect();
          }
        },
        options
      );

      if (elementRef.current) {
        observer.observe(elementRef.current);
      }

      return () => observer.disconnect();
    }, [hasLoaded, options]);

    return (
      <div ref={elementRef}>
        {isVisible ? (
          <Suspense fallback={fallback}>
            <Component {...props} />
          </Suspense>
        ) : (
          fallback
        )}
      </div>
    );
  };
}

// Hook for lazy data loading
export function useLazyData<T>(
  fetchFunction: () => Promise<T>,
  dependencies: any[] = [],
  options: { threshold?: number; rootMargin?: string } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '50px'
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin]);

  useEffect(() => {
    if (isVisible && !loading && !data) {
      setLoading(true);
      setError(null);

      fetchFunction()
        .then(setData)
        .catch(setError)
        .finally(() => setLoading(false));
    }
  }, [isVisible, loading, data, fetchFunction, ...dependencies]);

  return { data, loading, error, elementRef };
}