/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Bing Webmaster Tools client — Bing's view of civdotiq.org: impressions and
 * clicks per day, plus the top queries and top pages.
 *
 * Google Search Console covers Google only. Bing's index also feeds ChatGPT
 * Search, Copilot and DuckDuckGo, so Bing impressions are the nearest thing
 * we have to a "how visible are we to the non-Google assistants" number.
 *
 * Setup (one time, as the Bing Webmaster Tools owner):
 *   1. Sign in at https://www.bing.com/webmasters → Settings (top right) →
 *      API Access → accept the terms → Generate API Key. One key per user;
 *      it covers every site verified under that account.
 *   2. Put it in .env.local as BING_WEBMASTER_API_KEY. Local only, never
 *      Vercel: only `npm run stats` reads it.
 *
 * Endpoints (https://learn.microsoft.com/en-us/bingwebmaster/), all GET with
 * `apikey` and `siteUrl` as query parameters:
 *   GetUserSites            → sites the key can read; used to pick the property
 *   GetRankAndTrafficStats  → one {Date, Impressions, Clicks} per day; updated daily
 *   GetQueryStats           → {Query, Impressions, Clicks, AvgImpressionPosition,
 *                              AvgClickPosition, Date}; updated weekly
 *   GetPageStats            → same shape, `Query` holds the page URL
 * Dates arrive as "/Date(1316156400000-0700)/" (epoch ms plus a UTC offset).
 */

const API = 'https://ssl.bing.com/webmaster/api.svc/json';
const SITE_HOST = 'civdotiq.org';
/** Bing's daily traffic rows usually stop at yesterday. */
const DATA_LAG_DAYS = 1;
const TOP_N = 10;

export interface BingRow {
  key: string;
  clicks: number;
  impressions: number;
  /** 0-1 */
  ctr: number;
  position: number;
}

export interface BingSummary {
  configured: boolean;
  siteUrl: string | null;
  windowDays: number;
  startDate: string | null;
  endDate: string | null;
  /** Summed over the daily rows inside the window. */
  totals: { clicks: number; impressions: number; ctr: number } | null;
  /** How many days inside the window Bing actually reported; < windowDays means lag. */
  daysReported: number;
  /** Date range the query/page rows cover (Bing's weekly report, may differ from the window). */
  detailStart: string | null;
  detailEnd: string | null;
  topQueries: BingRow[];
  topPages: BingRow[];
  error: string | null;
}

interface ApiTrafficRow {
  Date?: string;
  Impressions?: number;
  Clicks?: number;
}

interface ApiDetailRow extends ApiTrafficRow {
  Query?: string;
  AvgImpressionPosition?: number;
  AvgClickPosition?: number;
}

interface ApiSite {
  Url?: string;
  IsVerified?: boolean;
}

/**
 * "/Date(1316156400000-0700)/" → "2011-09-16". The number is the UTC instant;
 * the offset is the local zone the day was counted in, so shift by it before
 * taking the calendar date (midnight +0100 is the previous day in UTC).
 */
export function parseBingDate(value: string | undefined): string | null {
  if (!value) return null;
  const m = /^\/Date\((-?\d+)(?:([+-])(\d{2})(\d{2}))?\)\/$/.exec(value);
  if (!m) {
    // Some responses use plain ISO timestamps.
    const iso = /^(\d{4}-\d{2}-\d{2})/.exec(value);
    return iso ? iso[1] : null;
  }
  const ms = Number(m[1]);
  const sign = m[2] === '-' ? -1 : 1;
  const offsetMs = m[3] ? sign * (Number(m[3]) * 60 + Number(m[4])) * 60 * 1000 : 0;
  return new Date(ms + offsetMs).toISOString().slice(0, 10);
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

/**
 * Pick the civdotiq.org property from GetUserSites. Prefers a verified entry;
 * falls back to the https root when the list is empty or unreadable.
 */
export function pickSiteUrl(sites: ApiSite[]): string {
  const ours = sites.filter(s => {
    try {
      return new URL(s.Url ?? '').hostname.replace(/^www\./, '') === SITE_HOST;
    } catch {
      return false;
    }
  });
  const verified = ours.find(s => s.IsVerified);
  return verified?.Url ?? ours[0]?.Url ?? `https://${SITE_HOST}/`;
}

function inWindow(date: string | null, window: { startDate: string; endDate: string }): boolean {
  return date !== null && date >= window.startDate && date <= window.endDate;
}

/** Sum the daily traffic rows that fall inside the window. */
export function summarizeTraffic(
  rows: ApiTrafficRow[],
  window: { startDate: string; endDate: string }
): { totals: BingSummary['totals']; daysReported: number } {
  const days = new Set<string>();
  let clicks = 0;
  let impressions = 0;
  for (const row of rows) {
    const date = parseBingDate(row.Date);
    if (!inWindow(date, window)) continue;
    days.add(date as string);
    clicks += row.Clicks ?? 0;
    impressions += row.Impressions ?? 0;
  }
  return {
    totals: { clicks, impressions, ctr: impressions > 0 ? clicks / impressions : 0 },
    daysReported: days.size,
  };
}

/**
 * Group query/page rows by key. Rows inside the window are used when there are
 * any; otherwise every row (Bing's weekly report can be dated just outside a
 * short window). The date range actually used is returned so the report can
 * say so.
 */
export function aggregateDetail(
  rows: ApiDetailRow[],
  window: { startDate: string; endDate: string }
): { rows: BingRow[]; start: string | null; end: string | null } {
  const dated = rows.map(row => ({ row, date: parseBingDate(row.Date) }));
  const windowed = dated.filter(d => inWindow(d.date, window));
  const used = windowed.length > 0 ? windowed : dated;

  const byKey = new Map<string, { clicks: number; impressions: number; positionWeight: number }>();
  let start: string | null = null;
  let end: string | null = null;
  for (const { row, date } of used) {
    const key = row.Query ?? '';
    if (!key) continue;
    const entry = byKey.get(key) ?? { clicks: 0, impressions: 0, positionWeight: 0 };
    const impressions = row.Impressions ?? 0;
    entry.clicks += row.Clicks ?? 0;
    entry.impressions += impressions;
    entry.positionWeight += (row.AvgImpressionPosition ?? 0) * impressions;
    byKey.set(key, entry);
    if (date) {
      if (start === null || date < start) start = date;
      if (end === null || date > end) end = date;
    }
  }

  const out: BingRow[] = [...byKey.entries()].map(([key, e]) => ({
    key,
    clicks: e.clicks,
    impressions: e.impressions,
    ctr: e.impressions > 0 ? e.clicks / e.impressions : 0,
    position: e.impressions > 0 ? e.positionWeight / e.impressions : 0,
  }));
  out.sort(
    (a, b) => b.clicks - a.clicks || b.impressions - a.impressions || a.key.localeCompare(b.key)
  );
  return { rows: out.slice(0, TOP_N), start, end };
}

/** Bing wraps errors as {"ErrorCode","Message"}; fall back to the raw body. */
export function errorMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as { Message?: string; ErrorCode?: number };
    if (parsed.Message) {
      return parsed.ErrorCode === undefined
        ? parsed.Message
        : `${parsed.Message} (ErrorCode ${parsed.ErrorCode})`;
    }
  } catch {
    // not JSON
  }
  return body.slice(0, 300);
}

async function bingFetch<T>(
  apiKey: string,
  method: string,
  params: Record<string, string>
): Promise<T> {
  const url = new URL(`${API}/${method}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('apikey', apiKey);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    // Never echo the URL: it carries the key.
    throw new Error(
      `Bing Webmaster ${method} failed (${res.status}): ${errorMessage(await res.text())}`
    );
  }
  return ((await res.json()) as { d?: T }).d as T;
}

async function resolveSiteUrl(apiKey: string): Promise<string> {
  const override = process.env.BING_SITE_URL;
  if (override) return override;
  const sites = await bingFetch<ApiSite[]>(apiKey, 'GetUserSites', {});
  return pickSiteUrl(sites ?? []);
}

/**
 * Fetch the Bing summary. Degrades to `configured: false` without a key and to
 * an `error` string when a call fails — never throws, so it cannot take down
 * the weekly report.
 */
export async function fetchBingSummary(
  windowDays: number,
  apiKey: string | null = process.env.BING_WEBMASTER_API_KEY ?? null,
  today: Date = new Date()
): Promise<BingSummary> {
  const empty: BingSummary = {
    configured: false,
    siteUrl: null,
    windowDays,
    startDate: null,
    endDate: null,
    totals: null,
    daysReported: 0,
    detailStart: null,
    detailEnd: null,
    topQueries: [],
    topPages: [],
    error: null,
  };
  if (!apiKey) return empty;

  const window = dateWindow(windowDays, today);
  const base = { ...empty, configured: true, ...window };

  try {
    const siteUrl = await resolveSiteUrl(apiKey);
    const params = { siteUrl };
    const [traffic, queries, pages] = await Promise.all([
      bingFetch<ApiTrafficRow[]>(apiKey, 'GetRankAndTrafficStats', params),
      bingFetch<ApiDetailRow[]>(apiKey, 'GetQueryStats', params),
      bingFetch<ApiDetailRow[]>(apiKey, 'GetPageStats', params),
    ]);

    const { totals, daysReported } = summarizeTraffic(traffic ?? [], window);
    const topQueries = aggregateDetail(queries ?? [], window);
    const topPages = aggregateDetail(pages ?? [], window);

    return {
      ...base,
      siteUrl,
      totals,
      daysReported,
      detailStart: topQueries.start ?? topPages.start,
      detailEnd: topQueries.end ?? topPages.end,
      topQueries: topQueries.rows,
      topPages: topPages.rows,
    };
  } catch (err) {
    return { ...base, error: (err as Error).message };
  }
}
