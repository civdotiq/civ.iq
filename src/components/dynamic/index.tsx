/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import dynamic from 'next/dynamic';
import { SmartLoadingState } from '@/shared/components/ui';

// Note: Analytics chart components (CampaignFinanceChart, VotingTrendsChart, EffectivenessChart)
// are not currently implemented - using existing campaign finance components instead

// Campaign finance visualization components
export const DynamicCampaignFinanceVisualizer = dynamic(
  () =>
    import('@/features/campaign-finance/components/CampaignFinanceVisualizer').then(mod => ({
      default: mod.CampaignFinanceVisualizer,
    })),
  {
    loading: () => <SmartLoadingState type="finance" />,
    ssr: false,
  }
);

export const DynamicDonationSourcesChart = dynamic(
  () =>
    import('@/features/campaign-finance/components/DonationSourcesChart').then(mod => ({
      default: mod.DonationSourcesChart,
    })),
  {
    loading: () => <SmartLoadingState type="finance" />,
    ssr: false,
  }
);

export const DynamicFundraisingTrends = dynamic(
  () =>
    import('@/features/campaign-finance/components/FundraisingTrends').then(mod => ({
      default: mod.FundraisingTrends,
    })),
  {
    loading: () => <SmartLoadingState type="finance" />,
    ssr: false,
  }
);

// Map components - these are typically heavy with geospatial libraries
export const DynamicDistrictMap = dynamic(
  () => import('@/features/districts/components/DistrictMap'),
  {
    loading: () => (
      <div className="h-64 bg-white border-2 border-gray-300 animate-pulse flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-civiq-blue mx-auto mb-2"></div>
          <p className="text-gray-600">Loading district map...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export const DynamicInteractiveDistrictMap = dynamic(
  () =>
    import('@/features/districts/components/InteractiveDistrictMap').then(mod => ({
      default: mod.InteractiveDistrictMap,
    })),
  {
    loading: () => (
      <div className="h-96 bg-white border-2 border-gray-300 animate-pulse flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-civiq-blue mx-auto mb-2"></div>
          <p className="text-gray-600">Loading interactive map...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export const DynamicDistrictBoundaryMap = dynamic(
  () => import('@/features/districts/components/DistrictBoundaryMap'),
  {
    loading: () => (
      <div className="h-64 bg-white border-2 border-gray-300 animate-pulse flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-civiq-blue mx-auto mb-2"></div>
          <p className="text-gray-600">Loading boundary map...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export const DynamicLeafletDistrictMap = dynamic(
  () => import('@/features/districts/components/LeafletDistrictMap'),
  {
    loading: () => (
      <div className="h-64 bg-white border-2 border-gray-300 animate-pulse flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-civiq-blue mx-auto mb-2"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

// Bills and legislation components
export const DynamicBillsTracker = dynamic(
  () =>
    import('@/features/representatives/components/BillsTab').then(mod => ({
      default: mod.BillsTab,
    })),
  {
    loading: () => <SmartLoadingState type="bills" />,
    ssr: false,
  }
);

// Performance-sensitive large data components
export const DynamicVotingRecordsTable = dynamic(
  () =>
    import('@/features/representatives/components/VotingRecordsTable').then(mod => ({
      default: mod.VotingRecordsTable,
    })),
  {
    loading: () => <SmartLoadingState type="votes" />,
    ssr: false,
  }
);
