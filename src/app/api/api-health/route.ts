/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

interface APIHealthCheck {
  name: string;
  status: 'operational' | 'degraded' | 'error';
  responseTime: number;
  lastChecked: string;
  details?: unknown;
  error?: string;
}

interface HealthReport {
  timestamp: string;
  overall: 'operational' | 'degraded' | 'error';
  apis: APIHealthCheck[];
  environment: {
    NODE_ENV: string;
    apiKeysConfigured: {
      congress: boolean;
      fec: boolean;
      census: boolean;
      openStates: boolean;
      openAI: boolean;
    };
  };
}

async function checkAPI(name: string, url: string, options?: RequestInit): Promise<APIHealthCheck> {
  const start = Date.now();
  const check: APIHealthCheck = {
    name,
    status: 'error',
    responseTime: 0,
    lastChecked: new Date().toISOString(),
  };

  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    check.responseTime = Date.now() - start;

    if (response.ok) {
      check.status = 'operational';
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        const data = await response.json();
        check.details = {
          hasData: !!data,
          sampleSize: Array.isArray(data)
            ? data.length
            : data.results
              ? data.results.length
              : data.members
                ? data.members.length
                : data.bills
                  ? data.bills.length
                  : 1,
        };
      }
    } else {
      check.status = 'degraded';
      check.error = `HTTP ${response.status}: ${response.statusText}`;
    }
  } catch (error) {
    check.status = 'error';
    check.error = error instanceof Error ? error.message : 'Unknown error';
    check.responseTime = Date.now() - start;
  }

  return check;
}

export async function GET(request: NextRequest) {
  try {
    logger.info(
      'Running API health checks',
      {
        operation: 'api_health_check',
      },
      request
    );

    const checks: APIHealthCheck[] = [];

    // 1. Congress.gov API
    if (process.env.CONGRESS_API_KEY) {
      const congressCheck = await checkAPI(
        'Congress.gov API',
        `https://api.congress.gov/v3/member?api_key=${process.env.CONGRESS_API_KEY}&limit=2&format=json`,
        {
          headers: {
            Accept: 'application/json',
            'X-API-Key': process.env.CONGRESS_API_KEY,
          },
        }
      );
      checks.push(congressCheck);
    } else {
      checks.push({
        name: 'Congress.gov API',
        status: 'error',
        responseTime: 0,
        lastChecked: new Date().toISOString(),
        error: 'API key not configured',
      });
    }

    // 2. FEC API
    if (process.env.FEC_API_KEY) {
      const fecCheck = await checkAPI(
        'FEC API',
        `https://api.open.fec.gov/v1/candidates/?api_key=${process.env.FEC_API_KEY}&per_page=2&is_active_candidate=true`,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );
      checks.push(fecCheck);
    } else {
      checks.push({
        name: 'FEC API',
        status: 'error',
        responseTime: 0,
        lastChecked: new Date().toISOString(),
        error: 'API key not configured',
      });
    }

    // 3. Census Geocoding API (no key required)
    const censusCheck = await checkAPI(
      'Census Geocoding API',
      'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=1600+Pennsylvania+Ave+Washington+DC&benchmark=4&vintage=Current_119th&format=json'
    );
    checks.push(censusCheck);

    // 4. Congress-Legislators GitHub
    const legislatorsCheck = await checkAPI(
      'Congress-Legislators Data',
      'https://api.github.com/repos/unitedstates/congress-legislators/commits?per_page=1',
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    checks.push(legislatorsCheck);

    // 5. GDELT API (no key required)
    const gdeltCheck = await checkAPI(
      'GDELT API',
      'https://api.gdeltproject.org/api/v2/doc/doc?query=Congress&mode=artlist&maxrecords=2&format=json'
    );
    checks.push(gdeltCheck);

    // 6. OpenStates API
    if (process.env.OPENSTATES_API_KEY) {
      const openStatesCheck = await checkAPI(
        'OpenStates API',
        'https://v3.openstates.org/people?jurisdiction=us&per_page=2',
        {
          headers: {
            Accept: 'application/json',
            'X-API-KEY': process.env.OPENSTATES_API_KEY,
          },
        }
      );
      checks.push(openStatesCheck);
    } else {
      checks.push({
        name: 'OpenStates API',
        status: 'error',
        responseTime: 0,
        lastChecked: new Date().toISOString(),
        error: 'API key not configured',
      });
    }

    // 7. Internal API endpoints
    const baseUrl = request.nextUrl.origin;

    // Test representatives endpoint
    const repsCheck = await checkAPI(
      'Representatives Endpoint',
      `${baseUrl}/api/representatives?zip=48221`
    );
    checks.push(repsCheck);

    // Test representative profile endpoint
    const profileCheck = await checkAPI(
      'Representative Profile Endpoint',
      `${baseUrl}/api/representative/S001184`
    );
    checks.push(profileCheck);

    // Determine overall status
    const operationalCount = checks.filter(c => c.status === 'operational').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;
    const errorCount = checks.filter(c => c.status === 'error').length;

    let overall: 'operational' | 'degraded' | 'error' = 'operational';
    if (errorCount > checks.length / 2) {
      overall = 'error';
    } else if (degradedCount > 0 || errorCount > 0) {
      overall = 'degraded';
    }

    const report: HealthReport = {
      timestamp: new Date().toISOString(),
      overall,
      apis: checks,
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        apiKeysConfigured: {
          congress: !!process.env.CONGRESS_API_KEY,
          fec: !!process.env.FEC_API_KEY,
          census: !!process.env.CENSUS_API_KEY,
          openStates: !!process.env.OPENSTATES_API_KEY,
          openAI: !!process.env.OPENAI_API_KEY,
        },
      },
    };

    logger.info(
      'API health check completed',
      {
        operation: 'api_health_check',
        overall: report.overall,
        operationalCount,
        degradedCount,
        errorCount,
      },
      request
    );

    return NextResponse.json(report, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    logger.error(
      'API health check failed',
      error as Error,
      {
        operation: 'api_health_check',
      },
      request
    );

    return NextResponse.json(
      {
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
