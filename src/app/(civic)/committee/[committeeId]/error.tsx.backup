/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Committee Error
          </h1>
          <p className="text-lg text-gray-600 mt-1">
            Something went wrong loading this committee page
          </p>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Error Details</h2>
          <p className="text-gray-700 mb-4">
            {error.message || 'An unexpected error occurred'}
          </p>
          
          <div className="flex space-x-4">
            <button
              onClick={reset}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
            
            <Link
              href="/representatives"
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Back to Representatives
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}