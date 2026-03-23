/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ApiCheckResult {
  status: 'ok' | 'error';
  latencyMs: number;
  message?: string;
}

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  apiKeys: {
    congress: ApiCheckResult;
    fec: ApiCheckResult;
    census: boolean;
    openstates: boolean;
    followthemoney: boolean;
  };
}

const startTime = Date.now();

// Cache live check results for 60s to avoid hammering upstream APIs
let cachedResult: { data: HealthCheck; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

async function checkApi(url: string, timeoutMs: number = 5000): Promise<ApiCheckResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const latencyMs = Date.now() - start;

    if (response.ok) {
      return { status: 'ok', latencyMs };
    }
    return {
      status: 'error',
      latencyMs,
      message: `HTTP ${response.status}`,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message =
      err instanceof DOMException && err.name === 'AbortError'
        ? 'Timeout'
        : err instanceof Error
          ? err.message
          : 'Unknown error';
    return { status: 'error', latencyMs, message };
  } finally {
    clearTimeout(timeout);
  }
}

async function runHealthChecks(): Promise<HealthCheck> {
  const congressKey = process.env.CONGRESS_API_KEY;
  const fecKey = process.env.FEC_API_KEY;

  // Live validation for Congress.gov and FEC (known stable endpoints)
  const [congressResult, fecResult] = await Promise.allSettled([
    congressKey
      ? checkApi(`https://api.congress.gov/v3/bill/118/hr/1?api_key=${congressKey}`)
      : Promise.resolve<ApiCheckResult>({
          status: 'error',
          latencyMs: 0,
          message: 'API key not configured',
        }),
    fecKey
      ? checkApi(`https://api.open.fec.gov/v1/candidate/P00003335/?api_key=${fecKey}`)
      : Promise.resolve<ApiCheckResult>({
          status: 'error',
          latencyMs: 0,
          message: 'API key not configured',
        }),
  ]);

  const congress =
    congressResult.status === 'fulfilled'
      ? congressResult.value
      : { status: 'error' as const, latencyMs: 0, message: 'Check failed' };
  const fec =
    fecResult.status === 'fulfilled'
      ? fecResult.value
      : { status: 'error' as const, latencyMs: 0, message: 'Check failed' };

  // Existence checks for less critical APIs (avoid rate limiting)
  const census = !!process.env.CENSUS_API_KEY;
  const openstates = !!process.env.OPENSTATES_API_KEY;
  const followthemoney = !!process.env.FOLLOWTHEMONEY_API_KEY;

  const allLiveOk = congress.status === 'ok' && fec.status === 'ok';
  const anyLiveOk = congress.status === 'ok' || fec.status === 'ok';

  return {
    status: allLiveOk ? 'healthy' : anyLiveOk ? 'degraded' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    apiKeys: { congress, fec, census, openstates, followthemoney },
  };
}

export async function GET(_request: NextRequest) {
  try {
    const now = Date.now();
    if (cachedResult && now < cachedResult.expiresAt) {
      return NextResponse.json(cachedResult.data, {
        status: cachedResult.data.status === 'unhealthy' ? 503 : 200,
      });
    }

    const healthCheck = await runHealthChecks();

    cachedResult = { data: healthCheck, expiresAt: now + CACHE_TTL_MS };

    return NextResponse.json(healthCheck, {
      status: healthCheck.status === 'unhealthy' ? 503 : 200,
    });
  } catch {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - startTime,
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        apiKeys: {
          congress: { status: 'error', latencyMs: 0, message: 'Check failed' },
          fec: { status: 'error', latencyMs: 0, message: 'Check failed' },
          census: false,
          openstates: false,
          followthemoney: false,
        },
      } satisfies HealthCheck,
      { status: 503 }
    );
  }
}

// Simple health endpoint for load balancers
export async function HEAD(_request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}
