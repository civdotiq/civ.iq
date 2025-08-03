/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseBillNumber } from '@/types/bill';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { billId } = await params;

    if (!billId) {
      return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
    }

    // Parse the bill ID
    const { congress, type, number } = parseBillNumber(billId);

    // Test direct Congress.gov access with different bill types
    const testUrls = [
      `https://api.congress.gov/v3/bill/${congress}/${type}/${number}`,
      `https://api.congress.gov/v3/bill/${congress}/hres/${number}`,
      `https://api.congress.gov/v3/bill/${congress}/hjres/${number}`,
      `https://api.congress.gov/v3/bill/${congress}/hconres/${number}`,
      `https://api.congress.gov/v3/bill/${congress}/s/${number}`,
      `https://api.congress.gov/v3/bill/${congress}/sres/${number}`,
      `https://api.congress.gov/v3/bill/${congress}/sjres/${number}`,
      `https://api.congress.gov/v3/bill/${congress}/sconres/${number}`,
    ];

    const results: Array<{
      billType: string;
      url: string;
      status?: number;
      found: boolean;
      statusText?: string;
      error?: string;
      billTitle?: string;
      billSponsor?: string;
    }> = [];

    for (const url of testUrls) {
      try {
        const fullUrl = `${url}?api_key=${process.env.CONGRESS_API_KEY}&format=json`;
        const response = await fetch(fullUrl, {
          headers: {
            'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
            Accept: 'application/json',
          },
        });

        const billType = url.split('/').slice(-2, -1)[0] || 'unknown'; // Extract bill type from URL

        const result: {
          billType: string;
          url: string;
          status: number;
          found: boolean;
          statusText: string;
          billTitle?: string;
          billSponsor?: string;
        } = {
          billType,
          url: url.replace('https://api.congress.gov/v3/', ''),
          status: response.status,
          found: response.ok,
          statusText: response.statusText,
        };

        // If successful, get basic bill info
        if (response.ok) {
          try {
            const data = await response.json();
            result.billTitle = data.bill?.title?.substring(0, 100) + '...';
            result.billSponsor = data.bill?.sponsors?.[0]?.fullName;
          } catch {
            // Ignore JSON parsing errors
          }
        }

        results.push(result);
      } catch (error) {
        const billType = url.split('/').slice(-2, -1)[0] || 'unknown';
        results.push({
          billType,
          url: url.replace('https://api.congress.gov/v3/', ''),
          error: (error as Error).message,
          found: false,
        });
      }
    }

    return NextResponse.json({
      billId,
      parsedBill: { congress, type: type.toLowerCase(), number },
      apiKeyExists: !!process.env.CONGRESS_API_KEY,
      apiKeyPrefix: process.env.CONGRESS_API_KEY?.substring(0, 5),
      testResults: results,
      summary: {
        totalTested: results.length,
        found: results.filter(r => r.found).length,
        foundTypes: results.filter(r => r.found).map(r => r.billType),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: (error as Error).message,
        billId: (await params).billId,
      },
      { status: 500 }
    );
  }
}
