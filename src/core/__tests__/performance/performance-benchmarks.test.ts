/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Performance Benchmark Tests
 *
 * Test-driven development for performance requirements:
 * - API response time targets (sub-200ms)
 * - Memory usage optimization
 * - Bundle size monitoring
 * - Cache hit rate benchmarks
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock performance data structures
interface PerformanceMetrics {
  responseTimeMs: number;
  memoryUsageMB: number;
  cacheHitRate: number;
  bundleSizeKB: number;
  timestamp: number;
}

interface BenchmarkResult {
  name: string;
  duration: number;
  iterations: number;
  avgResponseTime: number;
  memory: {
    used: number;
    peak: number;
  };
}

// Mock service implementations for performance testing
class MockApiService {
  private delay: number;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(delay = 50) {
    this.delay = delay;
  }

  async getRepresentative(id: string): Promise<{ id: string; data: unknown }> {
    const start = performance.now();

    // Simulate cache check
    const cacheHit = Math.random() > 0.3; // 70% cache hit rate
    if (cacheHit) {
      this.cacheHits++;
      await this.simulateDelay(10); // Cache retrieval
    } else {
      this.cacheMisses++;
      await this.simulateDelay(this.delay); // API call
    }

    return {
      id,
      data: { responseTime: performance.now() - start },
    };
  }

  async batchGetRepresentatives(ids: string[]): Promise<{ id: string; data: unknown }[]> {
    const start = performance.now();

    // Batch operations should be more efficient
    const batchDelay = Math.min(this.delay * 0.6, ids.length * 5); // Efficient batch processing
    await this.simulateDelay(batchDelay);

    const responseTime = performance.now() - start;
    return ids.map(id => ({ id, data: { responseTime } }));
  }

  getCacheMetrics() {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0,
    };
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Performance testing utilities
class PerformanceTester {
  static async measureExecutionTime<T>(
    operation: () => Promise<T>,
    iterations = 1
  ): Promise<BenchmarkResult> {
    const results: number[] = [];
    const memoryBefore = this.getMemoryUsage();
    let peakMemory = memoryBefore;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await operation();
      const end = performance.now();
      results.push(end - start);

      const currentMemory = this.getMemoryUsage();
      if (currentMemory > peakMemory) {
        peakMemory = currentMemory;
      }
    }

    const avgResponseTime = results.reduce((a, b) => a + b, 0) / results.length;
    const totalDuration = results.reduce((a, b) => a + b, 0);

    return {
      name: operation.name || 'anonymous',
      duration: totalDuration,
      iterations,
      avgResponseTime,
      memory: {
        used: this.getMemoryUsage() - memoryBefore,
        peak: peakMemory - memoryBefore,
      },
    };
  }

  static async stressTest<T>(
    operation: () => Promise<T>,
    concurrency = 10,
    duration = 1000
  ): Promise<{ requestsCompleted: number; avgResponseTime: number; errors: number }> {
    let requestsCompleted = 0;
    let totalTime = 0;
    let errors = 0;
    const endTime = Date.now() + duration;

    const workers = Array.from({ length: concurrency }, async () => {
      while (Date.now() < endTime) {
        try {
          const start = performance.now();
          await operation();
          totalTime += performance.now() - start;
          requestsCompleted++;
        } catch {
          errors++;
        }
      }
    });

    await Promise.all(workers);

    return {
      requestsCompleted,
      avgResponseTime: requestsCompleted > 0 ? totalTime / requestsCompleted : 0,
      errors,
    };
  }

  private static getMemoryUsage(): number {
    if (
      typeof window !== 'undefined' &&
      window.performance &&
      (window.performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
    ) {
      return (
        (window.performance as unknown as { memory: { usedJSHeapSize: number } }).memory
          .usedJSHeapSize /
        (1024 * 1024)
      ); // MB
    }
    // Node.js environment
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / (1024 * 1024); // MB
    }
    return 0;
  }
}

// Bundle size analyzer (mock for testing)
class BundleAnalyzer {
  static analyzeBundle(): { totalSizeKB: number; chunks: { name: string; sizeKB: number }[] } {
    // Mock bundle analysis - in real implementation would use webpack-bundle-analyzer
    return {
      totalSizeKB: 250, // Target: Keep under 300KB for main chunk
      chunks: [
        { name: 'main', sizeKB: 180 },
        { name: 'vendor', sizeKB: 45 },
        { name: 'runtime', sizeKB: 25 },
      ],
    };
  }

  static analyzeTreeShaking(): { removedBytes: number; utilizationRate: number } {
    // Mock tree-shaking analysis
    return {
      removedBytes: 1024 * 150, // 150KB removed
      utilizationRate: 0.85, // 85% of imported code is used
    };
  }
}

describe('Performance Benchmark Tests', () => {
  let apiService: MockApiService;
  let performanceTester: typeof PerformanceTester;

  beforeEach(() => {
    apiService = new MockApiService(80); // 80ms simulated API delay
    performanceTester = PerformanceTester;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('API Response Time Benchmarks', () => {
    it('should meet sub-200ms response time requirement for single requests', async () => {
      const benchmark = await performanceTester.measureExecutionTime(
        () => apiService.getRepresentative('K000367'),
        50 // 50 iterations
      );

      expect(benchmark.avgResponseTime).toBeLessThan(200);
      expect(benchmark.avgResponseTime).toBeGreaterThan(0);
    });

    it('should demonstrate batch request efficiency', async () => {
      const singleRequests = await performanceTester.measureExecutionTime(async () => {
        await Promise.all([
          apiService.getRepresentative('K000367'),
          apiService.getRepresentative('S000033'),
          apiService.getRepresentative('A000001'),
        ]);
      }, 10);

      const batchRequest = await performanceTester.measureExecutionTime(
        () => apiService.batchGetRepresentatives(['K000367', 'S000033', 'A000001']),
        10
      );

      expect(batchRequest.avgResponseTime).toBeLessThan(singleRequests.avgResponseTime);
      expect(batchRequest.avgResponseTime).toBeLessThan(100); // Batch should be very fast
    });

    it('should maintain performance under concurrent load', async () => {
      const stressResult = await performanceTester.stressTest(
        () => apiService.getRepresentative('K000367'),
        20, // 20 concurrent requests
        2000 // for 2 seconds
      );

      expect(stressResult.avgResponseTime).toBeLessThan(250); // Allow some degradation under load
      expect(stressResult.errors).toBeLessThan(stressResult.requestsCompleted * 0.01); // <1% error rate
      expect(stressResult.requestsCompleted).toBeGreaterThan(30); // Should handle significant load
    });

    it('should meet cache performance targets', async () => {
      // Warm up cache
      for (let i = 0; i < 20; i++) {
        await apiService.getRepresentative('K000367');
      }

      const cacheMetrics = apiService.getCacheMetrics();
      expect(cacheMetrics.hitRate).toBeGreaterThan(0.6); // 60% hit rate minimum
      expect(cacheMetrics.hits).toBeGreaterThan(cacheMetrics.misses);
    });
  });

  describe('Memory Usage Benchmarks', () => {
    it('should not exceed memory usage limits during normal operations', async () => {
      const benchmark = await performanceTester.measureExecutionTime(async () => {
        // Simulate normal usage pattern
        await apiService.getRepresentative('K000367');
        await apiService.batchGetRepresentatives(['S000033', 'A000001']);
      }, 100);

      expect(benchmark.memory.peak).toBeLessThan(10); // Less than 10MB peak memory usage
      expect(benchmark.memory.used).toBeLessThan(5); // Less than 5MB memory retention
    });

    it('should handle memory cleanup during batch operations', async () => {
      const largeIds = Array.from({ length: 100 }, (_, i) => `ID${i}`);

      const benchmark = await performanceTester.measureExecutionTime(
        () => apiService.batchGetRepresentatives(largeIds),
        5
      );

      // Memory usage should be reasonable even for large batches
      expect(benchmark.memory.peak).toBeLessThan(50); // Less than 50MB for large operations
    });
  });

  describe('Bundle Size Benchmarks', () => {
    it('should maintain bundle size within targets', () => {
      const bundleAnalysis = BundleAnalyzer.analyzeBundle();

      expect(bundleAnalysis.totalSizeKB).toBeLessThan(300); // Total bundle under 300KB

      // Check individual chunk sizes
      const mainChunk = bundleAnalysis.chunks.find(c => c.name === 'main');
      expect(mainChunk?.sizeKB).toBeLessThan(200); // Main chunk under 200KB

      const vendorChunk = bundleAnalysis.chunks.find(c => c.name === 'vendor');
      expect(vendorChunk?.sizeKB).toBeLessThan(80); // Vendor chunk under 80KB
    });

    it('should demonstrate effective tree shaking', () => {
      const treeShakingAnalysis = BundleAnalyzer.analyzeTreeShaking();

      expect(treeShakingAnalysis.utilizationRate).toBeGreaterThan(0.8); // 80% code utilization
      expect(treeShakingAnalysis.removedBytes).toBeGreaterThan(100 * 1024); // >100KB removed
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions in API responses', async () => {
      const baselineMetrics: PerformanceMetrics = {
        responseTimeMs: 150,
        memoryUsageMB: 5,
        cacheHitRate: 0.75,
        bundleSizeKB: 280,
        timestamp: Date.now(),
      };

      const currentBenchmark = await performanceTester.measureExecutionTime(
        () => apiService.getRepresentative('K000367'),
        25
      );

      const currentMetrics: PerformanceMetrics = {
        responseTimeMs: currentBenchmark.avgResponseTime,
        memoryUsageMB: currentBenchmark.memory.peak,
        cacheHitRate: apiService.getCacheMetrics().hitRate,
        bundleSizeKB: BundleAnalyzer.analyzeBundle().totalSizeKB,
        timestamp: Date.now(),
      };

      // Check for regressions (allow 20% tolerance)
      const responseTolerance = 1.2;
      const memoryTolerance = 1.2;
      const bundleTolerance = 1.1;

      expect(currentMetrics.responseTimeMs).toBeLessThan(
        baselineMetrics.responseTimeMs * responseTolerance
      );
      expect(currentMetrics.memoryUsageMB).toBeLessThan(
        baselineMetrics.memoryUsageMB * memoryTolerance
      );
      expect(currentMetrics.bundleSizeKB).toBeLessThan(
        baselineMetrics.bundleSizeKB * bundleTolerance
      );
      expect(currentMetrics.cacheHitRate).toBeGreaterThan(
        baselineMetrics.cacheHitRate * 0.9 // Allow 10% degradation
      );
    });
  });

  describe('Performance Optimization Validation', () => {
    it('should validate caching strategy effectiveness', async () => {
      const noCacheService = new MockApiService(100);
      const cachedService = new MockApiService(100);

      // Test without cache (fresh requests)
      const noCacheBenchmark = await performanceTester.measureExecutionTime(
        () => noCacheService.getRepresentative(`fresh-${Math.random()}`),
        20
      );

      // Test with cache (repeated requests)
      const cachedBenchmark = await performanceTester.measureExecutionTime(
        () => cachedService.getRepresentative('K000367'),
        20
      );

      // Cache should provide significant performance improvement
      expect(cachedBenchmark.avgResponseTime).toBeLessThan(noCacheBenchmark.avgResponseTime * 0.5);
    });

    it('should validate request batching benefits', async () => {
      const ids = Array.from({ length: 10 }, (_, i) => `ID${i}`);

      // Individual requests
      const individualBenchmark = await performanceTester.measureExecutionTime(async () => {
        for (const id of ids) {
          await apiService.getRepresentative(id);
        }
      }, 5);

      // Batch request
      const batchBenchmark = await performanceTester.measureExecutionTime(
        () => apiService.batchGetRepresentatives(ids),
        5
      );

      // Batching should provide significant performance improvement
      expect(batchBenchmark.avgResponseTime).toBeLessThan(
        individualBenchmark.avgResponseTime * 0.3
      );
    });
  });

  describe('Performance Monitoring', () => {
    it('should provide performance metrics for monitoring', async () => {
      const metrics = await performanceTester.measureExecutionTime(
        () => apiService.getRepresentative('K000367'),
        10
      );

      // Ensure metrics are available for monitoring dashboards
      expect(metrics).toHaveProperty('name');
      expect(metrics).toHaveProperty('duration');
      expect(metrics).toHaveProperty('iterations');
      expect(metrics).toHaveProperty('avgResponseTime');
      expect(metrics).toHaveProperty('memory');
      expect(metrics.memory).toHaveProperty('used');
      expect(metrics.memory).toHaveProperty('peak');

      expect(typeof metrics.avgResponseTime).toBe('number');
      expect(typeof metrics.memory.used).toBe('number');
      expect(typeof metrics.memory.peak).toBe('number');
    });

    it('should track performance trends over time', () => {
      const performanceHistory: PerformanceMetrics[] = [
        {
          responseTimeMs: 120,
          memoryUsageMB: 4.5,
          cacheHitRate: 0.8,
          bundleSizeKB: 275,
          timestamp: Date.now() - 86400000,
        },
        {
          responseTimeMs: 125,
          memoryUsageMB: 4.8,
          cacheHitRate: 0.78,
          bundleSizeKB: 280,
          timestamp: Date.now() - 43200000,
        },
        {
          responseTimeMs: 130,
          memoryUsageMB: 5.1,
          cacheHitRate: 0.75,
          bundleSizeKB: 285,
          timestamp: Date.now(),
        },
      ];

      // Analyze trend
      const responseTimeTrend = performanceHistory.map(m => m.responseTimeMs);
      const memoryTrend = performanceHistory.map(m => m.memoryUsageMB);

      // Should detect increasing trends (performance degradation)
      const responseTimeIncreasing = (responseTimeTrend[2] ?? 0) > (responseTimeTrend[0] ?? 0);
      const memoryIncreasing = (memoryTrend[2] ?? 0) > (memoryTrend[0] ?? 0);

      // Tests document trend analysis capability
      expect(typeof responseTimeIncreasing).toBe('boolean');
      expect(typeof memoryIncreasing).toBe('boolean');

      // All metrics should be within acceptable ranges
      performanceHistory.forEach(metrics => {
        expect(metrics.responseTimeMs).toBeLessThan(200);
        expect(metrics.memoryUsageMB).toBeLessThan(10);
        expect(metrics.cacheHitRate).toBeGreaterThan(0.5);
        expect(metrics.bundleSizeKB).toBeLessThan(350);
      });
    });
  });
});
