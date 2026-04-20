/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Backbone response contract for CIV.IQ API routes.
 *
 * Every join-based API response must carry a dataQuality field so consumers
 * (UI, MCP tools, SDK users) can distinguish "no data exists" from
 * "upstream API failed." Silent false negatives are the single biggest
 * data-integrity risk in a civic data platform.
 */

export type DataQuality = 'complete' | 'partial' | 'empty' | 'unavailable';

export interface SourceStatus {
  source: string;
  status: 'ok' | 'error' | 'timeout' | 'rate-limited' | 'not-configured';
  errorMessage?: string;
  fetchedAt: string;
}

export interface BackboneResponse<T> {
  data: T;
  dataQuality: DataQuality;
  sourceStatus: SourceStatus[];
  /**
   * When set, explains a known accuracy limitation of this specific response —
   * e.g. ZIP-based district lookup, where ZIP ↔ congressional district
   * alignment is wrong 10–20% of the time. Consumers (UI, SDK, MCP tools)
   * should surface this to end users when dataQuality is 'partial' due to
   * input-quality degradation rather than upstream failure.
   */
  accuracyNote?: string;
}

/**
 * Wrap an upstream fetch in source-status tracking.
 *
 * On success, returns { data, sourceStatus } with status 'ok'.
 * On failure, returns { data: fallback, sourceStatus } with the appropriate
 * error status, so callers never lose the signal about what went wrong.
 */
export async function fetchWithSourceStatus<T>(
  source: string,
  fetcher: () => Promise<T>,
  fallback: T
): Promise<{ data: T; sourceStatus: SourceStatus }> {
  const fetchedAt = new Date().toISOString();
  try {
    const data = await fetcher();
    return {
      data,
      sourceStatus: { source, status: 'ok', fetchedAt },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout =
      message.includes('timeout') ||
      message.includes('AbortError') ||
      message.includes('ETIMEDOUT');
    const isRateLimit = message.includes('429') || message.includes('rate limit');

    return {
      data: fallback,
      sourceStatus: {
        source,
        status: isTimeout ? 'timeout' : isRateLimit ? 'rate-limited' : 'error',
        errorMessage: message,
        fetchedAt,
      },
    };
  }
}

/**
 * Derive the aggregate DataQuality from a list of source statuses and
 * whether the final data set is empty.
 */
export function computeDataQuality(
  sourceStatuses: SourceStatus[],
  dataIsEmpty: boolean
): DataQuality {
  const allOk = sourceStatuses.every(s => s.status === 'ok');
  const allFailed = sourceStatuses.every(s => s.status !== 'ok');
  const notConfigured = sourceStatuses.some(s => s.status === 'not-configured');

  if (notConfigured || allFailed) return 'unavailable';
  if (allOk && dataIsEmpty) return 'empty';
  if (allOk) return 'complete';
  return 'partial';
}
