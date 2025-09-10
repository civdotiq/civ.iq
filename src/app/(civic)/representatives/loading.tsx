/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { AdaptiveGridSkeleton } from '@/shared/components/ui';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-200 rounded w-32 animate-pulse" />
            <nav className="flex items-center gap-6">
              <div className="h-6 bg-gray-200 rounded w-24 animate-pulse" />
              <div className="h-6 bg-gray-200 rounded w-20 animate-pulse" />
              <div className="h-6 bg-gray-200 rounded w-20 animate-pulse" />
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Page header skeleton */}
        <div className="mb-8">
          <div className="h-10 bg-gray-200 rounded w-64 mb-3 animate-pulse" />
          <div className="h-6 bg-gray-200 rounded w-96 animate-pulse" />
        </div>

        {/* Enhanced grid skeleton */}
        <AdaptiveGridSkeleton type="representatives" count={9} />
      </main>

      {/* Footer skeleton */}
      <footer className="bg-gray-900 py-8 mt-16">
        <div className="container mx-auto px-4 text-center space-y-2">
          <div className="h-4 bg-gray-700 rounded w-80 mx-auto animate-pulse" />
          <div className="h-3 bg-gray-800 rounded w-64 mx-auto animate-pulse" />
        </div>
      </footer>
    </div>
  );
}
