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
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
      <div className="container mx-auto px-4 py-8">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-[#3ea2d4]">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <Link href="/influence" className="hover:text-[#3ea2d4]">
            Influence
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">Error</span>
        </nav>

        <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Committee Data Unavailable
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error.message || 'An unexpected error occurred loading this committee profile.'}
          </p>

          <div className="flex gap-4">
            <button
              onClick={reset}
              className="px-4 py-2 border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#2a2a2e] font-medium text-sm"
            >
              Try Again
            </button>
            <Link
              href="/influence"
              className="px-4 py-2 border-2 border-[#3ea2d4] text-[#3ea2d4] hover:bg-[#3ea2d4] hover:text-white font-medium text-sm"
            >
              Back to Search
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
