/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Industry Sector → Civic Connections
 *
 * Given an industry sector, finds connected bills, committees, and spending.
 * Traverses the civic intelligence graph from the industry/finance axis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import {
  getAllPolicyAreas,
  getPolicyAreaMapping,
  getIndustrySectorsForPolicyArea,
} from '@/lib/connections/policy-area-map';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';
import type { JoinMetadata } from '@/types/joins';

export const dynamic = 'force-dynamic';

interface IndustryConnectionsResponse {
  sector: string;
  relatedPolicyAreas: string[];
  relatedAgencies: string[];
  committees: Array<{
    code: string;
    name: string;
    chamber: 'House' | 'Senate' | 'Joint';
  }>;
  recentBills: Array<{
    id: string;
    title: string;
    type: string;
    number: string;
    congress: number;
    policyArea: string | null;
    url: string;
  }>;
  metadata: JoinMetadata;
}

interface CongressBillItem {
  congress: number;
  type: string;
  number: number;
  title: string;
  policyArea?: { name: string };
  url: string;
}

/** Map URL-safe sector slugs to IndustrySector enum values */
function parseSector(input: string): IndustrySector | null {
  const normalized = decodeURIComponent(input).toLowerCase().replace(/-/g, ' ');

  for (const value of Object.values(IndustrySector)) {
    if (value.toLowerCase() === normalized) return value;
    if (value.toLowerCase().replace(/[/&]/g, ' ') === normalized) return value;
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sector: string }> }
): Promise<NextResponse<IndustryConnectionsResponse | { error: string }>> {
  const { sector: sectorParam } = await params;
  const sector = parseSector(sectorParam);

  if (!sector) {
    const validSectors = Object.values(IndustrySector).join(', ');
    return NextResponse.json(
      { error: `Unknown sector "${sectorParam}". Valid sectors: ${validSectors}` },
      { status: 400 }
    );
  }

  try {
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '10'), 30);
    const cacheKey = `join-industry-connections:${sector}:${limit}`;

    const result = await cachedFetch(
      cacheKey,
      async () => {
        const dataSources: string[] = [];

        // Step 1: Find policy areas connected to this industry sector
        const relatedPolicyAreas: string[] = [];
        const relatedAgencySlugs = new Set<string>();

        for (const pa of getAllPolicyAreas()) {
          const sectors = getIndustrySectorsForPolicyArea(pa);
          if (sectors.includes(sector)) {
            relatedPolicyAreas.push(pa);
            const mapping = getPolicyAreaMapping(pa);
            if (mapping) {
              mapping.agencySlugs.forEach(s => relatedAgencySlugs.add(s));
            }
          }
        }

        // Step 2: Collect committees from policy area mappings
        const { getCommitteesForAgency } = await import('@/lib/connections/committee-agency-map');
        const committeeMap = new Map<
          string,
          { code: string; name: string; chamber: 'House' | 'Senate' | 'Joint' }
        >();
        for (const slug of relatedAgencySlugs) {
          const committees = getCommitteesForAgency(slug);
          for (const c of committees) {
            committeeMap.set(c.committeeCode, {
              code: c.committeeCode,
              name: c.committeeName,
              chamber: c.chamber,
            });
          }
        }

        // Step 3: Fetch bills matching this sector's keywords
        // The Congress.gov bill list endpoint does NOT include policyArea,
        // so we match bill titles against federalRegisterKeywords from the
        // policy area mapping instead.
        const recentBills: IndustryConnectionsResponse['recentBills'] = [];

        if (process.env.CONGRESS_API_KEY && relatedPolicyAreas.length > 0) {
          // Collect all keywords from related policy areas
          const keywords: string[] = [];
          for (const pa of relatedPolicyAreas) {
            const mapping = getPolicyAreaMapping(pa);
            if (mapping) {
              keywords.push(...mapping.federalRegisterKeywords);
            }
          }
          const keywordPatterns = keywords.map(k => k.toLowerCase());

          const url = new URL('https://api.congress.gov/v3/bill');
          url.searchParams.set('format', 'json');
          url.searchParams.set('limit', '250');
          url.searchParams.set('sort', 'updateDate+desc');

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);
          try {
            const response = await fetch(url.toString(), {
              headers: {
                'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
                Accept: 'application/json',
                'X-API-Key': process.env.CONGRESS_API_KEY,
              },
              signal: controller.signal,
            });

            if (response.ok) {
              const data = await response.json();
              const allBills: CongressBillItem[] = data.bills || [];
              if (allBills.length > 0) dataSources.push('congress.gov');

              for (const bill of allBills) {
                if (recentBills.length >= limit) break;
                const titleLower = bill.title.toLowerCase();
                const matched = keywordPatterns.some(kw => titleLower.includes(kw));
                if (matched) {
                  recentBills.push({
                    id: `${bill.congress}-${bill.type.toLowerCase()}-${bill.number}`,
                    title: bill.title,
                    type: bill.type,
                    number: bill.number.toString(),
                    congress: bill.congress,
                    policyArea: null,
                    url: bill.url,
                  });
                }
              }
            }
          } catch {
            // Timeout or network error — continue with empty bills
          } finally {
            clearTimeout(timeout);
          }
        }

        return {
          sector,
          relatedPolicyAreas,
          relatedAgencies: [...relatedAgencySlugs],
          committees: [...committeeMap.values()],
          recentBills,
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources,
            joinType: 'industry-connections',
            dataQuality: recentBills.length > 0 ? ('complete' as const) : ('partial' as const),
          },
        } satisfies IndustryConnectionsResponse;
      },
      2 * 60 * 60 * 1000
    );

    if (!result) {
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    logger.error('Industry→connections join error', error as Error, { sector });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
