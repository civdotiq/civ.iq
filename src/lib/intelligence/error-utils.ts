/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Error classification utilities for intelligence API routes.
 * Separate from shared.ts to avoid importing AI dependencies in route files.
 */

import type { InsightError } from './types';

/** Classify a caught error into an InsightError. */
export function classifyError(error: unknown, source: string): InsightError {
  const timestamp = new Date().toISOString();
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes('timeout') || msg.includes('Timeout') || msg.includes('ETIMEDOUT')) {
    return { source, type: 'upstream_timeout', message: msg, timestamp };
  }
  if (/\b(429|500|502|503|504)\b/.test(msg)) {
    return { source, type: 'upstream_error', message: msg, timestamp };
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNREFUSED')) {
    return { source, type: 'upstream_error', message: msg, timestamp };
  }
  return { source, type: 'internal_error', message: msg, timestamp };
}

/** Build an InsightError for insufficient data. */
export function insufficientDataError(source: string, message: string): InsightError {
  return {
    source,
    type: 'insufficient_data',
    message,
    timestamp: new Date().toISOString(),
  };
}
