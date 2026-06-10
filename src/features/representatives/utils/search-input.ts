/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Classifies the representatives search input so the client can route it.
 *
 * Per .claude/rules/security.md the primary lookup path is a full street
 * address (Census Geocoder → district). ZIP codes remain a fallback only:
 * ZIP ↔ district alignment is wrong 10–20% of the time, so ZIP results must
 * carry the honesty caveat the API returns.
 */
export type SearchInputKind = 'zip' | 'address' | 'too-short';

const ZIP_PATTERN = /^\d{5}(-\d{4})?$/;

export function classifySearchInput(input: string): SearchInputKind {
  const trimmed = input.trim();
  if (ZIP_PATTERN.test(trimmed)) {
    return 'zip';
  }
  if (trimmed.length < 3) {
    return 'too-short';
  }
  return 'address';
}

/** Extracts the 5-digit ZIP from a 5- or 9-digit ZIP input. */
export function extractZip5(input: string): string {
  return input.trim().split('-')[0] ?? '';
}
