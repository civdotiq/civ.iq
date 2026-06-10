/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Spending → Legislation Reverse Join
 *
 * Given spending keywords or agency slug, finds enabling legislation.
 * Reverse of bill→spending: traverses from awards back to authorizing bills.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { getCommitteesForAgency } from '@/lib/connections/committee-agency-map';
import { getAllPolicyAreas, getPolicyAreaMapping } from '@/lib/connections/policy-area-map';
import type { JoinMetadata } from '@/types/joins';

export const dynamic = 'force-dynamic';

interface SpendingLegislationResult {
  billId: string;
  title: string;
  type: string;
  number: string;
  congress: number;
  policyArea: string | null;
  connectionType: 'authorizing' | 'appropriating' | 'related';
  url: string;
}

interface SpendingLegislationResponse {
  query: {
    agencySlug?: string;
    keywords?: string;
  };
  enablingLegislation: SpendingLegislationResult[];
  relatedCommittees: Array<{
    code: string;
    name: string;
    chamber: 'House' | 'Senate' | 'Joint';
  }>;
  metadata: JoinMetadata;
}

interface CongressBillItem {
  congress: number;
  type: string;
  number: number;
  title: string;
  policyArea?: { name: string };
  latestAction?: { actionDate: string; text: string };
  url: string;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<SpendingLegislationResponse | { error: string }>> {
  const { searchParams } = request.nextUrl;
  const agencySlug = searchParams.get('agency');
  const keywords = searchParams.get('keywords');

  if (!agencySlug && !keywords) {
    return NextResponse.json(
      { error: 'Provide "agency" (slug) or "keywords" query parameter' },
      { status: 400 }
    );
  }

  try {
    if (!process.env.CONGRESS_API_KEY) {
      return NextResponse.json({ error: 'Congress.gov API key not configured' }, { status: 503 });
    }

    // NaN would poison the cache key below — fall back to the default instead
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10) || 10, 1), 30);
    const cacheKey = `join-spending-legislation:${agencySlug || ''}:${keywords || ''}:${limit}`;

    const result = await cachedFetch(
      cacheKey,
      async () => {
        const dataSources: string[] = ['congress.gov'];
        const committees = agencySlug ? getCommitteesForAgency(agencySlug) : [];

        // Find policy areas related to the agency
        const relatedPolicyAreas: string[] = [];
        if (agencySlug) {
          for (const pa of getAllPolicyAreas()) {
            const mapping = getPolicyAreaMapping(pa);
            if (mapping?.agencySlugs.includes(agencySlug)) {
              relatedPolicyAreas.push(pa);
            }
          }
        }

        // Build search terms from keywords and policy areas
        const searchTerms = new Set<string>();
        if (keywords) {
          keywords.split(',').forEach(k => searchTerms.add(k.trim().toLowerCase()));
        }
        relatedPolicyAreas.forEach(pa => searchTerms.add(pa.toLowerCase()));

        // Fetch bills from Congress.gov
        const url = new URL('https://api.congress.gov/v3/bill');
        url.searchParams.set('format', 'json');
        url.searchParams.set('limit', Math.min(limit * 10, 250).toString());
        url.searchParams.set('sort', 'updateDate+desc');

        const response = await fetch(url.toString(), {
          headers: {
            'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
            Accept: 'application/json',
            'X-API-Key': process.env.CONGRESS_API_KEY || '',
          },
        });

        let allBills: CongressBillItem[] = [];
        if (response.ok) {
          const data = await response.json();
          allBills = data.bills || [];
        }

        // Score and filter bills
        const policyAreaSet = new Set(relatedPolicyAreas.map(pa => pa.toLowerCase()));
        const legislation: SpendingLegislationResult[] = [];

        for (const bill of allBills) {
          if (legislation.length >= limit) break;

          const billPolicyArea = bill.policyArea?.name?.toLowerCase();
          const titleLower = bill.title.toLowerCase();
          const actionLower = bill.latestAction?.text?.toLowerCase() ?? '';

          let connectionType: 'authorizing' | 'appropriating' | 'related' | null = null;

          // Check for appropriations bills
          if (titleLower.includes('appropriation') || actionLower.includes('appropriation')) {
            if (billPolicyArea && policyAreaSet.has(billPolicyArea)) {
              connectionType = 'appropriating';
            } else if ([...searchTerms].some(t => titleLower.includes(t))) {
              connectionType = 'appropriating';
            }
          }

          // Check for authorizing legislation (policy area match)
          if (!connectionType && billPolicyArea && policyAreaSet.has(billPolicyArea)) {
            connectionType = 'authorizing';
          }

          // Check for keyword matches
          if (!connectionType && [...searchTerms].some(t => titleLower.includes(t))) {
            connectionType = 'related';
          }

          if (connectionType) {
            legislation.push({
              billId: `${bill.congress}-${bill.type.toLowerCase()}-${bill.number}`,
              title: bill.title,
              type: bill.type,
              number: bill.number.toString(),
              congress: bill.congress,
              policyArea: bill.policyArea?.name ?? null,
              connectionType,
              url: bill.url,
            });
          }
        }

        return {
          query: {
            ...(agencySlug ? { agencySlug } : {}),
            ...(keywords ? { keywords } : {}),
          },
          enablingLegislation: legislation,
          relatedCommittees: committees.map(c => ({
            code: c.committeeCode,
            name: c.committeeName,
            chamber: c.chamber,
          })),
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources,
            joinType: 'spending-legislation',
            dataQuality: legislation.length > 0 ? ('complete' as const) : ('partial' as const),
          },
        } satisfies SpendingLegislationResponse;
      },
      2 * 60 * 60 * 1000
    );

    if (!result) {
      return NextResponse.json({ error: 'Failed to fetch legislation' }, { status: 500 });
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    logger.error('Spending→legislation join error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
