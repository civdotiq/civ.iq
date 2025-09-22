/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-2 border-black">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white border-2 border-black p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
