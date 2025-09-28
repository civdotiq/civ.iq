/**
 * Base service interfaces for Phase 3 architecture
 */

export interface ServiceResult<T> {
  data: T | null;
  success: boolean;
  error?: ServiceError;
  metadata: {
    timestamp: string;
    processingTimeMs: number;
    cacheHit: boolean;
    dataSource: string;
  };
}

export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
}

export interface CacheOptions {
  ttl?: number; // seconds
  key?: string;
  tags?: string[];
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  cache?: CacheOptions;
}
