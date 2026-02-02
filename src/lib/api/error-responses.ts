/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Standardized API Error Response Utilities
 *
 * This module provides consistent error response patterns across all API routes.
 * It follows the same structure as the route-wrapper.ts but provides simpler
 * factory functions for common error cases.
 */

import { NextResponse } from 'next/server';

/**
 * Error codes used across the API
 */
export const ErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  BAD_REQUEST: 'BAD_REQUEST',
  NO_DATA: 'NO_DATA',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Standard error response structure
 */
export interface ApiError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: string;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Factory functions for creating standardized error responses
 */
export const ApiErrors = {
  /**
   * Resource not found (404)
   */
  notFound: (resource: string, id?: string): NextResponse<ApiError> => {
    const message = id ? `${resource} '${id}' not found` : `${resource} not found`;
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message,
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 404 }
    );
  },

  /**
   * Validation error (400)
   */
  validation: (message: string, details?: string): NextResponse<ApiError> => {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message,
          details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 400 }
    );
  },

  /**
   * Bad request (400) - generic client error
   */
  badRequest: (message: string): NextResponse<ApiError> => {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.BAD_REQUEST,
          message,
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 400 }
    );
  },

  /**
   * Internal server error (500)
   */
  serverError: (error?: Error, includeDetails = false): NextResponse<ApiError> => {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'An internal error occurred',
          details:
            includeDetails && error && process.env.NODE_ENV === 'development'
              ? error.message
              : undefined,
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  },

  /**
   * Service unavailable (503)
   */
  serviceUnavailable: (service: string): NextResponse<ApiError> => {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.SERVICE_UNAVAILABLE,
          message: `${service} is temporarily unavailable`,
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 503 }
    );
  },

  /**
   * Rate limited (429)
   */
  rateLimited: (retryAfter?: number): NextResponse<ApiError> => {
    const headers: HeadersInit = {};
    if (retryAfter) {
      headers['Retry-After'] = String(retryAfter);
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.RATE_LIMITED,
          message: 'Too many requests. Please try again later.',
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 429, headers }
    );
  },

  /**
   * No data available - returns 200 with empty data
   * Used when the resource exists but has no data (e.g., no FEC mapping)
   */
  noData: <T>(emptyData: T, metadata?: Record<string, unknown>): NextResponse => {
    return NextResponse.json({
      ...emptyData,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        dataAvailable: false,
      },
    });
  },
} as const;

/**
 * Helper to create a custom error response with any status code
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  details?: string
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

/**
 * Type guard to check if a value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}
