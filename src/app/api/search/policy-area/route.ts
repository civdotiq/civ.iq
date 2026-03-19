/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Policy Area Search API — Gap 6 Join Endpoint
 *
 * Cross-domain search by Congress.gov policyArea. Given a policyArea string,
 * returns related items from four domains in parallel:
 * - Bills (Congress.gov)
 * - Regulations (Federal Register)
 * - Spending (USAspending aggregate by agency)
 * - Committees (from committee-agency-map)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import {
  getPolicyAreaMapping,
  getAgencySlugsForPolicyArea,
} from '@/lib/connections/policy-area-map';
import { getCommitteesForAgency } from '@/lib/connections/committee-agency-map';
import type { FederalRegisterAPIResponse, FederalRegisterItem } from '@/types/federal-register';
import type { PolicyAreaResults, JoinMetadata } from '@/types/joins';
import type { BillStatus } from '@/types/bill';
import { mapCongressStatus } from '@/lib/services/bill.service';

export const dynamic = 'force-dynamic'; // 2 hours

const FEDERAL_REGISTER_API = 'https://www.federalregister.gov/api/v1';
const USASPENDING_API = 'https://api.usaspending.gov/api/v2';

interface CongressBillListItem {
  congress: number;
  type: string;
  number: number;
  title: string;
  introducedDate: string;
  policyArea?: { name: string };
  latestAction?: { actionDate: string; text: string };
}

async function fetchBillsByPolicyArea(limit: number): Promise<
  Array<{
    id: string;
    title: string;
    status: BillStatus;
    introducedDate: string;
    policyArea: string | null;
  }>
> {
  if (!process.env.CONGRESS_API_KEY) return [];

  const url = new URL('https://api.congress.gov/v3/bill');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', Math.min(limit * 5, 250).toString());
  url.searchParams.set('sort', 'updateDate+desc');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
        Accept: 'application/json',
        'X-API-Key': process.env.CONGRESS_API_KEY,
      },
    });

    if (!response.ok) return [];
    const data = await response.json();
    return (data.bills || []).map((bill: CongressBillListItem) => ({
      id: `${bill.congress}-${bill.type.toLowerCase()}-${bill.number}`,
      title: bill.title,
      status: mapCongressStatus(bill.latestAction?.text) ?? ('introduced' as BillStatus),
      introducedDate: bill.introducedDate,
      policyArea: bill.policyArea?.name ?? null,
    }));
  } catch {
    return [];
  }
}

async function fetchRegulations(
  agencySlugs: string[],
  keywords: string[],
  limit: number
): Promise<FederalRegisterItem[]> {
  if (agencySlugs.length === 0) return [];

  const allItems: FederalRegisterItem[] = [];
  const seen = new Set<string>();

  for (const slug of agencySlugs.slice(0, 3)) {
    const params = new URLSearchParams();
    params.set('per_page', limit.toString());
    params.set('order', 'newest');
    params.set('conditions[agencies][]', slug);
    [
      'document_number',
      'title',
      'abstract',
      'type',
      'publication_date',
      'html_url',
      'pdf_url',
      'agencies',
      'comment_url',
      'comments_close_on',
      'effective_on',
    ].forEach(f => params.append('fields[]', f));

    try {
      const response = await fetch(`${FEDERAL_REGISTER_API}/documents.json?${params.toString()}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
        },
      });

      if (!response.ok) continue;

      const data: FederalRegisterAPIResponse = await response.json();
      for (const doc of data.results) {
        if (seen.has(doc.document_number)) continue;
        seen.add(doc.document_number);

        const primaryAgency = doc.agencies?.[0];
        let type: FederalRegisterItem['type'] = 'notice';
        if (doc.type === 'Proposed Rule') type = 'proposed_rule';
        else if (doc.type === 'Rule') type = 'final_rule';

        allItems.push({
          id: doc.document_number,
          title: doc.title,
          summary: doc.abstract,
          type,
          publishedDate: doc.publication_date,
          agency: primaryAgency?.name ?? 'Unknown Agency',
          agencySlug: primaryAgency?.slug ?? 'unknown',
          url: doc.html_url,
          pdfUrl: doc.pdf_url,
          commentUrl: doc.comment_url ?? undefined,
          commentsCloseOn: doc.comments_close_on ?? undefined,
          effectiveDate: doc.effective_on ?? undefined,
        });
      }
    } catch {
      // continue to next agency
    }
  }

  // Filter by keyword relevance
  if (keywords.length > 0) {
    const lowerKeywords = keywords.map(k => k.toLowerCase());
    return allItems
      .filter(item => {
        const text = `${item.title} ${item.summary ?? ''}`.toLowerCase();
        return lowerKeywords.some(k => text.includes(k));
      })
      .slice(0, limit);
  }

  return allItems.slice(0, limit);
}

async function fetchSpendingByAgencies(
  agencySlugs: string[]
): Promise<{ totalAmount: number; topAgencies: Array<{ name: string; amount: number }> }> {
  if (agencySlugs.length === 0) return { totalAmount: 0, topAgencies: [] };

  const fiscalYear = new Date().getFullYear();
  const startDate = `${fiscalYear - 1}-10-01`;
  const endDate = `${fiscalYear}-09-30`;

  const requestBody = {
    subawards: false,
    limit: 1,
    fields: ['Award Amount', 'Awarding Agency'],
    filters: {
      agencies: agencySlugs.map(slug => ({
        type: 'awarding',
        tier: 'toptier',
        toptier_name: slug
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
      })),
      time_period: [{ start_date: startDate, end_date: endDate }],
      award_type_codes: ['A', 'B', 'C', 'D', '02', '03', '04', '05'],
    },
  };

  try {
    const response = await fetch(`${USASPENDING_API}/search/spending_by_award/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) return { totalAmount: 0, topAgencies: [] };

    const data = await response.json();
    const totalAmount =
      data.results?.reduce(
        (sum: number, r: { 'Award Amount': number }) => sum + (r['Award Amount'] ?? 0),
        0
      ) ?? 0;

    // Aggregate by agency
    const agencyTotals = new Map<string, number>();
    for (const r of data.results ?? []) {
      const agency = r['Awarding Agency'] ?? 'Unknown';
      agencyTotals.set(agency, (agencyTotals.get(agency) ?? 0) + (r['Award Amount'] ?? 0));
    }

    const topAgencies = [...agencyTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    return { totalAmount, topAgencies };
  } catch {
    return { totalAmount: 0, topAgencies: [] };
  }
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<PolicyAreaResults | { error: string }>> {
  const { searchParams } = request.nextUrl;
  const policyArea = searchParams.get('policyArea');

  if (!policyArea) {
    return NextResponse.json(
      { error: 'Query parameter "policyArea" is required' },
      { status: 400 }
    );
  }

  try {
    logger.info('Policy area search request', { policyArea });

    const mapping = getPolicyAreaMapping(policyArea);
    if (!mapping) {
      return NextResponse.json({ error: `Unknown policy area: ${policyArea}` }, { status: 404 });
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 30);
    const cacheKey = `join-policy-area-search:${policyArea}:${limit}`;

    const result = await cachedFetch(
      cacheKey,
      async () => {
        const agencySlugs = getAgencySlugsForPolicyArea(policyArea);

        // Find committees that oversee these agencies
        const committeeSet = new Map<
          string,
          { code: string; name: string; chamber: 'House' | 'Senate' | 'Joint' }
        >();
        for (const slug of agencySlugs) {
          for (const cm of getCommitteesForAgency(slug)) {
            committeeSet.set(cm.committeeCode, {
              code: cm.committeeCode,
              name: cm.committeeName,
              chamber: cm.chamber,
            });
          }
        }
        const committees = [...committeeSet.values()];

        // 4 parallel fetches
        const [allBills, regulations, spending] = await Promise.all([
          fetchBillsByPolicyArea(limit),
          fetchRegulations(agencySlugs, mapping.federalRegisterKeywords, limit),
          fetchSpendingByAgencies(agencySlugs),
        ]);

        // Post-filter bills by this policyArea, then strip policyArea for response shape
        const bills = allBills
          .filter(b => b.policyArea?.toLowerCase() === policyArea.toLowerCase())
          .slice(0, limit)
          .map(({ id, title, status, introducedDate }) => ({ id, title, status, introducedDate }));

        const dataSources: string[] = ['congress.gov'];
        if (regulations.length > 0) dataSources.push('federalregister.gov');
        if (spending.totalAmount > 0) dataSources.push('usaspending.gov');

        const metadata: JoinMetadata = {
          generatedAt: new Date().toISOString(),
          dataSources,
          joinType: 'policy-area-search',
          dataQuality: bills.length > 0 ? 'complete' : 'partial',
        };

        const response: PolicyAreaResults = {
          policyArea,
          bills,
          regulations,
          spending,
          committees,
          metadata,
        };

        return response;
      },
      2 * 60 * 60 * 1000 // 2 hour cache
    );

    if (!result) {
      return NextResponse.json({ error: 'Failed to fetch policy area results' }, { status: 500 });
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    logger.error('Policy area search error', error as Error, { policyArea });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
