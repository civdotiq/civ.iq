/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GDELT Error Handling Utilities
 *
 * Implements Result/Either pattern for functional error handling
 * in GDELT API integration following civic-intel-hub patterns
 */

import { Success, Failure, GDELTError, GDELTErrorType } from '@/types/gdelt';

/**
 * Create a success result
 */
export function createSuccess<T>(data: T): Success<T> {
  return { data };
}

/**
 * Create a failure result
 */
export function createFailure<E = GDELTError>(error: E): Failure<E> {
  return { error };
}

/**
 * Create a GDELT-specific error
 */
export function createGDELTError(
  type: GDELTErrorType,
  message: string,
  statusCode?: number,
  details?: Record<string, unknown>
): GDELTError {
  return {
    type,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    details,
  };
}

/**
 * Transform a generic error into a GDELT error
 */
export function transformToGDELTError(error: unknown, context?: string): GDELTError {
  if (error instanceof Error) {
    const message = context ? `${context}: ${error.message}` : error.message;
    return createGDELTError(GDELTErrorType.NETWORK_ERROR, message);
  }

  const message = context ? `${context}: Unknown error` : 'An unknown error occurred';
  return createGDELTError(GDELTErrorType.NETWORK_ERROR, message);
}

/**
 * Check if a result is a success
 */
export function isSuccess<T, E>(result: { data?: T; error?: E }): result is Success<T> {
  return 'data' in result && result.data !== undefined;
}

/**
 * Check if a result is a failure
 */
export function isFailure<T, E>(result: { data?: T; error?: E }): result is Failure<E> {
  return 'error' in result && result.error !== undefined;
}
