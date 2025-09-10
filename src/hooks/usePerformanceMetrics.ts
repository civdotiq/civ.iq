/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useEffect, useRef, useState } from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

interface PageMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  domContentLoaded?: number;
  loadComplete?: number;
  navigationStart?: number;
}

interface ComponentMetrics {
  renderTime: number;
  mountTime: number;
  updateCount: number;
  errorCount: number;
}

export function usePerformanceMetrics(componentName?: string) {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [pageMetrics, setPageMetrics] = useState<PageMetrics>({});
  const [componentMetrics, setComponentMetrics] = useState<ComponentMetrics>({
    renderTime: 0,
    mountTime: 0,
    updateCount: 0,
    errorCount: 0,
  });

  const renderStartTime = useRef<number>(performance.now());
  const mountStartTime = useRef<number>(Date.now());
  const updateCountRef = useRef<number>(0);

  // Track component lifecycle metrics
  useEffect(() => {
    const mountTime = Date.now() - mountStartTime.current;
    setComponentMetrics(prev => ({
      ...prev,
      mountTime,
    }));

    // Track rerenders
    updateCountRef.current += 1;
    setComponentMetrics(prev => ({
      ...prev,
      updateCount: updateCountRef.current,
    }));
  }, []); // Empty dependency array to run only on mount

  // Measure render time
  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    setComponentMetrics(prev => ({
      ...prev,
      renderTime,
    }));
    renderStartTime.current = performance.now();
  }, []); // Empty dependency array

  // Collect Web Vitals and navigation timing
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const collectMetrics = () => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;

      if (navigation) {
        const newPageMetrics: PageMetrics = {
          ttfb: navigation.responseStart - navigation.requestStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          loadComplete: navigation.loadEventEnd - navigation.fetchStart,
          navigationStart: navigation.fetchStart,
        };
        setPageMetrics(newPageMetrics);
      }

      // Collect paint metrics
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach(entry => {
        if (entry.name === 'first-contentful-paint') {
          setPageMetrics(prev => ({ ...prev, fcp: entry.startTime }));
        }
      });

      // Try to get LCP
      try {
        const observer = new PerformanceObserver(list => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            setPageMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
          }
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });

        return () => observer.disconnect();
      } catch {
        // LCP not supported
        return undefined;
      }
    };

    // Delay collection to ensure navigation timing is available
    const timer = setTimeout(collectMetrics, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Performance tracking functions
  const trackMetric = (name: string, value: number, unit: string = 'ms') => {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
    };

    setMetrics(prev => [...prev, metric]);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[Performance] ${componentName || 'App'} - ${name}: ${value}${unit}`);
    }
  };

  const startTimer = (name: string) => {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      trackMetric(name, duration);
      return duration;
    };
  };

  const trackAsyncOperation = async <T>(name: string, operation: () => Promise<T>): Promise<T> => {
    const stopTimer = startTimer(name);
    try {
      const result = await operation();
      stopTimer();
      return result;
    } catch (error) {
      stopTimer();
      setComponentMetrics(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1,
      }));
      throw error;
    }
  };

  const getPerformanceGrade = (): 'excellent' | 'good' | 'needs-improvement' | 'poor' => {
    const { fcp, lcp, cls, fid } = pageMetrics;

    let score = 0;
    let totalChecks = 0;

    // First Contentful Paint (good < 1.8s, needs improvement < 3s)
    if (fcp !== undefined) {
      totalChecks++;
      if (fcp < 1800) score++;
      else if (fcp < 3000) score += 0.5;
    }

    // Largest Contentful Paint (good < 2.5s, needs improvement < 4s)
    if (lcp !== undefined) {
      totalChecks++;
      if (lcp < 2500) score++;
      else if (lcp < 4000) score += 0.5;
    }

    // Cumulative Layout Shift (good < 0.1, needs improvement < 0.25)
    if (cls !== undefined) {
      totalChecks++;
      if (cls < 0.1) score++;
      else if (cls < 0.25) score += 0.5;
    }

    // First Input Delay (good < 100ms, needs improvement < 300ms)
    if (fid !== undefined) {
      totalChecks++;
      if (fid < 100) score++;
      else if (fid < 300) score += 0.5;
    }

    if (totalChecks === 0) return 'good';

    const percentage = score / totalChecks;
    if (percentage >= 0.9) return 'excellent';
    if (percentage >= 0.7) return 'good';
    if (percentage >= 0.5) return 'needs-improvement';
    return 'poor';
  };

  const getMetricsSummary = () => {
    const recent = metrics.slice(-10); // Last 10 metrics
    return {
      totalMetrics: metrics.length,
      recentMetrics: recent,
      performanceGrade: getPerformanceGrade(),
      pageMetrics,
      componentMetrics,
      averageRenderTime:
        recent.filter(m => m.name.includes('render')).reduce((sum, m) => sum + m.value, 0) /
        Math.max(1, recent.filter(m => m.name.includes('render')).length),
    };
  };

  return {
    metrics,
    pageMetrics,
    componentMetrics,
    trackMetric,
    startTimer,
    trackAsyncOperation,
    getPerformanceGrade,
    getMetricsSummary,
  };
}

// Hook for tracking bundle size and loading performance
export function useBundleMetrics() {
  const [bundleMetrics, setBundleMetrics] = useState({
    totalSize: 0,
    jsSize: 0,
    cssSize: 0,
    chunkCount: 0,
    loadTime: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const measureBundleSize = () => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      let totalSize = 0;
      let jsSize = 0;
      let cssSize = 0;
      let chunkCount = 0;
      let maxLoadTime = 0;

      resources.forEach(resource => {
        if (resource.name.includes('/_next/static/')) {
          const size = resource.transferSize || resource.encodedBodySize || 0;
          totalSize += size;
          maxLoadTime = Math.max(maxLoadTime, resource.duration);
          chunkCount++;

          if (resource.name.endsWith('.js')) {
            jsSize += size;
          } else if (resource.name.endsWith('.css')) {
            cssSize += size;
          }
        }
      });

      setBundleMetrics({
        totalSize,
        jsSize,
        cssSize,
        chunkCount,
        loadTime: maxLoadTime,
      });
    };

    // Measure after page load
    if (document.readyState === 'complete') {
      measureBundleSize();
      return undefined;
    } else {
      window.addEventListener('load', measureBundleSize);
      return () => window.removeEventListener('load', measureBundleSize);
    }
  }, []);

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return {
    bundleMetrics: {
      ...bundleMetrics,
      totalSizeFormatted: formatSize(bundleMetrics.totalSize),
      jsSizeFormatted: formatSize(bundleMetrics.jsSize),
      cssSizeFormatted: formatSize(bundleMetrics.cssSize),
    },
    formatSize,
  };
}
