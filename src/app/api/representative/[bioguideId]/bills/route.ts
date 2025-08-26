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

    // ENHANCED DATA FETCHING: Fetch last 3 congresses for better data coverage
    const currentCongress = 119;
    const congressesToFetch = [119, 118, 117]; // Current + last 2 congresses

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

    // ENHANCED: Fetch multiple congresses for better data coverage
    const allBills: unknown[] = [];

    for (const congress of congressesToFetch) {
      let offset = 0;
      const maxLimit = 250; // Congress.gov maximum
      let hasMoreBills = true;

      // Paginate through ALL bills for this congress
      while (hasMoreBills) {
        const url = `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation?api_key=${process.env.CONGRESS_API_KEY}&limit=${maxLimit}&offset=${offset}&congress=${congress}`;
        // eslint-disable-next-line no-console
        console.log(
          `Congress ${congress} (offset ${offset}):`,
          url.replace(/api_key=[^&]+/, 'api_key=***')
        );

        try {
          const response = await fetch(url, {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'CIV.IQ/1.0 (Democratic Platform)',
            },
          });

          // Debug response details
          // eslint-disable-next-line no-console
          console.log('Response Status:', response.status, response.statusText);

          if (response.ok) {
            const billsData = await response.json();
            const congressBills = billsData.sponsoredLegislation || [];

            // DIAGNOSTIC: Log raw Congress.gov response structure BEFORE any processing
            if (congressBills.length > 0 && offset === 0) {
              // eslint-disable-next-line no-console
              console.log('🔍 RAW Congress.gov Response Sample for Congress', congress);
              // eslint-disable-next-line no-console
              console.log(
                'First 3 raw bills:',
                congressBills.slice(0, 3).map((bill: Record<string, unknown>) => ({
                  number: bill.number,
                  type: bill.type,
                  billType: bill.billType, // Check if field name is different
                  legislationType: bill.legislationType, // Another possible field name
                  congress: bill.congress,
                  title:
                    typeof bill.title === 'string'
                      ? bill.title.substring(0, 50) + '...'
                      : bill.title,
                  availableKeys: Object.keys(bill || {}),
                }))
              );
            }

            allBills.push(...congressBills);

            // eslint-disable-next-line no-console
            console.log(`Congress ${congress} (offset ${offset}) bills:`, congressBills.length);

            // Check if we've reached the end
            if (congressBills.length < maxLimit) {
              hasMoreBills = false;
            } else {
              offset += maxLimit;
            }
          } else {
            // eslint-disable-next-line no-console
            console.log(
              `Failed to fetch Congress ${congress} (offset ${offset}):`,
              response.status
            );
            hasMoreBills = false;
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.log(`Error fetching Congress ${congress} (offset ${offset}):`, error);
          hasMoreBills = false;
        }
      }
    }

    const bills = allBills;

    // eslint-disable-next-line no-console
    console.log('Final processing results:', {
      totalBills: bills.length,
      congressesFetched: congressesToFetch,
    });

    logger.info('Successfully fetched sponsored legislation from Congress.gov', {
      bioguideId,
      congress: currentCongress,
      billCount: bills.length,
    });

    // DIAGNOSTIC: Check raw data quality before transformation
    const rawDataDiagnostics = bills.slice(0, 3).map((bill: unknown) => {
      const billData = bill as Record<string, unknown>;
      return {
        congress: billData.congress,
        type: billData.type,
        number: billData.number,
        title: billData.title,
        hasType: !!billData.type,
        hasNumber: !!billData.number,
        hasCongress: !!billData.congress,
        rawKeys: Object.keys(billData),
      };
    });

    logger.info('Raw Congress.gov bill data sample', {
      bioguideId,
      totalBills: bills.length,
      sampleData: rawDataDiagnostics,
    });

    // Helper function to extract bill type from bill number (more reliable than URL parsing)
    function extractBillType(billNumber: string): string {
      if (!billNumber) return '';

      // Match common bill patterns from Congress.gov
      const patterns = [
        /^(S)\.\s*\d+/i, // S. 123
        /^(H\.?R)\.\s*\d+/i, // H.R. 123 or HR. 123
        /^(H\.?J\.?RES)\.\s*\d+/i, // H.J.RES. 123
        /^(S\.?J\.?RES)\.\s*\d+/i, // S.J.RES. 123
        /^(H\.?RES)\.\s*\d+/i, // H.RES. 123
        /^(S\.?RES)\.\s*\d+/i, // S.RES. 123
        /^(H\.?CON\.?RES)\.\s*\d+/i, // H.CON.RES. 123
        /^(S\.?CON\.?RES)\.\s*\d+/i, // S.CON.RES. 123
      ];

      for (const pattern of patterns) {
        const match = billNumber.match(pattern);
        if (match && match[1]) {
          return match[1].toLowerCase().replace(/\./g, '');
        }
      }

      return '';
    }

    // Helper function to extract bill type from Congress.gov URL (fallback)
    function extractTypeFromUrl(url: string): string | null {
      if (!url) return null;
      const match = url.match(/congress\.gov\/bill\/\d+th-congress\/([^\/]+)/);
      if (match && match[1]) {
        const urlType = match[1];
        if (urlType.includes('senate-bill')) return 's';
        if (urlType.includes('house-bill')) return 'hr';
        if (urlType.includes('house-joint-resolution')) return 'hjres';
        if (urlType.includes('senate-joint-resolution')) return 'sjres';
        if (urlType.includes('house-concurrent-resolution')) return 'hconres';
        if (urlType.includes('senate-concurrent-resolution')) return 'sconres';
        if (urlType.includes('house-resolution')) return 'hres';
        if (urlType.includes('senate-resolution')) return 'sres';
      }
      return null;
    }

    // Transform bills to include required fields for frontend
    const transformedBills = bills.map((bill: unknown) => {
      const billData = bill as Record<string, unknown>;
      const latestAction = billData.latestAction as Record<string, unknown> | undefined;
      const policyArea = billData.policyArea as Record<string, unknown> | undefined;

      // ROOT CAUSE FIX: Extract bill type from bill number (primary) or URL (fallback)
      const extractedFromNumber = extractBillType(billData.number as string);
      const extractedFromUrl = extractTypeFromUrl(billData.url as string);
      const billType = billData.type || extractedFromNumber || extractedFromUrl;

      // DIAGNOSTIC: Track the fix in action
      if (!billData.type && (extractedFromNumber || extractedFromUrl)) {
        logger.info('Extracted bill type', {
          bioguideId,
          billNumber: billData.number,
          url: billData.url,
          extractedFromNumber,
          extractedFromUrl,
          finalType: billType,
        });
      }

      // Validate we have required fields after extraction
      const hasRequiredFields = !!(billType && billData.number && billData.congress);
      if (!hasRequiredFields) {
        logger.warn('Bill still missing required fields after type extraction', {
          bioguideId,
          billId: billData.id || 'unknown',
          congress: billData.congress,
          originalType: billData.type,
          extractedFromNumber,
          extractedFromUrl,
          finalType: billType,
          number: billData.number,
          url: billData.url,
        });
      }

      return {
        id: `${billData.congress}-${billType}-${billData.number}`,
        number: `${typeof billType === 'string' ? billType.toUpperCase() : billType} ${billData.number}`,
        title: billData.title as string,
        introducedDate: billData.introducedDate as string,
        status: (latestAction?.text as string) || 'Unknown',
        lastAction: (latestAction?.text as string) || 'No recent action',
        congress: billData.congress as number,
        type: billType as string,
        policyArea: (policyArea?.name as string) || 'Unspecified',
        url: billData.url as string,
      };
    });

    // Log any bills that still don't have types after extraction
    const missingTypes = transformedBills.filter(b => !b.type);
    if (missingTypes.length > 0) {
      logger.warn(`Bills still missing types after extraction`, {
        bioguideId,
        count: missingTypes.length,
        samples: missingTypes.slice(0, 3).map(b => ({
          number: b.number,
          title: b.title,
          url: b.url,
        })),
      });
    } else {
      logger.info(`All bills have types after extraction`, {
        bioguideId,
        totalBills: transformedBills.length,
      });
    }

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
