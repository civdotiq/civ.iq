/**
 * API Performance Timer Wrapper
 * Provides detailed timing and metrics for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from './metrics-collector';
import logger from '@/lib/logging/simple-logger';

export interface PerformanceMetrics {
  route: string;
  method: string;
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
  statusCode: number;
  cacheHit: boolean;
  timestamp: number;
  error?: string;
}

export interface TimedResponse {
  response: NextResponse;
  metrics: PerformanceMetrics;
}

/**
 * Wraps an API handler with performance timing and metrics collection
 */
export function withPerformanceTiming<T extends unknown[], R extends NextResponse>(
  routeName: string,
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const startTime = performance.now();
    const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    const request = args[0] as NextRequest;
    const method = request?.method || 'GET';

    let response: R;
    let statusCode = 200;
    let error: string | undefined;
    let cacheHit = false;

    try {
      // Execute the handler
      response = await handler(...args);

      // Extract status code from response
      statusCode = response.status;

      // Check if response headers indicate cache hit
      const cacheHeader = response.headers.get('x-cache-status');
      cacheHit = cacheHeader === 'hit';

      return response;
    } catch (err) {
      statusCode = 500;
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      const endTime = performance.now();
      const duration = endTime - startTime;
      const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      const memoryDelta = memoryAfter - memoryBefore;

      const metrics: PerformanceMetrics = {
        route: routeName,
        method,
        duration,
        memoryBefore,
        memoryAfter,
        memoryDelta,
        statusCode,
        cacheHit,
        timestamp: Date.now(),
        error,
      };

      // Collect metrics
      metricsCollector.record(metrics);

      // Log performance data
      const logMessage = `[PERF] route: ${routeName}, method: ${method}, duration: ${duration.toFixed(2)}ms, status: ${statusCode}, memory: ${memoryDelta > 0 ? '+' : ''}${memoryDelta.toFixed(2)}MB${cacheHit ? ', cache: HIT' : ''}${error ? `, error: ${error}` : ''}`;

      if (process.env.NODE_ENV === 'development' || process.env.PERF_LOGGING === 'true') {
        if (duration > 1000) {
          logger.warn(logMessage);
        } else {
          logger.info(logMessage);
        }
      }
    }
  };
}

/**
 * Utility to measure specific code blocks
 */
export class PerformanceTimer {
  private startTime: number;
  private checkpoints: Map<string, number>;

  constructor(private name: string) {
    this.startTime = performance.now();
    this.checkpoints = new Map();
  }

  checkpoint(label: string): number {
    const now = performance.now();
    const elapsed = now - this.startTime;
    this.checkpoints.set(label, elapsed);
    return elapsed;
  }

  end(): { total: number; checkpoints: Record<string, number> } {
    const total = performance.now() - this.startTime;
    const checkpoints: Record<string, number> = {};

    this.checkpoints.forEach((time, label) => {
      checkpoints[label] = time;
    });

    if (process.env.NODE_ENV === 'development' || process.env.PERF_LOGGING === 'true') {
      logger.info(`[PERF-TIMER] ${this.name}: ${total.toFixed(2)}ms`, checkpoints);
    }

    return { total, checkpoints };
  }
}

/**
 * Decorator for measuring async function performance
 */
export function measurePerformance(
  target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: unknown[]) {
    const targetClass = target as { constructor: { name: string } };
    const timer = new PerformanceTimer(`${targetClass.constructor.name}.${propertyKey}`);
    try {
      const result = await originalMethod.apply(this, args);
      timer.end();
      return result;
    } catch (error) {
      timer.end();
      throw error;
    }
  };

  return descriptor;
}
