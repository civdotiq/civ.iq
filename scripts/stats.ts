/**
 * Weekly stats — the Monday measurement ritual (~20 min, this covers the CLI half).
 *
 * Reports, in one run:
 *   1. Alert subscribers (verified/pending) and most-watched legislators
 *   2. API request volume for the last 7 days with top endpoints
 *   3. MCP client + SDK adoption counters for the last 28 days
 *   4. npm download counts for the three @civiq packages
 *   5. A reminder checklist for the GA4 views that have no API access here
 *
 * Redis data comes from Upstash REST (UPSTASH_REDIS_REST_URL/TOKEN in
 * .env.local — same store production writes to). Sections degrade to a
 * clear "not configured" note rather than failing the whole run.
 *
 * Usage:
 *   npm run stats                      # human-readable summary
 *   npx tsx scripts/stats.ts --json    # machine-readable JSON
 */

import * as dotenv from 'dotenv';
import { Redis } from '@upstash/redis';

dotenv.config({ path: '.env.local' });

const NPM_PACKAGES = ['@civiq/sdk', '@civiq/civic-statistics', '@civiq/entity-resolution'];
// RedisCache (src/lib/cache/redis-client.ts) prefixes its keys with civiq:
const CACHE_PREFIX = 'civiq:';
const REQUEST_WINDOW_DAYS = 7;
const ADOPTION_WINDOW_DAYS = 28;

interface Subscription {
  verified: boolean;
  entities: Array<{ type: string; id: string; name?: string }>;
}

interface StatsReport {
  generatedAt: string;
  subscribers: {
    configured: boolean;
    total: number;
    verified: number;
    pending: number;
    digestVerified: number;
    digestPending: number;
    topEntities: Array<{ entity: string; watchers: number }>;
  };
  apiRequests: {
    configured: boolean;
    windowDays: number;
    total: number;
    topPaths: Array<{ path: string; count: number }>;
  };
  adoption: {
    configured: boolean;
    windowDays: number;
    mcpInitializesByClient: Record<string, number>;
    sdkRequestsByVersion: Record<string, number>;
  };
  npmDownloads: Array<{ package: string; lastWeek: number | null; lastMonth: number | null }>;
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function lastNDates(n: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

async function collectSubscribers(redis: Redis | null): Promise<StatsReport['subscribers']> {
  const empty = {
    configured: false,
    total: 0,
    verified: 0,
    pending: 0,
    digestVerified: 0,
    digestPending: 0,
    topEntities: [],
  };
  if (!redis) return empty;

  // Subscription values are plain JSON written by RedisCache; @upstash/redis
  // deserializes JSON automatically on get.
  const subKeys = await redis.keys(`${CACHE_PREFIX}alert:sub:*`);
  let verified = 0;
  let pending = 0;
  for (const key of subKeys) {
    const sub = await redis.get<Subscription>(key);
    if (!sub) continue;
    if (sub.verified) verified++;
    else pending++;
  }

  const entityKeys = await redis.keys(`${CACHE_PREFIX}alert:entity:*`);
  const topEntities: Array<{ entity: string; watchers: number }> = [];
  for (const key of entityKeys) {
    const watchers = await redis.get<string[]>(key);
    if (!Array.isArray(watchers) || watchers.length === 0) continue;
    topEntities.push({
      entity: key.slice(`${CACHE_PREFIX}alert:entity:`.length),
      watchers: watchers.length,
    });
  }
  topEntities.sort((a, b) => b.watchers - a.watchers);

  let digestVerified = 0;
  let digestPending = 0;
  const digestKeys = await redis.keys(`${CACHE_PREFIX}digest:sub:*`);
  for (const key of digestKeys) {
    const sub = await redis.get<{ verified?: boolean }>(key);
    if (!sub) continue;
    if (sub.verified) digestVerified++;
    else digestPending++;
  }

  return {
    configured: true,
    total: verified + pending,
    verified,
    pending,
    digestVerified,
    digestPending,
    topEntities: topEntities.slice(0, 10),
  };
}

async function collectApiRequests(redis: Redis | null): Promise<StatsReport['apiRequests']> {
  const empty = { configured: false, windowDays: REQUEST_WINDOW_DAYS, total: 0, topPaths: [] };
  if (!redis) return empty;

  const byPath: Record<string, number> = {};
  let total = 0;

  for (const date of lastNDates(REQUEST_WINDOW_DAYS)) {
    const keys = await redis.keys(`analytics:requests:${date}:*`);
    if (keys.length === 0) continue;
    const values = await redis.mget<Array<number | null>>(...keys);
    keys.forEach((key, i) => {
      const count = Number(values[i]);
      if (!Number.isFinite(count) || count <= 0) return;
      // Key: analytics:requests:{date}:{path}:{method}:{status} — the path
      // itself may contain ':' (e.g. /:id), so strip fixed ends, not split all.
      const middle = key.slice(`analytics:requests:${date}:`.length);
      const path = middle.replace(/:[A-Z]+:\d{3}$/, '');
      byPath[path] = (byPath[path] || 0) + count;
      total += count;
    });
  }

  const topPaths = Object.entries(byPath)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { configured: true, windowDays: REQUEST_WINDOW_DAYS, total, topPaths };
}

async function collectAdoption(redis: Redis | null): Promise<StatsReport['adoption']> {
  const empty = {
    configured: false,
    windowDays: ADOPTION_WINDOW_DAYS,
    mcpInitializesByClient: {},
    sdkRequestsByVersion: {},
  };
  if (!redis) return empty;

  const mcpInitializesByClient: Record<string, number> = {};
  const sdkRequestsByVersion: Record<string, number> = {};

  for (const [kind, sink] of [
    ['mcp', mcpInitializesByClient],
    ['sdk', sdkRequestsByVersion],
  ] as const) {
    for (const date of lastNDates(ADOPTION_WINDOW_DAYS)) {
      const keys = await redis.keys(`analytics:adoption:${kind}:${date}:*`);
      if (keys.length === 0) continue;
      const values = await redis.mget<Array<number | null>>(...keys);
      keys.forEach((key, i) => {
        const count = Number(values[i]);
        if (!Number.isFinite(count) || count <= 0) return;
        const label = key.slice(`analytics:adoption:${kind}:${date}:`.length);
        sink[label] = (sink[label] || 0) + count;
      });
    }
  }

  return {
    configured: true,
    windowDays: ADOPTION_WINDOW_DAYS,
    mcpInitializesByClient,
    sdkRequestsByVersion,
  };
}

async function fetchNpmDownloads(pkg: string, period: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.npmjs.org/downloads/point/${period}/${encodeURIComponent(pkg)}`
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { downloads?: number };
    return typeof body.downloads === 'number' ? body.downloads : null;
  } catch {
    return null;
  }
}

async function collectNpm(): Promise<StatsReport['npmDownloads']> {
  return Promise.all(
    NPM_PACKAGES.map(async pkg => ({
      package: pkg,
      lastWeek: await fetchNpmDownloads(pkg, 'last-week'),
      lastMonth: await fetchNpmDownloads(pkg, 'last-month'),
    }))
  );
}

function printReport(report: StatsReport): void {
  const line = (s = '') => console.log(s);
  const notConfigured =
    '  (Upstash Redis not configured — set UPSTASH_REDIS_REST_URL/TOKEN in .env.local)';

  line(`CIV.IQ weekly stats — ${report.generatedAt.slice(0, 10)}`);
  line('='.repeat(60));

  line();
  line('Email subscribers');
  if (!report.subscribers.configured) line(notConfigured);
  else {
    line(
      `  Alerts: ${report.subscribers.total} (${report.subscribers.verified} verified, ${report.subscribers.pending} pending)`
    );
    line(
      `  Weekly digest: ${report.subscribers.digestVerified} verified, ${report.subscribers.digestPending} pending`
    );
    for (const { entity, watchers } of report.subscribers.topEntities) {
      line(`    ${entity}: ${watchers} watcher${watchers === 1 ? '' : 's'}`);
    }
  }

  line();
  line(`API requests (last ${report.apiRequests.windowDays} days)`);
  if (!report.apiRequests.configured) line(notConfigured);
  else {
    line(`  Total: ${report.apiRequests.total}`);
    for (const { path, count } of report.apiRequests.topPaths) {
      line(`    ${count.toString().padStart(6)}  ${path}`);
    }
  }

  line();
  line(`MCP / SDK adoption (last ${report.adoption.windowDays} days)`);
  if (!report.adoption.configured) line(notConfigured);
  else {
    const mcp = Object.entries(report.adoption.mcpInitializesByClient).sort((a, b) => b[1] - a[1]);
    const sdk = Object.entries(report.adoption.sdkRequestsByVersion).sort((a, b) => b[1] - a[1]);
    if (mcp.length === 0) line('  MCP initializes: none recorded yet');
    else
      for (const [client, n] of mcp) line(`  MCP ${client}: ${n} initialize${n === 1 ? '' : 's'}`);
    if (sdk.length === 0) line('  SDK requests: none recorded yet');
    else for (const [version, n] of sdk) line(`  SDK ${version}: ${n} requests`);
  }

  line();
  line('npm downloads');
  for (const p of report.npmDownloads) {
    line(`  ${p.package}: week=${p.lastWeek ?? 'n/a'} month=${p.lastMonth ?? 'n/a'}`);
  }

  line();
  line('GA4 (manual — no API access from this script)');
  line('  https://analytics.google.com → Reports → Engagement → Pages and screens');
  line('  → Acquisition → Traffic acquisition: look for chatgpt.com, perplexity.ai,');
  line('    claude.ai referrers (the AI-pipeline signal)');
}

async function main(): Promise<void> {
  const asJson = process.argv.includes('--json');
  const redis = getRedis();

  const [subscribers, apiRequests, adoption, npmDownloads] = await Promise.all([
    collectSubscribers(redis),
    collectApiRequests(redis),
    collectAdoption(redis),
    collectNpm(),
  ]);

  const report: StatsReport = {
    generatedAt: new Date().toISOString(),
    subscribers,
    apiRequests,
    adoption,
    npmDownloads,
  };

  if (asJson) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else printReport(report);
}

main().catch(err => {
  console.error('[stats] fatal', err);
  process.exit(1);
});
