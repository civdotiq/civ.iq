/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAtomFeed, createBillsFeedConfig } from '@/lib/feeds/atom-generator';
import type { AtomEntry } from '@/lib/feeds/atom-generator';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

/** Shape of a bill object from the Congress.gov /v3/bill endpoint */
interface CongressBill {
  congress: number;
  latestAction?: {
    actionDate: string;
    text: string;
  };
  number: string;
  originChamber?: string;
  originChamberCode?: string;
  title?: string;
  type?: string;
  updateDate?: string;
  url?: string;
}

interface CongressBillsResponse {
  bills: CongressBill[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKey = process.env.CONGRESS_API_KEY;
    if (!apiKey) {
      return new NextResponse('Congress.gov API key required', { status: 500 });
    }

    const congress = process.env.CURRENT_CONGRESS || '119';
    const { searchParams } = request.nextUrl;
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10) || 50;
    const limit = Math.min(Math.max(rawLimit, 1), 100);

    const response = await fetch(
      `https://api.congress.gov/v3/bill/${congress}?limit=${limit}&sort=updateDate+desc&format=json`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CIV.IQ/1.0 (Democratic Platform)',
          'X-API-Key': apiKey,
        },
      }
    );

    if (!response.ok) {
      logger.error('Congress.gov bills feed API failed', new Error(`HTTP ${response.status}`), {
        status: response.status,
        congress,
      });
      return new NextResponse('Failed to fetch bills from Congress.gov', { status: 500 });
    }

    const data: CongressBillsResponse = await response.json();
    const bills = data.bills ?? [];
    const now = new Date();

    const entries: AtomEntry[] = bills.map(bill => {
      const billType = bill.type?.toLowerCase() || 'hr';
      const categories: AtomEntry['categories'] = [
        { term: bill.type || 'HR', label: bill.type || 'HR' },
      ];

      if (bill.originChamber) {
        categories.push({ term: bill.originChamber, label: bill.originChamber });
      }

      return {
        id: `https://civdotiq.org/bill/${billType}${bill.number}-${congress}`,
        title: `${bill.type || 'H.R.'} ${bill.number} — ${bill.title || 'Untitled'}`,
        link: `https://civdotiq.org/bill/${billType}${bill.number}-${congress}`,
        updated: new Date(bill.updateDate || bill.latestAction?.actionDate || now),
        summary: bill.latestAction?.text || '',
        categories,
      };
    });

    const feedConfig = createBillsFeedConfig();
    const firstEntry = entries[0];
    if (firstEntry) {
      feedConfig.updated = firstEntry.updated;
    }

    const xml = generateAtomFeed(feedConfig, entries);

    logger.info('Generated bills Atom feed', {
      congress,
      entryCount: entries.length,
    });

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/atom+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('Bills Atom feed error', error as Error);
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate bills feed</error>',
      {
        status: 500,
        headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
      }
    );
  }
}
