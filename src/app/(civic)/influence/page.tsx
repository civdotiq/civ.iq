/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CommitteeSearch } from '@/features/influence/components/CommitteeSearch';
import { InfluenceClusterChart } from '@/components/intelligence/InfluenceClusterChart';
import { InfluencePathSection } from '@/components/mesh/InfluencePathSection';

function InfluencePageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-[#3ea2d4]">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">Influence</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Follow the Money
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
            Search any PAC, Super PAC, or political committee to see who they fund. All data comes
            directly from FEC.gov filing records.
          </p>
        </div>

        {/* Search */}
        <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6 mb-8">
          <CommitteeSearch initialQuery={initialQuery} />
        </div>

        {/* Empty state explanation */}
        {!initialQuery && (
          <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
              What is this?
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Political Action Committees (PACs) pool campaign contributions from members and donate
              to candidates running for federal office. Super PACs can raise unlimited funds but
              cannot contribute directly to candidates. This tool shows where committee money
              goes&mdash;which members of Congress receive funding from any given PAC.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="border-2 border-gray-200 dark:border-gray-700 p-3">
                <div className="font-bold text-gray-900 dark:text-gray-100 mb-1">PAC</div>
                <div className="text-gray-500 dark:text-gray-400">
                  Raises up to $5,000/person. Can contribute directly to candidates.
                </div>
              </div>
              <div className="border-2 border-gray-200 dark:border-gray-700 p-3">
                <div className="font-bold text-gray-900 dark:text-gray-100 mb-1">Super PAC</div>
                <div className="text-gray-500 dark:text-gray-400">
                  Unlimited fundraising. Cannot coordinate with candidates.
                </div>
              </div>
              <div className="border-2 border-gray-200 dark:border-gray-700 p-3">
                <div className="font-bold text-gray-900 dark:text-gray-100 mb-1">
                  Leadership PAC
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  Run by officeholders to support other candidates.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trace Influence Paths */}
        <div className="mt-8">
          <InfluencePathSection />
        </div>

        {/* Funding Influence Clusters */}
        <div className="mt-8">
          <InfluenceClusterChart />
        </div>

        {/* Source */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
          Source: Federal Election Commission (FEC.gov) &middot; Data reflects the most recent
          filing cycle.
        </p>
      </main>
    </div>
  );
}

export default function InfluencePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-[#1a1a1e] flex items-center justify-center">
          <div className="aicher-loading w-8 h-8" />
        </div>
      }
    >
      <InfluencePageContent />
    </Suspense>
  );
}
