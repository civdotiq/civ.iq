/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Public API v1 — List Committees
 *
 * Returns congressional committees from Congress.gov.
 */

import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import { NextRequest, NextResponse } from 'next/server';
import { v1Success, v1Error } from '@/lib/api/v1-response';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

interface CongressCommittee {
  name: string;
  systemCode: string;
  chamber: string;
  committeeTypeCode?: string;
  url?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKey = process.env.CONGRESS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(v1Error(500, 'Congress.gov API key not configured'), {
        status: 500,
      });
    }

    const congress = process.env.CURRENT_CONGRESS || String(getCurrentCongressNumber());
    const { searchParams } = request.nextUrl;
    const chamber = searchParams.get('chamber');
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '100', 10) || 100, 1),
      250
    );
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

    let url = `https://api.congress.gov/v3/committee/${congress}?limit=${limit}&offset=${offset}&format=json`;
    if (chamber) {
      url += `&chamber=${chamber.charAt(0).toUpperCase() + chamber.slice(1).toLowerCase()}`;
    }

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Democratic Platform)',
        'X-API-Key': apiKey,
      },
    });

    if (!response.ok) {
      logger.error('v1 committees: Congress.gov API failed', new Error(`HTTP ${response.status}`));
      return NextResponse.json(v1Error(502, 'Failed to fetch committees'), { status: 502 });
    }

    const raw = await response.json();
    const committees: CongressCommittee[] = raw.committees ?? [];

    const data = committees.map(c => ({
      systemCode: c.systemCode,
      name: c.name,
      chamber: c.chamber,
      type: c.committeeTypeCode ?? null,
      url: `https://civdotiq.org/committee/${c.systemCode}`,
    }));

    const total = raw.pagination?.count ?? data.length + offset;

    logger.info('v1 committees list', { returned: data.length });

    return NextResponse.json(v1Success(data, 'congress.gov', { total, limit, offset }), {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
      },
    });
  } catch (error) {
    logger.error('v1 committees error', error as Error);
    return NextResponse.json(v1Error(500, 'Internal server error'), { status: 500 });
  }
}
