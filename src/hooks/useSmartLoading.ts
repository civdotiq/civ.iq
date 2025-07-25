/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface LoadingState {
  loading: boolean;
  error: Error | null;
  progress: number;
  stage: string;
  timeElapsed: number;
  showTimeout: boolean;
}

interface UseSmartLoadingOptions {
  timeout?: number;
  stages?: string[];
  retryCount?: number;
  retryDelay?: number;
}

interface UseSmartLoadingReturn extends LoadingState {
  start: (stage?: string) => void;
  complete: () => void;
  setError: (error: Error) => void;
  setProgress: (progress: number) => void;
  setStage: (stage: string) => void;
  retry: () => Promise<void>;
  reset: () => void;
}

export function useSmartLoading(
  asyncOperation?: () => Promise<void>,
  options: UseSmartLoadingOptions = {}
): UseSmartLoadingReturn {
  const { timeout = 10000, stages = [], retryCount = 3, retryDelay = 1000 } = options;

  const [state, setState] = useState<LoadingState>({
    loading: false,
    error: null,
    progress: 0,
    stage: stages[0] || 'Loading...',
    timeElapsed: 0,
    showTimeout: false,
  });

  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentRetries, setCurrentRetries] = useState(0);
  const isMounted = useRef(true);

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Update time elapsed
  useEffect(() => {
    if (!state.loading || !startTime) return;

    const interval = setInterval(() => {
      if (!isMounted.current) return;
      const elapsed = Date.now() - startTime;
      setState(prev => ({
        ...prev,
        timeElapsed: elapsed,
        showTimeout: elapsed >= timeout,
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [state.loading, startTime, timeout]);

  const start = useCallback(
    (stage?: string) => {
      if (!isMounted.current) return;
      setStartTime(Date.now());
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        progress: 0,
        stage: stage || stages[0] || 'Loading...',
        timeElapsed: 0,
        showTimeout: false,
      }));
    },
    [stages]
  );

  const complete = useCallback(() => {
    if (!isMounted.current) return;
    setState(prev => ({
      ...prev,
      loading: false,
      progress: 100,
      timeElapsed: 0,
      showTimeout: false,
    }));
    setStartTime(null);
    setCurrentRetries(0);
  }, []);

  const setError = useCallback((error: Error) => {
    if (!isMounted.current) return;
    setState(prev => ({
      ...prev,
      loading: false,
      error,
      timeElapsed: 0,
      showTimeout: false,
    }));
    setStartTime(null);
  }, []);

  const setProgress = useCallback((progress: number) => {
    if (!isMounted.current) return;
    setState(prev => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress)),
    }));
  }, []);

  const setStage = useCallback((stage: string) => {
    if (!isMounted.current) return;
    setState(prev => ({
      ...prev,
      stage,
    }));
  }, []);

  const retry = useCallback(async () => {
    if (!isMounted.current) return;
    if (currentRetries >= retryCount) {
      setError(new Error(`Failed after ${retryCount} attempts`));
      return;
    }

    setCurrentRetries(prev => prev + 1);

    // Exponential backoff
    const delay = retryDelay * Math.pow(2, currentRetries);
    await new Promise(resolve => setTimeout(resolve, delay));

    if (asyncOperation) {
      try {
        start(`Retrying... (${currentRetries + 1}/${retryCount})`);
        await asyncOperation();
        complete();
      } catch (error) {
        if (currentRetries + 1 >= retryCount) {
          setError(error instanceof Error ? error : new Error('Unknown error'));
        } else {
          await retry();
        }
      }
    }
  }, [asyncOperation, currentRetries, retryCount, retryDelay, start, complete, setError]);

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      progress: 0,
      stage: stages[0] || 'Loading...',
      timeElapsed: 0,
      showTimeout: false,
    });
    setStartTime(null);
    setCurrentRetries(0);
  }, [stages]);

  return {
    ...state,
    start,
    complete,
    setError,
    setProgress,
    setStage,
    retry,
    reset,
  };
}

// Specialized hook for multi-stage operations
export function useMultiStageLoading(stages: string[]) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const loading = useSmartLoading(undefined, { stages });

  const nextStage = useCallback(() => {
    if (currentStageIndex < stages.length - 1) {
      const nextIndex = currentStageIndex + 1;
      setCurrentStageIndex(nextIndex);
      loading.setStage(stages[nextIndex]);
      loading.setProgress((nextIndex / (stages.length - 1)) * 100);
    }
  }, [currentStageIndex, stages, loading]);

  const start = useCallback(() => {
    setCurrentStageIndex(0);
    loading.start(stages[0]);
  }, [stages, loading]);

  const complete = useCallback(() => {
    setCurrentStageIndex(stages.length - 1);
    loading.setProgress(100);
    loading.complete();
  }, [stages.length, loading]);

  return {
    ...loading,
    currentStageIndex,
    currentStage: stages[currentStageIndex],
    nextStage,
    start,
    complete,
  };
}

// Hook for timeout-aware operations
export function useTimeoutLoading(operation: () => Promise<void>, timeoutMs: number = 10000) {
  const loading = useSmartLoading(operation, { timeout: timeoutMs });

  const executeWithTimeout = useCallback(async () => {
    loading.start();

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
      });

      await Promise.race([operation(), timeoutPromise]);
      loading.complete();
    } catch (error) {
      loading.setError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }, [operation, timeoutMs, loading]);

  return {
    ...loading,
    execute: executeWithTimeout,
  };
}

// Hook for tracking upload/download progress
export function useProgressLoading() {
  const loading = useSmartLoading();

  const trackProgress = useCallback(
    (event: ProgressEvent) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        loading.setProgress(progress);

        if (progress >= 100) {
          loading.complete();
        }
      }
    },
    [loading]
  );

  return {
    ...loading,
    trackProgress,
  };
}
