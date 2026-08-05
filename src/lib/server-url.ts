/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Get the base URL for server-side API requests.
 *
 * Priority:
 * 1. NEXT_PUBLIC_SITE_URL — explicit override (ignored if it points at
 *    localhost while running on Vercel)
 * 2. VERCEL_PROJECT_PRODUCTION_URL — the production custom domain
 * 3. VERCEL_URL — the deployment URL (previews)
 * 4. localhost:3000 — local development
 *
 * NEXT_PUBLIC_BASE_URL is deliberately NOT consulted. It is set to
 * http://localhost:3000 in .env.local and is scoped to All Environments in the
 * Vercel dashboard, so treating it as an origin override risks pointing
 * server-side fetches at localhost from inside a production function.
 *
 * Why the production domain outranks VERCEL_URL:
 *
 * This project has Vercel SSO protection set to `all_except_custom_domains`.
 * The per-deployment *.vercel.app hostname is therefore behind an auth
 * redirect, and a server-side fetch to it receives a 302 to the Vercel login
 * page rather than JSON. Since VERCEL_URL is exactly that hostname, every
 * self-fetch made from inside a production function was failing — the caller
 * would parse an HTML login page, throw, and fall back to "Data unavailable".
 * The custom domain is exempt from the protection and answers normally.
 *
 * Known gap: preview deployments still resolve to the protected VERCEL_URL,
 * so self-fetches there continue to fail. Fixing previews properly needs the
 * `x-vercel-protection-bypass` header with VERCEL_AUTOMATION_BYPASS_SECRET,
 * which is a per-request concern this helper cannot express. Previews are no
 * worse off than before.
 *
 * @returns The base URL including protocol (https:// or http://)
 */
export function getServerBaseUrl(): string {
  // Explicit override for custom domains or specific deployment control.
  // A localhost value is ignored when running on Vercel: it can only be dev
  // configuration that leaked into a deployed environment, and honouring it
  // would make every server-side fetch call back into the function's own
  // loopback interface.
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && !(process.env.VERCEL && /^https?:\/\/(localhost|127\.0\.0\.1)/.test(explicit))) {
    return explicit;
  }

  // The production custom domain, which SSO protection exempts.
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  // Deployment URL — correct for previews, and the historical behaviour.
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Local development fallback
  return 'http://localhost:3000';
}
