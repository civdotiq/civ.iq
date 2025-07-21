/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Base error interface for all CIV.IQ errors
export interface CiviqErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  helpText?: string;
  suggestedActions?: string[];
  context?: Record<string, unknown>;
  retryable?: boolean;
  autoRetry?: boolean;
  showTimer?: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Base custom error class
export class CiviqError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly helpText?: string;
  public readonly suggestedActions: string[];
  public readonly context: Record<string, unknown>;
  public readonly retryable: boolean;
  public readonly autoRetry: boolean;
  public readonly showTimer: boolean;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly timestamp: Date;

  constructor(details: CiviqErrorDetails) {
    super(details.message);
    this.name = this.constructor.name;
    this.code = details.code;
    this.userMessage = details.userMessage;
    this.helpText = details.helpText;
    this.suggestedActions = details.suggestedActions || [];
    this.context = details.context || {};
    this.retryable = details.retryable ?? false;
    this.autoRetry = details.autoRetry ?? false;
    this.showTimer = details.showTimer ?? false;
    this.severity = details.severity;
    this.timestamp = new Date();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      helpText: this.helpText,
      suggestedActions: this.suggestedActions,
      context: this.context,
      retryable: this.retryable,
      autoRetry: this.autoRetry,
      showTimer: this.showTimer,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

// Network-related errors
export class NetworkError extends CiviqError {
  constructor(details: Partial<CiviqErrorDetails> & { message: string }) {
    super({
      code: 'NETWORK_ERROR',
      userMessage: 'Connection problem',
      helpText: 'Check your internet connection and try again',
      suggestedActions: ['Try Again', 'Check Connection'],
      retryable: true,
      autoRetry: true,
      severity: 'medium',
      ...details,
    });
  }
}

export class TimeoutError extends NetworkError {
  constructor(operation: string, timeout: number) {
    super({
      code: 'TIMEOUT_ERROR',
      message: `${operation} timed out after ${timeout}ms`,
      userMessage: 'Request timed out',
      helpText: 'Government servers are responding slowly right now',
      suggestedActions: ['Try Again', 'Wait and Retry'],
      context: { operation, timeout },
      autoRetry: true,
      severity: 'medium',
    });
  }
}

export class RateLimitError extends NetworkError {
  constructor(retryAfter: number) {
    const minutes = Math.ceil(retryAfter / 60);
    super({
      code: 'RATE_LIMITED',
      message: 'Rate limit exceeded',
      userMessage: 'Too many searches',
      helpText: `Please wait ${minutes} minute${minutes !== 1 ? 's' : ''} before searching again`,
      suggestedActions: ['Wait and Retry'],
      context: { retryAfter, minutes },
      showTimer: true,
      severity: 'low',
    });
  }
}

// Data-related errors
export class DataError extends CiviqError {
  constructor(details: Partial<CiviqErrorDetails> & { message: string }) {
    super({
      code: 'DATA_ERROR',
      userMessage: 'Data unavailable',
      helpText: 'The requested information could not be found',
      suggestedActions: ['Try Different Search'],
      severity: 'medium',
      ...details,
    });
  }
}

export class RepresentativeNotFoundError extends DataError {
  constructor(location: string) {
    super({
      code: 'REP_NOT_FOUND',
      message: `No representative found for ${location}`,
      userMessage: `No representative found for "${location}"`,
      helpText: 'This might be a new district or the ZIP code might be incorrect',
      suggestedActions: ['Try Different ZIP', 'Search by Address', 'Check ZIP Code'],
      context: { location },
      severity: 'medium',
    });
  }
}

export class InvalidZipCodeError extends DataError {
  constructor(zipCode: string) {
    super({
      code: 'INVALID_ZIP',
      message: `Invalid ZIP code: ${zipCode}`,
      userMessage: `"${zipCode}" isn't a valid ZIP code`,
      helpText: 'ZIP codes are 5 digits, like 48201 or 10001',
      suggestedActions: ['Try Again', 'Use 5 Digits'],
      context: { zipCode },
      severity: 'low',
    });
  }
}

export class InvalidAddressError extends DataError {
  constructor(address: string) {
    super({
      code: 'INVALID_ADDRESS',
      message: `Address not recognized: ${address}`,
      userMessage: 'Address not recognized',
      helpText:
        'Include street number, street name, city, and state. Example: "123 Main St, Detroit MI"',
      suggestedActions: ['Try Again', 'Use Full Address', 'Try ZIP Code'],
      context: { address },
      severity: 'low',
    });
  }
}

export class DataSourceError extends DataError {
  constructor(source: string, operation: string) {
    super({
      code: 'DATA_SOURCE_ERROR',
      message: `${source} is unavailable for ${operation}`,
      userMessage: `${source} is temporarily unavailable`,
      helpText: 'Government data sources sometimes go offline for maintenance',
      suggestedActions: ['Try Again Later', 'Use Cached Data'],
      context: { source, operation },
      retryable: true,
      severity: 'medium',
    });
  }
}

// Validation errors
export class ValidationError extends CiviqError {
  constructor(field: string, value: unknown, constraint: string) {
    super({
      code: 'VALIDATION_ERROR',
      message: `Validation failed for ${field}: ${constraint}`,
      userMessage: `Invalid ${field}`,
      helpText: constraint,
      suggestedActions: ['Fix Input', 'Try Again'],
      context: { field, value, constraint },
      severity: 'low',
    });
  }
}

// Server errors
export class ServerError extends CiviqError {
  constructor(status: number, statusText: string) {
    super({
      code: 'SERVER_ERROR',
      message: `Server error: ${status} ${statusText}`,
      userMessage: 'Server temporarily unavailable',
      helpText: 'Our servers are experiencing issues. This usually resolves quickly.',
      suggestedActions: ['Try Again', 'Report Problem'],
      context: { status, statusText },
      retryable: true,
      autoRetry: status >= 500, // Auto-retry server errors, not client errors
      severity: status >= 500 ? 'high' : 'medium',
    });
  }
}

// API-specific errors
export class CongressApiError extends DataError {
  constructor(operation: string, details?: string) {
    super({
      code: 'CONGRESS_API_ERROR',
      message: `Congress.gov API error during ${operation}`,
      userMessage: 'Congressional data temporarily unavailable',
      helpText:
        'The government data source is having issues. Voting records and bill information may be delayed.',
      suggestedActions: ['Try Again Later', 'Check Recent Votes'],
      context: { operation, details },
      retryable: true,
      severity: 'medium',
    });
  }
}

export class CensusApiError extends DataError {
  constructor(operation: string) {
    super({
      code: 'CENSUS_API_ERROR',
      message: `Census API error during ${operation}`,
      userMessage: 'District lookup unavailable',
      helpText:
        'The Census Bureau systems are temporarily down. District boundaries may not be accurate.',
      suggestedActions: ['Try ZIP Code', 'Try Again Later'],
      context: { operation },
      retryable: true,
      severity: 'medium',
    });
  }
}

export class FecApiError extends DataError {
  constructor(operation: string) {
    super({
      code: 'FEC_API_ERROR',
      message: `FEC API error during ${operation}`,
      userMessage: 'Campaign finance data unavailable',
      helpText:
        'Federal Election Commission data is temporarily unavailable. Financial information may be delayed.',
      suggestedActions: ['Try Again Later', 'Check Other Data'],
      context: { operation },
      retryable: true,
      severity: 'low',
    });
  }
}

// Permission and access errors
export class PermissionError extends CiviqError {
  constructor(resource: string, action: string) {
    super({
      code: 'PERMISSION_ERROR',
      message: `Access denied for ${action} on ${resource}`,
      userMessage: 'Access denied',
      helpText: "You don't have permission to access this information",
      suggestedActions: ['Go Back', 'Contact Support'],
      context: { resource, action },
      severity: 'medium',
    });
  }
}

// Utility function to create appropriate error from HTTP response
export function createErrorFromResponse(response: Response, operation: string): CiviqError {
  const status = response.status;
  const statusText = response.statusText;

  switch (status) {
    case 400:
      return new ValidationError('request', 'invalid', 'The request was malformed');
    case 401:
      return new PermissionError('data', 'access');
    case 403:
      return new PermissionError('resource', 'view');
    case 404:
      return new DataError({
        code: 'NOT_FOUND',
        message: `Resource not found: ${operation}`,
        userMessage: 'Information not found',
        helpText: "The requested data doesn't exist or has been moved",
        suggestedActions: ['Try Different Search', 'Go Back'],
        context: { operation, status },
        severity: 'medium',
      });
    case 429:
      // Try to extract retry-after header
      const retryAfter = parseInt(response.headers.get('retry-after') || '60');
      return new RateLimitError(retryAfter);
    case 500:
    case 502:
    case 503:
    case 504:
      return new ServerError(status, statusText);
    default:
      return new NetworkError({
        message: `HTTP ${status}: ${statusText}`,
        userMessage: 'Connection problem',
        context: { status, statusText, operation },
        severity: 'medium',
      });
  }
}

// Utility function to create error from JavaScript Error
export function createErrorFromException(
  error: Error,
  context?: Record<string, unknown>
): CiviqError {
  // If it's already a CiviqError, return as-is
  if (error instanceof CiviqError) {
    return error;
  }

  // Handle specific JavaScript error types
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return new NetworkError({
      message: error.message,
      userMessage: 'Network connection failed',
      helpText: 'Unable to connect to the server. Check your internet connection.',
      context: { originalError: error.message, ...context },
      severity: 'medium',
    });
  }

  if (error.name === 'AbortError') {
    const operation = typeof context?.operation === 'string' ? context.operation : 'Request';
    const timeout = typeof context?.timeout === 'number' ? context.timeout : 10000;
    return new TimeoutError(operation, timeout);
  }

  // Default fallback for unknown errors
  return new CiviqError({
    code: 'UNKNOWN_ERROR',
    message: error.message,
    userMessage: 'An unexpected error occurred',
    helpText: 'Please try again or contact support if the problem persists',
    suggestedActions: ['Try Again', 'Refresh Page', 'Report Problem'],
    context: { originalError: error.message, ...context },
    retryable: true,
    severity: 'medium',
  });
}
