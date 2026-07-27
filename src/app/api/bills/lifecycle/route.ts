/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill Lifecycle API — Gap 7 Join Endpoint
 *
 * Returns recent bills filtered by lifecycle status and date range.
 * Maps Congress.gov latest action text through mapCongressStatus()
 * to normalize status values, then filters by the requested status.
 *
 * Query params:
 * - status: BillStatus value (e.g. "introduced", "passed_house", "enacted")
 * - since: ISO date or relative ("7d", "30d", "90d") — default "7d"
 * - until: ISO date — default now
 * - chamber: "house" or "senate"
 * - limit: max 50, default 20
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { mapCongressStatus } from '@/lib/services/bill.service';
import type { BillStatus } from '@/types/bill';
import type { JoinMetadata } from '@/types/joins';

export const dynamic = 'force-dynamic';

interface LifecycleBill {
  id: string;
  title: string;
  type: string;
  number: string;
  congress: number;
  chamber: string;
  status: BillStatus;
  introducedDate: string;
  latestActionDate: string;
  latestActionText: string;
  policyArea: string | null;
  url: string;
}

interface BillLifecycleResponse {
  filters: {
    status: string | null;
    since: string;
    until: string;
    chamber: string | null;
  };
  bills: LifecycleBill[];
  statusCounts: Record<string, number>;
  metadata: JoinMetadata;
}

interface CongressBillListItem {
  congress: number;
  type: string;
  number: number;
  title: string;
  originChamber: string;
  introducedDate: string;
  policyArea?: { name: string };
  latestAction?: { actionDate: string; text: string };
  url: string;
}

const VALID_STATUSES: BillStatus[] = [
  'introduced',
  'referred',
  'reported',
  'passed_house',
  'passed_senate',
  'passed_both',
  'failed',
  'enacted',
  'vetoed',
];

function parseSince(since: string): Date {
  // Relative format: "7d", "30d", "90d"
  const relMatch = since.match(/^(\d+)d$/);
  if (relMatch) {
    const days = parseInt(relMatch[1] ?? '7');
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }

  // ISO date
  const parsed = new Date(since);
  if (!isNaN(parsed.getTime())) return parsed;

  // Default: 7 days ago
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<BillLifecycleResponse | { error: string }>> {
  try {
    const { searchParams } = request.nextUrl;
    const statusFilter = searchParams.get('status') ?? null;
    const sinceParam = searchParams.get('since') ?? '7d';
    const untilParam = searchParams.get('until') ?? null;
    const chamberFilter = searchParams.get('chamber')?.toLowerCase() ?? null;
    // NaN would poison the cache key below — fall back to the default instead
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 50);

    if (statusFilter && !VALID_STATUSES.includes(statusFilter as BillStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Valid values: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!process.env.CONGRESS_API_KEY) {
      return NextResponse.json({ error: 'Congress.gov API key not configured' }, { status: 503 });
    }

    logger.info('Bill lifecycle request', { statusFilter, sinceParam, chamberFilter });

    const sinceDate = parseSince(sinceParam);
    const untilDate = untilParam ? new Date(untilParam) : new Date();
    const sinceDateStr = sinceDate.toISOString().split('T')[0] ?? '';
    const untilDateStr = untilDate.toISOString().split('T')[0] ?? '';

    const cacheKey = `join-bill-lifecycle:${statusFilter ?? 'all'}:${sinceDateStr}:${untilDateStr}:${chamberFilter ?? 'all'}:${limit}`;

    const result = await cachedFetch(
      cacheKey,
      async () => {
        // Fetch a larger batch of recent bills
        const fetchLimit = Math.min(limit * 5, 250);
        const url = new URL('https://api.congress.gov/v3/bill');
        url.searchParams.set('format', 'json');
        url.searchParams.set('limit', fetchLimit.toString());
        url.searchParams.set('sort', 'updateDate+desc');

        const response = await fetch(url.toString(), {
          headers: {
            'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
            Accept: 'application/json',
            'X-API-Key': process.env.CONGRESS_API_KEY || '',
          },
        });

        let allBills: CongressBillListItem[] = [];
        if (response.ok) {
          const data = await response.json();
          allBills = data.bills || [];
        }

        // Map and filter
        const statusCounts: Record<string, number> = {};
        const matched: LifecycleBill[] = [];

        for (const bill of allBills) {
          const actionDate = bill.latestAction?.actionDate ?? bill.introducedDate;
          const actionDateObj = new Date(actionDate);

          // Date range filter
          if (actionDateObj < sinceDate || actionDateObj > untilDate) continue;

          // Chamber filter
          const billChamber = bill.originChamber?.toLowerCase();
          if (chamberFilter && billChamber !== chamberFilter) continue;

          const status = mapCongressStatus(bill.latestAction?.text) ?? 'introduced';

          // Count all statuses for summary
          statusCounts[status] = (statusCounts[status] ?? 0) + 1;

          // Status filter
          if (statusFilter && status !== statusFilter) continue;

          matched.push({
            id: `${bill.congress}-${bill.type.toLowerCase()}-${bill.number}`,
            title: bill.title,
            type: bill.type,
            number: bill.number.toString(),
            congress: bill.congress,
            chamber: bill.originChamber ?? 'Unknown',
            status,
            introducedDate: bill.introducedDate,
            latestActionDate: actionDate,
            latestActionText: bill.latestAction?.text ?? 'Introduced',
            policyArea: bill.policyArea?.name ?? null,
            url: bill.url,
          });
        }

        const bills = matched.slice(0, limit);

        const lifecycleResponse: BillLifecycleResponse = {
          filters: {
            status: statusFilter,
            since: sinceDateStr,
            until: untilDateStr,
            chamber: chamberFilter,
          },
          bills,
          statusCounts,
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: ['congress.gov'],
            joinType: 'bill-lifecycle',
            dataQuality: bills.length > 0 ? 'complete' : 'partial',
          },
        };

        return lifecycleResponse;
      },
      60 * 60 // 1 hour cache
    );

    if (!result) {
      return NextResponse.json({ error: 'Failed to fetch bill lifecycle data' }, { status: 500 });
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=900',
      },
    });
  } catch (error) {
    logger.error('Bill lifecycle error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
