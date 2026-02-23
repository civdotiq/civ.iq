/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Public API v1 — Bill Detail
 *
 * Returns bill data from Congress.gov in the v1 envelope.
 * Accepts bill IDs like "hr1-119", "s100-119", "hjres5-119".
 */

import { NextRequest, NextResponse } from 'next/server';
import { v1Success, v1Error } from '@/lib/api/v1-response';
import { parseBillNumber } from '@/types/bill';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

interface CongressSponsor {
  bioguideId: string;
  fullName: string;
  party: string;
  state: string;
}

interface CongressBillData {
  congress: number;
  type: string;
  number: string;
  title: string;
  shortTitle?: string;
  originChamber: string;
  introducedDate: string;
  latestAction?: { actionDate: string; text: string };
  actions?: { count: number; url: string };
  sponsors?: CongressSponsor[];
  cosponsors?: { count: number; url: string };
  policyArea?: { name: string };
  subjects?: { legislativeSubjects: Array<{ name: string }> };
  summaries?: { count: number; url: string };
  textVersions?: { count: number; url: string };
  committees?: { count: number; url: string };
  updateDate?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
): Promise<NextResponse> {
  try {
    const { billId } = await params;

    if (!billId) {
      return NextResponse.json(v1Error(400, 'Bill ID is required'), { status: 400 });
    }

    const apiKey = process.env.CONGRESS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(v1Error(500, 'Congress.gov API key not configured'), {
        status: 500,
      });
    }

    // Parse bill ID (e.g., "119-hr-1" -> { type: "hr", number: "1", congress: "119" })
    const parsed = parseBillNumber(billId);
    if (parsed.type === 'unknown') {
      return NextResponse.json(
        v1Error(400, 'Invalid bill ID format. Expected: 119-hr-1, 119-s-100, etc.'),
        { status: 400 }
      );
    }

    const { type, number: billNumber, congress } = parsed;

    const response = await fetch(
      `https://api.congress.gov/v3/bill/${congress}/${type}/${billNumber}?format=json`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CIV.IQ/1.0 (Democratic Platform)',
          'X-API-Key': apiKey,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(v1Error(404, 'Bill not found'), { status: 404 });
      }
      logger.error('v1 bill detail: Congress.gov API failed', new Error(`HTTP ${response.status}`));
      return NextResponse.json(v1Error(502, 'Failed to fetch bill from Congress.gov'), {
        status: 502,
      });
    }

    const raw = await response.json();
    const bill: CongressBillData = raw.bill;

    if (!bill) {
      return NextResponse.json(v1Error(404, 'Bill not found'), { status: 404 });
    }

    const data = {
      billId,
      congress: bill.congress,
      type: bill.type,
      number: bill.number,
      title: bill.title,
      shortTitle: bill.shortTitle ?? null,
      originChamber: bill.originChamber,
      introducedDate: bill.introducedDate,
      updateDate: bill.updateDate ?? null,
      latestAction: bill.latestAction ?? null,
      policyArea: bill.policyArea?.name ?? null,
      sponsors: bill.sponsors ?? [],
      cosponsorsCount: bill.cosponsors?.count ?? 0,
      committeesCount: bill.committees?.count ?? 0,
      actionsCount: bill.actions?.count ?? 0,
      textVersionsCount: bill.textVersions?.count ?? 0,
      url: `https://civdotiq.org/bill/${billId}`,
    };

    logger.info('v1 bill detail', { billId, title: bill.title });

    // Congress-aware caching
    const CURRENT_CONGRESS = 119;
    const isHistorical = bill.congress < CURRENT_CONGRESS;
    const cacheMaxAge = isHistorical ? 31536000 : 86400;
    const staleRevalidate = isHistorical ? 86400 : 3600;

    return NextResponse.json(v1Success(data, 'congress.gov'), {
      headers: {
        'Cache-Control': `public, s-maxage=${cacheMaxAge}, stale-while-revalidate=${staleRevalidate}`,
      },
    });
  } catch (error) {
    logger.error('v1 bill detail error', error as Error);
    return NextResponse.json(v1Error(500, 'Internal server error'), { status: 500 });
  }
}
