/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: ApiError;
  readonly metadata: ResponseMetadata;
}

/**
 * API error structure
 */
export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
  readonly field?: string;
  readonly timestamp?: string;
}

/**
 * Response metadata for all API calls
 */
export interface ResponseMetadata {
  readonly timestamp: string;
  readonly apiVersion: string;
  readonly processingTime?: number;
  readonly dataQuality?: 'high' | 'medium' | 'low' | 'unavailable';
  readonly dataSource?: string;
  readonly cacheable?: boolean;
  readonly freshness?: string;
  readonly validationScore?: number;
  readonly validationStatus?: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * Pagination metadata
 */
export interface PaginationMetadata {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}

/**
 * Paginated API response
 */
export interface PaginatedApiResponse<T> extends ApiResponse<T> {
  readonly pagination: PaginationMetadata;
}

/**
 * Request options for API calls
 */
export interface RequestOptions extends RequestInit {
  readonly params?: Record<string, string | number | boolean>;
  readonly timeout?: number;
  readonly retries?: number;
  readonly cacheKey?: string;
  readonly cacheTtl?: number;
}

/**
 * Base service configuration
 */
export interface ServiceConfig {
  readonly baseURL: string;
  readonly timeout: number;
  readonly retries: number;
  readonly headers: Record<string, string>;
  readonly version: string;
}

/**
 * Circuit breaker status
 */
export interface CircuitBreakerStatus {
  readonly failures: number;
  readonly isOpen: boolean;
  readonly lastFailureTime: number;
  readonly successCount?: number;
  readonly totalRequests?: number;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly timestamp: string;
  readonly services: Record<string, ServiceHealthStatus>;
  readonly uptime?: number;
  readonly version?: string;
}

/**
 * Individual service health status
 */
export interface ServiceHealthStatus {
  readonly status: 'up' | 'down' | 'degraded';
  readonly responseTime?: number;
  readonly lastChecked: string;
  readonly error?: string;
  readonly details?: Record<string, unknown>;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  readonly ttl: number;
  readonly maxSize?: number;
  readonly strategy: 'write-through' | 'write-behind' | 'cache-aside';
  readonly compression?: boolean;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  readonly requestsPerMinute: number;
  readonly burstLimit: number;
  readonly windowMs: number;
  readonly skipSuccessfulRequests?: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult<T = unknown> {
  readonly isValid: boolean;
  readonly data?: T;
  readonly errors: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
}

/**
 * Search parameters base interface
 */
export interface SearchParams {
  readonly query?: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
  readonly filters?: Record<string, unknown>;
}

/**
 * Batch request base interface
 */
export interface BatchRequest<T> {
  readonly items: ReadonlyArray<T>;
  readonly options?: {
    readonly continueOnError?: boolean;
    readonly maxConcurrency?: number;
    readonly timeout?: number;
  };
}

/**
 * Batch response base interface
 */
export interface BatchResponse<T, E = ApiError> {
  readonly results: ReadonlyArray<{
    readonly success: boolean;
    readonly data?: T;
    readonly error?: E;
    readonly index: number;
  }>;
  readonly metadata: {
    readonly totalRequested: number;
    readonly successCount: number;
    readonly errorCount: number;
    readonly processingTime: number;
    readonly timestamp: string;
  };
}

/**
 * External API configuration
 */
export interface ExternalApiConfig {
  readonly baseURL: string;
  readonly apiKey?: string;
  readonly timeout: number;
  readonly version?: string;
  readonly rateLimit?: RateLimitConfig;
  readonly circuitBreaker?: {
    readonly threshold: number;
    readonly timeout: number;
    readonly resetTimeout: number;
  };
}

/**
 * Data quality metrics
 */
export interface DataQualityMetrics {
  readonly completeness: number; // 0-100
  readonly accuracy: number; // 0-100
  readonly consistency: number; // 0-100
  readonly timeliness: number; // 0-100
  readonly overall: number; // 0-100
  readonly issues: ReadonlyArray<string>;
  readonly lastUpdated: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  readonly responseTime: number;
  readonly throughput: number;
  readonly errorRate: number;
  readonly availability: number;
  readonly timestamp: string;
  readonly period: string; // e.g., '1h', '24h', '7d'
}
