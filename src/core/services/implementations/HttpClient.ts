/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * HTTP Client Implementation
 *
 * High-performance HTTP client with connection pooling, retry logic,
 * and performance monitoring. Optimized for government API calls.
 */

import * as https from 'https';
import type { IHttpClient, HttpOptions, HttpResponse, HttpError } from '../interfaces/IHttpClient';

interface ConnectionPoolMetrics {
  activeConnections: number;
  queuedRequests: number;
  totalRequests: number;
  totalResponseTime: number;
}

export class HttpClient implements IHttpClient {
  private agent: https.Agent;
  private defaultHeaders: Record<string, string> = {};
  private metrics: ConnectionPoolMetrics = {
    activeConnections: 0,
    queuedRequests: 0,
    totalRequests: 0,
    totalResponseTime: 0,
  };

  constructor() {
    this.agent = new https.Agent({
      keepAlive: true,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 60000,
      scheduling: 'lifo',
    });
  }

  async get<T = unknown>(url: string, options?: HttpOptions): Promise<HttpResponse<T>> {
    return this.request<T>('GET', url, undefined, options);
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    options?: HttpOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('POST', url, data, options);
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    options?: HttpOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', url, data, options);
  }

  async delete<T = unknown>(url: string, options?: HttpOptions): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', url, undefined, options);
  }

  setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageResponseTime:
        this.metrics.totalRequests > 0
          ? this.metrics.totalResponseTime / this.metrics.totalRequests
          : 0,
    };
  }

  private async request<T = unknown>(
    method: string,
    url: string,
    data?: unknown,
    options: HttpOptions = {}
  ): Promise<HttpResponse<T>> {
    const startTime = Date.now();
    const retries = options.retries ?? 3;
    let lastError: HttpError | null = null;

    this.metrics.queuedRequests++;

    try {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const response = await this.executeRequest<T>(method, url, startTime, data, options);
          this.updateMetrics(startTime);
          return response;
        } catch (error) {
          lastError = this.createHttpError(error, url);

          // Don't retry on 4xx errors (client errors)
          if (lastError.status && lastError.status >= 400 && lastError.status < 500) {
            break;
          }

          if (attempt < retries) {
            await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
          }
        }
      }

      throw lastError;
    } finally {
      this.metrics.queuedRequests--;
    }
  }

  private async executeRequest<T = unknown>(
    method: string,
    url: string,
    startTime: number,
    data?: unknown,
    options: HttpOptions = {}
  ): Promise<HttpResponse<T>> {
    return new Promise<HttpResponse<T>>((resolve, reject) => {
      const urlObj = new URL(url);
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method,
        agent: this.agent,
        timeout: options.timeout ?? 10000,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
          'Content-Type': 'application/json',
          'User-Agent': 'civic-intel-hub/1.0.0',
        } as Record<string, string>,
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        const postData = JSON.stringify(data);
        (requestOptions.headers as Record<string, string>)['Content-Length'] =
          Buffer.byteLength(postData).toString();
      }

      this.metrics.activeConnections++;

      const req = https.request(requestOptions, res => {
        let responseData = '';

        res.on('data', chunk => {
          responseData += chunk;
        });

        res.on('end', () => {
          const responseTime = Date.now() - startTime;

          try {
            const parsedData = responseData ? JSON.parse(responseData) : null;
            const response: HttpResponse<T> = {
              data: parsedData,
              status: res.statusCode || 0,
              statusText: res.statusMessage || '',
              headers: res.headers as Record<string, string>,
              responseTime,
            };

            if (res.statusCode && res.statusCode >= 400) {
              reject(this.createHttpError(response, url));
            } else {
              resolve(response);
            }
          } catch (error) {
            reject(this.createHttpError(error, url));
          } finally {
            this.metrics.activeConnections--;
          }
        });
      });

      req.on('error', error => {
        this.metrics.activeConnections--;
        reject(this.createHttpError(error, url));
      });

      req.on('timeout', () => {
        this.metrics.activeConnections--;
        req.destroy();
        reject(this.createHttpError(new Error('Request timeout'), url, true));
      });

      if (data && (method === 'POST' || method === 'PUT')) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  private createHttpError(error: unknown, url: string, isTimeout = false): HttpError {
    const httpError = new Error() as HttpError;

    if (typeof error === 'object' && error !== null) {
      if ('data' in error && 'status' in error) {
        // HTTP response error
        const response = error as HttpResponse;
        httpError.message = `HTTP ${response.status}: ${response.statusText}`;
        httpError.status = response.status;
        httpError.response = response;
        httpError.code = `HTTP_${response.status}`;
      } else if (error instanceof Error) {
        httpError.message = error.message;
        httpError.code = 'REQUEST_ERROR';
      }
    } else {
      httpError.message = 'Unknown error occurred';
      httpError.code = 'UNKNOWN_ERROR';
    }

    httpError.isTimeout = isTimeout;
    httpError.isNetworkError = !httpError.status;

    // Add context
    httpError.message += ` (URL: ${url})`;

    return httpError;
  }

  private updateMetrics(startTime: number): void {
    this.metrics.totalRequests++;
    this.metrics.totalResponseTime += Date.now() - startTime;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
