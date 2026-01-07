'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { AdvancedSearch } from '@/features/search/components/AdvancedSearch';

export default function SearchPage() {
  return (
    <div className="min-h-screen aicher-background density-compact">
      <main className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="aicher-heading text-4xl text-gray-900 mb-3">
            Advanced Representative Search
          </h1>
          <p className="text-xl text-gray-600">
            Find representatives using multiple criteria including voting patterns, committee
            membership, campaign finance, and more
          </p>
        </div>

        {/* Search Component */}
        <AdvancedSearch />

        {/* Search Tips */}
        <div className="aicher-card aicher-status-info mt-12 p-6">
          <h3 className="aicher-heading text-lg text-blue-900 mb-4">Search Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Quick Searches:</h4>
              <ul className="space-y-1">
                <li>• Type a representative&apos;s name for direct results</li>
                <li>• Use state abbreviations (e.g., &quot;CA&quot;, &quot;TX&quot;)</li>
                <li>• Search by committee name or policy area</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Advanced Filters:</h4>
              <ul className="space-y-1">
                <li>• Filter by years of experience in office</li>
                <li>• Set campaign fundraising ranges</li>
                <li>• Find representatives by voting patterns</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Comparison Tools:</h4>
              <ul className="space-y-1">
                <li>• Select multiple representatives to compare</li>
                <li>• Analyze voting records side-by-side</li>
                <li>• Compare campaign finance data</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Export & Share:</h4>
              <ul className="space-y-1">
                <li>• Export search results to CSV</li>
                <li>• Save searches for future reference</li>
                <li>• Share search URLs with others</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Recent Searches */}
        <div className="aicher-card mt-8 p-6">
          <h3 className="aicher-heading text-lg text-gray-900 mb-4">Popular Searches</h3>
          <div className="flex flex-wrap gap-2">
            {[
              'Progressive Democrats',
              'Republican Senators',
              'Healthcare Committee',
              'Climate Champions',
              'Veterans Affairs',
              'Financial Services',
              'New Representatives 2024',
              'High Fundraisers',
            ].map((search, index) => (
              <button key={index} className="aicher-button aicher-hover px-3 py-2 text-sm">
                {search}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
