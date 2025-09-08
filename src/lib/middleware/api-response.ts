/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextResponse } from 'next/server';

export type DataQuality = 'high' | 'medium' | 'low' | 'unavailable';

export type ValidationStatus = 'excellent' | 'good' | 'fair' | 'poor';

export interface ApiMetadata {
  timestamp: string;
  dataQuality: DataQuality;
  dataSource: string;
  cacheable: boolean;
  freshness?: string;
  validationScore?: number;
  validationStatus?: ValidationStatus;
  requestId?: string;
  processingTime?: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata: ApiMetadata;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ListResponse<T = unknown> extends ApiResponse<T[]> {
  count: number;
}

export type SingleResponse<T = unknown> = ApiResponse<T>;

export type HealthResponse = ApiResponse<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, 'up' | 'down' | 'degraded'>;
  timestamp: string;
}>;

export interface ErrorResponse extends ApiResponse<never> {
  success: false;
  error: ApiError;
}

export class ApiResponseBuilder<T = unknown> {
  private response: Partial<ApiResponse<T>> = {
    success: false,
    metadata: {
      timestamp: new Date().toISOString(),
      dataQuality: 'unavailable',
      dataSource: 'unknown',
      cacheable: false,
    },
  };

  private startTime: number;
  private requestId?: string;

  constructor(requestId?: string) {
    this.startTime = Date.now();
    this.requestId = requestId;
    if (requestId) {
      this.response.metadata!.requestId = requestId;
    }
  }

  success(data: T): ApiResponseBuilder<T> {
    this.response.success = true;
    this.response.data = data;
    return this;
  }

  error(code: string, message: string, details?: unknown): ApiResponseBuilder<T> {
    this.response.success = false;
    this.response.error = { code, message, details };
    delete this.response.data;
    return this;
  }

  quality(level: DataQuality): ApiResponseBuilder<T> {
    this.response.metadata!.dataQuality = level;
    return this;
  }

  source(dataSource: string): ApiResponseBuilder<T> {
    this.response.metadata!.dataSource = dataSource;
    return this;
  }

  cacheable(enabled: boolean = true): ApiResponseBuilder<T> {
    this.response.metadata!.cacheable = enabled;
    return this;
  }

  validation(score: number, status: ValidationStatus): ApiResponseBuilder<T> {
    this.response.metadata!.validationScore = score;
    this.response.metadata!.validationStatus = status;
    return this;
  }

  freshness(description: string): ApiResponseBuilder<T> {
    this.response.metadata!.freshness = description;
    return this;
  }

  build(): ApiResponse<T> {
    const processingTime = Date.now() - this.startTime;
    this.response.metadata!.processingTime = processingTime;

    if (!this.response.metadata!.freshness) {
      this.response.metadata!.freshness = `Retrieved in ${processingTime}ms`;
    }

    return this.response as ApiResponse<T>;
  }

  toNextResponse(statusCode?: number): NextResponse {
    const response = this.build();
    const status =
      statusCode || (response.success ? 200 : this.getErrorStatusCode(response.error?.code));
    return NextResponse.json(response, { status });
  }

  private getErrorStatusCode(errorCode?: string): number {
    if (!errorCode) return 500;

    const statusMap: Record<string, number> = {
      MISSING_PARAMETERS: 400,
      INVALID_ZIP_CODE: 400,
      INVALID_BIOGUIDE_ID: 400,
      INVALID_BILL_ID: 400,
      INVALID_COMMITTEE_ID: 400,
      DISTRICT_NOT_FOUND: 404,
      REPRESENTATIVE_NOT_FOUND: 404,
      BILL_NOT_FOUND: 404,
      COMMITTEE_NOT_FOUND: 404,
      NO_REPRESENTATIVES_FOUND: 404,
      NO_BILLS_FOUND: 404,
      NO_COMMITTEES_FOUND: 404,
      SERVICE_TEMPORARILY_UNAVAILABLE: 503,
      SERVICE_TIMEOUT: 503,
      REPRESENTATIVES_DATA_UNAVAILABLE: 503,
      BILLS_DATA_UNAVAILABLE: 503,
      FINANCE_DATA_UNAVAILABLE: 503,
      NEWS_DATA_UNAVAILABLE: 503,
      CONFIGURATION_ERROR: 500,
      UNKNOWN_ERROR: 500,
      INTERNAL_ERROR: 500,
    };

    return statusMap[errorCode] || 500;
  }
}

export function createSuccessResponse<T>(
  data: T,
  source: string,
  quality: DataQuality = 'high',
  requestId?: string
): ApiResponse<T> {
  return new ApiResponseBuilder<T>(requestId)
    .success(data)
    .source(source)
    .quality(quality)
    .cacheable(true)
    .build();
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown,
  source: string = 'error',
  requestId?: string
): ErrorResponse {
  return new ApiResponseBuilder<never>(requestId)
    .error(code, message, details)
    .source(source)
    .quality('unavailable')
    .build() as ErrorResponse;
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginatedResponse<T>['pagination'],
  source: string,
  quality: DataQuality = 'high',
  requestId?: string
): PaginatedResponse<T> {
  const response = createSuccessResponse(data, source, quality, requestId) as PaginatedResponse<T>;
  response.pagination = pagination;
  return response;
}

export function createListResponse<T>(
  data: T[],
  source: string,
  quality: DataQuality = 'high',
  requestId?: string
): ListResponse<T> {
  const response = createSuccessResponse(data, source, quality, requestId) as ListResponse<T>;
  response.count = data.length;
  return response;
}

export function createHealthResponse(
  status: 'healthy' | 'degraded' | 'unhealthy',
  services: Record<string, 'up' | 'down' | 'degraded'>,
  requestId?: string
): HealthResponse {
  return createSuccessResponse(
    {
      status,
      services,
      timestamp: new Date().toISOString(),
    },
    'health-check',
    'high',
    requestId
  ) as HealthResponse;
}

export interface CircuitBreakerError extends Error {
  serviceName: string;
  isCircuitBreakerOpen: boolean;
}

export interface TimeoutError extends Error {
  timeout: number;
}

export interface ValidationError extends Error {
  field: string;
  value: unknown;
}

export function handleApiError(
  error: unknown,
  fallbackMessage: string = 'An unexpected error occurred',
  source: string = 'error',
  requestId?: string
): ErrorResponse {
  if (error instanceof Error) {
    if ('isCircuitBreakerOpen' in error && error.isCircuitBreakerOpen) {
      return createErrorResponse(
        'SERVICE_TEMPORARILY_UNAVAILABLE',
        'Government data services are temporarily unavailable due to multiple failures',
        { serviceName: (error as CircuitBreakerError).serviceName },
        source,
        requestId
      );
    }

    if ('timeout' in error) {
      return createErrorResponse(
        'SERVICE_TIMEOUT',
        'Government data services are responding slowly. Please try again.',
        { timeout: (error as TimeoutError).timeout },
        source,
        requestId
      );
    }

    if ('field' in error) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        `Invalid ${(error as ValidationError).field}: ${error.message}`,
        {
          field: (error as ValidationError).field,
          value: (error as ValidationError).value,
        },
        source,
        requestId
      );
    }

    if (error.message.includes('API key')) {
      return createErrorResponse(
        'CONFIGURATION_ERROR',
        'Service configuration issue. Please contact support.',
        undefined,
        source,
        requestId
      );
    }

    return createErrorResponse('UNKNOWN_ERROR', error.message, error.stack, source, requestId);
  }

  return createErrorResponse('INTERNAL_ERROR', fallbackMessage, error, source, requestId);
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function extractRequestId(headers: Headers): string | undefined {
  return headers.get('x-request-id') || undefined;
}

export async function withErrorHandler<T>(
  operation: () => Promise<T>,
  fallbackMessage: string,
  source: string,
  requestId?: string
): Promise<ApiResponse<T> | ErrorResponse> {
  try {
    const result = await operation();
    return createSuccessResponse(result, source, 'high', requestId);
  } catch (error) {
    return handleApiError(error, fallbackMessage, source, requestId);
  }
}

export function transformLegacyResponse<T>(
  legacyResponse: T,
  source: string,
  requestId?: string
): ApiResponse<T> {
  if (typeof legacyResponse === 'object' && legacyResponse !== null) {
    const obj = legacyResponse as Record<string, unknown>;

    if ('success' in obj && 'metadata' in obj) {
      return legacyResponse as unknown as ApiResponse<T>;
    }

    if ('error' in obj) {
      return createErrorResponse(
        'LEGACY_ERROR',
        (obj.error as string) || 'Legacy API error',
        obj,
        source,
        requestId
      ) as ApiResponse<T>;
    }
  }

  return createSuccessResponse(legacyResponse, source, 'high', requestId);
}

export const ApiResponseTransformer = {
  success: createSuccessResponse,
  error: createErrorResponse,
  paginated: createPaginatedResponse,
  list: createListResponse,
  health: createHealthResponse,
  handleError: handleApiError,
  transform: transformLegacyResponse,
  withErrorHandler,
  builder: (requestId?: string) => new ApiResponseBuilder(requestId),
};
