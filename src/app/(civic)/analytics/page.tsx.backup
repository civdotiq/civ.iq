'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { CiviqLogo } from '@/shared/ui/CiviqLogo';

// Dynamically import heavy dashboard components for better performance
const CivicEngagementDashboard = dynamic(
  () =>
    import('@/shared/components/ui/AdvancedDashboard').then(mod => ({
      default: mod.CivicEngagementDashboard,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading civic engagement dashboard...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

const LegislativeActivityMonitor = dynamic(
  () =>
    import('@/shared/components/ui/AdvancedDashboard').then(mod => ({
      default: mod.LegislativeActivityMonitor,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading legislative activity monitor...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

const CampaignFinanceOverview = dynamic(
  () =>
    import('@/shared/components/ui/AdvancedDashboard').then(mod => ({
      default: mod.CampaignFinanceOverview,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading campaign finance overview...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

const DistrictPerformanceDashboard = dynamic(
  () =>
    import('@/shared/components/ui/AdvancedDashboard').then(mod => ({
      default: mod.DistrictPerformanceDashboard,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading district performance dashboard...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

const NewsSentimentTracker = dynamic(
  () =>
    import('@/shared/components/ui/AdvancedDashboard').then(mod => ({
      default: mod.NewsSentimentTracker,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading news sentiment tracker...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export default function AnalyticsPage() {
  const [activeView, setActiveView] = useState<
    'engagement' | 'legislative' | 'finance' | 'districts' | 'sentiment'
  >('engagement');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <CiviqLogo />
            </Link>
            <nav className="flex items-center gap-6">
              <Link
                href="/representatives"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Representatives
              </Link>
              <Link
                href="/districts"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Districts
              </Link>
              <Link href="/analytics" className="text-blue-600 font-medium">
                Analytics
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Civic Analytics Dashboard</h1>
          <p className="text-xl text-gray-600">
            Comprehensive insights into civic engagement, legislative activity, and political trends
          </p>
        </div>

        {/* Navigation tabs */}
        <div className="bg-white rounded-lg shadow-md p-1 mb-8">
          <nav className="flex flex-wrap">
            {[
              { id: 'engagement', label: 'Civic Engagement' },
              { id: 'legislative', label: 'Legislative Activity' },
              { id: 'finance', label: 'Campaign Finance' },
              { id: 'districts', label: 'District Performance' },
              { id: 'sentiment', label: 'News Sentiment' },
            ].map(view => (
              <button
                key={view.id}
                onClick={() =>
                  setActiveView(
                    view.id as 'engagement' | 'legislative' | 'finance' | 'districts' | 'sentiment'
                  )
                }
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  activeView === view.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {view.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content based on active view */}
        <div className="space-y-8">
          {activeView === 'engagement' && <CivicEngagementDashboard />}
          {activeView === 'legislative' && <LegislativeActivityMonitor />}
          {activeView === 'finance' && <CampaignFinanceOverview />}
          {activeView === 'districts' && <DistrictPerformanceDashboard />}
          {activeView === 'sentiment' && <NewsSentimentTracker />}
        </div>

        {/* Quick insights section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-green-600">•</span>
                <span className="text-sm text-gray-700">Civic engagement up 15% this month</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span className="text-sm text-gray-700">
                  23 competitive districts identified nationwide
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span className="text-sm text-gray-700">
                  $100M+ raised in current election cycle
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Trending Topics</h3>
            <div className="space-y-2">
              {['Healthcare Reform', 'Infrastructure', 'Climate Policy', 'Economic Recovery'].map(
                (topic, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{topic}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${[85, 72, 68, 61][index]}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{[85, 72, 68, 61][index]}%</span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                href="/compare"
                className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors"
              >
                Compare Representatives
              </Link>
              <Link
                href="/districts"
                className="block w-full px-4 py-2 border border-gray-300 text-gray-700 text-center rounded-lg hover:bg-gray-50 transition-colors"
              >
                Explore Districts
              </Link>
              <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Export Report
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            Data sourced from Congress.gov, FEC.gov, and official government sources
          </p>
          <p className="text-gray-500 text-sm mt-2">
            © 2019-2025 Mark Sandford. CIV.IQ™ - The Original Civic Information Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
