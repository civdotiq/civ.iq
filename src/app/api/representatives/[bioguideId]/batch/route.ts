/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getBillsByMember,
  getVotesByMember,
  getCommitteesByMember,
} from '@/features/representatives/services/congress-api';
import { fecAPI } from '@/lib/fec-api';
import { fetchGDELTNews } from '@/features/news/services/gdelt-api';

interface BatchRequestBody {
  endpoints: string[];
}

interface BatchResponse {
  success: boolean;
  data: Record<string, unknown>;
  metadata: {
    requestedEndpoints: string[];
    successfulEndpoints: string[];
    failedEndpoints: string[];
    totalRequests: number;
    cacheable: boolean;
    timestamp: string;
  };
  errors?: Record<string, { code: string; message: string }>;
}

/**
 * Batch API endpoint for fetching multiple representative data types in a single request
 * Supports: bills, votes, committees, finance, news
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse<BatchResponse>> {
  try {
    const { bioguideId } = await params;
    const { endpoints }: BatchRequestBody = await request.json();

    if (!bioguideId) {
      return NextResponse.json(
        {
          success: false,
          data: {},
          metadata: {
            requestedEndpoints: endpoints || [],
            successfulEndpoints: [],
            failedEndpoints: endpoints || [],
            totalRequests: 0,
            cacheable: false,
            timestamp: new Date().toISOString(),
          },
          errors: { general: { code: 'MISSING_BIOGUIDE_ID', message: 'bioguideId is required' } },
        },
        { status: 400 }
      );
    }

    if (!endpoints || !Array.isArray(endpoints) || endpoints.length === 0) {
      return NextResponse.json(
        {
          success: false,
          data: {},
          metadata: {
            requestedEndpoints: [],
            successfulEndpoints: [],
            failedEndpoints: [],
            totalRequests: 0,
            cacheable: false,
            timestamp: new Date().toISOString(),
          },
          errors: {
            general: { code: 'MISSING_ENDPOINTS', message: 'endpoints array is required' },
          },
        },
        { status: 400 }
      );
    }

    const validEndpoints = ['bills', 'votes', 'committees', 'finance', 'news'];
    const requestedEndpoints = endpoints.filter(endpoint => validEndpoints.includes(endpoint));

    const data: Record<string, unknown> = {};
    const errors: Record<string, { code: string; message: string }> = {};
    const successfulEndpoints: string[] = [];
    const failedEndpoints: string[] = [];

    // Execute all requests in parallel for better performance
    const promises = requestedEndpoints.map(async endpoint => {
      try {
        let result;
        switch (endpoint) {
          case 'bills':
            result = await getBillsByMember(bioguideId);
            break;
          case 'votes':
            result = await getVotesByMember(bioguideId);
            break;
          case 'committees':
            result = await getCommitteesByMember(bioguideId);
            break;
          case 'finance':
            result = await fecAPI.getCandidateFinancials(bioguideId);
            break;
          case 'news':
            result = await fetchGDELTNews(bioguideId);
            break;
          default:
            throw new Error(`Unknown endpoint: ${endpoint}`);
        }

        data[endpoint] = result;
        successfulEndpoints.push(endpoint);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors[endpoint] = {
          code: 'ENDPOINT_ERROR',
          message: `Failed to fetch ${endpoint}: ${errorMessage}`,
        };
        failedEndpoints.push(endpoint);
      }
    });

    // Wait for all requests to complete
    await Promise.allSettled(promises);

    const response: BatchResponse = {
      success: successfulEndpoints.length > 0,
      data,
      metadata: {
        requestedEndpoints,
        successfulEndpoints,
        failedEndpoints,
        totalRequests: requestedEndpoints.length,
        cacheable: true,
        timestamp: new Date().toISOString(),
      },
    };

    if (Object.keys(errors).length > 0) {
      response.errors = errors;
    }

    // Set cache headers for successful responses
    const headers: Record<string, string> = {};
    if (successfulEndpoints.length > 0) {
      headers['Cache-Control'] = 'public, s-maxage=300, stale-while-revalidate=600'; // 5 min cache
    }

    return NextResponse.json(response, {
      status: successfulEndpoints.length > 0 ? 200 : 500,
      headers,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';

    return NextResponse.json(
      {
        success: false,
        data: {},
        metadata: {
          requestedEndpoints: [],
          successfulEndpoints: [],
          failedEndpoints: [],
          totalRequests: 0,
          cacheable: false,
          timestamp: new Date().toISOString(),
        },
        errors: {
          server: {
            code: 'INTERNAL_SERVER_ERROR',
            message: errorMessage,
          },
        },
      },
      { status: 500 }
    );
  }
}
