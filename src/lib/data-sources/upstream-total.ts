/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Rows fetched, alongside how many the upstream says exist.
 *
 * Every summary in this codebase that counts a fetched array is really counting
 * the fetch. The usual remedy is to label the figure a lower bound, but that is
 * a concession we mostly do not have to make: EPA ECHO, NIH RePORTER, FDIC and
 * College Scorecard already report the full match count in the same response
 * body we throw away, and CMS and FEMA report it for one extra query parameter.
 *
 * So the honest count is available at no extra fetch. Services expose it here;
 * callers that publish a count use `totalAvailable` and keep `items` for the
 * rankings and averages that genuinely need rows.
 */
export interface CountedResult<T> {
  /** The rows actually retrieved — still bounded by the caller's limit. */
  items: T[];
  /**
   * Rows matching the query upstream, independent of the fetch cap.
   *
   * Null when the API reports no count, or reported one that could not be
   * parsed. Null means "unknown", never "zero" — a caller must not fall back to
   * `items.length`, which is the very number this field exists to replace.
   */
  totalAvailable: number | null;
}

/** Parse an upstream count that may arrive as a number or a numeric string. */
export function parseUpstreamTotal(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw === 'string') {
    // Guard the empty string explicitly: Number('') is 0, which would turn a
    // missing count into a confident "nothing matched".
    const trimmed = raw.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
