/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger, createRequestLogger } from '@/lib/logging/logger-edge';

/**
 * Proxy route for Senate.gov XML voting data to handle CORS
 * Fetches roll call vote XML from Senate.gov for 119th Congress
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ voteNumber: string }> }
) {
  const { voteNumber } = await params;
  // Using simple logger
  logger.info('Senate votes proxy called', { voteNumber });

  if (!voteNumber) {
    return NextResponse.json({ error: 'Vote number is required' }, { status: 400 });
  }

  try {
    // Pad vote number to 5 digits as required by Senate.gov
    const paddedVoteNumber = voteNumber.padStart(5, '0');

    // Senate.gov XML URL format for 119th Congress, Session 1
    const senateXmlUrl = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_${paddedVoteNumber}.xml`;

    logger.info('Fetching Senate XML data', {
      voteNumber,
      paddedVoteNumber,
      url: senateXmlUrl,
    });

    const response = await fetch(senateXmlUrl, {
      headers: {
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
      },
    });

    if (!response.ok) {
      logger.error(
        'Senate XML fetch failed',
        new Error(`${response.status} ${response.statusText}`),
        {
          voteNumber,
          url: senateXmlUrl,
          metadata: { status: response.status, statusText: response.statusText },
        }
      );
      return NextResponse.json(
        { error: `Failed to fetch Senate vote data: ${response.status}` },
        { status: response.status }
      );
    }

    const xmlText = await response.text();

    logger.info('Senate XML fetched successfully', {
      voteNumber,
      dataLength: xmlText.length,
    });

    // Return XML with proper CORS headers
    return new NextResponse(xmlText, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    logger.error('Senate votes proxy error', error as Error, {
      voteNumber,
      operation: 'senate_votes_proxy_error',
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch Senate vote data',
        voteNumber,
      },
      { status: 500 }
    );
  }
}
