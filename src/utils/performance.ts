/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Performance optimization utilities
 * Handles request batching, bundle optimization, and performance monitoring
 */

// Request batching utility
class RequestBatcher {
  private batchTimeoutMs: number;
  private maxBatchSize: number;
  private pendingRequests: Map<string, {
    requests: Array<{
      key: string;
      resolve: (value: unknown) => void;
      reject: (error: unknown) => void;
    }>;
    timeoutId: NodeJS.Timeout;
  }> = new Map();

  constructor(batchTimeoutMs: number = 50, maxBatchSize: number = 10) {
    this.batchTimeoutMs = batchTimeoutMs;
    this.maxBatchSize = maxBatchSize;
  }

  async batchRequest<T>(
    batchKey: string,
    requestKey: string,
    batchFunction: (keys: string[]) => Promise<Record<string, T>>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const batch = this.pendingRequests.get(batchKey);

      if (batch) {
        // Add to existing batch
        batch.requests.push({ key: requestKey, resolve, reject });

        // Check if batch is full
        if (batch.requests.length >= this.maxBatchSize) {
          this.executeBatch(batchKey, batchFunction);
        }
      } else {
        // Create new batch
        const newBatch = {
          requests: [{ key: requestKey, resolve, reject }],
          timeoutId: setTimeout(() => {
            this.executeBatch(batchKey, batchFunction);
          }, this.batchTimeoutMs)
        };

        this.pendingRequests.set(batchKey, newBatch);
      }
    });
  }

  private async executeBatch<T>(
    batchKey: string,
    batchFunction: (keys: string[]) => Promise<Record<string, T>>
  ) {
    const batch = this.pendingRequests.get(batchKey);
    if (!batch) return;

    // Remove from pending
    this.pendingRequests.delete(batchKey);
    clearTimeout(batch.timeoutId);

    try {
      const keys = batch.requests.map(req => req.key);
      const results = await batchFunction(keys);

      // Resolve individual requests
      batch.requests.forEach(({ key, resolve, reject }) => {
        if (key in results) {
          resolve(results[key]);
        } else {
          reject(new Error(`No result for key: ${key}`));
        }
      });
    } catch (error) {
      // Reject all requests in batch
      batch.requests.forEach(({ reject }) => {
        reject(error);
      });
    }
  }

  clear() {
    this.pendingRequests.forEach(batch => {
      clearTimeout(batch.timeoutId);
      batch.requests.forEach(({ reject }) => {
        reject(new Error('Request batch cleared'));
      });
    });
    this.pendingRequests.clear();
  }
}

// Global request batcher instance
export const requestBatcher = new RequestBatcher();

// API batching helpers
export async function batchApiRequests<T>(
  endpoint: string,
  ids: string[],
  batchFunction: (batchedIds: string[]) => Promise<Record<string, T>>
): Promise<Record<string, T>> {
  const batchPromises = ids.map(id => 
    requestBatcher.batchRequest(`api:${endpoint}`, id, batchFunction)
  );

  const results = await Promise.all(batchPromises);
  
  // Convert array back to object
  const resultObject: Record<string, T> = {};
  ids.forEach((id, index) => {
    resultObject[id] = results[index];
  });

  return resultObject;
}

// Representative data batching
export async function batchRepresentativeRequests(bioguideIds: string[]) {
  return batchApiRequests(
    'representatives',
    bioguideIds,
    async (ids) => {
      const response = await fetch('/api/representatives/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bioguideIds: ids })
      });
      
      if (!response.ok) {
        throw new Error(`Batch request failed: ${response.statusText}`);
      }
      
      return await response.json();
    }
  );
}

// News data batching
export async function batchNewsRequests(bioguideIds: string[]) {
  return batchApiRequests(
    'news',
    bioguideIds,
    async (ids) => {
      const response = await fetch('/api/news/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bioguideIds: ids })
      });
      
      if (!response.ok) {
        throw new Error(`Batch news request failed: ${response.statusText}`);
      }
      
      return await response.json();
    }
  );
}

// Performance monitoring utilities
interface PerformanceMetrics {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private activeTimers: Map<string, number> = new Map();

  startTimer(name: string, metadata?: Record<string, any>): void {
    const startTime = performance.now();
    this.activeTimers.set(name, startTime);
    
    this.metrics.push({
      name,
      startTime,
      metadata
    });
  }

  endTimer(name: string): number | null {
    const endTime = performance.now();
    const startTime = this.activeTimers.get(name);
    
    if (!startTime) {
      console.warn(`No active timer found for: ${name}`);
      return null;
    }

    const duration = endTime - startTime;
    this.activeTimers.delete(name);

    // Update the metric
    const metric = this.metrics.find(m => m.name === name && !m.endTime);
    if (metric) {
      metric.endTime = endTime;
      metric.duration = duration;
    }

    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  measureAsync<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    this.startTimer(name, metadata);
    
    return fn().finally(() => {
      this.endTimer(name);
    });
  }

  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    this.startTimer(name, metadata);
    
    try {
      return fn();
    } finally {
      this.endTimer(name);
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getAverageTime(name: string): number {
    const matchingMetrics = this.metrics.filter(m => m.name === name && m.duration);
    if (matchingMetrics.length === 0) return 0;
    
    const totalTime = matchingMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    return totalTime / matchingMetrics.length;
  }

  clearMetrics(): void {
    this.metrics = [];
    this.activeTimers.clear();
  }

  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

// Global performance monitor
export const performanceMonitor = new PerformanceMonitor();

// Resource preloading utilities
export function preloadResource(href: string, as: string, crossorigin?: string): void {
  if (typeof document === 'undefined') return;

  // Check if already preloaded
  const existing = document.querySelector(`link[rel="preload"][href="${href}"]`);
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  
  if (crossorigin) {
    link.crossOrigin = crossorigin;
  }

  document.head.appendChild(link);
}

export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

export function preloadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }

    // Check if already loaded
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = reject;
    
    document.head.appendChild(script);
  });
}

// Bundle optimization utilities
export function loadChunk(chunkName: string): Promise<any> {
  // Dynamic import with explicit chunk name
  switch (chunkName) {
    case 'charts':
      return import('../components/Charts');
    case 'district-map':
      return import('../components/DistrictMap');
    case 'analytics':
      return import('../components/analytics/VotingTrendsChart');
    case 'news-feed':
      return import('../components/EnhancedNewsFeed');
    case 'advanced-search':
      return import('../components/AdvancedSearch');
    default:
      throw new Error(`Unknown chunk: ${chunkName}`);
  }
}

// Memory management utilities
export function estimateMemoryUsage(): {
  used: number;
  total: number;
  percentage: number;
} | null {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
    };
  }
  return null;
}

export function cleanupResources(): void {
  // Clear request batcher
  requestBatcher.clear();
  
  // Clear performance metrics older than 5 minutes
  const fiveMinutesAgo = performance.now() - 5 * 60 * 1000;
  const monitor = performanceMonitor as any;
  monitor.metrics = monitor.metrics.filter((m: PerformanceMetrics) => 
    m.startTime > fiveMinutesAgo
  );

  // Suggest garbage collection if available
  if ('gc' in window && typeof (window as any).gc === 'function') {
    (window as any).gc();
  }
}

// Debounce utility for performance
export function debounce<T extends (...args: unknown[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Throttle utility for performance
export function throttle<T extends (...args: unknown[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastExecTime = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastExecTime >= delay) {
      func(...args);
      lastExecTime = now;
    }
  };
}

// Network optimization
export function optimizeNetworkRequests() {
  // Prefetch important resources
  preloadResource('/api/representatives', 'fetch');
  preloadResource('/manifest.json', 'manifest');
  
  // Preload critical images
  const criticalImages = [
    '/icon-192x192.png',
    '/icon-512x512.png'
  ];
  
  criticalImages.forEach(src => {
    preloadImage(src).catch(console.warn);
  });
}

// Initialize performance optimizations
export function initializePerformanceOptimizations(): void {
  if (typeof window === 'undefined') return;

  // Set up cleanup interval
  setInterval(cleanupResources, 5 * 60 * 1000); // Every 5 minutes

  // Optimize network on idle
  if ('requestIdleCallback' in window) {
    requestIdleCallback(optimizeNetworkRequests);
  } else {
    setTimeout(optimizeNetworkRequests, 1000);
  }

  // Monitor memory usage
  if ('memory' in performance) {
    setInterval(() => {
      const memory = estimateMemoryUsage();
      if (memory && memory.percentage > 80) {
        console.warn(`High memory usage: ${memory.percentage.toFixed(1)}%`);
        cleanupResources();
      }
    }, 30000); // Every 30 seconds
  }
}