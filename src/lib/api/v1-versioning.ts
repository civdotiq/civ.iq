/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * V1 API Versioning Headers
 *
 * Sets standard version headers on all v1 API responses.
 * Supports Sunset/Deprecation headers for future version transitions.
 */

// Keep in sync with public/openapi.json info.version and the newest
// /api/v1/changelog entry.
const API_VERSION = '1.2.0';

interface VersionConfig {
  sunset?: string; // RFC 7231 date string (e.g., "Sat, 01 Jan 2028 00:00:00 GMT")
  deprecation?: string; // RFC 7231 date string
  successorLink?: string; // URL of successor API version
}

// Current config: no sunset planned for v1
const currentConfig: VersionConfig = {};

/**
 * Add version headers to a response Headers object.
 * Call this on every v1 route response.
 */
export function addVersionHeaders(headers: Headers): void {
  headers.set('X-API-Version', API_VERSION);

  if (currentConfig.sunset) {
    headers.set('Sunset', currentConfig.sunset);
  }

  if (currentConfig.deprecation) {
    headers.set('Deprecation', currentConfig.deprecation);
  }

  if (currentConfig.successorLink) {
    headers.set('Link', `<${currentConfig.successorLink}>; rel="successor-version"`);
  }
}

export { API_VERSION };
