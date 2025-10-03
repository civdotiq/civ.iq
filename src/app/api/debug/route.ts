/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Diagnostic API route for Vercel deployment troubleshooting
 * Tests environment variables, API connectivity, and runtime configuration
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface DiagnosticResult {
  timestamp: string;
  environment: {
    nodeVersion: string;
    platform: string;
    runtime: string;
    vercelUrl?: string;
    appUrl?: string;
    nodeEnv: string;
  };
  apiKeys: {
    congressApi: boolean;
    fecApi: boolean;
    censusApi: boolean;
    openStatesApi: boolean;
    openAiApi: boolean;
  };
  apiTests: {
    representativeApi: {
      endpoint: string;
      status: number;
      success: boolean;
      error?: string;
      dataReturned: boolean;
      responseTime: number;
    };
    votesApi: {
      endpoint: string;
      status: number;
      success: boolean;
      error?: string;
      dataReturned: boolean;
      responseTime: number;
    };
    billsApi: {
      endpoint: string;
      status: number;
      success: boolean;
      error?: string;
      dataReturned: boolean;
      responseTime: number;
    };
  };
  vercelConfig: {
    isVercel: boolean;
    region?: string;
    functionMemory?: string;
    functionMaxDuration?: string;
  };
  urls: {
    currentUrl: string;
    baseUrl: string;
    nextPublicAppUrl?: string;
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get base URL from request or environment
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Test representative Bernie Sanders (I-VT)
    const testBioguideId = 'S000033';

    const diagnostic: DiagnosticResult = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        runtime: process.env.NEXT_RUNTIME || 'nodejs',
        vercelUrl: process.env.VERCEL_URL,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        nodeEnv: process.env.NODE_ENV || 'development',
      },
      apiKeys: {
        congressApi: !!process.env.CONGRESS_API_KEY,
        fecApi: !!process.env.FEC_API_KEY,
        censusApi: !!process.env.CENSUS_API_KEY,
        openStatesApi: !!process.env.OPENSTATES_API_KEY,
        openAiApi: !!process.env.OPENAI_API_KEY,
      },
      apiTests: {
        representativeApi: {
          endpoint: '',
          status: 0,
          success: false,
          dataReturned: false,
          responseTime: 0,
        },
        votesApi: {
          endpoint: '',
          status: 0,
          success: false,
          dataReturned: false,
          responseTime: 0,
        },
        billsApi: {
          endpoint: '',
          status: 0,
          success: false,
          dataReturned: false,
          responseTime: 0,
        },
      },
      vercelConfig: {
        isVercel: !!process.env.VERCEL,
        region: process.env.VERCEL_REGION,
        functionMemory: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
        functionMaxDuration: process.env.AWS_LAMBDA_FUNCTION_TIMEOUT,
      },
      urls: {
        currentUrl: request.url,
        baseUrl,
        nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
      },
    };

    // Test 1: Representative API
    try {
      const repStartTime = Date.now();
      const repEndpoint = `${baseUrl}/api/representative/${testBioguideId}`;
      diagnostic.apiTests.representativeApi.endpoint = repEndpoint;

      const repResponse = await fetch(repEndpoint, {
        signal: AbortSignal.timeout(10000),
      });

      diagnostic.apiTests.representativeApi.status = repResponse.status;
      diagnostic.apiTests.representativeApi.success = repResponse.ok;
      diagnostic.apiTests.representativeApi.responseTime = Date.now() - repStartTime;

      if (repResponse.ok) {
        const data = await repResponse.json();
        diagnostic.apiTests.representativeApi.dataReturned =
          !!data.representative || !!data.profile;
      }
    } catch (error) {
      diagnostic.apiTests.representativeApi.error =
        error instanceof Error ? error.message : 'Unknown error';
      diagnostic.apiTests.representativeApi.success = false;
    }

    // Test 2: Votes API
    try {
      const votesStartTime = Date.now();
      const votesEndpoint = `${baseUrl}/api/representative/${testBioguideId}/votes?limit=5`;
      diagnostic.apiTests.votesApi.endpoint = votesEndpoint;

      const votesResponse = await fetch(votesEndpoint, {
        signal: AbortSignal.timeout(15000),
      });

      diagnostic.apiTests.votesApi.status = votesResponse.status;
      diagnostic.apiTests.votesApi.success = votesResponse.ok;
      diagnostic.apiTests.votesApi.responseTime = Date.now() - votesStartTime;

      if (votesResponse.ok) {
        const data = await votesResponse.json();
        diagnostic.apiTests.votesApi.dataReturned =
          Array.isArray(data.votes) && data.votes.length > 0;
      }
    } catch (error) {
      diagnostic.apiTests.votesApi.error = error instanceof Error ? error.message : 'Unknown error';
      diagnostic.apiTests.votesApi.success = false;
    }

    // Test 3: Bills API
    try {
      const billsStartTime = Date.now();
      const billsEndpoint = `${baseUrl}/api/representative/${testBioguideId}/bills?limit=5`;
      diagnostic.apiTests.billsApi.endpoint = billsEndpoint;

      const billsResponse = await fetch(billsEndpoint, {
        signal: AbortSignal.timeout(15000),
      });

      diagnostic.apiTests.billsApi.status = billsResponse.status;
      diagnostic.apiTests.billsApi.success = billsResponse.ok;
      diagnostic.apiTests.billsApi.responseTime = Date.now() - billsStartTime;

      if (billsResponse.ok) {
        const data = await billsResponse.json();
        diagnostic.apiTests.billsApi.dataReturned =
          (Array.isArray(data.bills) && data.bills.length > 0) ||
          (Array.isArray(data.sponsoredLegislation) && data.sponsoredLegislation.length > 0);
      }
    } catch (error) {
      diagnostic.apiTests.billsApi.error = error instanceof Error ? error.message : 'Unknown error';
      diagnostic.apiTests.billsApi.success = false;
    }

    // Calculate total response time
    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      diagnostic,
      summary: {
        allApiKeysPresent:
          diagnostic.apiKeys.congressApi &&
          diagnostic.apiKeys.fecApi &&
          diagnostic.apiKeys.censusApi,
        allApisWorking:
          diagnostic.apiTests.representativeApi.success &&
          diagnostic.apiTests.votesApi.success &&
          diagnostic.apiTests.billsApi.success,
        totalResponseTime: totalTime,
        recommendations: generateRecommendations(diagnostic),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(diagnostic: DiagnosticResult): string[] {
  const recommendations: string[] = [];

  // Check API keys
  if (!diagnostic.apiKeys.congressApi) {
    recommendations.push('❌ CONGRESS_API_KEY is missing - representative data will be limited');
  }
  if (!diagnostic.apiKeys.fecApi) {
    recommendations.push('⚠️ FEC_API_KEY is missing - campaign finance data unavailable');
  }
  if (!diagnostic.apiKeys.censusApi) {
    recommendations.push('⚠️ CENSUS_API_KEY is missing - demographic data unavailable');
  }

  // Check NEXT_PUBLIC_APP_URL
  if (!diagnostic.environment.appUrl) {
    recommendations.push(
      '❌ NEXT_PUBLIC_APP_URL is not set - client-side API calls may fail on Vercel'
    );
  }

  // Check API tests
  if (!diagnostic.apiTests.representativeApi.success) {
    recommendations.push(
      `❌ Representative API failed: ${diagnostic.apiTests.representativeApi.error || 'Unknown error'}`
    );
  }

  if (!diagnostic.apiTests.votesApi.success) {
    recommendations.push(
      `❌ Votes API failed: ${diagnostic.apiTests.votesApi.error || 'Unknown error'}`
    );
  }

  if (!diagnostic.apiTests.billsApi.success) {
    recommendations.push(
      `❌ Bills API failed: ${diagnostic.apiTests.billsApi.error || 'Unknown error'}`
    );
  }

  // Check data returned
  if (
    diagnostic.apiTests.representativeApi.success &&
    !diagnostic.apiTests.representativeApi.dataReturned
  ) {
    recommendations.push('⚠️ Representative API returns 200 but no data');
  }

  if (diagnostic.apiTests.votesApi.success && !diagnostic.apiTests.votesApi.dataReturned) {
    recommendations.push('⚠️ Votes API returns 200 but no votes array');
  }

  if (diagnostic.apiTests.billsApi.success && !diagnostic.apiTests.billsApi.dataReturned) {
    recommendations.push('⚠️ Bills API returns 200 but no bills array');
  }

  // Check response times
  if (diagnostic.apiTests.representativeApi.responseTime > 5000) {
    recommendations.push(
      `⚠️ Representative API is slow (${diagnostic.apiTests.representativeApi.responseTime}ms) - consider caching`
    );
  }

  if (diagnostic.apiTests.votesApi.responseTime > 10000) {
    recommendations.push(
      `⚠️ Votes API is slow (${diagnostic.apiTests.votesApi.responseTime}ms) - may timeout on Vercel`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All systems operational!');
  }

  return recommendations;
}
