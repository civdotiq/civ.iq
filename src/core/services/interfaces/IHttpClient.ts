/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * HTTP Client Interface
 *
 * Defines the contract for HTTP operations with connection pooling,
 * retry logic, and performance monitoring.
 */

export interface HttpOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  cache?: boolean;
  cacheTtl?: number;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  responseTime: number;
}

export interface HttpError extends Error {
  status?: number;
  response?: HttpResponse;
  code: string;
  isTimeout: boolean;
  isNetworkError: boolean;
}

export interface IHttpClient {
  /**
   * GET request
   */
  get<T = unknown>(url: string, options?: HttpOptions): Promise<HttpResponse<T>>;

  /**
   * POST request
   */
  post<T = unknown>(url: string, data?: unknown, options?: HttpOptions): Promise<HttpResponse<T>>;

  /**
   * PUT request
   */
  put<T = unknown>(url: string, data?: unknown, options?: HttpOptions): Promise<HttpResponse<T>>;

  /**
   * DELETE request
   */
  delete<T = unknown>(url: string, options?: HttpOptions): Promise<HttpResponse<T>>;

  /**
   * Set default headers for all requests
   */
  setDefaultHeaders(headers: Record<string, string>): void;

  /**
   * Get connection pool metrics
   */
  getMetrics(): {
    activeConnections: number;
    queuedRequests: number;
    totalRequests: number;
    averageResponseTime: number;
  };
}
