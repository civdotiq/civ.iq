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
  /** Whether the probe needs an API key */
  requiresKey?: string;
  /** How to add the key */
  keyMethod?: 'query' | 'header';
  /** Query param or header name for the key */
  keyParam?: string;
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
    probeUrl: 'https://api.congress.gov/v3',
    requiresKey: 'CONGRESS_API_KEY',
    keyMethod: 'query',
    keyParam: 'api_key',
    staleTtlHours: 24,
    cacheKeyPattern: 'congress:*',
  },
  {
    name: 'FEC',
    tier: 'critical',
    probeUrl: 'https://api.open.fec.gov/v1/',
    staleTtlHours: 48,
    cacheKeyPattern: 'fec:*',
  },
  {
    name: 'Senate LDA',
    tier: 'critical',
    probeUrl: 'https://lda.senate.gov/api/v1/filings/?filing_period=2025&page_size=1',
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
    name: 'SEC EDGAR',
    tier: 'standard',
    probeUrl:
      'https://efts.sec.gov/LATEST/search-index?q=test&dateRange=custom&startdt=2025-01-01&enddt=2025-01-02',
    staleTtlHours: 336,
    cacheKeyPattern: 'sec:*',
  },
  {
    name: 'OSHA',
    tier: 'standard',
    probeUrl: 'https://apiprod.dol.gov/v4/osha/inspection?$top=1',
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
    name: 'CourtListener',
    tier: 'standard',
    probeUrl: 'https://www.courtlistener.com/api/rest/v4/courts/?page_size=1',
    staleTtlHours: 336,
    cacheKeyPattern: 'courtlistener:*',
  },
  {
    name: 'NOAA',
    tier: 'standard',
    probeUrl: 'https://www.ncdc.noaa.gov/cdo-web/api/v2/datasets?limit=1',
    requiresKey: 'NOAA_API_KEY',
    keyMethod: 'header',
    keyParam: 'token',
    staleTtlHours: 720,
    cacheKeyPattern: 'noaa:*',
  },
  {
    name: 'EIA',
    tier: 'standard',
    probeUrl: 'https://api.eia.gov/v2/?api_key=',
    requiresKey: 'EIA_API_KEY',
    keyMethod: 'query',
    keyParam: 'api_key',
    staleTtlHours: 720,
    cacheKeyPattern: 'eia:*',
  },
  {
    name: 'HUD',
    tier: 'standard',
    probeUrl: 'https://www.huduser.gov/hudapi/public/fmr/listMetroAreas',
    requiresKey: 'HUD_API_KEY',
    keyMethod: 'header',
    keyParam: 'Authorization',
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
    name: 'NIH Reporter',
    tier: 'standard',
    probeUrl: 'https://api.reporter.nih.gov/v2/projects/search',
    expectedStatus: 405, // POST-only endpoint, GET returns 405
    staleTtlHours: 720,
    cacheKeyPattern: 'nih:*',
  },
  {
    name: 'CMS',
    tier: 'standard',
    probeUrl: 'https://data.cms.gov/provider-data/api/1/datastore/query/mj5m-pzi6?limit=1',
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
    name: 'NHTSA',
    tier: 'standard',
    probeUrl: 'https://api.nhtsa.gov/products/vehicle/makes?issueType=r',
    staleTtlHours: 720,
    cacheKeyPattern: 'nhtsa:*',
  },
  {
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
    name: 'Open States',
    tier: 'standard',
    probeUrl: 'https://v3.openstates.org/jurisdictions?apikey=',
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
    name: 'Senate Stock Watcher',
    tier: 'standard',
    probeUrl:
      'https://raw.githubusercontent.com/timothycarambat/senate-stock-watcher-data/master/aggregate/all_transactions_for_senators.json',
    expectedStatus: 200,
    staleTtlHours: 168,
    cacheKeyPattern: 'senate-disclosures:*',
  },
  {
    name: 'House Disclosures',
    tier: 'standard',
    probeUrl: 'https://disclosures-clerk.house.gov/PublicDisclosure/FinancialDisclosure',
    expectedStatus: 200,
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
        const headerValue = source.keyParam === 'Authorization' ? `Bearer ${keyValue}` : keyValue;
        headers[source.keyParam] = headerValue;
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      // Avoid Next.js caching of fetch
      cache: 'no-store',
    });

    clearTimeout(timeout);
    const elapsed = Date.now() - start;
    const expectedStatus = source.expectedStatus ?? 200;

    if (response.status === expectedStatus) {
      return {
        name: source.name,
        tier: source.tier,
        status: elapsed > DEGRADED_THRESHOLD_MS ? 'degraded' : 'ok',
        responseTimeMs: elapsed,
        httpStatus: response.status,
        lastSuccessfulFetch: await getLastSuccessfulFetch(source),
        error: null,
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

/**
 * Check Redis for the most recent cached entry matching this source's pattern.
 * Returns the timestamp of the cache entry if found.
 */
async function getLastSuccessfulFetch(source: SourceDefinition): Promise<string | null> {
  if (!source.cacheKeyPattern) return null;

  try {
    const redis = getRedisCache();
    const status = redis.getStatus();
    if (!status.isConnected && !status.redisAvailable) return null;

    // Check if any key matching the pattern exists
    // We store a dedicated health metadata key per source
    const metaKey = `health:last-success:${source.name.toLowerCase().replace(/\s+/g, '-')}`;
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
        regulationsGov: !!process.env.REGULATIONS_GOV_API_KEY,
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
