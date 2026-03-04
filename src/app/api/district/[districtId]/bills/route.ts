/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * District → Relevant Bills API — Gap 8 Join Endpoint
 *
 * Finds bills relevant to a congressional district by:
 * 1. Fetching district spending to identify top agencies
 * 2. Reverse-mapping agencies → committees → topics → policyAreas
 * 3. Getting the district rep's committee assignments for additional topics
 * 4. Querying Congress.gov for recent bills and scoring by relevance
 *
 * Relevance scoring:
 * +3 policyArea maps to an agency with district spending
 * +2 bill's committee matches the rep's committee
 * +1 any topic/keyword match
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import {
  getCommitteesForAgency,
  getTopicsForCommittee,
} from '@/lib/connections/committee-agency-map';
import { getAllPolicyAreas, getPolicyAreaMapping } from '@/lib/connections/policy-area-map';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { mapCongressStatus } from '@/lib/services/bill.service';
import type { BillStatus } from '@/types/bill';
import type { JoinMetadata } from '@/types/joins';

export const revalidate = 21600; // 6 hours

const USASPENDING_API = 'https://api.usaspending.gov/api/v2';

interface DistrictBill {
  id: string;
  title: string;
  type: string;
  number: string;
  congress: number;
  status: BillStatus;
  policyArea: string | null;
  introducedDate: string;
  latestActionDate: string;
  latestActionText: string;
  relevanceScore: number;
  relevanceReasons: string[];
  url: string;
}

interface DistrictBillsResponse {
  districtId: string;
  state: string;
  district: string;
  representativeName: string | null;
  topAgencies: string[];
  relevantPolicyAreas: string[];
  bills: DistrictBill[];
  metadata: JoinMetadata;
}

interface CongressBillListItem {
  congress: number;
  type: string;
  number: number;
  title: string;
  introducedDate: string;
  policyArea?: { name: string };
  latestAction?: { actionDate: string; text: string };
  url: string;
}

function parseDistrictId(districtId: string): { state: string; district: string } | null {
  const match = districtId.match(/^([A-Z]{2})-(\d{2}|AL)$/i);
  if (!match) return null;
  return {
    state: (match[1] ?? '').toUpperCase(),
    district: (match[2] ?? '').toUpperCase(),
  };
}

async function fetchTopAgenciesForDistrict(state: string, district: string): Promise<string[]> {
  const fiscalYear = new Date().getFullYear();
  const startDate = `${fiscalYear - 1}-10-01`;
  const endDate = `${fiscalYear}-09-30`;

  const districtCode = district === 'AL' ? '00' : district;

  const requestBody = {
    subawards: false,
    limit: 20,
    fields: ['Awarding Agency', 'Award Amount'],
    sort: 'Award Amount',
    order: 'desc',
    filters: {
      place_of_performance_locations: [{ country: 'USA', state, district_current: districtCode }],
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

    if (!response.ok) return [];

    const data = await response.json();
    // Extract unique agency names
    const agencies = new Set<string>();
    for (const r of data.results ?? []) {
      if (r['Awarding Agency']) agencies.add(r['Awarding Agency']);
    }
    return [...agencies].slice(0, 10);
  } catch {
    return [];
  }
}

function agencyNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
): Promise<NextResponse<DistrictBillsResponse | { error: string }>> {
  const { districtId } = await params;

  const parsed = parseDistrictId(districtId);
  if (!parsed) {
    return NextResponse.json(
      { error: 'Invalid district ID format. Use format: ST-DD (e.g., MI-05, CA-12, AK-AL)' },
      { status: 400 }
    );
  }

  if (!process.env.CONGRESS_API_KEY) {
    return NextResponse.json({ error: 'Congress.gov API key not configured' }, { status: 503 });
  }

  try {
    const { state, district } = parsed;
    logger.info('District bills join request', { districtId, state, district });

    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 30);

    const cacheKey = `join-district-bills:${state}-${district}:${limit}`;

    const result = await cachedFetch(
      cacheKey,
      async () => {
        // Step 1: Fetch district spending agencies + district rep in parallel
        const [topAgencyNames, allReps] = await Promise.all([
          fetchTopAgenciesForDistrict(state, district),
          getAllEnhancedRepresentatives(),
        ]);

        // Find the House rep for this district
        const normalizeDistrict = (d: string | undefined): string => {
          if (!d || d === '' || d === '0' || d === '00') return '00';
          return d.padStart(2, '0');
        };

        const rep = allReps.find(r => {
          if (r.state !== state || r.chamber !== 'House') return false;
          if (district === 'AL') return true;
          return normalizeDistrict(r.district) === normalizeDistrict(district);
        });

        // Step 2: Map spending agencies → slugs → committees → topics
        const agencySlugs = topAgencyNames.map(agencyNameToSlug);
        const spendingTopics = new Set<string>();
        const spendingPolicyAreas = new Set<string>();

        for (const slug of agencySlugs) {
          for (const cm of getCommitteesForAgency(slug)) {
            for (const t of cm.topics) spendingTopics.add(t);
          }
        }

        // Find policyAreas that map to these agency slugs
        for (const pa of getAllPolicyAreas()) {
          const mapping = getPolicyAreaMapping(pa);
          if (mapping?.agencySlugs.some(s => agencySlugs.includes(s))) {
            spendingPolicyAreas.add(pa);
          }
        }

        // Steps 3 & 4: Fetch rep's committees and recent bills in parallel
        const fetchLimit = Math.min(limit * 10, 250);
        const billUrl = new URL('https://api.congress.gov/v3/bill/119');
        billUrl.searchParams.set('format', 'json');
        billUrl.searchParams.set('limit', fetchLimit.toString());
        billUrl.searchParams.set('sort', 'updateDate+desc');

        const congressHeaders = {
          'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
          Accept: 'application/json',
          'X-API-Key': process.env.CONGRESS_API_KEY || '',
        };

        // Fetch member committees (for +2 scoring) and bills in parallel
        const memberCommitteesFetch = rep?.bioguideId
          ? fetch(`https://api.congress.gov/v3/member/${rep.bioguideId}?format=json`, {
              headers: congressHeaders,
              signal: AbortSignal.timeout(8000),
            })
              .then(async res => {
                if (!res.ok) return [];
                const data = await res.json();
                return (data.member?.committees ?? [])
                  .map((c: { name?: string }) => c.name)
                  .filter((n: string | undefined): n is string => !!n);
              })
              .catch(() => [] as string[])
          : Promise.resolve([] as string[]);

        const billsFetch = fetch(billUrl.toString(), { headers: congressHeaders })
          .then(async res => {
            if (!res.ok) return [];
            const data = await res.json();
            return (data.bills || []) as CongressBillListItem[];
          })
          .catch(() => [] as CongressBillListItem[]);

        const [repCommitteeNames, allBills] = await Promise.all([
          memberCommitteesFetch,
          billsFetch,
        ]);

        // Build rep committee topics for +2 scoring path
        const repTopics = new Set<string>();
        for (const name of repCommitteeNames) {
          for (const t of getTopicsForCommittee(name)) {
            repTopics.add(t);
          }
        }

        // Combine all relevant policyAreas
        for (const pa of getAllPolicyAreas()) {
          const mapping = getPolicyAreaMapping(pa);
          if (!mapping) continue;
          const hasRepTopicOverlap = mapping.topics.some(t => repTopics.has(t.toLowerCase()));
          if (hasRepTopicOverlap) spendingPolicyAreas.add(pa);
        }

        const relevantPolicyAreas = [...spendingPolicyAreas];
        const policyAreaLower = new Set(relevantPolicyAreas.map(pa => pa.toLowerCase()));

        // Step 5: Score each bill
        const scored: DistrictBill[] = [];

        for (const bill of allBills) {
          let score = 0;
          const reasons: string[] = [];

          const billPolicyArea = bill.policyArea?.name;

          // +3: policyArea maps to an agency with district spending
          if (billPolicyArea && policyAreaLower.has(billPolicyArea.toLowerCase())) {
            score += 3;
            reasons.push(`Policy area "${billPolicyArea}" linked to district spending`);
          }

          // +2: topic keyword match from rep's committees
          const titleLower = bill.title.toLowerCase();
          const hasRepTopicMatch = [...repTopics].some(t => titleLower.includes(t));
          if (hasRepTopicMatch) {
            score += 2;
            reasons.push("Matches representative's committee topics");
          }

          // +1 for spending topic match
          const hasSpendingTopicMatch = [...spendingTopics].some(t => titleLower.includes(t));
          if (hasSpendingTopicMatch && !hasRepTopicMatch) {
            score += 1;
            reasons.push('Matches district spending topics');
          }

          if (score > 0) {
            scored.push({
              id: `${bill.congress}-${bill.type.toLowerCase()}-${bill.number}`,
              title: bill.title,
              type: bill.type,
              number: bill.number.toString(),
              congress: bill.congress,
              status: mapCongressStatus(bill.latestAction?.text) ?? 'introduced',
              policyArea: billPolicyArea ?? null,
              introducedDate: bill.introducedDate,
              latestActionDate: bill.latestAction?.actionDate ?? bill.introducedDate,
              latestActionText: bill.latestAction?.text ?? 'Introduced',
              relevanceScore: score,
              relevanceReasons: reasons,
              url: bill.url,
            });
          }
        }

        // Sort by relevance score desc, then by date desc
        scored.sort((a, b) => {
          if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
          return new Date(b.latestActionDate).getTime() - new Date(a.latestActionDate).getTime();
        });

        const bills = scored.slice(0, limit);

        const dataSources = ['congress.gov'];
        if (topAgencyNames.length > 0) dataSources.push('usaspending.gov');

        const districtBillsResponse: DistrictBillsResponse = {
          districtId: `${state}-${district}`,
          state,
          district,
          representativeName: rep?.name ?? null,
          topAgencies: topAgencyNames,
          relevantPolicyAreas,
          bills,
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources,
            joinType: 'district-bills',
            dataQuality: bills.length > 0 ? 'complete' : 'partial',
          },
        };

        return districtBillsResponse;
      },
      6 * 60 * 60 * 1000 // 6 hour cache
    );

    if (!result) {
      return NextResponse.json({ error: 'Failed to fetch district bills' }, { status: 500 });
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('District bills join error', error as Error, { districtId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
