'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { lazy, Suspense, ComponentType, useEffect, useState, useRef } from 'react';

// Loading fallback components
const ChartSkeleton = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex-1 h-6 bg-gray-100 rounded-full">
            <div
              className="h-6 bg-gray-200 rounded-full animate-pulse"
              style={{ width: `${Math.random() * 80 + 20}%` }}
            ></div>
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

// Enhanced lazy loaded components with better error handling and chunking
export const LazyDistrictMap = lazy(() =>
  import(/* webpackChunkName: "district-map" */ './DistrictMap').then(module => ({
    default: module.DistrictMap,
  }))
);

export const LazyInteractiveDistrictMap = lazy(() =>
  import(/* webpackChunkName: "interactive-map" */ './InteractiveDistrictMap').then(module => ({
    default: module.InteractiveDistrictMap,
  }))
);

// Charts with individual chunk names for better caching
export const LazyBarChart = lazy(() =>
  import(/* webpackChunkName: "charts-bar" */ './Charts').then(module => ({
    default: module.BarChart,
  }))
);

export const LazyPieChart = lazy(() =>
  import(/* webpackChunkName: "charts-pie" */ './Charts').then(module => ({
    default: module.PieChart,
  }))
);

export const LazyDonutChart = lazy(() =>
  import(/* webpackChunkName: "charts-donut" */ './Charts').then(module => ({
    default: module.DonutChart,
  }))
);

// Heavy visualization components
export const LazyEnhancedNewsFeed = lazy(() =>
  import(/* webpackChunkName: "news-feed" */ '../features/news/components/EnhancedNewsFeed').then(
    module => ({
      default: module.EnhancedNewsFeed,
    })
  )
);

export const LazyBillsTracker = lazy(() =>
  import(
    /* webpackChunkName: "bills-tracker" */ '../features/legislation/components/BillsTracker'
  ).then(module => ({
    default: module.BillsTracker,
  }))
);

export const LazyPartyAlignmentAnalysis = lazy(() =>
  import(/* webpackChunkName: "party-alignment" */ './PartyAlignmentAnalysis').then(module => ({
    default: module.PartyAlignmentAnalysis,
  }))
);

// Analytics components
export const LazyVotingTrendsChart = lazy(() =>
  import(/* webpackChunkName: "voting-trends" */ './analytics/VotingTrendsChart').then(module => ({
    default: module.VotingTrendsChart,
  }))
);

export const LazyCampaignFinanceChart = lazy(() =>
  import(/* webpackChunkName: "campaign-finance-chart" */ './analytics/CampaignFinanceChart').then(
    module => ({
      default: module.CampaignFinanceChart,
    })
  )
);

export const LazyEffectivenessChart = lazy(() =>
  import(/* webpackChunkName: "effectiveness-chart" */ './analytics/EffectivenessChart').then(
    module => ({ default: module.EffectivenessChart })
  )
);

// Campaign Finance Visualizer - Large component with D3
export const LazyCampaignFinanceVisualizer = lazy(() =>
  import(/* webpackChunkName: "campaign-finance-viz" */ './CampaignFinanceVisualizer').then(
    module => ({ default: module.CampaignFinanceVisualizer })
  )
);

// Interactive Visualizations - Heavy D3 component
export const LazyVotingPatternHeatmap = lazy(() =>
  import(/* webpackChunkName: "d3-visualizations" */ './InteractiveVisualizations').then(
    module => ({ default: module.VotingPatternHeatmap })
  )
);

export const LazyRepresentativeNetwork = lazy(() =>
  import(/* webpackChunkName: "d3-visualizations" */ './InteractiveVisualizations').then(
    module => ({ default: module.RepresentativeNetwork })
  )
);

export const LazyCampaignFinanceFlow = lazy(() =>
  import(/* webpackChunkName: "d3-visualizations" */ './InteractiveVisualizations').then(
    module => ({ default: module.CampaignFinanceFlow })
  )
);

export const LazyLegislativeSuccessFunnel = lazy(() =>
  import(/* webpackChunkName: "d3-visualizations" */ './InteractiveVisualizations').then(
    module => ({ default: module.LegislativeSuccessFunnel })
  )
);

export const LazyInteractiveDistrictMapViz = lazy(() =>
  import(/* webpackChunkName: "d3-visualizations" */ './InteractiveVisualizations').then(
    module => ({ default: module.InteractiveDistrictMap })
  )
);

// Dashboard components
export const LazyCivicEngagementDashboard = lazy(() =>
  import(/* webpackChunkName: "dashboard" */ './dashboard/AdvancedDashboard').then(module => ({
    default: module.CivicEngagementDashboard,
  }))
);

export const LazyStateDataVisualizations = lazy(
  () => import(/* webpackChunkName: "state-data-viz" */ './StateDataVisualizations')
);

export const LazyAdvancedSearch = lazy(() =>
  import(
    /* webpackChunkName: "advanced-search" */ '../features/search/components/AdvancedSearch'
  ).then(module => ({
    default: module.AdvancedSearch,
  }))
);

// Campaign Finance Analysis Components
export const LazyIndustryBreakdown = lazy(() =>
  import(
    /* webpackChunkName: "campaign-finance-components" */ './campaign-finance/IndustryBreakdown'
  ).then(module => ({ default: module.IndustryBreakdown }))
);

export const LazyDonorAnalysis = lazy(() =>
  import(
    /* webpackChunkName: "campaign-finance-components" */ './campaign-finance/DonorAnalysis'
  ).then(module => ({ default: module.DonorAnalysis }))
);

export const LazyFundraisingTrends = lazy(() =>
  import(
    /* webpackChunkName: "campaign-finance-components" */ './campaign-finance/FundraisingTrends'
  ).then(module => ({ default: module.FundraisingTrends }))
);

// Enhanced Voting and Analysis Components
export const LazyEnhancedVotingChart = lazy(() =>
  import(/* webpackChunkName: "voting-analysis" */ './EnhancedVotingChart').then(module => ({
    default: module.EnhancedVotingChart,
  }))
);

export const LazyVotingPatternAnalysis = lazy(() =>
  import(/* webpackChunkName: "voting-analysis" */ './VotingPatternAnalysis').then(module => ({
    default: module.VotingPatternAnalysis,
  }))
);

export const LazyVotingRecordsTable = lazy(() =>
  import(/* webpackChunkName: "voting-analysis" */ './VotingRecordsTable').then(module => ({
    default: module.VotingRecordsTable,
  }))
);

// Committee and Timeline Components
export const LazyCommitteeActivityTimeline = lazy(
  () => import(/* webpackChunkName: "committee-components" */ './CommitteeActivityTimeline')
);

export const LazyCommitteeBillsAndReports = lazy(
  () =>
    import(
      /* webpackChunkName: "committee-components" */ '../features/legislation/components/CommitteeBillsAndReports'
    )
);

// Third-party heavy components
export const LazyLeafletMap = lazy(
  () => import(/* webpackChunkName: "leaflet-components" */ './MapComponent')
);

export const LazyDistrictBoundaryMap = lazy(
  () => import(/* webpackChunkName: "leaflet-components" */ './DistrictBoundaryMap')
);

// Generic component props type (for future use)
// type ComponentProps = Record<string, unknown>;

// Wrapper components with appropriate loading states
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DistrictMapWithSuspense = (props: any) => (
  <Suspense fallback={<MapSkeleton />}>
    <LazyDistrictMap {...props} />
  </Suspense>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const InteractiveDistrictMapWithSuspense = (props: any) => (
  <Suspense fallback={<MapSkeleton />}>
    <LazyInteractiveDistrictMap {...props} />
  </Suspense>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ChartsWithSuspense = (props: any) => (
  <Suspense fallback={<ChartSkeleton />}>
    <LazyBarChart {...props} />
  </Suspense>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const EnhancedNewsFeedWithSuspense = (props: any) => (
  <Suspense fallback={<NewsFeedSkeleton />}>
    <LazyEnhancedNewsFeed {...props} />
  </Suspense>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BillsTrackerWithSuspense = (props: any) => (
  <Suspense fallback={<div className="animate-pulse bg-gray-200 h-20 rounded" />}>
    <LazyBillsTracker {...props} />
  </Suspense>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PartyAlignmentAnalysisWithSuspense = (props: any) => (
  <Suspense fallback={<ChartSkeleton />}>
    <LazyPartyAlignmentAnalysis {...props} />
  </Suspense>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const VotingTrendsChartWithSuspense = (props: any) => (
  <Suspense fallback={<ChartSkeleton />}>
    <LazyVotingTrendsChart {...props} />
  </Suspense>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CampaignFinanceChartWithSuspense = (props: any) => (
  <Suspense fallback={<ChartSkeleton />}>
    <LazyCampaignFinanceChart {...props} />
  </Suspense>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const EffectivenessChartWithSuspense = (props: any) => (
  <Suspense fallback={<ChartSkeleton />}>
    <LazyEffectivenessChart {...props} />
  </Suspense>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AdvancedDashboardWithSuspense = (_props: any) => (
  <Suspense fallback={<AnalyticsSkeleton />}>
    <div className="p-4 text-gray-500">Advanced Dashboard Component</div>
  </Suspense>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const VotingPatternHeatmapWithSuspense = (props: any) => (
  <Suspense fallback={<AnalyticsSkeleton />}>
    <LazyVotingPatternHeatmap {...props} />
  </Suspense>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const StateDataVisualizationsWithSuspense = (props: any) => (
  <Suspense fallback={<AnalyticsSkeleton />}>
    <LazyStateDataVisualizations {...props} />
  </Suspense>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AdvancedSearchWithSuspense = (props: any) => (
  <Suspense fallback={<div className="animate-pulse bg-gray-200 h-12 rounded" />}>
    <LazyAdvancedSearch {...props} />
  </Suspense>
);

// Campaign Finance Components with Suspense
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CampaignFinanceVisualizerWithSuspense = (props: any) => (
  <Suspense fallback={<ChartSkeleton />}>
    <LazyCampaignFinanceVisualizer {...props} />
  </Suspense>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const IndustryBreakdownWithSuspense = (props: any) => (
  <Suspense fallback={<ChartSkeleton />}>
    <LazyIndustryBreakdown {...props} />
  </Suspense>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DonorAnalysisWithSuspense = (props: any) => (
  <Suspense fallback={<ChartSkeleton />}>
    <LazyDonorAnalysis {...props} />
  </Suspense>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FundraisingTrendsWithSuspense = (props: any) => (
  <Suspense fallback={<ChartSkeleton />}>
    <LazyFundraisingTrends {...props} />
  </Suspense>
);

// Committee Components with Suspense
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CommitteeActivityTimelineWithSuspense = (props: any) => (
  <Suspense fallback={<div className="animate-pulse bg-gray-200 h-32 rounded" />}>
    <LazyCommitteeActivityTimeline {...props} />
  </Suspense>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CommitteeBillsAndReportsWithSuspense = (props: any) => (
  <Suspense fallback={<div className="animate-pulse bg-gray-200 h-32 rounded" />}>
    <LazyCommitteeBillsAndReports {...props} />
  </Suspense>
);

// Higher-order component for lazy loading with intersection observer
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  fallback: React.ReactNode = <div className="animate-pulse bg-gray-200 h-20 rounded" />,
  observerOptions: IntersectionObserverInit = { threshold: 0.1, rootMargin: '50px' }
) {
  return function LazyLoadedComponent(props: P) {
    const [isVisible, setIsVisible] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
          observer.disconnect();
        }
      }, observerOptions);

      if (elementRef.current) {
        observer.observe(elementRef.current);
      }

      return () => observer.disconnect();
    }, [hasLoaded]);

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
  dependencies: React.DependencyList = [],
  options: { threshold?: number; rootMargin?: string } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const threshold = options.threshold || 0.1;
  const rootMargin = options.rootMargin || '50px';

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (isVisible && !loading && !data) {
      setLoading(true);
      setError(null);

      fetchFunction()
        .then(setData)
        .catch(setError)
        .finally(() => setLoading(false));
    }
    // Dependencies handled manually to avoid spread issues
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, loading, data, fetchFunction, dependencies.length]);

  return { data, loading, error, elementRef };
}
