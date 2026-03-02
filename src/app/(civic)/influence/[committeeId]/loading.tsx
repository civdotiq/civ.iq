/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export default function Loading() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          {/* Breadcrumb */}
          <div className="h-4 bg-gray-200 dark:bg-gray-700 w-48 mb-6"></div>

          {/* Header */}
          <div className="border-2 border-black dark:border-[#333333] p-6 mb-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 w-1/2"></div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="border-2 border-black dark:border-[#333333] p-6">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 w-1/2 mb-3"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 w-3/4"></div>
            </div>
            <div className="border-2 border-black dark:border-[#333333] p-6">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 w-1/2 mb-3"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 w-3/4"></div>
            </div>
            <div className="border-2 border-black dark:border-[#333333] p-6">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 w-1/2 mb-3"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 w-3/4"></div>
            </div>
          </div>

          {/* Table */}
          <div className="border-2 border-black dark:border-[#333333] p-6">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 w-1/3 mb-4"></div>
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
