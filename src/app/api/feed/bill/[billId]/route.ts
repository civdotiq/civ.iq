/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Atom Feed — Bill Status Updates
 *
 * Returns an Atom feed tracking actions and status changes for a specific bill.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAtomFeed } from '@/lib/feeds/atom-generator';
import type { AtomFeedConfig, AtomEntry } from '@/lib/feeds/atom-generator';
import { parseBillNumber } from '@/types/bill';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

interface CongressAction {
  actionDate: string;
  text: string;
  actionCode?: string;
  type?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
): Promise<NextResponse> {
  try {
    const { billId } = await params;

    if (!billId) {
      return new NextResponse('Bill ID is required', { status: 400 });
    }

    const apiKey = process.env.CONGRESS_API_KEY;
    if (!apiKey) {
      return new NextResponse('Congress.gov API key required', { status: 500 });
    }

    const parsed = parseBillNumber(billId);
    if (parsed.type === 'unknown') {
      return new NextResponse('Invalid bill ID format', { status: 400 });
    }

    const { type, number: billNumber, congress } = parsed;
    const baseUrl = 'https://civdotiq.org';

    // Fetch bill info
    const billResponse = await fetch(
      `https://api.congress.gov/v3/bill/${congress}/${type}/${billNumber}?format=json`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CIV.IQ/1.0 (Democratic Platform)',
          'X-API-Key': apiKey,
        },
      }
    );

    if (!billResponse.ok) {
      if (billResponse.status === 404) {
        return new NextResponse('Bill not found', { status: 404 });
      }
      return new NextResponse('Failed to fetch bill data', { status: 502 });
    }

    const billRaw = await billResponse.json();
    const bill = billRaw.bill;

    if (!bill) {
      return new NextResponse('Bill not found', { status: 404 });
    }

    // Fetch actions
    const actionsResponse = await fetch(
      `https://api.congress.gov/v3/bill/${congress}/${type}/${billNumber}/actions?format=json&limit=50`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CIV.IQ/1.0 (Democratic Platform)',
          'X-API-Key': apiKey,
        },
      }
    );

    let actions: CongressAction[] = [];
    if (actionsResponse.ok) {
      const actionsRaw = await actionsResponse.json();
      actions = actionsRaw.actions ?? [];
    }

    const billTitle = bill.title ?? `${type.toUpperCase()} ${billNumber}`;
    const now = new Date();

    const entries: AtomEntry[] = actions.map((action, index) => ({
      id: `${baseUrl}/bill/${billId}#action-${index}`,
      title: action.text.length > 120 ? action.text.slice(0, 117) + '...' : action.text,
      link: `${baseUrl}/bill/${billId}`,
      updated: new Date(action.actionDate || now),
      summary: action.text,
      categories: action.type ? [{ term: action.type, label: action.type }] : undefined,
    }));

    // Sort newest first
    entries.sort((a, b) => b.updated.getTime() - a.updated.getTime());

    const feedConfig: AtomFeedConfig = {
      id: `${baseUrl}/feed/bill/${billId}`,
      title: `${billTitle} — CIV.IQ`,
      subtitle: `Status updates and actions for ${type.toUpperCase()} ${billNumber}`,
      link: `${baseUrl}/bill/${billId}`,
      selfLink: `${baseUrl}/api/feed/bill/${billId}`,
      updated: entries.length > 0 && entries[0] ? entries[0].updated : now,
      author: { name: 'CIV.IQ', uri: baseUrl },
      icon: `${baseUrl}/favicon.ico`,
      rights: 'Data sourced from Congress.gov. MIT License.',
    };

    const xml = generateAtomFeed(feedConfig, entries);

    logger.info('Generated bill Atom feed', { billId, entryCount: entries.length });

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/atom+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    logger.error('Bill Atom feed error', error as Error);
    return new NextResponse('Failed to generate bill feed', { status: 500 });
  }
}
