/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Agency → Bills API — Gap 1B Join Endpoint
 *
 * Reverse of Gap 1A. Given a USAspending agency slug, finds recent
 * congressional bills whose policyArea or committee assignments relate
 * to that agency's oversight domain.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { getCommitteesForAgency } from '@/lib/connections/committee-agency-map';
import { getAllPolicyAreas, getPolicyAreaMapping } from '@/lib/connections/policy-area-map';
import type { JoinMetadata } from '@/types/joins';

export const revalidate = 7200; // 2 hours

interface AgencyBillResult {
  id: string;
  title: string;
  type: string;
  number: string;
  congress: number;
  policyArea: string | null;
  introducedDate: string;
  latestActionDate: string;
  latestActionText: string;
  connectionStrength: 'direct' | 'inferred';
  url: string;
}

interface AgencyBillsResponse {
  agencySlug: string;
  oversightCommittees: Array<{
    code: string;
    name: string;
    chamber: 'House' | 'Senate' | 'Joint';
  }>;
  relatedPolicyAreas: string[];
  bills: AgencyBillResult[];
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
  latestAction?: {
    actionDate: string;
    text: string;
  };
  url: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agencySlug: string }> }
): Promise<NextResponse<AgencyBillsResponse | { error: string }>> {
  const { agencySlug } = await params;

  if (!agencySlug) {
    return NextResponse.json({ error: 'Agency slug is required' }, { status: 400 });
  }

  try {
    logger.info('Agency bills join request', { agencySlug });

    if (!process.env.CONGRESS_API_KEY) {
      return NextResponse.json({ error: 'Congress.gov API key not configured' }, { status: 503 });
    }

    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 30);

    const cacheKey = `join-agency-bills:${agencySlug}:${limit}`;

    const result = await cachedFetch(
      cacheKey,
      async () => {
        // Step 1: Find oversight committees for this agency
        const committees = getCommitteesForAgency(agencySlug);
        const directTopics = new Set<string>();
        for (const c of committees) {
          for (const t of c.topics) {
            directTopics.add(t);
          }
        }

        // Step 2: Find policyAreas that reference this agency slug
        const relatedPolicyAreas: string[] = [];
        for (const pa of getAllPolicyAreas()) {
          const mapping = getPolicyAreaMapping(pa);
          if (mapping?.agencySlugs.includes(agencySlug)) {
            relatedPolicyAreas.push(pa);
          }
        }

        if (relatedPolicyAreas.length === 0 && committees.length === 0) {
          return {
            agencySlug,
            oversightCommittees: [],
            relatedPolicyAreas: [],
            bills: [],
            metadata: {
              generatedAt: new Date().toISOString(),
              dataSources: ['congress.gov'],
              joinType: 'agency-bills',
              dataQuality: 'degraded' as const,
            },
          };
        }

        // Step 3: Fetch recent bills from Congress.gov
        // We fetch a larger batch and post-filter by matching policyAreas
        const fetchLimit = Math.min(limit * 10, 250); // Overfetch to filter
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

        // Step 4: Filter and score bills by relevance
        const policyAreaSet = new Set(relatedPolicyAreas.map(pa => pa.toLowerCase()));
        const scored: AgencyBillResult[] = [];

        for (const bill of allBills) {
          const billPolicyArea = bill.policyArea?.name?.toLowerCase();
          const isDirect = billPolicyArea && policyAreaSet.has(billPolicyArea);

          if (isDirect) {
            scored.push({
              id: `${bill.congress}-${bill.type.toLowerCase()}-${bill.number}`,
              title: bill.title,
              type: bill.type,
              number: bill.number.toString(),
              congress: bill.congress,
              policyArea: bill.policyArea?.name ?? null,
              introducedDate: bill.introducedDate,
              latestActionDate: bill.latestAction?.actionDate || bill.introducedDate,
              latestActionText: bill.latestAction?.text || 'Introduced',
              connectionStrength: 'direct',
              url: bill.url,
            });
          }
        }

        // If direct matches are thin, add topic-keyword matches as inferred
        if (scored.length < limit && directTopics.size > 0) {
          for (const bill of allBills) {
            if (scored.length >= limit) break;
            if (
              scored.some(
                s => s.id === `${bill.congress}-${bill.type.toLowerCase()}-${bill.number}`
              )
            ) {
              continue;
            }
            const titleLower = bill.title.toLowerCase();
            const hasTopicMatch = [...directTopics].some(t => titleLower.includes(t));
            if (hasTopicMatch) {
              scored.push({
                id: `${bill.congress}-${bill.type.toLowerCase()}-${bill.number}`,
                title: bill.title,
                type: bill.type,
                number: bill.number.toString(),
                congress: bill.congress,
                policyArea: bill.policyArea?.name ?? null,
                introducedDate: bill.introducedDate,
                latestActionDate: bill.latestAction?.actionDate || bill.introducedDate,
                latestActionText: bill.latestAction?.text || 'Introduced',
                connectionStrength: 'inferred',
                url: bill.url,
              });
            }
          }
        }

        const bills = scored.slice(0, limit);

        const agencyBillsResponse: AgencyBillsResponse = {
          agencySlug,
          oversightCommittees: committees.map(c => ({
            code: c.committeeCode,
            name: c.committeeName,
            chamber: c.chamber,
          })),
          relatedPolicyAreas,
          bills,
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: ['congress.gov'],
            joinType: 'agency-bills',
            dataQuality: bills.length > 0 ? 'complete' : 'partial',
          },
        };

        return agencyBillsResponse;
      },
      2 * 60 * 60 * 1000 // 2 hour cache
    );

    if (!result) {
      return NextResponse.json({ error: 'Failed to fetch agency bills' }, { status: 500 });
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    logger.error('Agency bills join error', error as Error, { agencySlug });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
