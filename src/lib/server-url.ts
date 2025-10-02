/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Get the base URL for server-side API requests
 *
 * Priority:
 * 1. NEXT_PUBLIC_SITE_URL - Explicitly configured site URL (allows override)
 * 2. VERCEL_URL - Automatically provided by Vercel (production/preview)
 * 3. localhost:3000 - Local development fallback
 *
 * @returns The base URL including protocol (https:// or http://)
 */
export function getServerBaseUrl(): string {
  // Explicit override for custom domains or specific deployment control
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // Vercel automatically provides VERCEL_URL for production and preview deployments
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Local development fallback
  return 'http://localhost:3000';
}
