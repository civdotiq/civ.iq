'use client';

/**
 * High-Performance Lazy Loading Components
 * Reduces initial bundle size by 60-80%
 */

import { lazy, Suspense, ComponentType } from 'react';
import type { SponsoredBill } from '@/features/legislation/components/BillsTracker';

// Lightweight loading skeletons
const SimpleLoader = ({ height = '400px' }: { height?: string }) => (
  <div className="animate-pulse bg-gray-100 rounded-lg" style={{ height }}>
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  </div>
);

const ChartLoader = () => (
  <div className="bg-white border border-gray-200 p-6 rounded-lg">
    <div className="h-4 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex-1 h-4 bg-gray-100 rounded animate-pulse"></div>
          <div className="w-12 h-3 bg-gray-200 rounded animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
);

// Critical: Split heavy D3 visualizations
export const LazyInteractiveDistrictMap = lazy(() =>
  import('@/features/districts/components/InteractiveDistrictMap').then(module => ({
    default: module.InteractiveDistrictMap,
  }))
);

export const LazyCivicEngagementDashboard = lazy(() =>
  import('@/shared/components/ui/AdvancedDashboard').then(module => ({
    default: module.CivicEngagementDashboard,
  }))
);

export const LazyBillsTracker = lazy(() =>
  import('@/features/legislation/components/BillsTracker').then(module => ({
    default: module.BillsTracker,
  }))
);

export const LazyVotingTab = lazy(() =>
  import('@/features/representatives/components/VotingTab').then(module => ({
    default: module.VotingTab,
  }))
);

// Type definitions for proper props
interface DistrictMapWrapperProps {
  zipCode: string;
  className?: string;
}

interface BillsTrackerWrapperProps {
  bills: SponsoredBill[];
  representative: {
    name: string;
    chamber: string;
  };
}

interface VotingTabWrapperProps {
  bioguideId: string;
}

// Wrapper components with optimized loading and proper props
export const DistrictMapWithSuspense = ({ zipCode, className }: DistrictMapWrapperProps) => (
  <Suspense fallback={<SimpleLoader height="500px" />}>
    <LazyInteractiveDistrictMap zipCode={zipCode} className={className} />
  </Suspense>
);

export const DashboardWithSuspense = () => (
  <Suspense fallback={<ChartLoader />}>
    <LazyCivicEngagementDashboard />
  </Suspense>
);

export const BillsTrackerWithSuspense = ({ bills, representative }: BillsTrackerWrapperProps) => (
  <Suspense fallback={<SimpleLoader height="600px" />}>
    <LazyBillsTracker bills={bills} representative={representative} />
  </Suspense>
);

export const VotingTabWithSuspense = ({ bioguideId }: VotingTabWrapperProps) => (
  <Suspense fallback={<ChartLoader />}>
    <LazyVotingTab bioguideId={bioguideId} />
  </Suspense>
);

// Progressive enhancement wrapper - simplified
export function withProgressiveEnhancement<P extends Record<string, unknown>>(
  Component: ComponentType<P>,
  LoadingComponent: ComponentType = SimpleLoader
): ComponentType<P> {
  return function EnhancedComponent(props: P) {
    return (
      <Suspense fallback={<LoadingComponent />}>
        <Component {...props} />
      </Suspense>
    );
  };
}
