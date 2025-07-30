'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect } from 'react';
import { initializeChunkErrorHandler } from '@/lib/error-handling/chunk-error-handler';
import { structuredLogger } from '@/lib/logging/universal-logger';

/**
 * Client component to initialize the global chunk error handler
 * This must be a client component since it deals with browser APIs
 */
export function ChunkErrorHandler() {
  useEffect(() => {
    // Initialize the global chunk error handler
    const _handler = initializeChunkErrorHandler();

    structuredLogger.info('Global chunk error handler initialized', {
      component: 'ChunkErrorHandler',
      metadata: { system: 'chunk-error-handling' },
    });

    // Cleanup function (though the handler should persist)
    return () => {
      // Handler continues to run globally
      structuredLogger.info('ChunkErrorHandler component unmounted', {
        component: 'ChunkErrorHandler',
        metadata: { system: 'chunk-error-handling' },
      });
    };
  }, []);

  // This component renders nothing - it's just for initialization
  return null;
}
