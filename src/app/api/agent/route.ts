/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

interface DebugResults {
  apiCall?: {
    url?: string;
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    ok?: boolean;
    hasData?: boolean;
    dataSource?: string;
    representativeName?: string;
    error?: string;
    message?: string;
  };
  congressLegislators?: {
    hasData?: boolean;
    name?: string;
    party?: string;
    state?: string;
    chamber?: string;
    hasSocialMedia?: boolean;
    hasCurrentTerm?: boolean;
    error?: string;
    message?: string;
  };
  environment?: {
    nodeEnv?: string;
    vercelUrl?: boolean;
    congressApiKey?: boolean;
    fecApiKey?: boolean;
    censusApiKey?: boolean;
  };
  frontendSimulation?: {
    status?: number;
    statusText?: string;
    ok?: boolean;
    hasRepresentative?: boolean;
    representativeName?: string;
    error?: string;
    message?: string;
    wouldTriggerNotFound?: boolean;
  };
  commonIds?: Record<
    string,
    {
      status?: number;
      ok?: boolean;
      name?: string;
      error?: string;
    }
  >;
}

interface DebugInfo {
  timestamp: string;
  bioguideId: string;
  testRequested: string;
  environment: string | undefined;
  results: DebugResults;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const bioguideId = searchParams.get('bioguideId') || 'P000595'; // Default to Gary Peters
  const test = searchParams.get('test') || 'all';

  const debugInfo: DebugInfo = {
    timestamp: new Date().toISOString(),
    bioguideId: bioguideId,
    testRequested: test,
    environment: process.env.NODE_ENV,
    results: {},
  };

  logger.info(`[AGENT] Starting debug for bioguideId: ${bioguideId}`);

  try {
    // Test 1: Direct API call to our representative endpoint
    if (test === 'all' || test === 'api') {
      logger.info('[AGENT] Testing direct API call...');
      try {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NODE_ENV === 'development'
            ? `http://localhost:${process.env.PORT || 3000}`
            : 'https://civdotiq.org';

        const apiResponse = await fetch(`${baseUrl}/api/representative/${bioguideId}`, {
          method: 'GET',
          credentials: 'omit',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        debugInfo.results.apiCall = {
          url: `${baseUrl}/api/representative/${bioguideId}`,
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          headers: Object.fromEntries(apiResponse.headers.entries()),
          ok: apiResponse.ok,
        };

        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          debugInfo.results.apiCall.hasData = !!apiData.representative;
          debugInfo.results.apiCall.dataSource = apiData.metadata?.dataSource;
          debugInfo.results.apiCall.representativeName = apiData.representative?.name;
        } else {
          const errorText = await apiResponse.text();
          debugInfo.results.apiCall.error = errorText;
        }
      } catch (error) {
        debugInfo.results.apiCall = {
          error: 'Exception occurred',
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }

    // Test 2: Direct congress-legislators call
    if (test === 'all' || test === 'congress') {
      logger.info('[AGENT] Testing congress-legislators service...');
      try {
        const enhancedData = await getEnhancedRepresentative(bioguideId);
        debugInfo.results.congressLegislators = {
          hasData: !!enhancedData,
          name: enhancedData?.name,
          party: enhancedData?.party,
          state: enhancedData?.state,
          chamber: enhancedData?.chamber,
          hasSocialMedia: !!enhancedData?.socialMedia,
          hasCurrentTerm: !!enhancedData?.currentTerm,
        };
      } catch (error) {
        debugInfo.results.congressLegislators = {
          error: 'Exception occurred',
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }

    // Test 3: Environment variables check
    if (test === 'all' || test === 'env') {
      logger.info('[AGENT] Checking environment variables...');
      debugInfo.results.environment = {
        nodeEnv: process.env.NODE_ENV,
        vercelUrl: !!process.env.VERCEL_URL,
        congressApiKey: !!process.env.CONGRESS_API_KEY,
        fecApiKey: !!process.env.FEC_API_KEY,
        censusApiKey: !!process.env.CENSUS_API_KEY,
      };
    }

    // Test 4: Frontend simulation
    if (test === 'all' || test === 'frontend') {
      logger.info('[AGENT] Simulating frontend call...');
      try {
        // Simulate the exact same call the frontend makes
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NODE_ENV === 'development'
            ? `http://localhost:${process.env.PORT || 3001}`
            : 'https://civdotiq.org';

        const frontendResponse = await fetch(`${baseUrl}/api/representative/${bioguideId}`, {
          method: 'GET',
          credentials: 'omit',
          headers: {
            'Content-Type': 'application/json',
          },
          next: {
            revalidate: 300,
            tags: [`representative-${bioguideId}`, 'representative'],
          },
        } as RequestInit & { next?: { revalidate?: number; tags?: string[] } });

        debugInfo.results.frontendSimulation = {
          status: frontendResponse.status,
          statusText: frontendResponse.statusText,
          ok: frontendResponse.ok,
        };

        if (frontendResponse.ok) {
          const frontendData = await frontendResponse.json();
          debugInfo.results.frontendSimulation.hasRepresentative = !!frontendData.representative;
          debugInfo.results.frontendSimulation.representativeName =
            frontendData.representative?.name;
        } else {
          const errorText = await frontendResponse.text();
          debugInfo.results.frontendSimulation.error = errorText;

          // Check if this would trigger notFound() in the frontend
          if (frontendResponse.status === 404) {
            debugInfo.results.frontendSimulation.wouldTriggerNotFound = true;
          }
        }
      } catch (error) {
        debugInfo.results.frontendSimulation = {
          error: 'Exception occurred',
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }

    // Test 5: Common bioguideIds
    if (test === 'all' || test === 'common') {
      logger.info('[AGENT] Testing common bioguideIds...');
      const commonIds = ['P000595', 'S000770', 'B001230', 'S000148'];
      debugInfo.results.commonIds = {};

      for (const id of commonIds) {
        try {
          const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : process.env.NODE_ENV === 'development'
              ? `http://localhost:${process.env.PORT || 3000}`
              : 'https://civdotiq.org';

          const testResponse = await fetch(`${baseUrl}/api/representative/${id}`, {
            method: 'GET',
            credentials: 'omit',
          });

          debugInfo.results.commonIds[id] = {
            status: testResponse.status,
            ok: testResponse.ok,
          };

          if (testResponse.ok) {
            const testData = await testResponse.json();
            debugInfo.results.commonIds[id].name = testData.representative?.name;
          }
        } catch (error) {
          debugInfo.results.commonIds[id] = {
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    }

    logger.info('[AGENT] Debug complete');
    logger.info('Agent debug completed', {
      bioguideId,
      test,
      hasResults: Object.keys(debugInfo.results).length > 0,
    });

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      recommendations: generateRecommendations(debugInfo),
    });
  } catch (error) {
    logger.error('[AGENT] Debug failed', error as Error);
    logger.error('Agent debug failed', error as Error, { bioguideId, test });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        debug: debugInfo,
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(debugInfo: DebugInfo): string[] {
  const recommendations: string[] = [];

  // Check API call results
  if (debugInfo.results.apiCall) {
    if (!debugInfo.results.apiCall.ok) {
      recommendations.push(
        `API call failed with status ${debugInfo.results.apiCall.status}. Check API endpoint.`
      );
    }
    if (debugInfo.results.apiCall.status === 404) {
      recommendations.push('API returning 404 - this would trigger notFound() in frontend.');
    }
  }

  // Check congress-legislators
  if (debugInfo.results.congressLegislators && !debugInfo.results.congressLegislators.hasData) {
    recommendations.push(
      'congress-legislators service not returning data. Check network/API keys.'
    );
  }

  // Check environment
  if (debugInfo.results.environment) {
    if (!debugInfo.results.environment.congressApiKey) {
      recommendations.push('Congress API key missing - API will use fallback data only.');
    }
  }

  // Check frontend simulation
  if (
    debugInfo.results.frontendSimulation &&
    debugInfo.results.frontendSimulation.wouldTriggerNotFound
  ) {
    recommendations.push('Frontend would call notFound() due to 404 response from API.');
  }

  if (recommendations.length === 0) {
    recommendations.push('All tests passed. The issue may be intermittent or deployment-specific.');
  }

  return recommendations;
}
