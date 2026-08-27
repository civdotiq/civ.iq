/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * v1 Public API — query parameter validation helpers
 *
 * Routes historically dropped unrecognized query parameters in silence, which
 * is the worst possible behavior for a machine consumer: the caller gets a
 * 200 OK carrying data that does not answer the question they asked.
 *
 * Measured 2026-08-27: a client had been requesting
 * `/api/v1/bills?query=bill&congress=119` roughly 10,000 times a day for
 * months. Neither parameter existed on that route, so every response was the
 * unfiltered latest-50 list rather than the search they believed they were
 * running. Nothing in the response told them.
 *
 * Rejecting unknown parameters outright would be a breaking change to a
 * published v1 contract, and would break exactly the caller it is meant to
 * help. Instead the response carries a `meta.warnings` array — additive,
 * absent when there is nothing to say, and readable by the agents this API
 * exists to serve.
 */

/** Longest parameter name echoed back; anything longer is truncated. */
const MAX_ECHOED_NAME_LENGTH = 40;

/** Cap on warnings per response, so a request with 500 junk params can't inflate it. */
const MAX_WARNINGS = 5;

const DOCS_URL = 'https://civdotiq.org/docs/api';

/**
 * Echo a caller-supplied parameter name safely.
 *
 * The name lands in a JSON response body, so it is restricted to a
 * conservative charset and truncated. JSON encoding already neutralizes
 * quotes and control characters; this keeps the output legible as well.
 */
function sanitizeName(name: string): string {
  const cleaned = name.replace(/[^\w.-]/g, '');
  return cleaned.length > MAX_ECHOED_NAME_LENGTH
    ? `${cleaned.slice(0, MAX_ECHOED_NAME_LENGTH)}…`
    : cleaned;
}

/**
 * Build one warning per unrecognized query parameter.
 *
 * Returns an empty array when every parameter is supported, so callers can
 * pass the result straight to `v1Success` without a conditional — the field
 * is omitted from the envelope when empty.
 */
export function unknownParamWarnings(
  searchParams: URLSearchParams,
  supported: readonly string[]
): string[] {
  const known = new Set(supported);
  const seen = new Set<string>();
  const unknown: string[] = [];

  for (const name of searchParams.keys()) {
    if (known.has(name) || seen.has(name)) continue;
    seen.add(name);
    unknown.push(name);
    if (unknown.length >= MAX_WARNINGS) break;
  }

  const supportedList = supported.join(', ');
  return unknown.map(
    name =>
      `Unknown parameter '${sanitizeName(name)}' was ignored. ` +
      `Supported parameters: ${supportedList}. See ${DOCS_URL}`
  );
}
