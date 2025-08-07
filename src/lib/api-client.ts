/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import toast from 'react-hot-toast';
import { structuredLogger } from '@/lib/logging/universal-logger';

interface ApiClientOptions {
  timeout?: number;
  retries?: number;
  showToast?: boolean;
}

interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  success: boolean;
}

class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number = 10000; // 10 seconds
  private defaultRetries: number = 3;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Generic API request method with error handling, timeouts, and retries
   */
  async request<T = unknown>(
    url: string,
    options: RequestInit & ApiClientOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      showToast = true,
      ...fetchOptions
    } = options;

    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;

    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(fullUrl, {
          ...fetchOptions,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Return successful response
        return {
          data,
          success: true,
        };
      } catch (error) {
        lastError = error as Error;

        // Log the attempt
        structuredLogger.warn('API request failed', {
          url: fullUrl,
          attempt: attempt + 1,
          maxRetries: retries + 1,
          error: lastError?.message || String(lastError),
        });

        // Don't retry on the last attempt
        if (attempt === retries) break;

        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Handle final error
    const errorMessage = this.getErrorMessage(lastError);
    const apiError = {
      code: this.getErrorCode(lastError),
      message: errorMessage,
      details: lastError?.message,
    };

    // Show user-friendly toast notification
    if (showToast) {
      if (lastError?.name === 'AbortError') {
        toast.error('Request timed out. Please try again.');
      } else if (
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('Failed to fetch')
      ) {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    }

    // Log the final error
    structuredLogger.error('API request failed after all retries', lastError, {
      url: fullUrl,
      totalAttempts: retries + 1,
    });

    return {
      error: apiError,
      success: false,
    };
  }

  /**
   * GET request
   */
  async get<T = unknown>(url: string, options: ApiClientOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    options: ApiClientOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    options: ApiClientOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(url: string, options: ApiClientOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  /**
   * Extract user-friendly error message
   */
  private getErrorMessage(error: Error | null): string {
    if (!error) return 'Unknown error occurred';

    if (error.name === 'AbortError') {
      return 'Request timeout';
    }

    if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
      return 'Network connection error';
    }

    if (error.message.includes('HTTP 404')) {
      return 'Resource not found';
    }

    if (error.message.includes('HTTP 500')) {
      return 'Server error';
    }

    if (error.message.includes('HTTP 429')) {
      return 'Too many requests. Please wait and try again.';
    }

    return error.message || 'Request failed';
  }

  /**
   * Extract error code for programmatic handling
   */
  private getErrorCode(error: Error | null): string {
    if (!error) return 'UNKNOWN_ERROR';

    if (error.name === 'AbortError') return 'TIMEOUT';
    if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch'))
      return 'NETWORK_ERROR';
    if (error.message.includes('HTTP 404')) return 'NOT_FOUND';
    if (error.message.includes('HTTP 500')) return 'SERVER_ERROR';
    if (error.message.includes('HTTP 429')) return 'RATE_LIMITED';

    return 'REQUEST_FAILED';
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export for testing or custom instances
export { ApiClient };

// Export types
export type { ApiResponse, ApiClientOptions };
