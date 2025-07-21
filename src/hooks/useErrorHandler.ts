/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useCallback, useState } from 'react';
import { structuredLogger } from '@/lib/logging/logger';

export interface ErrorState {
  error: Error | null;
  isError: boolean;
  errorMessage: string;
}

export interface UseErrorHandlerReturn {
  error: ErrorState;
  handleError: (error: Error, context?: Record<string, any>) => void;
  clearError: () => void;
  withErrorHandling: <T>(
    asyncFn: () => Promise<T>, 
    context?: Record<string, any>
  ) => Promise<T | null>;
}

export function useErrorHandler(componentName?: string): UseErrorHandlerReturn {
  const [error, setError] = useState<ErrorState>({
    error: null,
    isError: false,
    errorMessage: '',
  });

  const handleError = useCallback(
    (error: Error, context: Record<string, any> = {}) => {
      const errorMessage = error.message || 'An unexpected error occurred';
      
      // Log error with context
      structuredLogger.error('Component error handled', error, {
        componentName: componentName || 'Unknown',
        context,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        timestamp: new Date().toISOString(),
      });

      setError({
        error,
        isError: true,
        errorMessage,
      });
    },
    [componentName]
  );

  const clearError = useCallback(() => {
    setError({
      error: null,
      isError: false,
      errorMessage: '',
    });
  }, []);

  const withErrorHandling = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      context: Record<string, any> = {}
    ): Promise<T | null> => {
      try {
        clearError();
        return await asyncFn();
      } catch (error) {
        handleError(error as Error, context);
        return null;
      }
    },
    [handleError, clearError]
  );

  return {
    error,
    handleError,
    clearError,
    withErrorHandling,
  };
}

// Hook for API calls with standardized error handling
export function useApiCall<T>(
  apiCall: () => Promise<T>,
  dependencies: unknown[] = [],
  componentName?: string
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const { error, withErrorHandling } = useErrorHandler(componentName);

  const execute = useCallback(async () => {
    setLoading(true);
    const result = await withErrorHandling(apiCall, { apiCall: apiCall.name });
    if (result) {
      setData(result);
    }
    setLoading(false);
  }, dependencies);

  return {
    data,
    loading,
    error: error.isError ? error : null,
    execute,
    refetch: execute,
  };
}