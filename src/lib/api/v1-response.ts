/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * v1 Public API Response Helpers
 *
 * Consistent response envelope for the open /api/v1/ endpoints.
 */

interface V1Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface V1Meta {
  apiVersion: 'v1';
  timestamp: string;
  source: string;
  license: string;
  documentation: string;
  /**
   * Advisory notes about the request — currently unrecognized query
   * parameters that were ignored. Omitted entirely when there is nothing to
   * report, so the happy-path envelope is unchanged. See v1-params.ts.
   */
  warnings?: string[];
}

interface V1Response<T> {
  data: T;
  pagination?: V1Pagination;
  meta: V1Meta;
}

interface V1ErrorResponse {
  error: {
    code: number;
    message: string;
    details?: string;
  };
  meta: V1Meta;
}

function buildMeta(source: string): V1Meta {
  return {
    apiVersion: 'v1',
    timestamp: new Date().toISOString(),
    source,
    license: 'MIT',
    documentation: 'https://civdotiq.org/docs/api',
  };
}

export function v1Success<T>(
  data: T,
  source: string,
  pagination?: { total: number; limit: number; offset: number },
  warnings?: string[]
): V1Response<T> {
  const meta = buildMeta(source);
  if (warnings && warnings.length > 0) {
    meta.warnings = warnings;
  }

  const response: V1Response<T> = {
    data,
    meta,
  };

  if (pagination) {
    response.pagination = {
      ...pagination,
      hasMore: pagination.offset + pagination.limit < pagination.total,
    };
  }

  return response;
}

export function v1Error(code: number, message: string, details?: string): V1ErrorResponse {
  return {
    error: { code, message, details },
    meta: buildMeta('error'),
  };
}

export type { V1Response, V1ErrorResponse, V1Pagination, V1Meta };
