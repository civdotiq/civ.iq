/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { structuredLogger } from '@/lib/logging/logger';
import { apiConfig } from '@/config';

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
  timeout?: number;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

export abstract class BaseService {
  protected readonly baseURL: string;
  protected readonly defaultHeaders: HeadersInit;
  protected readonly defaultTimeout: number;

  constructor(baseURL: string, defaultHeaders?: HeadersInit, defaultTimeout?: number) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      ...apiConfig.headers.default,
      ...defaultHeaders,
    };
    this.defaultTimeout = defaultTimeout || apiConfig.timeout;
  }

  /**
   * Main request method with error handling and logging
   */
  protected async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { params, timeout = this.defaultTimeout, ...fetchOptions } = options;

    // Build URL with query parameters
    const url = this.buildUrl(endpoint, params);

    // Merge headers
    const headers = {
      ...this.defaultHeaders,
      ...fetchOptions.headers,
    };

    // Create abort controller for timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    try {
      structuredLogger.debug('API Request', {
        url,
        method: fetchOptions.method || 'GET',
        headers: this.sanitizeHeaders(headers),
      });

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      const data = await this.parseResponse<T>(response);

      structuredLogger.debug('API Response', {
        url,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        throw this.createApiError(response, data);
      }

      return {
        data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error(`Request timeout: ${url}`);
        structuredLogger.error('Request timeout', timeoutError);
        throw this.createApiError(null, null, 'Request timeout', 408);
      }

      const apiError = error instanceof Error ? error : new Error('Unknown error');
      structuredLogger.error(`API Request failed: ${url}`, apiError);

      throw error;
    }
  }

  /**
   * Convenience methods for common HTTP verbs
   */
  protected async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const response = await this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
    return response.data;
  }

  protected async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const response = await this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.data;
  }

  protected async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const response = await this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.data;
  }

  protected async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const response = await this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.data;
  }

  protected async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const response = await this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
    return response.data;
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(`${this.baseURL}${endpoint}`, window.location.origin);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Parse response based on content type
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return response.json();
    }

    if (contentType?.includes('text/')) {
      return response.text() as unknown as T;
    }

    // Return blob for other content types
    return response.blob() as unknown as T;
  }

  /**
   * Create standardized API error
   */
  private createApiError(
    response: Response | null,
    data: unknown,
    message?: string,
    status?: number
  ): ApiError {
    const error: ApiError = {
      message: message || response?.statusText || 'Unknown error',
      status: status || response?.status,
    };

    // Try to extract error details from response data
    if (data && typeof data === 'object' && 'error' in data) {
      const errorData = data as { error: string | { message?: string; code?: string } };
      if (typeof errorData.error === 'string') {
        error.message = errorData.error;
      } else if (errorData.error.message) {
        error.message = errorData.error.message;
        error.code = errorData.error.code;
      }
    }

    error.details = data;

    return error;
  }

  /**
   * Remove sensitive headers from logs
   */
  private sanitizeHeaders(headers: HeadersInit): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    Object.entries(headers as Record<string, string>).forEach(([key, value]) => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Retry logic for failed requests using configuration
   */
  protected async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = apiConfig.retry.maxAttempts,
    retryDelay = apiConfig.retry.baseDelay
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = Math.min(
            retryDelay * Math.pow(apiConfig.retry.backoffMultiplier, attempt),
            apiConfig.retry.maxDelay
          );

          structuredLogger.warn('Retrying request', {
            attempt: attempt + 1,
            maxRetries,
            delay,
            error: lastError.message,
          });

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}
