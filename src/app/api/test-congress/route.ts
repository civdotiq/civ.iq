/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { structuredLogger } from '@/lib/logging/logger-client';

export async function GET(_request: NextRequest) {
  try {
    const congressApiKey = process.env.CONGRESS_API_KEY;

    if (!congressApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Congress API key not configured',
          apiKeyProvided: false,
        },
        { status: 500 }
      );
    }

    // Test a simple Congress.gov API call
    const testUrl = `https://api.congress.gov/v3/member?api_key=${congressApiKey}&limit=3`;

    structuredLogger.info('Testing Congress API', {
      url: testUrl.replace(congressApiKey, 'HIDDEN'),
    });

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivicIntelHub/1.0',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    structuredLogger.info('Congress API Response', {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: `Congress API returned ${response.status}: ${response.statusText}`,
          details: errorText,
          apiKeyProvided: true,
          responseStatus: response.status,
        },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Congress API is working',
      apiKeyProvided: true,
      responseStatus: response.status,
      dataReceived: {
        membersCount: data.members?.length || 0,
        paginationInfo: data.pagination || null,
        firstMember: data.members?.[0]
          ? {
              bioguideId: data.members[0].bioguideId,
              name: data.members[0].name,
              party: data.members[0].partyName,
              state: data.members[0].state,
            }
          : null,
      },
      rawDataSample: data,
    });
  } catch (error) {
    structuredLogger.error('Congress API test failed', error as Error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        apiKeyProvided: !!process.env.CONGRESS_API_KEY,
      },
      { status: 500 }
    );
  }
}
