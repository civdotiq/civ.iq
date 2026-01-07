/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Unified Search API
 *
 * Searches across representatives, bills, and committees in a single query.
 * Returns grouped results for autocomplete/typeahead UI.
 *
 * @example GET /api/search/unified?q=pelosi&limit=5
 */

import { NextRequest, NextResponse } from 'next/server';

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

interface Representative {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  district?: string;
}

interface Bill {
  number: string;
  title: string;
  type: string;
  congress: number;
  status?: string;
}

interface Committee {
  id: string;
  name: string;
  chamber: 'House' | 'Senate' | 'Joint';
  type?: string;
}

interface UnifiedSearchResult {
  representatives: Representative[];
  bills: Bill[];
  committees: Committee[];
  query: string;
  totalResults: number;
}

// In-memory cache for committees (static data)
let committeesCache: Committee[] = [];
let committeesCacheLoaded = false;

async function getCommittees(): Promise<Committee[]> {
  if (committeesCacheLoaded) return committeesCache;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://civdotiq.org';
    const response = await fetch(`${baseUrl}/api/committees`, {
      cache: 'force-cache',
    });
    if (!response.ok) return [];
    const data = await response.json();
    committeesCache = data.committees ?? data ?? [];
    committeesCacheLoaded = true;
    return committeesCache;
  } catch {
    return [];
  }
}

async function searchRepresentatives(query: string, limit: number): Promise<Representative[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://civdotiq.org';
    const response = await fetch(
      `${baseUrl}/api/search?query=${encodeURIComponent(query)}&limit=${limit}`,
      { cache: 'no-store' }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return (data.representatives ?? []).slice(0, limit);
  } catch {
    return [];
  }
}

async function searchBills(query: string, limit: number): Promise<Bill[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://civdotiq.org';
    // Use latest bills and filter client-side for now
    const response = await fetch(`${baseUrl}/api/bills/latest?limit=100`, {
      cache: 'force-cache',
    });
    if (!response.ok) return [];
    const data = await response.json();
    const bills: Bill[] = data.bills ?? [];

    const q = query.toLowerCase();
    return bills
      .filter(
        (bill: Bill) =>
          bill.number.toLowerCase().includes(q) || bill.title.toLowerCase().includes(q)
      )
      .slice(0, limit);
  } catch {
    return [];
  }
}

function searchCommittees(committees: Committee[], query: string, limit: number): Committee[] {
  const q = query.toLowerCase();
  return committees
    .filter((committee: Committee) => committee.name.toLowerCase().includes(q))
    .slice(0, limit);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') ?? '';
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 10) : 5;

  if (!query || query.length < 2) {
    return NextResponse.json({
      representatives: [],
      bills: [],
      committees: [],
      query,
      totalResults: 0,
    });
  }

  // Fetch all data in parallel
  const [representatives, bills, allCommittees] = await Promise.all([
    searchRepresentatives(query, limit),
    searchBills(query, limit),
    getCommittees(),
  ]);

  const committees = searchCommittees(allCommittees, query, limit);

  const result: UnifiedSearchResult = {
    representatives,
    bills,
    committees,
    query,
    totalResults: representatives.length + bills.length + committees.length,
  };

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
