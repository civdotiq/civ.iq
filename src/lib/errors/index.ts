/**
 * Unified Error Handling Exports
 *
 * This file consolidates error handling utilities from multiple modules.
 * Import from here instead of individual files for cleaner imports.
 *
 * Two error systems exist:
 * 1. API Error System (ApiError) - For server-side API routes
 * 2. Client Error System (CiviqError) - For client-side with user-friendly messages
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// ====================
// CLIENT ERROR SYSTEM
// User-friendly errors with messages, help text, and suggested actions
// ====================
export {
  // Base types and class
  type CiviqErrorDetails,
  CiviqError,

  // Network errors
  NetworkError,
  TimeoutError,
  RateLimitError,

  // Data errors
  DataError,
  RepresentativeNotFoundError,
  InvalidZipCodeError,
  InvalidAddressError,
  DataSourceError,

  // Validation and server errors
  ValidationError,
  ServerError,

  // API-specific errors
  CongressApiError,
  CensusApiError,
  FecApiError,

  // Permission errors
  PermissionError,

  // Utility functions
  createErrorFromResponse,
  createErrorFromException,
} from './ErrorTypes';

export {
  // Enhanced fetch utilities
  safeFetch,
  safeJsonParse,

  // API error handlers
  ApiErrorHandlers,

  // Validation
  ValidationErrorHandler,

  // Rate limiting
  RateLimitHandler,

  // Retry logic
  RetryHandler,

  // Analytics
  ErrorAnalytics,
} from './ErrorHandlers';

// ====================
// API ERROR SYSTEM
// Server-side errors for API routes with status codes
// ====================
export {
  // Context type
  type ErrorContext,

  // API error classes
  ApiError,
  ValidationError as ApiValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError as ApiRateLimitError,
  ExternalApiError,

  // Response types
  type FallbackData,
  type ErrorResponse,

  // Main error handler
  ErrorHandler,

  // Wrapper functions
  withErrorHandling,
  withRetry,

  // Circuit breaker
  CircuitBreaker,

  // Health checking
  type ServiceHealth,
  HealthChecker,
  healthChecker,
} from '../error-handling/error-handler';
