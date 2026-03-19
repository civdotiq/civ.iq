/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill → Spending API — Gap 1A Join Endpoint
 *
 * Connects a bill to related federal spending by mapping the bill's
 * policyArea and committee assignments to agency slugs, then querying
 * USAspending for awards from those agencies.
 *
 * Connection strength:
 * - "direct": agency matched via the bill's committee assignments
 * - "inferred": agency matched via the bill's policyArea
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { fetchBillFromCongress } from '@/lib/services/bill.service';
import { getAgencySlugsForPolicyArea } from '@/lib/connections/policy-area-map';
import { getAgenciesForCommittees } from '@/lib/connections/committee-agency-map';
import type { BillSpendingConnection } from '@/types/joins';
import type {
  FederalAward,
  USASpendingAwardResponse,
  USASpendingAwardResult,
} from '@/types/spending';

export const dynamic = 'force-dynamic'; // 6 hours

const USASPENDING_API = 'https://api.usaspending.gov/api/v2';

function transformAward(award: USASpendingAwardResult): FederalAward {
  const type = ['A', 'B', 'C', 'D'].includes(award['Award Type'] ?? '') ? 'contract' : 'grant';
  return {
    id: award['Award ID'],
    internalId: award.internal_id,
    recipientName: award['Recipient Name'],
    amount: award['Award Amount'],
    type: type as FederalAward['type'],
    typeDescription: award['Award Type'],
    agency: award['Awarding Agency'],
    agencySlug: award.agency_slug,
    startDate: award['Start Date'],
    description: award.Description || 'No description available',
    url: `https://www.usaspending.gov/award/${award.generated_internal_id}`,
  };
}

async function fetchAwardsByAgencies(
  agencySlugs: string[],
  limit: number
): Promise<FederalAward[]> {
  if (agencySlugs.length === 0) return [];

  const fiscalYear = new Date().getFullYear();
  const startDate = `${fiscalYear - 1}-10-01`;
  const endDate = `${fiscalYear}-09-30`;

  // USAspending accepts awarding_agency names, not slugs.
  // We query without agency filter and post-filter, or use the toptier agency slug approach.
  // The simplest correct approach: query by each agency keyword via the search endpoint.
  const requestBody = {
    subawards: false,
    limit,
    fields: [
      'Award ID',
      'Recipient Name',
      'Award Amount',
      'Award Type',
      'Awarding Agency',
      'Start Date',
      'Description',
    ],
    sort: 'Award Amount',
    order: 'desc',
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

    if (!response.ok) {
      logger.warn('USAspending API error for bill spending', { status: response.status });
      return [];
    }

    const data: USASpendingAwardResponse = await response.json();
    return data.results.map(transformAward);
  } catch (error) {
    logger.error('Error fetching bill-related spending', error as Error);
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
): Promise<NextResponse<BillSpendingConnection | { error: string }>> {
  const { billId } = await params;

  if (!billId) {
    return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
  }

  try {
    logger.info('Bill spending join request', { billId });

    if (!process.env.CONGRESS_API_KEY) {
      return NextResponse.json({ error: 'Congress.gov API key not configured' }, { status: 503 });
    }

    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const cacheKey = `join-bill-spending:${billId}:${limit}`;

    const result = await cachedFetch(
      cacheKey,
      async () => {
        const bill = await fetchBillFromCongress(billId);

        if (!bill) return null;

        // Derive agency slugs from two sources
        const policyAreaSlugs = bill.policyArea ? getAgencySlugsForPolicyArea(bill.policyArea) : [];

        const committeeNames = bill.committees.map(c => c.name);
        const committeeAgencies = getAgenciesForCommittees(committeeNames);
        const committeeSlugs = committeeAgencies.map(a => a.slug);

        // Deduplicate, tracking which source each came from
        const directSlugs = new Set(committeeSlugs);
        const allSlugs = [...new Set([...committeeSlugs, ...policyAreaSlugs])];

        if (allSlugs.length === 0) {
          const response: BillSpendingConnection = {
            billId: bill.id,
            billTitle: bill.title,
            policyArea: bill.policyArea ?? null,
            relatedAgencies: [],
            spending: { awards: [], totalAmount: 0, awardCount: 0 },
            metadata: {
              generatedAt: new Date().toISOString(),
              dataSources: ['congress.gov'],
              joinType: 'bill-spending',
              dataQuality: 'partial',
            },
          };
          return response;
        }

        const awards = await fetchAwardsByAgencies(allSlugs, limit);

        // Tag awards with connection strength (not stored on FederalAward, but useful for metadata)
        const relatedAgencies = allSlugs.map(slug => {
          const strength = directSlugs.has(slug) ? 'direct' : 'inferred';
          return `${slug} (${strength})`;
        });

        const totalAmount = awards.reduce((sum, a) => sum + a.amount, 0);

        const response: BillSpendingConnection = {
          billId: bill.id,
          billTitle: bill.title,
          policyArea: bill.policyArea ?? null,
          relatedAgencies,
          spending: {
            awards,
            totalAmount,
            awardCount: awards.length,
          },
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: ['congress.gov', 'usaspending.gov'],
            joinType: 'bill-spending',
            dataQuality: awards.length > 0 ? 'complete' : 'partial',
          },
        };

        return response;
      },
      6 * 60 * 60 * 1000 // 6 hour cache
    );

    if (!result) {
      return NextResponse.json({ error: `Bill ${billId} not found` }, { status: 404 });
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('Bill spending join error', error as Error, { billId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
