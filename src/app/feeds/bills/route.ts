/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Latest Bills Feed (Atom)
 *
 * Provides a subscribable Atom feed of recently introduced legislation.
 *
 * @example GET /feeds/bills
 */

import { NextResponse } from 'next/server';
import {
  generateAtomFeed,
  createBillsFeedConfig,
  type AtomEntry,
} from '@/lib/feeds/atom-generator';
import { buildBillUrl } from '@/lib/helpers/url-builders';

export const dynamic = 'force-dynamic';

interface Bill {
  number: string;
  title: string;
  type: string;
  congress: number;
  introducedDate?: string;
  latestAction?: {
    actionDate: string;
    text: string;
  };
  sponsor?: {
    name: string;
    party: string;
    state: string;
  };
  policyArea?: {
    name: string;
  };
}

interface BillsResponse {
  bills: Bill[];
}

async function fetchLatestBills(): Promise<Bill[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://civdotiq.org';
    const response = await fetch(`${baseUrl}/api/bills/latest?limit=50`, {
      cache: 'force-cache',
    });
    if (!response.ok) return [];
    const data: BillsResponse = await response.json();
    return data.bills ?? [];
  } catch {
    return [];
  }
}

export async function GET(): Promise<NextResponse> {
  const baseUrl = 'https://civdotiq.org';

  // Fetch latest bills
  const bills = await fetchLatestBills();

  // Build entries from bills
  const entries: AtomEntry[] = bills.map(bill => {
    const date = bill.latestAction?.actionDate ?? bill.introducedDate ?? new Date().toISOString();
    const sponsorInfo = bill.sponsor
      ? ` by ${bill.sponsor.name} (${bill.sponsor.party}-${bill.sponsor.state})`
      : '';

    const billPath = buildBillUrl(bill.congress, bill.type, bill.number);
    return {
      id: `${baseUrl}${billPath}`,
      title: `${bill.number}: ${bill.title}`,
      link: `${baseUrl}${billPath}`,
      updated: new Date(date),
      published: new Date(bill.introducedDate ?? date),
      summary: `${bill.type} introduced${sponsorInfo}. ${bill.latestAction?.text ?? ''}`.trim(),
      categories: [
        { term: 'bill', label: 'Legislation' },
        { term: bill.type.toLowerCase(), label: bill.type },
        ...(bill.policyArea
          ? [{ term: bill.policyArea.name.toLowerCase(), label: bill.policyArea.name }]
          : []),
      ],
    };
  });

  // Generate feed
  const feedConfig = createBillsFeedConfig();

  // Update the feed timestamp to the most recent entry
  const firstEntry = entries[0];
  if (firstEntry) {
    feedConfig.updated = firstEntry.updated;
  }

  const atomXml = generateAtomFeed(feedConfig, entries);

  return new NextResponse(atomXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  });
}
