'use client';


/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface LazyDataOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
  immediate?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  cacheKey?: string;
  cacheTTL?: number;
}

interface LazyDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  elementRef: React.RefObject<HTMLDivElement>;
  refetch: () => Promise<void>;
  isVisible: boolean;
}

// Simple in-memory cache for lazy loaded data
const dataCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export function useLazyData<T>(
  fetchFunction: () => Promise<T>,
  dependencies: any[] = [],
  options: LazyDataOptions = {}
): LazyDataResult<T> {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    enabled = true,
    immediate = false,
    retryAttempts = 3,
    retryDelay = 1000,
    cacheKey,
    cacheTTL = 5 * 60 * 1000 // 5 minutes default
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isVisible, setIsVisible] = useState(immediate);
  const [hasFetched, setHasFetched] = useState(false);
  
  const elementRef = useRef<HTMLDivElement>(null);
  const fetchFunctionRef = useRef(fetchFunction);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Update fetch function ref when it changes
  useEffect(() => {
    fetchFunctionRef.current = fetchFunction;
  }, [fetchFunction]);

  // Check cache first
  const getCachedData = useCallback((): T | null => {
    if (!cacheKey) return null;
    
    const cached = dataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    
    // Remove expired cache entry
    if (cached) {
      dataCache.delete(cacheKey);
    }
    
    return null;
  }, [cacheKey]);

  // Set cache data
  const setCachedData = useCallback((newData: T) => {
    if (cacheKey) {
      dataCache.set(cacheKey, {
        data: newData,
        timestamp: Date.now(),
        ttl: cacheTTL
      });
    }
  }, [cacheKey, cacheTTL]);

  // Intersection observer setup
  useEffect(() => {
    if (immediate || !enabled) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      observer.disconnect();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [threshold, rootMargin, immediate, enabled]);

  // Fetch data with retry logic
  const fetchWithRetry = useCallback(async (attemptNumber = 1): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cachedData = getCachedData();
      if (cachedData && !hasFetched) {
        setData(cachedData);
        setLoading(false);
        setHasFetched(true);
        return;
      }

      const result = await fetchFunctionRef.current();
      setData(result);
      setCachedData(result);
      setError(null);
      setHasFetched(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      
      if (attemptNumber < retryAttempts) {
        console.log(`[LazyData] Retry attempt ${attemptNumber + 1}/${retryAttempts} after ${retryDelay}ms`);
        
        retryTimeoutRef.current = setTimeout(() => {
          fetchWithRetry(attemptNumber + 1);
        }, retryDelay * attemptNumber); // Exponential backoff
      } else {
        setError(error);
        console.error('[LazyData] All retry attempts failed:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [getCachedData, setCachedData, retryAttempts, retryDelay, hasFetched]);

  // Manual refetch function
  const refetch = useCallback(async (): Promise<void> => {
    setHasFetched(false);
    await fetchWithRetry();
  }, [fetchWithRetry]);

  // Trigger fetch when visible and enabled
  useEffect(() => {
    if (isVisible && enabled && !loading && !hasFetched) {
      fetchWithRetry();
    }
  }, [isVisible, enabled, loading, hasFetched, fetchWithRetry, ...dependencies]);

  // Clear retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    elementRef,
    refetch,
    isVisible
  };
}

// Hook for lazy loading multiple data sources
export function useLazyDataBatch<T extends Record<string, any>>(
  fetchFunctions: { [K in keyof T]: () => Promise<T[K]> },
  dependencies: any[] = [],
  options: LazyDataOptions = {}
): {
  data: Partial<T>;
  loading: { [K in keyof T]: boolean };
  errors: { [K in keyof T]: Error | null };
  elementRef: React.RefObject<HTMLDivElement>;
  refetch: () => Promise<void>;
  isVisible: boolean;
} {
  const [data, setData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState<{ [K in keyof T]: boolean }>({} as any);
  const [errors, setErrors] = useState<{ [K in keyof T]: Error | null }>({} as any);
  const [isVisible, setIsVisible] = useState(options.immediate || false);
  const [hasFetched, setHasFetched] = useState(false);
  
  const elementRef = useRef<HTMLDivElement>(null);

  // Intersection observer setup
  useEffect(() => {
    if (options.immediate || !options.enabled) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { 
        threshold: options.threshold || 0.1, 
        rootMargin: options.rootMargin || '50px' 
      }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin, options.immediate, options.enabled]);

  // Fetch all data sources
  const fetchAll = useCallback(async (): Promise<void> => {
    if (!isVisible || hasFetched) return;

    const keys = Object.keys(fetchFunctions) as (keyof T)[];
    
    // Initialize loading states
    const initialLoading = {} as { [K in keyof T]: boolean };
    keys.forEach(key => {
      initialLoading[key] = true;
    });
    setLoading(initialLoading);

    // Fetch all data sources in parallel
    const results = await Promise.allSettled(
      keys.map(async (key) => {
        try {
          const result = await fetchFunctions[key]();
          return { key, result, success: true };
        } catch (error) {
          return { key, error, success: false };
        }
      })
    );

    // Process results
    const newData = { ...data };
    const newLoading = {} as { [K in keyof T]: boolean };
    const newErrors = {} as { [K in keyof T]: Error | null };

    results.forEach((result, index) => {
      const key = keys[index];
      newLoading[key] = false;

      if (result.status === 'fulfilled') {
        const { success, result: resultData, error } = result.value;
        if (success) {
          newData[key] = resultData;
          newErrors[key] = null;
        } else {
          newErrors[key] = error instanceof Error ? error : new Error('Unknown error');
        }
      } else {
        newErrors[key] = new Error(result.reason);
      }
    });

    setData(newData);
    setLoading(newLoading);
    setErrors(newErrors);
    setHasFetched(true);
  }, [isVisible, hasFetched, fetchFunctions, data]);

  // Manual refetch function
  const refetch = useCallback(async (): Promise<void> => {
    setHasFetched(false);
    await fetchAll();
  }, [fetchAll]);

  // Trigger fetch when visible
  useEffect(() => {
    if (isVisible && (options.enabled !== false)) {
      fetchAll();
    }
  }, [isVisible, options.enabled, fetchAll, ...dependencies]);

  return {
    data,
    loading,
    errors,
    elementRef,
    refetch,
    isVisible
  };
}

// Utility hook for infinite scroll lazy loading
export function useInfiniteScroll<T>(
  fetchFunction: (page: number, pageSize: number) => Promise<{ items: T[]; hasMore: boolean }>,
  pageSize: number = 20
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const elementRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      setError(null);

      const result = await fetchFunction(page, pageSize);
      
      setItems(prev => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load more items'));
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, page, pageSize, loading, hasMore]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  return {
    items,
    loading,
    error,
    hasMore,
    elementRef,
    loadMore,
    reset
  };
}

// Clear all cached data
export function clearLazyDataCache(): void {
  dataCache.clear();
}

// Get cache statistics
export function getLazyDataCacheStats(): { size: number; keys: string[] } {
  return {
    size: dataCache.size,
    keys: Array.from(dataCache.keys())
  };
}