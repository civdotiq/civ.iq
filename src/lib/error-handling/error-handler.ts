/* eslint-disable no-console -- Error handler uses console for error logging */
/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';

export interface ErrorContext {
  endpoint: string;
  method: string;
  timestamp: string;
  userAgent?: string;
  ip?: string;
  apiKey?: string;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: ErrorContext;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: ErrorContext
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 400, true, context);
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 401, true, context);
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 403, true, context);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 404, true, context);
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 429, true, context);
  }
}

export class ExternalApiError extends ApiError {
  public readonly service: string;
  public readonly originalError?: Error;

  constructor(message: string, service: string, originalError?: Error, context?: ErrorContext) {
    super(message, 502, true, context);
    this.service = service;
    this.originalError = originalError;
  }
}

export interface FallbackData {
  source: 'cache' | 'mock' | 'partial';
  timestamp: string;
  note: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  endpoint: string;
  requestId?: string;
  fallback?: FallbackData;
}

export class ErrorHandler {
  private static requestIdCounter = 0;

  private static generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestIdCounter}`;
  }

  private static createErrorContext(request: NextRequest): ErrorContext {
    const url = new URL(request.url);

    return {
      endpoint: url.pathname,
      method: request.method,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || undefined,
      ip:
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'unknown',
    };
  }

  static logError(error: Error, context?: ErrorContext): void {
    const logData: Record<string, unknown> = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    };

    if (error instanceof ApiError) {
      logData.statusCode = error.statusCode;
      logData.isOperational = error.isOperational;

      if (error instanceof ExternalApiError) {
        logData.service = error.service;
        logData.originalError = error.originalError?.message;
      }
    }

    // In production, you'd send this to a logging service like Sentry
    if (process.env.NODE_ENV === 'production') {
      // Send to external logging service
      console.error('API Error:', JSON.stringify(logData, null, 2));
    } else {
      console.error('API Error:', logData);
    }
  }

  static createErrorResponse(
    error: Error,
    request: NextRequest,
    fallbackData?: unknown
  ): NextResponse {
    const context = this.createErrorContext(request);
    const requestId = this.generateRequestId();

    this.logError(error, context);

    let statusCode = 500;
    let message = 'Internal server error';

    if (error instanceof ApiError) {
      statusCode = error.statusCode;
      message = error.message;
    }

    const errorResponse: ErrorResponse = {
      error: error.name || 'Error',
      message,
      statusCode,
      timestamp: context.timestamp,
      endpoint: context.endpoint,
      requestId,
    };

    // Add fallback data if provided
    if (fallbackData) {
      errorResponse.fallback = {
        source: 'mock',
        timestamp: context.timestamp,
        note: 'Fallback data provided due to service unavailability',
      };

      // Type guard to check if fallbackData has metadata property
      const hasFallbackMetadata = (
        data: unknown
      ): data is { metadata?: Record<string, unknown> } => {
        return typeof data === 'object' && data !== null;
      };

      const existingMetadata = hasFallbackMetadata(fallbackData)
        ? fallbackData.metadata
        : undefined;

      // Return fallback data with error metadata
      return NextResponse.json(
        {
          ...fallbackData,
          metadata: {
            ...existingMetadata,
            error: errorResponse,
            dataSource: 'fallback',
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(errorResponse, { status: statusCode });
  }

  static handleExternalApiError(
    service: string,
    originalError: Error,
    request: NextRequest,
    fallbackData?: unknown
  ): NextResponse {
    const context = this.createErrorContext(request);
    const apiError = new ExternalApiError(
      `${service} API is currently unavailable`,
      service,
      originalError,
      context
    );

    return this.createErrorResponse(apiError, request, fallbackData);
  }
}

// Wrapper function for handling API routes with comprehensive error handling
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
  fallbackHandler?: (...args: T) => Promise<unknown>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      const request = args[0] as NextRequest;

      // Try fallback handler if available
      if (fallbackHandler) {
        try {
          const fallbackData = await fallbackHandler(...args);
          return ErrorHandler.createErrorResponse(error as Error, request, fallbackData);
        } catch (fallbackError) {
          ErrorHandler.logError(fallbackError as Error);
        }
      }

      return ErrorHandler.createErrorResponse(error as Error, request);
    }
  };
}

// Retry mechanism for external API calls
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    retryCondition?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = () => true,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries || !retryCondition(lastError)) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;

      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }

  throw lastError!;
}

// Circuit breaker pattern for external services
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly resetTimeout: number = 30000 // 30 seconds
  ) {}

  async call<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }
}

// Health check utilities
export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastChecked: string;
  error?: string;
}

export class HealthChecker {
  private services = new Map<string, ServiceHealth>();

  async checkService(
    serviceName: string,
    healthCheck: () => Promise<void>
  ): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      await healthCheck();
      const responseTime = Date.now() - startTime;

      const health: ServiceHealth = {
        service: serviceName,
        status: responseTime > 5000 ? 'degraded' : 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
      };

      this.services.set(serviceName, health);
      return health;
    } catch (error) {
      const health: ServiceHealth = {
        service: serviceName,
        status: 'unhealthy',
        lastChecked: new Date().toISOString(),
        error: (error as Error).message,
      };

      this.services.set(serviceName, health);
      return health;
    }
  }

  getAllHealth(): ServiceHealth[] {
    return Array.from(this.services.values());
  }

  getServiceHealth(serviceName: string): ServiceHealth | undefined {
    return this.services.get(serviceName);
  }
}

export const healthChecker = new HealthChecker();
