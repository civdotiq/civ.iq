/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Edge Runtime compatible telemetry and monitoring
 * Simplified implementation for MVP
 */

import { NextRequest } from 'next/server';

interface PerformanceMetric {
  name: string;
  startTime: number;
  duration?: number;
  success?: boolean;
  statusCode?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

class EdgeTelemetry {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics in memory

  // Start tracking a new operation
  startApiSpan(name: string, request?: NextRequest) {
    const startTime = Date.now();
    const metric: PerformanceMetric = {
      name,
      startTime,
      metadata: {
        userAgent: request?.headers.get('user-agent'),
        url: request?.url,
        method: request?.method,
      },
    };

    return {
      span: null, // No actual span object for Edge Runtime
      end: (statusCode?: number, error?: Error) => {
        metric.duration = Date.now() - startTime;
        metric.success = !error && (!statusCode || statusCode < 400);
        metric.statusCode = statusCode;
        metric.error = error?.message;

        this.recordMetric(metric);

        // Log performance info
        // eslint-disable-next-line no-console -- Intentional telemetry logging
        console.log(
          JSON.stringify({
            type: 'api_performance',
            name,
            duration: metric.duration,
            success: metric.success,
            statusCode,
            timestamp: new Date().toISOString(),
          })
        );
      },
    };
  }

  // Monitor external API calls
  monitorExternalApi(service: string, endpoint: string, url?: string) {
    const startTime = Date.now();
    const name = `external_${service}_${endpoint}`;

    return {
      end: (success: boolean = true, statusCode?: number, error?: Error) => {
        const duration = Date.now() - startTime;

        const metric: PerformanceMetric = {
          name,
          startTime,
          duration,
          success,
          statusCode,
          error: error?.message,
          metadata: { service, endpoint, url },
        };

        this.recordMetric(metric);

        // Log external API performance
        // eslint-disable-next-line no-console -- Intentional telemetry logging
        console.log(
          JSON.stringify({
            type: 'external_api',
            service,
            endpoint,
            duration,
            success,
            statusCode,
            timestamp: new Date().toISOString(),
          })
        );
      },
    };
  }

  // Monitor cache operations
  monitorCache(operation: 'get' | 'set' | 'delete', key: string) {
    const startTime = Date.now();
    const name = `cache_${operation}`;

    return {
      end: (hit: boolean = true, error?: Error) => {
        const duration = Date.now() - startTime;

        const metric: PerformanceMetric = {
          name,
          startTime,
          duration,
          success: !error,
          error: error?.message,
          metadata: { operation, key, hit },
        };

        this.recordMetric(metric);

        // Log cache performance
        // eslint-disable-next-line no-console -- Intentional telemetry logging
        console.log(
          JSON.stringify({
            type: 'cache_operation',
            operation,
            key: key.substring(0, 50), // Truncate long keys
            duration,
            hit,
            success: !error,
            timestamp: new Date().toISOString(),
          })
        );
      },
    };
  }

  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);

    // Keep only the last maxMetrics entries
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  // Get performance stats
  getStats() {
    const now = Date.now();
    const lastHour = this.metrics.filter(m => now - m.startTime < 60 * 60 * 1000);

    return {
      totalMetrics: this.metrics.length,
      lastHourMetrics: lastHour.length,
      averageResponseTime:
        lastHour.reduce((sum, m) => sum + (m.duration || 0), 0) / lastHour.length || 0,
      successRate: lastHour.filter(m => m.success).length / lastHour.length || 0,
      services: [...new Set(lastHour.map(m => m.metadata?.service).filter(Boolean))],
    };
  }

  // Clear metrics
  clear() {
    this.metrics = [];
  }
}

// Global telemetry instance
const edgeTelemetry = new EdgeTelemetry();

// Performance monitoring class for compatibility
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;

  private constructor() {}

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startApiSpan(name: string, request?: NextRequest) {
    return edgeTelemetry.startApiSpan(name, request);
  }

  getStats() {
    return edgeTelemetry.getStats();
  }
}

// Export functions for compatibility with existing code
export function monitorExternalApi(service: string, endpoint: string, url?: string) {
  return edgeTelemetry.monitorExternalApi(service, endpoint, url);
}

export function monitorCache(operation: 'get' | 'set' | 'delete', key: string) {
  return edgeTelemetry.monitorCache(operation, key);
}

// Export telemetry instance
export { edgeTelemetry as telemetry };
