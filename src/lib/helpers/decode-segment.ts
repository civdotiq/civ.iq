/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Decode a dynamic route segment. Page params arrive percent-encoded
 * ("1st%20Barnstable"), so compare against source data only after decoding.
 * Malformed encoding falls back to the raw segment.
 */
export function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
