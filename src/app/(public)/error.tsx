'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong!</h2>
        <p className="text-gray-600 mb-6">We encountered an error while loading this page.</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-civiq-blue text-white hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
