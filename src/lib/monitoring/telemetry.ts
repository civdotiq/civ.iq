/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest } from 'next/server'

// Simplified telemetry implementation for now
// Note: OpenTelemetry can be re-enabled when dependencies are resolved

// Performance monitoring class
export class PerformanceMonitor {
  private static instance: PerformanceMonitor

  private constructor() {}

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Start a new span for API requests
  startApiSpan(name: string, request?: NextRequest) {
    const startTime = Date.now()

    return {
      span: null,
      end: (statusCode?: number, error?: Error) => {
        const duration = Date.now() - startTime
        // Simple logging instead of OpenTelemetry spans
        if (error || (statusCode && statusCode >= 400)) {
          console.log(`[ERROR] ${name} - ${duration}ms - ${statusCode || 'Unknown'} - ${error?.message || ''}`)
        } else {
          console.log(`[INFO] ${name} - ${duration}ms - ${statusCode || 200}`)
        }
      }
    }
  }

  // Start a span for external API calls
  startExternalApiSpan(service: string, operation: string, url?: string) {
    const startTime = Date.now()

    return {
      span: null,
      end: (success: boolean, statusCode?: number, error?: Error) => {
        const duration = Date.now() - startTime
        
        // Simple logging instead of OpenTelemetry spans
        if (!success || error || (statusCode && statusCode >= 400)) {
          console.log(`[ERROR] External API ${service}:${operation} - ${duration}ms - ${statusCode || 'Unknown'} - ${error?.message || ''}`)
        } else {
          console.log(`[INFO] External API ${service}:${operation} - ${duration}ms - ${statusCode || 200}`)
        }
      }
    }
  }

  // Start a span for cache operations
  startCacheSpan(operation: 'get' | 'set' | 'delete', key: string) {
    const startTime = Date.now()

    return {
      span: null,
      end: (hit?: boolean, error?: Error) => {
        const duration = Date.now() - startTime
        
        // Simple logging instead of OpenTelemetry spans
        if (error) {
          console.log(`[ERROR] Cache ${operation} ${key} - ${duration}ms - ${error.message}`)
        } else {
          console.log(`[INFO] Cache ${operation} ${key} - ${duration}ms - ${hit ? 'HIT' : 'MISS'}`)
        }
      }
    }
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
    console.log(`[METRICS] API ${method} ${endpoint} - ${duration}ms - ${statusCode}`)
  }

  // Wrap a function with tracing
  trace<T extends (...args: unknown[]) => any>(
    name: string,
    fn: T,
    attributes?: Record<string, string | number | boolean>
  ): T {
    return ((...args: Parameters<T>) => {
      const startTime = Date.now()
      try {
        const result = fn(...args)
        
        // Handle async functions
        if (result instanceof Promise) {
          return result
            .then((value) => {
              const duration = Date.now() - startTime
              console.log(`[TRACE] ${name} - ${duration}ms - SUCCESS`)
              return value
            })
            .catch((error) => {
              const duration = Date.now() - startTime
              console.log(`[TRACE] ${name} - ${duration}ms - ERROR: ${error.message}`)
              throw error
            })
        }
        
        // Handle sync functions
        const duration = Date.now() - startTime
        console.log(`[TRACE] ${name} - ${duration}ms - SUCCESS`)
        return result
      } catch (error) {
        const duration = Date.now() - startTime
        console.log(`[TRACE] ${name} - ${duration}ms - ERROR: ${(error as Error).message}`)
        throw error
      }
    }) as T
  }

  // Get current trace context
  getCurrentContext() {
    return null // Simplified - no context tracking
  }

  // Add attributes to current span
  addToCurrentSpan(attributes: Record<string, string | number | boolean>) {
    // Simplified - no span tracking
    console.log('[ATTRIBUTES]', attributes)
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// Middleware for request monitoring
export function monitorRequest(request: NextRequest) {
  const url = new URL(request.url)
  const operationName = `${request.method} ${url.pathname}`
  
  return performanceMonitor.startApiSpan(operationName, request)
}

// Helper for monitoring external API calls
export function monitorExternalApi(service: string, operation: string, url?: string) {
  return performanceMonitor.startExternalApiSpan(service, operation, url)
}

// Helper for monitoring cache operations
export function monitorCache(operation: 'get' | 'set' | 'delete', key: string) {
  return performanceMonitor.startCacheSpan(operation, key)
}

// Simplified exports
export const tracer = null
export const meter = null