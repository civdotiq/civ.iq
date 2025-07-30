'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useState } from 'react';

function isChunkLoadError(error: Error): boolean {
  return (
    error.message.includes('ChunkLoadError') ||
    error.message.includes('__webpack_require__.f.j') ||
    error.message.includes('Loading chunk') ||
    error.message.includes('failed to import') ||
    error.stack?.includes('ChunkLoadError') ||
    false
  );
}

async function clearAllCaches() {
  try {
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('[CIV.IQ-CACHE] Cleared all caches');
    }

    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();

    // Unregister service worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      console.log('[CIV.IQ-SW] Unregistered service workers');
    }
  } catch (error) {
    console.error('[CIV.IQ-ERROR] Failed to clear caches:', error);
  }
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [reloading, setReloading] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Log error details for debugging
    console.error('Route Error:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      component: 'app/error.tsx',
      isChunkError: isChunkLoadError(error),
    });

    // Auto-handle ChunkLoadErrors
    if (isChunkLoadError(error)) {
      console.log('[CIV.IQ-ERROR] ChunkLoadError detected, initiating auto-recovery');

      // Start countdown for automatic reload
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleChunkError();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }

    // Return undefined for non-chunk errors (no cleanup needed)
    return undefined;
  }, [error]);

  const handleChunkError = async () => {
    setReloading(true);
    console.log('[CIV.IQ-ERROR] Clearing caches and reloading...');

    await clearAllCaches();

    // Force hard reload
    window.location.reload();
  };

  const handleManualRetry = async () => {
    if (isChunkLoadError(error)) {
      await handleChunkError();
    } else {
      reset();
    }
  };

  // Auto-reload for chunk errors
  if (isChunkLoadError(error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-4 text-orange-500">
              <svg
                className="w-full h-full animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-orange-600 mb-4">Updating Application</h2>
          <p className="text-gray-600 mb-4">
            The app is being updated with the latest version. This will only take a moment.
          </p>
          <div className="mb-6">
            <div className="text-3xl font-bold text-civiq-blue mb-2">{countdown}</div>
            <div className="text-sm text-gray-500">
              {reloading ? 'Reloading...' : 'Auto-reloading in seconds'}
            </div>
          </div>
          <button
            onClick={handleChunkError}
            disabled={reloading}
            className="px-6 py-2 bg-civiq-blue text-white rounded hover:bg-civiq-blue/90 disabled:opacity-50"
          >
            {reloading ? 'Reloading...' : 'Reload Now'}
          </button>
        </div>
      </div>
    );
  }

  // Standard error display for non-chunk errors
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong!</h2>
        <p className="text-gray-600 mb-4">{error.message || 'An unexpected error occurred'}</p>
        <details className="text-left mb-4">
          <summary className="cursor-pointer text-sm text-gray-500">Error details</summary>
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">{error.stack}</pre>
        </details>
        <button
          onClick={handleManualRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
