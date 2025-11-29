/**
 * API Route Middleware Utilities
 *
 * Provides reusable middleware functions for API route handlers.
 * Reduces code duplication across 90+ API routes.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

/**
 * API key configuration for different external services.
 */
export type ApiKeyType = 'congress' | 'fec' | 'newsapi' | 'openstates';

interface ApiKeyConfig {
  envVar: string;
  name: string;
  required: boolean;
}

const API_KEY_CONFIG: Record<ApiKeyType, ApiKeyConfig> = {
  congress: {
    envVar: 'CONGRESS_API_KEY',
    name: 'Congress.gov API',
    required: true,
  },
  fec: {
    envVar: 'FEC_API_KEY',
    name: 'FEC API',
    required: false, // FEC has a default demo key
  },
  newsapi: {
    envVar: 'NEWS_API_KEY',
    name: 'NewsAPI',
    required: false,
  },
  openstates: {
    envVar: 'OPENSTATES_API_KEY',
    name: 'OpenStates API',
    required: true,
  },
};

/**
 * Result of API key validation.
 */
export interface ApiKeyValidationResult {
  valid: boolean;
  key?: string;
  error?: NextResponse;
}

/**
 * Validate that an API key is configured.
 *
 * @param keyType - The type of API key to validate
 * @returns Validation result with key value or error response
 *
 * @example
 * ```typescript
 * export async function GET() {
 *   const apiKeyResult = validateApiKey('congress');
 *   if (!apiKeyResult.valid) {
 *     return apiKeyResult.error;
 *   }
 *   // Use apiKeyResult.key for API calls
 * }
 * ```
 */
export function validateApiKey(keyType: ApiKeyType): ApiKeyValidationResult {
  const config = API_KEY_CONFIG[keyType];
  const key = process.env[config.envVar];

  if (!key && config.required) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'API_KEY_MISSING',
            message: `${config.name} key is not configured`,
          },
        },
        { status: 500 }
      ),
    };
  }

  return {
    valid: true,
    key: key || undefined,
  };
}

/**
 * Validate multiple API keys at once.
 *
 * @param keyTypes - Array of API key types to validate
 * @returns Object with validation results keyed by type
 */
export function validateApiKeys(
  keyTypes: ApiKeyType[]
): Record<ApiKeyType, ApiKeyValidationResult> {
  const results: Partial<Record<ApiKeyType, ApiKeyValidationResult>> = {};

  for (const keyType of keyTypes) {
    results[keyType] = validateApiKey(keyType);
  }

  return results as Record<ApiKeyType, ApiKeyValidationResult>;
}

/**
 * Check if Congress.gov API key is available.
 * Convenience function for the most common use case.
 */
export function requireCongressApiKey(): ApiKeyValidationResult {
  return validateApiKey('congress');
}

/**
 * Get Congress.gov API key or throw error response.
 * Use this when you need the key value directly.
 *
 * @returns The API key string
 * @throws NextResponse if key is not configured
 *
 * @example
 * ```typescript
 * export async function GET() {
 *   const congressKey = getCongressApiKeyOrError();
 *   if (congressKey instanceof NextResponse) {
 *     return congressKey;
 *   }
 *   // congressKey is the string value
 * }
 * ```
 */
export function getCongressApiKeyOrError(): string | NextResponse {
  const result = validateApiKey('congress');
  if (!result.valid) {
    return result.error!;
  }
  return result.key!;
}

/**
 * Build Congress.gov API URL with key.
 *
 * @param path - API path (e.g., '/v3/bill/119')
 * @param params - Additional query parameters
 * @returns Full URL with API key
 */
export function buildCongressApiUrl(
  path: string,
  params?: Record<string, string>
): string | NextResponse {
  const keyResult = validateApiKey('congress');
  if (!keyResult.valid) {
    return keyResult.error!;
  }

  const baseUrl = 'https://api.congress.gov';
  const url = new URL(path, baseUrl);
  url.searchParams.set('api_key', keyResult.key!);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

/**
 * Standard headers for Congress.gov API requests.
 */
export const CONGRESS_API_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
} as const;

/**
 * Create fetch options for Congress.gov API with standard headers.
 */
export function createCongressFetchOptions(
  additionalHeaders?: Record<string, string>
): RequestInit {
  return {
    headers: {
      ...CONGRESS_API_HEADERS,
      ...additionalHeaders,
    },
  };
}

/**
 * Result of a settled promise with error tracking.
 */
export interface SettledResult<T> {
  status: 'fulfilled' | 'rejected';
  value?: T;
  error?: Error;
  index: number;
}

/**
 * Execute promises in parallel with individual error handling.
 * Unlike Promise.all, this won't fail if one promise rejects.
 * Unlike Promise.allSettled, this provides typed results and index tracking.
 *
 * @param promises - Array of promises to execute
 * @param options - Optional configuration
 * @returns Array of settled results with status, value/error, and original index
 *
 * @example
 * ```typescript
 * const results = await safePromiseAll([
 *   fetch('/api/bills'),
 *   fetch('/api/votes'),
 *   fetch('/api/finance'),
 * ]);
 *
 * const successful = results.filter(r => r.status === 'fulfilled');
 * const failed = results.filter(r => r.status === 'rejected');
 * ```
 */
export async function safePromiseAll<T>(
  promises: Promise<T>[],
  options?: {
    /** Log errors to console (default: false) */
    logErrors?: boolean;
    /** Context string for error logging */
    context?: string;
  }
): Promise<SettledResult<T>[]> {
  const { logErrors = false, context = 'safePromiseAll' } = options || {};

  const wrappedPromises = promises.map(async (promise, index) => {
    try {
      const value = await promise;
      return { status: 'fulfilled' as const, value, index };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (logErrors) {
        logger.error(`[${context}] Promise ${index} failed`, { error: error.message });
      }
      return { status: 'rejected' as const, error, index };
    }
  });

  return Promise.all(wrappedPromises);
}

/**
 * Execute promises in parallel and return only successful results.
 * Failed promises are silently ignored (useful for optional enrichment).
 *
 * @param promises - Array of promises to execute
 * @returns Array of successful values only
 *
 * @example
 * ```typescript
 * const enrichedData = await promiseAllSuccessful([
 *   enrichBill(bill1),
 *   enrichBill(bill2),
 *   enrichBill(bill3), // If this fails, others still return
 * ]);
 * ```
 */
export async function promiseAllSuccessful<T>(promises: Promise<T>[]): Promise<T[]> {
  const results = await safePromiseAll(promises);
  return results
    .filter((r): r is SettledResult<T> & { value: T } => r.status === 'fulfilled')
    .map(r => r.value);
}

/**
 * Execute promises in batches to avoid rate limits.
 *
 * @param items - Array of items to process
 * @param processFn - Async function to process each item
 * @param options - Batch configuration
 * @returns Array of results (or errors for failed items)
 *
 * @example
 * ```typescript
 * const results = await batchPromises(
 *   votes,
 *   vote => enrichVote(vote),
 *   { batchSize: 5, delayMs: 100 }
 * );
 * ```
 */
export async function batchPromises<T, R>(
  items: T[],
  processFn: (item: T, index: number) => Promise<R>,
  options?: {
    /** Number of items per batch (default: 5) */
    batchSize?: number;
    /** Delay between batches in ms (default: 100) */
    delayMs?: number;
    /** Continue on individual errors (default: true) */
    continueOnError?: boolean;
  }
): Promise<SettledResult<R>[]> {
  const { batchSize = 5, delayMs = 100, continueOnError = true } = options || {};
  const results: SettledResult<R>[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map((item, batchIndex) => processFn(item, i + batchIndex));

    if (continueOnError) {
      const batchResults = await safePromiseAll(batchPromises);
      // Adjust indices to global position
      results.push(
        ...batchResults.map(r => ({
          ...r,
          index: i + r.index,
        }))
      );
    } else {
      const batchResults = await Promise.all(batchPromises);
      results.push(
        ...batchResults.map((value, idx) => ({
          status: 'fulfilled' as const,
          value,
          index: i + idx,
        }))
      );
    }

    // Delay between batches (except for the last batch)
    if (i + batchSize < items.length && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
