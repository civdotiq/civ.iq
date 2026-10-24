/**
 * Google Search Console client — what people typed into Google to find us.
 *
 * GA4 says how many people came; only Search Console says which searches
 * showed civdotiq.org, how often, at what position, and how often people
 * clicked. Without it, search demand was guessed from Trends pulls.
 *
 * Auth reuses the GA4 service account (google-auth.ts). Setup (one time):
 *   1. Google Cloud console → the project that owns the service account →
 *      APIs & Services → enable the "Google Search Console API".
 *   2. Search Console → civdotiq.org property → Settings → Users and
 *      permissions → Add user → the GA4_CLIENT_EMAIL address, Restricted.
 *
 * The property is found with sites.list rather than configured: a domain
 * property is `sc-domain:civdotiq.org`, a URL-prefix property is
 * `https://civdotiq.org/`, and the API rejects the wrong one. Set
 * GSC_SITE_URL in .env.local only to force a specific property.
 */

import { getAccessToken, readServiceAccount, type ServiceAccount } from './google-auth';

const API = 'https://searchconsole.googleapis.com/webmasters/v3';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const SITE_HOST = 'civdotiq.org';
/** Search Console data runs ~2-3 days behind; end the window where it is complete. */
const DATA_LAG_DAYS = 3;
const TOP_N = 10;

export interface GscRow {
  key: string;
  clicks: number;
  impressions: number;
  /** 0-1 */
  ctr: number;
  position: number;
}

export interface GscSummary {
  configured: boolean;
  siteUrl: string | null;
  windowDays: number;
  startDate: string | null;
  endDate: string | null;
  totals: Omit<GscRow, 'key'> | null;
  topQueries: GscRow[];
  topPages: GscRow[];
  error: string | null;
}

/**
 * Choose the civdotiq.org property from sites.list. Prefers the domain
 * property (covers every subdomain and protocol), then the URL-prefix one.
 */
export function pickSiteUrl(siteUrls: string[]): string | null {
  const domain = `sc-domain:${SITE_HOST}`;
  if (siteUrls.includes(domain)) return domain;
  return (
    siteUrls.find(u => u === `https://${SITE_HOST}/`) ??
    siteUrls.find(u => u === `https://www.${SITE_HOST}/`) ??
    null
  );
}

/** Inclusive [start, end] of a `windowDays` window ending DATA_LAG_DAYS ago, as YYYY-MM-DD. */
export function dateWindow(
  windowDays: number,
  today: Date
): { startDate: string; endDate: string } {
  const day = 24 * 60 * 60 * 1000;
  const end = new Date(today.getTime() - DATA_LAG_DAYS * day);
  const start = new Date(end.getTime() - (windowDays - 1) * day);
  const iso = (d: Date): string => d.toISOString().slice(0, 10);
  return { startDate: iso(start), endDate: iso(end) };
}

interface ApiRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

export function toRow(row: ApiRow): GscRow {
  return {
    key: row.keys?.[0] ?? '',
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  };
}

/** Google wraps errors as {"error":{"message"}}; fall back to the raw body. */
export function errorMessage(body: string): string {
  try {
    const message = (JSON.parse(body) as { error?: { message?: string } }).error?.message;
    if (message) return message;
  } catch {
    // not JSON
  }
  return body.slice(0, 300);
}

async function gscFetch<T>(token: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `Search Console ${path} failed (${res.status}): ${errorMessage(await res.text())}`
    );
  }
  return (await res.json()) as T;
}

async function resolveSiteUrl(token: string): Promise<string | null> {
  const override = process.env.GSC_SITE_URL;
  if (override) return override;
  const json = await gscFetch<{ siteEntry?: Array<{ siteUrl?: string }> }>(token, '/sites');
  return pickSiteUrl((json.siteEntry ?? []).map(e => e.siteUrl ?? ''));
}

async function query(
  token: string,
  siteUrl: string,
  window: { startDate: string; endDate: string },
  dimension: 'query' | 'page' | null
): Promise<ApiRow[]> {
  const json = await gscFetch<{ rows?: ApiRow[] }>(
    token,
    `/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      ...window,
      type: 'web',
      ...(dimension ? { dimensions: [dimension], rowLimit: TOP_N } : {}),
    }
  );
  return json.rows ?? [];
}

/**
 * Fetch the Search Console summary. Degrades to `configured: false` when the
 * service account is absent and to an `error` string when access is missing
 * or a call fails — never throws, so it cannot take down the weekly report.
 */
export async function fetchGscSummary(
  windowDays: number,
  account: ServiceAccount | null = readServiceAccount(),
  today: Date = new Date()
): Promise<GscSummary> {
  const empty: GscSummary = {
    configured: false,
    siteUrl: null,
    windowDays,
    startDate: null,
    endDate: null,
    totals: null,
    topQueries: [],
    topPages: [],
    error: null,
  };
  if (!account) return empty;

  const window = dateWindow(windowDays, today);
  const base = { ...empty, configured: true, ...window };

  try {
    const token = await getAccessToken(account, SCOPE);
    const siteUrl = await resolveSiteUrl(token);
    if (!siteUrl) {
      return {
        ...base,
        error:
          `the service account (${account.clientEmail}) has no access to a ` +
          `${SITE_HOST} Search Console property yet; add it under Settings → Users and permissions`,
      };
    }

    const [totals, queries, pages] = await Promise.all([
      query(token, siteUrl, window, null),
      query(token, siteUrl, window, 'query'),
      query(token, siteUrl, window, 'page'),
    ]);
    const totalsRow = totals[0];

    return {
      ...base,
      siteUrl,
      totals: totalsRow
        ? (({ key: _key, ...rest }) => rest)(toRow(totalsRow))
        : { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      topQueries: queries.map(toRow),
      topPages: pages.map(toRow),
    };
  } catch (err) {
    return { ...base, error: (err as Error).message };
  }
}
