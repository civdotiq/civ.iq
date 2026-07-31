/**
 * GA4 Data API client — the human-traffic half of the weekly measurement.
 *
 * Everything else in stats.ts counts machines: Redis request counters, MCP
 * handshakes, crawler hits. GA4 is the only source for actual people, and it
 * used to be a manual "go look at the dashboard" reminder. This pulls it.
 *
 * Auth is a service-account JWT exchanged for an OAuth token. Signed with
 * node:crypto rather than google-auth-library — the flow is ~20 lines and
 * this is a dev script, so a dependency would cost more than it saves.
 *
 * Setup (one time):
 *   1. Google Cloud console → create a service account, add a JSON key.
 *   2. Enable the "Google Analytics Data API" for that project.
 *   3. GA4 admin → Property access management → add the service account's
 *      email as a Viewer.
 *   4. Put these in .env.local (NOT in Vercel — this never runs in prod):
 *        GA4_PROPERTY_ID=123456789          # numeric, NOT G-F98819F2NC
 *        GA4_CLIENT_EMAIL=...@...iam.gserviceaccount.com
 *        GA4_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 *
 * The measurement ID (G-F98819F2NC, in src/app/layout.tsx) is NOT the property
 * ID. The Data API only accepts the numeric one, from GA4 admin → Property
 * details. Mixing them up returns a confusing 403.
 */

import { createSign } from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DATA_API = 'https://analyticsdata.googleapis.com/v1beta';
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

export interface Ga4Config {
  propertyId: string;
  clientEmail: string;
  privateKey: string;
}

export interface Ga4Summary {
  configured: boolean;
  windowDays: number;
  totals: { activeUsers: number; sessions: number; pageViews: number } | null;
  topPages: Array<{ path: string; views: number }>;
  topSources: Array<{ source: string; sessions: number }>;
  /** Referrals from AI assistants — the signal that the agent-native bet is landing. */
  aiReferrals: Array<{ source: string; sessions: number }>;
  error: string | null;
}

/** Hosts that indicate a visit arrived via an AI assistant rather than search. */
const AI_SOURCE_PATTERNS = [
  'chatgpt',
  'openai',
  'perplexity',
  'claude',
  'anthropic',
  'copilot',
  'gemini',
  'bard',
  'phind',
  'you.com',
];

export function isAiSource(source: string): boolean {
  const s = source.toLowerCase();
  return AI_SOURCE_PATTERNS.some(p => s.includes(p));
}

export function readGa4Config(): Ga4Config | null {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  // Env files store the PEM with literal \n; restore real newlines for crypto.
  const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!propertyId || !clientEmail || !privateKey) return null;
  return { propertyId, clientEmail, privateKey };
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Build and RS256-sign the service-account assertion. */
function signJwt(cfg: Ga4Config): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: cfg.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );

  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  signer.end();
  const signature = base64url(signer.sign(cfg.privateKey));

  return `${header}.${claims}.${signature}`;
}

async function getAccessToken(cfg: Ga4Config): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signJwt(cfg),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OAuth token exchange failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('OAuth response contained no access_token');
  return json.access_token;
}

interface ReportRow {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
}

interface ReportResponse {
  rows?: ReportRow[];
}

function firstDimension(row: ReportRow): string {
  return row.dimensionValues?.[0]?.value ?? 'unknown';
}

function firstMetric(row: ReportRow): number {
  const raw = Number(row.metricValues?.[0]?.value);
  return Number.isFinite(raw) ? raw : 0;
}

/**
 * One batched call covering all three questions: how many people, which pages,
 * where they came from. batchRunReports keeps it to a single round trip.
 */
async function batchRunReports(
  cfg: Ga4Config,
  token: string,
  windowDays: number
): Promise<ReportResponse[]> {
  const dateRanges = [{ startDate: `${windowDays}daysAgo`, endDate: 'today' }];

  const res = await fetch(`${DATA_API}/properties/${cfg.propertyId}:batchRunReports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          dateRanges,
          metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
        },
        {
          dateRanges,
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 10,
        },
        {
          dateRanges,
          dimensions: [{ name: 'sessionSource' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 25,
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GA4 runReport failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as { reports?: ReportResponse[] };
  return json.reports ?? [];
}

/**
 * Fetch the GA4 summary. Degrades to `configured: false` when credentials are
 * absent and to an `error` string when the call fails — never throws, so one
 * bad credential cannot take down the whole weekly report.
 */
export async function fetchGa4Summary(windowDays: number): Promise<Ga4Summary> {
  const empty: Ga4Summary = {
    configured: false,
    windowDays,
    totals: null,
    topPages: [],
    topSources: [],
    aiReferrals: [],
    error: null,
  };

  const cfg = readGa4Config();
  if (!cfg) return empty;

  try {
    const token = await getAccessToken(cfg);
    const [totalsReport, pagesReport, sourcesReport] = await batchRunReports(
      cfg,
      token,
      windowDays
    );

    const totalsRow = totalsReport?.rows?.[0];
    const metric = (i: number): number => {
      const raw = Number(totalsRow?.metricValues?.[i]?.value);
      return Number.isFinite(raw) ? raw : 0;
    };

    const topSources = (sourcesReport?.rows ?? []).map(row => ({
      source: firstDimension(row),
      sessions: firstMetric(row),
    }));

    return {
      configured: true,
      windowDays,
      totals: totalsRow
        ? { activeUsers: metric(0), sessions: metric(1), pageViews: metric(2) }
        : null,
      topPages: (pagesReport?.rows ?? []).map(row => ({
        path: firstDimension(row),
        views: firstMetric(row),
      })),
      topSources: topSources.slice(0, 10),
      aiReferrals: topSources.filter(s => isAiSource(s.source)),
      error: null,
    };
  } catch (err) {
    return { ...empty, configured: true, error: (err as Error).message };
  }
}
