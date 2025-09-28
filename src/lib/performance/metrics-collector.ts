/**
 * Metrics Collector Service
 * Aggregates performance metrics and calculates statistics
 */

import type { PerformanceMetrics } from './api-timer';

interface MetricsSummary {
  route: string;
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  avgMemoryDelta: number;
  cacheHitRate: number;
  errorRate: number;
  lastUpdated: number;
}

class MetricsCollector {
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private maxMetricsPerRoute = 1000; // Keep last 1000 metrics per route

  /**
   * Record a new performance metric
   */
  record(metric: PerformanceMetrics): void {
    const key = `${metric.method}:${metric.route}`;
    const routeMetrics = this.metrics.get(key) || [];

    routeMetrics.push(metric);

    // Keep only the last N metrics per route
    if (routeMetrics.length > this.maxMetricsPerRoute) {
      routeMetrics.shift();
    }

    this.metrics.set(key, routeMetrics);
  }

  /**
   * Get summary statistics for a specific route
   */
  getSummary(route: string, method = 'GET'): MetricsSummary | null {
    const key = `${method}:${route}`;
    const routeMetrics = this.metrics.get(key);

    if (!routeMetrics || routeMetrics.length === 0) {
      return null;
    }

    const durations = routeMetrics.map(m => m.duration).sort((a, b) => a - b);
    const memoryDeltas = routeMetrics.map(m => m.memoryDelta);
    const cacheHits = routeMetrics.filter(m => m.cacheHit).length;
    const errors = routeMetrics.filter(m => m.error).length;

    return {
      route,
      count: routeMetrics.length,
      avgDuration: this.average(durations),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p50Duration: this.percentile(durations, 50),
      p95Duration: this.percentile(durations, 95),
      p99Duration: this.percentile(durations, 99),
      avgMemoryDelta: this.average(memoryDeltas),
      cacheHitRate: (cacheHits / routeMetrics.length) * 100,
      errorRate: (errors / routeMetrics.length) * 100,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Get summaries for all routes
   */
  getAllSummaries(): MetricsSummary[] {
    const summaries: MetricsSummary[] = [];

    for (const key of this.metrics.keys()) {
      const [method, ...routeParts] = key.split(':');
      const route = routeParts.join(':');
      const summary = this.getSummary(route, method);
      if (summary) {
        summaries.push(summary);
      }
    }

    return summaries.sort((a, b) => b.avgDuration - a.avgDuration);
  }

  /**
   * Export all metrics for analysis
   */
  exportMetrics(): Record<string, PerformanceMetrics[]> {
    const result: Record<string, PerformanceMetrics[]> = {};
    for (const [key, metrics] of this.metrics.entries()) {
      result[key] = [...metrics];
    }
    return result;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Get metrics for a specific time range
   */
  getMetricsInRange(startTime: number, endTime: number): PerformanceMetrics[] {
    const allMetrics: PerformanceMetrics[] = [];

    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime));
    }

    return allMetrics.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sortedArray[lower] ?? 0;
    }

    const lowerValue = sortedArray[lower] ?? 0;
    const upperValue = sortedArray[upper] ?? 0;
    return lowerValue * (1 - weight) + upperValue * weight;
  }

  /**
   * Calculate average
   */
  private average(array: number[]): number {
    if (array.length === 0) return 0;
    return array.reduce((sum, val) => sum + val, 0) / array.length;
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const summaries = this.getAllSummaries();

    if (summaries.length === 0) {
      return 'No performance data collected yet.';
    }

    let report = '📊 Performance Report\n';
    report += '═'.repeat(80) + '\n\n';

    for (const summary of summaries) {
      report += `📍 ${summary.route}\n`;
      report += `├─ Requests: ${summary.count}\n`;
      report += `├─ Avg Duration: ${summary.avgDuration.toFixed(2)}ms\n`;
      report += `├─ P50/P95/P99: ${summary.p50Duration.toFixed(2)}/${summary.p95Duration.toFixed(
        2
      )}/${summary.p99Duration.toFixed(2)}ms\n`;
      report += `├─ Memory Delta: ${summary.avgMemoryDelta.toFixed(2)}MB\n`;
      report += `├─ Cache Hit Rate: ${summary.cacheHitRate.toFixed(1)}%\n`;
      report += `└─ Error Rate: ${summary.errorRate.toFixed(1)}%\n\n`;
    }

    return report;
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();
