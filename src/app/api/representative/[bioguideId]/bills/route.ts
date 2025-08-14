/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse> {
  try {
    const { bioguideId } = await params;

    if (!bioguideId) {
      return NextResponse.json({ error: 'BioguideId required' }, { status: 400 });
    }

    if (!process.env.CONGRESS_API_KEY) {
      return new NextResponse('Congress.gov API key required', { status: 500 });
    }

    // Use last 3 congresses (117th - 2021-2023, 118th - 2023-2025, 119th - 2025-2027)
    const currentCongress = parseInt(process.env.CURRENT_CONGRESS || '119');
    const congressesToFetch = [currentCongress - 2, currentCongress - 1, currentCongress]; // 117, 118, 119

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
    console.log('Congresses to fetch:', congressesToFetch);

    // Fetch bills from multiple congresses
    const fetchPromises = congressesToFetch.map(congress => {
      const url = `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation?api_key=${process.env.CONGRESS_API_KEY}&limit=100&congress=${congress}`;
      // eslint-disable-next-line no-console
      console.log('Congress API URL:', url.replace(/api_key=[^&]+/, 'api_key=***'));

      return fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CIV.IQ/1.0 (Democratic Platform)',
        },
      });
    });

    const responses = await Promise.all(fetchPromises);

    // Debug response details
    responses.forEach((response, index) => {
      // eslint-disable-next-line no-console
      console.log(`Response ${index + 1} (Congress ${congressesToFetch[index]}):`);
      // eslint-disable-next-line no-console
      console.log('  Status:', response.status, response.statusText);
      // eslint-disable-next-line no-console
      console.log('  Headers:', Object.fromEntries(response.headers.entries()));
    });

    // Check if any requests failed
    const failedResponses = responses.filter(response => !response.ok);
    if (failedResponses.length > 0) {
      const firstFailed = failedResponses[0];
      if (firstFailed) {
        // eslint-disable-next-line no-console
        console.log('Failed response details:', {
          status: firstFailed.status,
          statusText: firstFailed.statusText,
          headers: Object.fromEntries(firstFailed.headers.entries()),
        });
      }

      logger.error(
        'Congress.gov sponsored legislation API failed',
        new Error(`HTTP ${firstFailed?.status || 'unknown'}`),
        {
          bioguideId,
          status: firstFailed?.status || 'unknown',
          failedCount: failedResponses.length,
        }
      );
      return new NextResponse('Failed to fetch from Congress.gov', { status: 500 });
    }

    // Process all responses and combine bills
    const allBillsData = await Promise.all(responses.map(response => response.json()));

    // Debug raw response data
    allBillsData.forEach((data, index) => {
      // eslint-disable-next-line no-console
      console.log(`Raw response ${index + 1} data:`, {
        congress: congressesToFetch[index],
        hasSponsored: !!data.sponsoredLegislation,
        sponsoredCount: data.sponsoredLegislation?.length || 0,
        dataKeys: Object.keys(data),
        firstBill: data.sponsoredLegislation?.[0] || 'none',
      });
    });

    const allBills = allBillsData.flatMap(data => data.sponsoredLegislation || []);

    // Filter for the target congresses (117th, 118th, 119th)
    const targetCongressBills = allBills.filter((bill: { congress?: number | string }) =>
      congressesToFetch.includes(parseInt(bill.congress?.toString() || '0'))
    );

    // eslint-disable-next-line no-console
    console.log('Final processing results:', {
      totalApiResponses: allBillsData.length,
      totalBillsFromAllResponses: allBills.length,
      targetCongressBills: targetCongressBills.length,
      congressesToFetch,
    });

    logger.info('Successfully fetched sponsored legislation from Congress.gov', {
      bioguideId,
      congresses: congressesToFetch,
      billCount: targetCongressBills?.length || 0,
      totalFetched: allBills?.length || 0,
    });

    // Transform bills to include required fields for frontend
    const transformedBills = targetCongressBills.map((bill: unknown) => {
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
      sponsoredLegislation: targetCongressBills,

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
        congresses: congressesToFetch,
        totalBills: targetCongressBills?.length || 0,
        source: 'Congress.gov API',
        generatedAt: new Date().toISOString(),
        congressLabels: {
          117: '117th Congress (2021-2023)',
          118: '118th Congress (2023-2025)',
          119: '119th Congress (2025-2027)',
        },
        dataStructure: 'enhanced',
        note: 'Cosponsored bills require separate API implementation',
      },
    };

    return NextResponse.json(enhancedResponse);
  } catch (error) {
    logger.error('Representative bills API error', error as Error, {
      bioguideId: (await params).bioguideId,
    });

    return new NextResponse('Congress.gov failed', { status: 500 });
  }
}
