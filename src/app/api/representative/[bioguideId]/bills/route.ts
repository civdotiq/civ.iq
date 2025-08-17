/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache/simple-government-cache';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse> {
  // ROBUST ERROR HANDLING: Wrap entire logic in try-catch to prevent crashes
  try {
    const { bioguideId } = await params;

    if (!bioguideId) {
      return NextResponse.json({ error: 'BioguideId required' }, { status: 400 });
    }

    if (!process.env.CONGRESS_API_KEY) {
      return NextResponse.json({ error: 'Congress.gov API key required' }, { status: 500 });
    }

    // SIMPLIFIED DATA FETCHING: Only fetch 119th Congress data (current congress)
    const currentCongress = 119; // Only fetch current congress data

    // Check cache first
    const cacheKey = `bills:${bioguideId}:${currentCongress}`;
    const cached = govCache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      logger.info('Cache hit for bills lookup', {
        bioguideId,
        currentCongress,
        cacheKey,
        billCount: (cached.totalBills as number) || 0,
      });
      const cachedMetadata = (cached.metadata as Record<string, unknown>) || {};
      return NextResponse.json({
        ...cached,
        metadata: {
          ...cachedMetadata,
          cached: true,
        },
      });
    }

    // Debug logging for API investigation
    // eslint-disable-next-line no-console
    console.log('=== BILLS API DEBUG ===');
    // eslint-disable-next-line no-console
    console.log('BioguideId:', bioguideId);
    // eslint-disable-next-line no-console
    console.log('API Key exists:', !!process.env.CONGRESS_API_KEY);
    // eslint-disable-next-line no-console
    console.log('API Key prefix:', process.env.CONGRESS_API_KEY?.slice(0, 8) + '...');
    // eslint-disable-next-line no-console
    console.log('Congress to fetch:', currentCongress);

    // SIMPLIFIED: Single API call instead of multiple congress loop
    const url = `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation?api_key=${process.env.CONGRESS_API_KEY}&limit=100&congress=${currentCongress}`;
    // eslint-disable-next-line no-console
    console.log('Congress API URL:', url.replace(/api_key=[^&]+/, 'api_key=***'));

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Democratic Platform)',
      },
    });

    // Debug response details
    // eslint-disable-next-line no-console
    console.log('Response Status:', response.status, response.statusText);
    // eslint-disable-next-line no-console
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    // Check if request failed
    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.log('Failed response details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      logger.error(
        'Congress.gov sponsored legislation API failed',
        new Error(`HTTP ${response.status}`),
        {
          bioguideId,
          status: response.status,
          congress: currentCongress,
        }
      );
      return NextResponse.json({ error: 'Failed to fetch from Congress.gov' }, { status: 500 });
    }

    // Process single response
    const billsData = await response.json();

    // Debug raw response data
    // eslint-disable-next-line no-console
    console.log('Raw response data:', {
      congress: currentCongress,
      hasSponsored: !!billsData.sponsoredLegislation,
      sponsoredCount: billsData.sponsoredLegislation?.length || 0,
      dataKeys: Object.keys(billsData),
      firstBill: billsData.sponsoredLegislation?.[0] || 'none',
    });

    const bills = billsData.sponsoredLegislation || [];

    // eslint-disable-next-line no-console
    console.log('Final processing results:', {
      congress: currentCongress,
      billCount: bills.length,
    });

    logger.info('Successfully fetched sponsored legislation from Congress.gov', {
      bioguideId,
      congress: currentCongress,
      billCount: bills.length,
    });

    // Transform bills to include required fields for frontend
    const transformedBills = bills.map((bill: unknown) => {
      const billData = bill as Record<string, unknown>;
      const latestAction = billData.latestAction as Record<string, unknown> | undefined;
      const policyArea = billData.policyArea as Record<string, unknown> | undefined;

      return {
        id: `${billData.congress}-${billData.type}-${billData.number}`,
        number: `${billData.type} ${billData.number}`,
        title: billData.title as string,
        introducedDate: billData.introducedDate as string,
        status: (latestAction?.text as string) || 'Unknown',
        lastAction: (latestAction?.text as string) || 'No recent action',
        congress: billData.congress as number,
        type: billData.type as string,
        policyArea: (policyArea?.name as string) || 'Unspecified',
        url: billData.url as string,
      };
    });

    // NOTE: Congress.gov API doesn't currently distinguish between sponsored vs cosponsored
    // All bills returned from member/{bioguideId}/sponsored-legislation are sponsored bills
    // Enhanced response structure for frontend compatibility
    const enhancedResponse = {
      // Legacy format (keep for backward compatibility)
      sponsoredLegislation: bills,

      // Enhanced format with counts and structure
      sponsored: {
        count: transformedBills.length,
        bills: transformedBills,
      },
      cosponsored: {
        count: 0, // NOTE: Would need separate API call to get cosponsored bills
        bills: [], // NOTE: Implement cosponsored bills fetch when needed
      },

      // Summary
      totalSponsored: transformedBills.length,
      totalCosponsored: 0,
      totalBills: transformedBills.length,

      metadata: {
        congress: currentCongress,
        totalBills: bills.length,
        source: 'Congress.gov API',
        generatedAt: new Date().toISOString(),
        congressLabel: '119th Congress (2025-2027)',
        dataStructure: 'enhanced',
        note: 'Cosponsored bills require separate API implementation',
      },
    };

    // Cache the successful result with appropriate TTL for bill data
    if (transformedBills.length > 0) {
      govCache.set(cacheKey, enhancedResponse, {
        ttl: 60 * 60 * 1000, // 1 hour for bill data
        source: 'congress.gov',
        dataType: 'committees', // Using committees TTL (1 hour) for bills
      });
      logger.info('Cached bills data', {
        bioguideId,
        cacheKey,
        billCount: transformedBills.length,
      });
    }

    return NextResponse.json(enhancedResponse);
  } catch (error) {
    // ROBUST ERROR HANDLING: Log specific error and return proper JSON response
    // eslint-disable-next-line no-console
    console.error('Bills API Route Error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      bioguideId: 'unavailable',
    });

    logger.error('Representative bills API error', error as Error, {
      bioguideId: 'unavailable',
      component: 'bills-api-route',
    });

    return NextResponse.json(
      { error: 'Internal server error while fetching bills' },
      { status: 500 }
    );
  }
}
