/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest } from 'next/server';
import { logger } from '../logging/logger-client';

// Simplified telemetry implementation for now
// Note: OpenTelemetry can be re-enabled when dependencies are resolved

// Performance monitoring class
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;

  private constructor() {}

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start a new span for API requests
  startApiSpan(name: string, _request?: NextRequest) {
    const startTime = Date.now();

    return {
      span: null,
      end: (statusCode?: number, error?: Error) => {
        const duration = Date.now() - startTime;
        // Simple logging instead of OpenTelemetry spans
        if (error || (statusCode && statusCode >= 400)) {
          logger.error(`${name}`, error, {
            duration,
            statusCode: statusCode || 'Unknown',
          });
        } else {
          logger.info(`${name}`, { duration, statusCode: statusCode || 200 });
        }
      },
    };
  }

  // Start a span for external API calls
  startExternalApiSpan(service: string, operation: string, _url?: string) {
    const startTime = Date.now();

    return {
      span: null,
      end: (success: boolean, statusCode?: number, error?: Error) => {
        const duration = Date.now() - startTime;

        // Simple logging instead of OpenTelemetry spans
        if (!success || error || (statusCode && statusCode >= 400)) {
          logger.error(`External API ${service}:${operation}`, error, {
            duration,
            statusCode: statusCode || 'Unknown',
          });
        } else {
          logger.info(`External API ${service}:${operation}`, {
            duration,
            statusCode: statusCode || 200,
          });
        }
      },
    };
  }

  // Start a span for cache operations
  startCacheSpan(operation: 'get' | 'set' | 'delete', key: string) {
    const startTime = Date.now();

    return {
      span: null,
      end: (hit?: boolean, error?: Error) => {
        const duration = Date.now() - startTime;

        // Simple logging instead of OpenTelemetry spans
        if (error) {
          logger.error(`Cache ${operation} ${key}`, error, { duration });
        } else {
          logger.info(`Cache ${operation} ${key}`, {
            duration,
            result: hit ? 'HIT' : 'MISS',
          });
        }
      },
    };
  }

  // Record API request metrics
  recordApiRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    userAgent?: string
  ) {
    // Simple logging instead of metrics
    logger.info(`API ${method} ${endpoint}`, { duration, statusCode, userAgent });
  }

  // Wrap a function with tracing
  trace<T extends (...args: unknown[]) => unknown>(
    name: string,
    fn: T,
    attributes?: Record<string, string | number | boolean>
  ): T {
    return ((...args: Parameters<T>) => {
      const startTime = Date.now();
      try {
        const result = fn(...args);

        // Handle async functions
        if (result instanceof Promise) {
          return result
            .then(value => {
              const duration = Date.now() - startTime;
              logger.debug(`${name}`, { duration, status: 'SUCCESS', ...attributes });
              return value;
            })
            .catch(error => {
              const duration = Date.now() - startTime;
              logger.error(`${name}`, error, { duration, ...attributes });
              throw error;
            });
        }

        // Handle sync functions
        const duration = Date.now() - startTime;
        logger.debug(`${name}`, { duration, status: 'SUCCESS', ...attributes });
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`${name}`, error as Error, { duration, ...attributes });
        throw error;
      }
    }) as T;
  }

  // Get current trace context
  getCurrentContext() {
    return null; // Simplified - no context tracking
  }

  // Add attributes to current span
  addToCurrentSpan(attributes: Record<string, string | number | boolean>) {
    // Simplified - no span tracking
    logger.debug('Span attributes', { attributes });
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Middleware for request monitoring
export function monitorRequest(request: NextRequest) {
  const url = new URL(request.url);
  const operationName = `${request.method} ${url.pathname}`;

  return performanceMonitor.startApiSpan(operationName, request);
}

// Helper for monitoring external API calls
export function monitorExternalApi(service: string, operation: string, url?: string) {
  return performanceMonitor.startExternalApiSpan(service, operation, url);
}

// Helper for monitoring cache operations
export function monitorCache(operation: 'get' | 'set' | 'delete', key: string) {
  return performanceMonitor.startCacheSpan(operation, key);
}

// Simplified exports
export const tracer = null;
export const meter = null;
