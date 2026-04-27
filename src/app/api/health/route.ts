/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Health Check Endpoint — probes data sources and reports structured status.
 *
 * Critical sources (Congress.gov, FEC, Senate LDA) are probed every call.
 * Non-critical sources rotate: each call probes a subset to avoid rate limits.
 * Infrastructure route — no Cache-Control header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedisCache } from '@/lib/cache/redis-client';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

// ── Source Definitions ──────────────────────────────────────────────

type SourceTier = 'critical' | 'important' | 'standard';
type SourceStatus = 'ok' | 'degraded' | 'down' | 'stale' | 'skipped';

interface SourceDefinition {
  name: string;
  tier: SourceTier;
  /** URL to probe — should be a lightweight endpoint */
  probeUrl: string;
  /** HTTP method for the probe (defaults to GET) */
  probeMethod?: 'GET' | 'POST' | 'HEAD';
  /** Body for POST probes */
  probeBody?: string;
  /** Whether the probe needs an API key */
  requiresKey?: string;
  /** How to add the key */
  keyMethod?: 'query' | 'header';
  /** Query param or header name for the key */
  keyParam?: string;
  /** Prefix for the header value (e.g., 'Bearer', 'Token'). Only used with keyMethod: 'header'. */
  keyPrefix?: string;
  /** Expected HTTP status */
  expectedStatus?: number;
  /** Cache staleness threshold in hours — data older than this is "stale" */
  staleTtlHours: number;
  /** Redis cache key pattern to check for last successful fetch */
  cacheKeyPattern?: string;
}

const DATA_SOURCES: SourceDefinition[] = [
  // ── Critical: probed every call ────────────────────────────────────
  {
    name: 'Congress.gov',
    tier: 'critical',
    // /v3 returns a 301 redirect that drops the api_key, so the followed
    // request 403s. Probe a concrete endpoint that returns 200 directly.
    probeUrl: 'https://api.congress.gov/v3/bill?format=json&limit=1',
    requiresKey: 'CONGRESS_API_KEY',
    keyMethod: 'query',
    keyParam: 'api_key',
    staleTtlHours: 24,
    cacheKeyPattern: 'congress:*',
  },
  {
    name: 'FEC',
    tier: 'critical',
    // FEC requires api_key on every request — without it the API returns 403.
    // /legal/citations is a lightweight reference endpoint that costs less
    // against our 1000/hr quota than candidate/contribution searches.
    probeUrl: 'https://api.open.fec.gov/v1/legal/citations/?per_page=1',
    requiresKey: 'FEC_API_KEY',
    keyMethod: 'query',
    keyParam: 'api_key',
    staleTtlHours: 48,
    cacheKeyPattern: 'fec:*',
  },
  {
    name: 'Senate LDA',
    tier: 'critical',
    // Senate LDA is unauthenticated but rejects the previous probe URL
    // (filing_period=2025 is invalid; the API expects filing_year). Match
    // the production query shape used by SenateLobbyingAPI.fetchFilingsByQuarter.
    probeUrl:
      'https://lda.senate.gov/api/v1/filings/?filing_year=2025&filing_period=first_quarter&page_size=1',
    staleTtlHours: 168, // weekly filings
    cacheKeyPattern: 'lobbying:*',
  },

  // ── Important: probed on rotation ──────────────────────────────────
  {
    name: 'Federal Register',
    tier: 'important',
    probeUrl: 'https://www.federalregister.gov/api/v1/documents.json?per_page=1',
    staleTtlHours: 48,
    cacheKeyPattern: 'federal-register:*',
  },
  {
    name: 'EPA ECHO',
    tier: 'important',
    probeUrl:
      'https://echodata.epa.gov/echo/echo_rest_services.get_facility_info?output=JSON&p_st=DC&p_act=Y&responseset=1',
    staleTtlHours: 168,
    cacheKeyPattern: 'epa:*',
  },
  {
    name: 'FRED',
    tier: 'important',
    probeUrl: 'https://api.stlouisfed.org/fred/series?series_id=GDP&file_type=json',
    requiresKey: 'FRED_API_KEY',
    keyMethod: 'query',
    keyParam: 'api_key',
    staleTtlHours: 168,
    cacheKeyPattern: 'fred:*',
  },
  {
    name: 'Census Geocoder',
    tier: 'important',
    probeUrl:
      'https://geocoding.geo.census.gov/geocoder/geographies/address?street=1600+Pennsylvania+Ave&city=Washington&state=DC&benchmark=Public_AR_Current&vintage=Current_Current&format=json',
    staleTtlHours: 720, // 30 days — static reference data
    cacheKeyPattern: 'census:*',
  },
  {
    name: 'Regulations.gov',
    tier: 'important',
    probeUrl:
      'https://api.regulations.gov/v4/documents?filter[lastModifiedDate][ge]=2025-01-01&page[size]=1',
    requiresKey: 'REGULATIONS_GOV_API_KEY',
    keyMethod: 'header',
    keyParam: 'X-Api-Key',
    staleTtlHours: 168,
    cacheKeyPattern: 'regulations:*',
  },

  // ── Standard: probed on wider rotation ─────────────────────────────
  {
    // Verified: sec-edgar-service.ts uses efts.sec.gov/LATEST/search-index
    name: 'SEC EDGAR',
    tier: 'standard',
    probeUrl:
      'https://efts.sec.gov/LATEST/search-index?q=test&dateRange=custom&startdt=2025-01-01&enddt=2025-01-02',
    staleTtlHours: 336,
    cacheKeyPattern: 'sec:*',
  },
  {
    // Verified: osha-service.ts uses /OSHA_inspection with limit/offset params
    // Requires DOL_API_KEY Bearer token for auth
    name: 'OSHA',
    tier: 'standard',
    probeUrl: 'https://apiprod.dol.gov/v4/osha/OSHA_inspection?limit=1&offset=0',
    requiresKey: 'DOL_API_KEY',
    keyMethod: 'header',
    keyParam: 'Authorization',
    keyPrefix: 'Bearer',
    staleTtlHours: 336,
    cacheKeyPattern: 'osha:*',
  },
  {
    name: 'CFPB',
    tier: 'standard',
    probeUrl:
      'https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/?size=1',
    staleTtlHours: 336,
    cacheKeyPattern: 'cfpb:*',
  },
  {
    // Verified: courtlistener-service.ts uses Token auth (not Bearer)
    name: 'CourtListener',
    tier: 'standard',
    probeUrl: 'https://www.courtlistener.com/api/rest/v4/courts/?page_size=1',
    requiresKey: 'COURTLISTENER_API_TOKEN',
    keyMethod: 'header',
    keyParam: 'Authorization',
    keyPrefix: 'Token',
    staleTtlHours: 336,
    cacheKeyPattern: 'courtlistener:*',
  },
  {
    // Verified: noaa-service.ts uses 'token' header
    name: 'NOAA',
    tier: 'standard',
    probeUrl: 'https://www.ncdc.noaa.gov/cdo-web/api/v2/datasets?limit=1',
    requiresKey: 'NOAA_TOKEN',
    keyMethod: 'header',
    keyParam: 'token',
    staleTtlHours: 720,
    cacheKeyPattern: 'noaa:*',
  },
  {
    // Verified: eia-service.ts uses api_key query param on /seds/data/ path
    name: 'EIA',
    tier: 'standard',
    probeUrl: 'https://api.eia.gov/v2/seds/data/',
    requiresKey: 'EIA_API_KEY',
    keyMethod: 'query',
    keyParam: 'api_key',
    staleTtlHours: 720,
    cacheKeyPattern: 'eia:*',
  },
  {
    // Verified: hud-service.ts uses Authorization: Bearer {token}
    name: 'HUD',
    tier: 'standard',
    probeUrl: 'https://www.huduser.gov/hudapi/public/fmr/listMetroAreas',
    requiresKey: 'HUD_API_TOKEN',
    keyMethod: 'header',
    keyParam: 'Authorization',
    keyPrefix: 'Bearer',
    staleTtlHours: 720,
    cacheKeyPattern: 'hud:*',
  },
  {
    name: 'FDIC',
    tier: 'standard',
    probeUrl: 'https://api.fdic.gov/banks?limit=1',
    staleTtlHours: 720,
    cacheKeyPattern: 'fdic:*',
  },
  {
    name: 'FEMA',
    tier: 'standard',
    probeUrl: 'https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=1',
    staleTtlHours: 720,
    cacheKeyPattern: 'fema:*',
  },
  {
    name: 'Treasury Fiscal',
    tier: 'standard',
    probeUrl:
      'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/rates_of_exchange?page[size]=1',
    staleTtlHours: 720,
    cacheKeyPattern: 'treasury:*',
  },
  {
    // Verified: nih-reporter-service.ts uses POST to /projects/search with JSON body
    name: 'NIH Reporter',
    tier: 'standard',
    probeUrl: 'https://api.reporter.nih.gov/v2/projects/search',
    probeMethod: 'POST',
    probeBody: JSON.stringify({ criteria: { limit: 1, offset: 0 } }),
    staleTtlHours: 720,
    cacheKeyPattern: 'nih:*',
  },
  {
    // Verified: cms-provider-service.ts uses DKAN distribution UUID ae3f2207-...
    name: 'CMS',
    tier: 'standard',
    probeUrl:
      'https://data.cms.gov/provider-data/api/1/datastore/query/ae3f2207-fca8-50d5-9fd5-d6a7d3426ee3?limit=1',
    staleTtlHours: 720,
    cacheKeyPattern: 'cms:*',
  },
  {
    name: 'College Scorecard',
    tier: 'standard',
    probeUrl: 'https://api.data.gov/ed/collegescorecard/v1/schools.json?per_page=1',
    requiresKey: 'DATA_GOV_API_KEY',
    keyMethod: 'query',
    keyParam: 'api_key',
    staleTtlHours: 720,
    cacheKeyPattern: 'scorecard:*',
  },
  {
    // Verified: nhtsa-service.ts uses /recalls/recallsByVehicle
    name: 'NHTSA',
    tier: 'standard',
    probeUrl: 'https://api.nhtsa.gov/recalls/recallsByVehicle?make=toyota&modelYear=2024',
    staleTtlHours: 720,
    cacheKeyPattern: 'nhtsa:*',
  },
  {
    // Verified: uses data.gov rate limiter with API_KEY param
    name: 'FBI UCR',
    tier: 'standard',
    probeUrl: 'https://api.usa.gov/crime/fbi/cde/arrest/national/all?from=2020&to=2020',
    requiresKey: 'DATA_GOV_API_KEY',
    keyMethod: 'query',
    keyParam: 'API_KEY',
    staleTtlHours: 720,
    cacheKeyPattern: 'fbi:*',
  },
  {
    // Verified: openstates-api.ts uses apikey query param
    name: 'Open States',
    tier: 'standard',
    probeUrl: 'https://v3.openstates.org/jurisdictions',
    requiresKey: 'OPENSTATES_API_KEY',
    keyMethod: 'query',
    keyParam: 'apikey',
    staleTtlHours: 168,
    cacheKeyPattern: 'openstates:*',
  },
  {
    name: 'USASpending',
    tier: 'standard',
    probeUrl: 'https://api.usaspending.gov/api/v2/references/agency/',
    staleTtlHours: 336,
    cacheKeyPattern: 'usaspending:*',
  },
  {
    // Verified: senate-disclosure-service.ts fetches this exact URL
    name: 'Senate Stock Watcher',
    tier: 'standard',
    probeUrl:
      'https://raw.githubusercontent.com/timothycarambat/senate-stock-watcher-data/master/aggregate/all_transactions_for_senators.json',
    probeMethod: 'HEAD', // Don't download the full JSON, just check it exists
    staleTtlHours: 168,
    cacheKeyPattern: 'senate-disclosures:*',
  },
  {
    // Verified: house-disclosure-service.ts fetches ZIP at /public_disc/financial-pdfs/{year}FD.ZIP
    // Use HEAD to check file exists without downloading the ZIP
    name: 'House Disclosures',
    tier: 'standard',
    probeUrl: `https://disclosures-clerk.house.gov/public_disc/financial-pdfs/${new Date().getFullYear()}FD.ZIP`,
    probeMethod: 'HEAD',
    staleTtlHours: 168,
    cacheKeyPattern: 'house-disclosures:*',
  },
  {
    name: 'Wikidata',
    tier: 'standard',
    probeUrl:
      'https://query.wikidata.org/sparql?query=SELECT%20%3Fitem%20WHERE%20%7B%20%3Fitem%20wdt%3AP31%20wd%3AQ5%20%7D%20LIMIT%201&format=json',
    staleTtlHours: 720,
    cacheKeyPattern: 'wikidata:*',
  },
];

// ── Rotation Logic ──────────────────────────────────────────────────

/**
 * Select which non-critical sources to probe this call.
 * Uses hour-of-day to deterministically rotate through sources
 * so each non-critical source gets probed roughly once per day.
 */
function selectSourcesToProbe(): SourceDefinition[] {
  const critical = DATA_SOURCES.filter(s => s.tier === 'critical');
  const important = DATA_SOURCES.filter(s => s.tier === 'important');
  const standard = DATA_SOURCES.filter(s => s.tier === 'standard');

  // Always probe critical sources
  const selected = [...critical];

  // Rotate important: probe 2 per call based on hour
  const hour = new Date().getUTCHours();
  const importantBatch = 2;
  const importantStart = (hour % Math.ceil(important.length / importantBatch)) * importantBatch;
  for (let i = 0; i < importantBatch && importantStart + i < important.length; i++) {
    selected.push(important[importantStart + i]!);
  }

  // Rotate standard: probe 3 per call based on hour
  const standardBatch = 3;
  const standardStart = (hour % Math.ceil(standard.length / standardBatch)) * standardBatch;
  for (let i = 0; i < standardBatch && standardStart + i < standard.length; i++) {
    selected.push(standard[standardStart + i]!);
  }

  return selected;
}

// ── Probe Logic ─────────────────────────────────────────────────────

interface SourceResult {
  name: string;
  tier: SourceTier;
  status: SourceStatus;
  responseTimeMs: number | null;
  httpStatus: number | null;
  lastSuccessfulFetch: string | null;
  error: string | null;
}

const PROBE_TIMEOUT_MS = 8000;
const DEGRADED_THRESHOLD_MS = 3000;

async function probeSource(source: SourceDefinition): Promise<SourceResult> {
  const start = Date.now();

  // Check if API key is required but missing
  if (source.requiresKey) {
    const keyValue = process.env[source.requiresKey];
    if (!keyValue) {
      return {
        name: source.name,
        tier: source.tier,
        status: 'down',
        responseTimeMs: null,
        httpStatus: null,
        lastSuccessfulFetch: await getLastSuccessfulFetch(source),
        error: `Missing ${source.requiresKey}`,
      };
    }
  }

  try {
    let url = source.probeUrl;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'CIV.IQ Health Check (civdotiq.org)',
    };

    // Add API key
    if (source.requiresKey && source.keyMethod && source.keyParam) {
      const keyValue = process.env[source.requiresKey]!;
      if (source.keyMethod === 'query') {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}${source.keyParam}=${keyValue}`;
      } else {
        // Use keyPrefix if specified (e.g., 'Bearer', 'Token'), otherwise raw value
        const headerValue = source.keyPrefix ? `${source.keyPrefix} ${keyValue}` : keyValue;
        headers[source.keyParam] = headerValue;
      }
    }

    // POST probes need Content-Type
    const method = source.probeMethod ?? 'GET';
    if (method === 'POST' && source.probeBody) {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    const response = await fetch(url, {
      method,
      headers,
      body: source.probeBody ?? undefined,
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);
    const elapsed = Date.now() - start;
    const expectedStatus = source.expectedStatus ?? 200;

    if (response.status === expectedStatus) {
      // Record successful probe in Redis
      await recordSuccessfulProbe(source);

      return {
        name: source.name,
        tier: source.tier,
        status: elapsed > DEGRADED_THRESHOLD_MS ? 'degraded' : 'ok',
        responseTimeMs: elapsed,
        httpStatus: response.status,
        lastSuccessfulFetch: new Date().toISOString(),
        error: null,
      };
    }

    // 429 = our key is rate-limited, NOT that the upstream is down. Surface
    // as `degraded` so the dashboard reports the real condition (quota
    // pressure on our side) instead of a false "source down" alarm.
    if (response.status === 429) {
      return {
        name: source.name,
        tier: source.tier,
        status: 'degraded',
        responseTimeMs: elapsed,
        httpStatus: response.status,
        lastSuccessfulFetch: await getLastSuccessfulFetch(source),
        error: 'Rate limited (429) — our key, not upstream',
      };
    }

    return {
      name: source.name,
      tier: source.tier,
      status: 'down',
      responseTimeMs: elapsed,
      httpStatus: response.status,
      lastSuccessfulFetch: await getLastSuccessfulFetch(source),
      error: `Unexpected HTTP ${response.status}`,
    };
  } catch (err) {
    const elapsed = Date.now() - start;
    const message = err instanceof Error ? err.message : 'Unknown error';
    const isTimeout = message.includes('abort');

    return {
      name: source.name,
      tier: source.tier,
      status: 'down',
      responseTimeMs: isTimeout ? PROBE_TIMEOUT_MS : elapsed,
      httpStatus: null,
      lastSuccessfulFetch: await getLastSuccessfulFetch(source),
      error: isTimeout ? `Timeout (${PROBE_TIMEOUT_MS}ms)` : message,
    };
  }
}

/** Slug used as Redis key suffix for a source. */
function sourceSlug(source: SourceDefinition): string {
  return source.name.toLowerCase().replace(/\s+/g, '-');
}

/** 30 days in seconds — how long to keep the last-success timestamp. */
const LAST_SUCCESS_TTL = 30 * 24 * 60 * 60;

/**
 * Record a successful probe in Redis so future calls (and calls that
 * skip this source due to rotation) can report when data was last reachable.
 */
async function recordSuccessfulProbe(source: SourceDefinition): Promise<void> {
  try {
    const redis = getRedisCache();
    const status = redis.getStatus();
    if (!status.isConnected && !status.redisAvailable) return;

    const metaKey = `health:last-success:${sourceSlug(source)}`;
    await redis.set(metaKey, new Date().toISOString(), LAST_SUCCESS_TTL);
  } catch {
    // Non-critical — don't let metadata writes break the health check
  }
}

/**
 * Read the last successful probe timestamp from Redis.
 * Returns null if Redis is unavailable or no probe has succeeded yet.
 */
async function getLastSuccessfulFetch(source: SourceDefinition): Promise<string | null> {
  try {
    const redis = getRedisCache();
    const status = redis.getStatus();
    if (!status.isConnected && !status.redisAvailable) return null;

    const metaKey = `health:last-success:${sourceSlug(source)}`;
    const timestamp = await redis.get<string>(metaKey);
    return timestamp ?? null;
  } catch {
    return null;
  }
}

// ── Skipped source entries ──────────────────────────────────────────

function skippedResult(source: SourceDefinition): SourceResult {
  return {
    name: source.name,
    tier: source.tier,
    status: 'skipped',
    responseTimeMs: null,
    httpStatus: null,
    lastSuccessfulFetch: null,
    error: null,
  };
}

// ── Overall Health ──────────────────────────────────────────────────

type OverallHealth = 'healthy' | 'degraded' | 'critical';

function computeOverallHealth(results: SourceResult[]): OverallHealth {
  const probed = results.filter(r => r.status !== 'skipped');
  const criticalDown = probed.filter(r => r.tier === 'critical' && r.status === 'down');
  const anyDown = probed.filter(r => r.status === 'down');
  const anyDegraded = probed.filter(r => r.status === 'degraded');

  if (criticalDown.length > 0) return 'critical';
  if (anyDown.length >= 3 || anyDegraded.length >= 3) return 'degraded';
  if (anyDown.length > 0 || anyDegraded.length > 0) return 'degraded';
  return 'healthy';
}

// ── Route Handler ───────────────────────────────────────────────────

interface HealthResponse {
  status: OverallHealth;
  timestamp: string;
  uptime: number;
  environment: string;
  sources: SourceResult[];
  summary: {
    total: number;
    probed: number;
    ok: number;
    degraded: number;
    down: number;
    skipped: number;
  };
  redis: {
    connected: boolean;
    available: boolean;
  };
  apiKeys: Record<string, boolean>;
}

const startTime = Date.now();

export async function GET(_request: NextRequest) {
  try {
    const selectedSources = selectSourcesToProbe();
    const selectedNames = new Set(selectedSources.map(s => s.name));

    // Probe selected sources in parallel
    const probePromises = selectedSources.map(source => probeSource(source));
    const probeResults = await Promise.all(probePromises);

    // Add skipped entries for non-selected sources
    const skippedResults = DATA_SOURCES.filter(s => !selectedNames.has(s.name)).map(s =>
      skippedResult(s)
    );

    const allResults = [...probeResults, ...skippedResults];

    // Redis status
    const redis = getRedisCache();
    const redisStatus = redis.getStatus();

    const probed = allResults.filter(r => r.status !== 'skipped');

    const response: HealthResponse = {
      status: computeOverallHealth(allResults),
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      environment: process.env.NODE_ENV ?? 'development',
      sources: allResults,
      summary: {
        total: allResults.length,
        probed: probed.length,
        ok: probed.filter(r => r.status === 'ok').length,
        degraded: probed.filter(r => r.status === 'degraded').length,
        down: probed.filter(r => r.status === 'down').length,
        skipped: allResults.filter(r => r.status === 'skipped').length,
      },
      redis: {
        connected: redisStatus.isConnected,
        available: redisStatus.redisAvailable,
      },
      apiKeys: {
        congress: !!process.env.CONGRESS_API_KEY,
        fec: !!process.env.FEC_API_KEY,
        census: !!process.env.CENSUS_API_KEY,
        openstates: !!process.env.OPENSTATES_API_KEY,
        fred: !!process.env.FRED_API_KEY,
        dataGov: !!process.env.DATA_GOV_API_KEY,
        noaa: !!process.env.NOAA_TOKEN,
        hud: !!process.env.HUD_API_TOKEN,
        dol: !!process.env.DOL_API_KEY,
        courtlistener: !!process.env.COURTLISTENER_API_TOKEN,
        eia: !!process.env.EIA_API_KEY,
      },
    };

    const httpStatus = response.status === 'critical' ? 503 : 200;

    logger.info('Health check completed', {
      status: response.status,
      probed: response.summary.probed,
      ok: response.summary.ok,
      down: response.summary.down,
    });

    return NextResponse.json(response, { status: httpStatus });
  } catch (error) {
    logger.error('Health check failed', error as Error);

    return NextResponse.json(
      {
        status: 'critical' as const,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - startTime,
        environment: process.env.NODE_ENV ?? 'development',
        sources: [],
        summary: { total: 0, probed: 0, ok: 0, degraded: 0, down: 0, skipped: 0 },
        redis: { connected: false, available: false },
        apiKeys: {},
        error: (error as Error).message,
      },
      { status: 503 }
    );
  }
}

// HEAD for load balancers — fast, no probing
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
