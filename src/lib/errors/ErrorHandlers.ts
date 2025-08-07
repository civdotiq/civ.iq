/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  CiviqError,
  NetworkError,
  TimeoutError,
  RateLimitError,
  RepresentativeNotFoundError,
  InvalidZipCodeError,
  InvalidAddressError,
  CongressApiError,
  CensusApiError,
  FecApiError,
  createErrorFromResponse,
  createErrorFromException,
} from './ErrorTypes';
import logger from '@/lib/logging/simple-logger';

// Enhanced fetch wrapper with automatic error handling
export async function safeFetch(
  url: string,
  options: RequestInit = {},
  context: { operation: string; timeout?: number } = { operation: 'API call' }
): Promise<Response> {
  const { operation, timeout = 10000 } = context;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw createErrorFromResponse(response, operation);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof CiviqError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new TimeoutError(operation, timeout);
      }
      throw createErrorFromException(error, { operation, url });
    }

    throw new NetworkError({
      message: `Unknown error during ${operation}`,
      context: { operation, url },
    });
  }
}

// Enhanced JSON parsing with error handling
export async function safeJsonParse<T>(response: Response, operation: string): Promise<T> {
  try {
    const text = await response.text();
    if (!text.trim()) {
      throw new CiviqError({
        code: 'EMPTY_RESPONSE',
        message: 'Empty response from server',
        userMessage: 'No data received',
        helpText: 'The server returned an empty response',
        suggestedActions: ['Try Again', 'Contact Support'],
        context: { operation },
        severity: 'medium',
      });
    }

    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof CiviqError) {
      throw error;
    }

    throw new CiviqError({
      code: 'INVALID_JSON',
      message: `Invalid JSON response during ${operation}`,
      userMessage: 'Invalid server response',
      helpText: 'The server returned malformed data',
      suggestedActions: ['Try Again', 'Report Problem'],
      context: { operation, error: error instanceof Error ? error.message : 'Unknown' },
      severity: 'medium',
    });
  }
}

// API-specific error handlers
export class ApiErrorHandlers {
  // Representatives API error handler
  static handleRepresentativesError(error: unknown, location: string): CiviqError {
    if (error instanceof CiviqError) {
      return error;
    }

    // Type guard for error objects
    const errorObj = error as { code?: string; message?: string };

    // Check for specific error codes from the API
    if (errorObj?.code === 'NO_REPRESENTATIVES_FOUND') {
      return new RepresentativeNotFoundError(location);
    }

    if (errorObj?.code === 'INVALID_ZIP_CODE') {
      return new InvalidZipCodeError(location);
    }

    if (errorObj?.code === 'INVALID_ADDRESS') {
      return new InvalidAddressError(location);
    }

    return createErrorFromException(error instanceof Error ? error : new Error(String(error)), {
      location,
      api: 'representatives',
    });
  }

  // Voting records API error handler
  static handleVotingRecordsError(error: unknown, bioguideId: string): CiviqError {
    if (error instanceof CiviqError) {
      return error;
    }

    // Type guard for error objects
    const errorObj = error as { message?: string };

    // Check for Congress.gov specific issues
    if (errorObj?.message?.includes('congress.gov')) {
      return new CongressApiError('voting records fetch', errorObj.message);
    }

    return createErrorFromException(error instanceof Error ? error : new Error(String(error)), {
      bioguideId,
      api: 'voting-records',
    });
  }

  // District mapping error handler
  static handleDistrictMappingError(error: unknown, input: string): CiviqError {
    if (error instanceof CiviqError) {
      return error;
    }

    // Type guard for error objects
    const errorObj = error as { message?: string };

    // Check for Census API specific issues
    if (errorObj?.message?.includes('census')) {
      return new CensusApiError('district mapping');
    }

    // ZIP code validation
    if (/^\d{5}$/.test(input)) {
      return new RepresentativeNotFoundError(input);
    } else {
      return new InvalidAddressError(input);
    }
  }

  // Campaign finance error handler
  static handleCampaignFinanceError(error: unknown, bioguideId: string): CiviqError {
    if (error instanceof CiviqError) {
      return error;
    }

    // Type guard for error objects
    const errorObj = error as { message?: string };

    // Check for FEC API specific issues
    if (errorObj?.message?.includes('fec')) {
      return new FecApiError('campaign finance data');
    }

    return createErrorFromException(error instanceof Error ? error : new Error(String(error)), {
      bioguideId,
      api: 'campaign-finance',
    });
  }
}

// Form validation error handler
export class ValidationErrorHandler {
  static validateZipCode(zipCode: string): void {
    if (!zipCode || typeof zipCode !== 'string') {
      throw new InvalidZipCodeError(zipCode || '');
    }

    const cleaned = zipCode.trim();
    if (!/^\d{5}$/.test(cleaned)) {
      throw new InvalidZipCodeError(cleaned);
    }
  }

  static validateAddress(address: string): void {
    if (!address || typeof address !== 'string') {
      throw new InvalidAddressError(address || '');
    }

    const cleaned = address.trim();
    if (cleaned.length < 5) {
      throw new InvalidAddressError(cleaned);
    }

    // Basic address validation - should contain numbers and letters
    if (!/\d/.test(cleaned) || !/[a-zA-Z]/.test(cleaned)) {
      throw new InvalidAddressError(cleaned);
    }
  }

  static validateBioguideId(bioguideId: string): void {
    if (!bioguideId || typeof bioguideId !== 'string') {
      throw new CiviqError({
        code: 'INVALID_BIOGUIDE_ID',
        message: 'Invalid bioguide ID',
        userMessage: 'Invalid representative ID',
        helpText: 'The representative identifier is not valid',
        suggestedActions: ['Go Back', 'Search Again'],
        context: { bioguideId },
        severity: 'medium',
      });
    }

    // Bioguide IDs should be alphanumeric, 5-10 characters
    if (!/^[A-Z]\d{6}$/.test(bioguideId.toUpperCase())) {
      throw new CiviqError({
        code: 'INVALID_BIOGUIDE_FORMAT',
        message: `Invalid bioguide ID format: ${bioguideId}`,
        userMessage: 'Invalid representative ID format',
        helpText: 'Representative IDs should be in format like "P000595"',
        suggestedActions: ['Go Back', 'Search Again'],
        context: { bioguideId },
        severity: 'medium',
      });
    }
  }
}

// Rate limiting handler
export class RateLimitHandler {
  private static requests: Map<string, number[]> = new Map();
  private static readonly WINDOW_MS = 60000; // 1 minute
  private static readonly MAX_REQUESTS = 60; // requests per minute

  static checkRateLimit(endpoint: string): void {
    const now = Date.now();
    const requests = this.requests.get(endpoint) || [];

    // Remove old requests outside the window
    const recentRequests = requests.filter(time => now - time < this.WINDOW_MS);

    if (recentRequests.length >= this.MAX_REQUESTS) {
      const oldestRequest = Math.min(...recentRequests);
      const retryAfter = Math.ceil((oldestRequest + this.WINDOW_MS - now) / 1000);
      throw new RateLimitError(retryAfter);
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(endpoint, recentRequests);
  }
}

// Retry logic with exponential backoff
export class RetryHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      baseDelay?: number;
      maxDelay?: number;
      shouldRetry?: (error: CiviqError) => boolean;
      context?: Record<string, unknown>;
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      shouldRetry = error => error.retryable,
      context = {},
    } = options;

    let lastError: CiviqError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const civiqError =
          error instanceof CiviqError
            ? error
            : createErrorFromException(error as Error, { attempt, ...context });

        lastError = civiqError;

        // Don't retry if it's the last attempt or if error is not retryable
        if (attempt === maxAttempts || !shouldRetry(civiqError)) {
          throw civiqError;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }

    throw lastError!;
  }
}

// Error analytics and monitoring
export class ErrorAnalytics {
  static reportError(error: CiviqError, context?: Record<string, unknown>): void {
    const report = {
      error: error.toJSON(),
      context,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      timestamp: new Date().toISOString(),
      sessionId:
        typeof sessionStorage !== 'undefined'
          ? sessionStorage.getItem('sessionId') || 'unknown'
          : 'server',
    };

    // In development, just log
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Error reported', { report });
      return;
    }

    // In production, send to monitoring service
    try {
      // Store locally as fallback
      if (typeof localStorage !== 'undefined') {
        const reports = JSON.parse(localStorage.getItem('errorAnalytics') || '[]');
        reports.push(report);
        localStorage.setItem('errorAnalytics', JSON.stringify(reports.slice(-100)));
      }

      // Send to monitoring service (implement based on your needs)
      // fetch('/api/analytics/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(report)
      // }).catch(err => logger.error('Failed to send error report', err));
    } catch (e) {
      logger.error('Failed to report error analytics', e instanceof Error ? e : String(e));
    }
  }

  static getErrorStats(): { errorCode: string; count: number; lastSeen: string }[] {
    if (typeof localStorage === 'undefined') return [];

    try {
      const reports = JSON.parse(localStorage.getItem('errorAnalytics') || '[]');
      const stats = new Map<string, { count: number; lastSeen: string }>();

      reports.forEach((report: { error?: { code?: string }; timestamp: string }) => {
        const code = report.error?.code || 'UNKNOWN';
        const current = stats.get(code) || { count: 0, lastSeen: report.timestamp };
        stats.set(code, {
          count: current.count + 1,
          lastSeen: report.timestamp > current.lastSeen ? report.timestamp : current.lastSeen,
        });
      });

      return Array.from(stats.entries())
        .map(([errorCode, data]) => ({
          errorCode,
          ...data,
        }))
        .sort((a, b) => b.count - a.count);
    } catch (e) {
      logger.error('Failed to get error stats', e instanceof Error ? e : String(e));
      return [];
    }
  }
}
