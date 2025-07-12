'use client';

/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

import { useEffect } from 'react';
import { initializeChunkErrorHandler } from '@/lib/error-handling/chunk-error-handler';

/**
 * Client component to initialize the global chunk error handler
 * This must be a client component since it deals with browser APIs
 */
export function ChunkErrorHandler() {
  useEffect(() => {
    // Initialize the global chunk error handler
    const handler = initializeChunkErrorHandler();
    
    console.log('[CIV.IQ-CHUNK] Global chunk error handler initialized');
    
    // Cleanup function (though the handler should persist)
    return () => {
      // Handler continues to run globally
      console.log('[CIV.IQ-CHUNK] ChunkErrorHandler component unmounted');
    };
  }, []);

  // This component renders nothing - it's just for initialization
  return null;
}