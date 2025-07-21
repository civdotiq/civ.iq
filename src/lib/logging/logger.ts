/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import * as winston from 'winston'
import { NextRequest } from 'next/server'

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Define colors for each level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
}

winston.addColors(logColors)

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info
    
    let logMessage = `${timestamp} [${level}]: ${message}`
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += ` | ${JSON.stringify(meta, null, 2)}`
    }
    
    return logMessage
  })
)

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'civic-intel-hub',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '0.1.0'
  },
  transports: [
    // Console transport only (Edge Runtime compatible)
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' 
        ? winston.format.json() 
        : structuredFormat
    })
  ],
})

// Edge Runtime compatible logger (no file system operations)

// Interface for structured log metadata
export interface LogMetadata {
  requestId?: string
  userId?: string
  apiKey?: string
  endpoint?: string
  method?: string
  statusCode?: number
  responseTime?: number
  userAgent?: string
  ip?: string
  error?: Error | string
  [key: string]: unknown
}

// Enhanced logger class with request context
export class StructuredLogger {
  private static instance: StructuredLogger
  private logger: winston.Logger

  private constructor() {
    this.logger = logger
  }

  public static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger()
    }
    return StructuredLogger.instance
  }

  // Extract request metadata
  private extractRequestMetadata(request?: NextRequest): Partial<LogMetadata> {
    if (!request) return {}

    const url = new URL(request.url)
    
    return {
      endpoint: url.pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 
          request.headers.get('x-real-ip') || 
          'unknown'
    }
  }

  // Log info level
  info(message: string, metadata?: LogMetadata, request?: NextRequest): void {
    const requestMeta = this.extractRequestMetadata(request)
    this.logger.info(message, { ...requestMeta, ...metadata })
  }

  // Log warn level
  warn(message: string, metadata?: LogMetadata, request?: NextRequest): void {
    const requestMeta = this.extractRequestMetadata(request)
    this.logger.warn(message, { ...requestMeta, ...metadata })
  }

  // Log error level
  error(message: string, error?: Error | string, metadata?: LogMetadata, request?: NextRequest): void {
    const requestMeta = this.extractRequestMetadata(request)
    const errorMeta = error instanceof Error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    } : error ? { error } : {}

    this.logger.error(message, { 
      ...requestMeta, 
      ...errorMeta, 
      ...metadata 
    })
  }

  // Log debug level
  debug(message: string, metadata?: LogMetadata, request?: NextRequest): void {
    const requestMeta = this.extractRequestMetadata(request)
    this.logger.debug(message, { ...requestMeta, ...metadata })
  }

  // Log HTTP requests
  http(message: string, metadata?: LogMetadata, request?: NextRequest): void {
    const requestMeta = this.extractRequestMetadata(request)
    this.logger.http(message, { ...requestMeta, ...metadata })
  }

  // Log API performance
  performance(
    operation: string, 
    duration: number, 
    metadata?: LogMetadata, 
    request?: NextRequest
  ): void {
    const requestMeta = this.extractRequestMetadata(request)
    this.logger.info(`Performance: ${operation}`, {
      ...requestMeta,
      ...metadata,
      operation,
      duration,
      performanceType: 'api'
    })
  }

  // Log cache operations
  cache(
    operation: 'hit' | 'miss' | 'set' | 'delete' | 'error',
    key: string,
    metadata?: LogMetadata
  ): void {
    this.logger.debug(`Cache ${operation}`, {
      ...metadata,
      cacheKey: key,
      cacheOperation: operation
    })
  }

  // Log external API calls
  externalApi(
    service: string,
    operation: string,
    duration: number,
    success: boolean,
    metadata?: LogMetadata
  ): void {
    const level = success ? 'info' : 'warn'
    this.logger[level](`External API: ${service} ${operation}`, {
      ...metadata,
      service,
      operation,
      duration,
      success,
      apiType: 'external'
    })
  }

  // Log security events
  security(
    event: 'auth_success' | 'auth_failure' | 'rate_limit' | 'invalid_input' | 'access_denied',
    metadata?: LogMetadata,
    request?: NextRequest
  ): void {
    const requestMeta = this.extractRequestMetadata(request)
    const level = event.includes('failure') || event.includes('denied') || event.includes('limit') ? 'warn' : 'info'
    
    this.logger[level](`Security: ${event}`, {
      ...requestMeta,
      ...metadata,
      securityEvent: event
    })
  }
}

// Export singleton instance
export const structuredLogger = StructuredLogger.getInstance()

// Middleware for request logging
export function logRequest(request: NextRequest, startTime: number): void {
  structuredLogger.http('Incoming request', {
    timestamp: new Date().toISOString(),
    startTime
  }, request)
}

export function logResponse(
  request: NextRequest,
  statusCode: number,
  startTime: number,
  metadata?: LogMetadata
): void {
  const duration = Date.now() - startTime
  
  structuredLogger.http('Request completed', {
    statusCode,
    responseTime: duration,
    ...metadata
  }, request)

  // Also log performance
  structuredLogger.performance('API Request', duration, {
    statusCode,
    ...metadata
  }, request)
}

// Helper to create request-scoped logger
export function createRequestLogger(request: NextRequest, requestId: string) {
  return {
    info: (message: string, metadata?: LogMetadata) => 
      structuredLogger.info(message, { ...metadata, requestId }, request),
    warn: (message: string, metadata?: LogMetadata) => 
      structuredLogger.warn(message, { ...metadata, requestId }, request),
    error: (message: string, error?: Error | string, metadata?: LogMetadata) => 
      structuredLogger.error(message, error, { ...metadata, requestId }, request),
    debug: (message: string, metadata?: LogMetadata) => 
      structuredLogger.debug(message, { ...metadata, requestId }, request)
  }
}

export default structuredLogger