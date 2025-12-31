/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import {
  getAgenciesForCommittees,
  getTopicsForCommittees,
  getCitiesForState,
  type AgencyInfo,
} from '@/lib/connections/committee-agency-map';

// ISR: Revalidate every 6 hours
export const revalidate = 21600;
export const dynamic = 'force-dynamic';

/**
 * Hypertext Connections API
 *
 * This endpoint embodies the civic intelligence philosophy:
 * "The data exists, it's just not organized."
 *
 * Like Wikipedia or PageRank, we connect civic data hypertextually:
 * - Representative → District → Spending
 * - Representative → Committees → Agencies → Regulations
 * - Representative → State → State Legislators
 * - Representative → State → City Councils
 *
 * A citizen looking at their rep should understand:
 * 1. Where their tax money goes (district spending)
 * 2. What agencies their rep oversees (committee connections)
 * 3. What regulations they can comment on (civic participation)
 * 4. Who else represents them (state/local officials)
 */

interface DistrictSpending {
  totalSpending: number;
  contractSpending: number;
  grantSpending: number;
  topContracts: Array<{
    recipient: string;
    amount: number;
    agency: string;
    description: string;
  }>;
  topGrants: Array<{
    recipient: string;
    amount: number;
    agency: string;
    description: string;
  }>;
}

interface RelevantHearing {
  id: string;
  title: string;
  chamber: string;
  dateIssued: string;
  relevance: string; // Why this is relevant to the rep
  pdfUrl: string;
}

interface OpenCommentPeriod {
  id: string;
  title: string;
  agency: string;
  summary: string;
  daysUntilClose: number;
  commentUrl: string | null;
  relevance: string; // Why this is relevant to the rep
}

interface StateLegislator {
  id: string;
  name: string;
  chamber: string;
  district: string;
  party: string;
}

interface CityCouncilMember {
  id: number;
  name: string;
  city: string;
  title: string | null;
}

interface ConnectionsResponse {
  success: boolean;
  representative: {
    bioguideId: string;
    name: string;
    state: string;
    district: string | null;
    chamber: string;
  };
  connections: {
    districtSpending: DistrictSpending | null;
    relevantAgencies: AgencyInfo[];
    relevantTopics: string[];
    relevantHearings: RelevantHearing[];
    openCommentPeriods: OpenCommentPeriod[];
    stateLegislators: StateLegislator[];
    cityCouncils: Array<{
      city: string;
      members: CityCouncilMember[];
    }>;
  };
  civicActions: {
    canComment: number; // Number of open comment periods
    upcomingDeadlines: Array<{
      title: string;
      daysLeft: number;
      url: string | null;
    }>;
  };
  metadata: {
    generatedAt: string;
    dataSources: string[];
  };
  error?: string;
}

/**
 * Fetch district spending from USAspending
 */
async function fetchDistrictSpending(
  state: string,
  district: string | null
): Promise<DistrictSpending | null> {
  if (!district) return null; // Senators don't have districts

  const districtId = `${state}-${district.padStart(2, '0')}`;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/spending/district/${districtId}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.success) return null;

    return {
      totalSpending: data.summary?.totalSpending || 0,
      contractSpending: data.summary?.contractSpending || 0,
      grantSpending: data.summary?.grantSpending || 0,
      topContracts: (data.recentContracts || [])
        .slice(0, 5)
        .map(
          (c: { recipientName: string; amount: number; agency: string; description: string }) => ({
            recipient: c.recipientName,
            amount: c.amount,
            agency: c.agency,
            description: c.description,
          })
        ),
      topGrants: (data.recentGrants || [])
        .slice(0, 5)
        .map(
          (g: { recipientName: string; amount: number; agency: string; description: string }) => ({
            recipient: g.recipientName,
            amount: g.amount,
            agency: g.agency,
            description: g.description,
          })
        ),
    };
  } catch (error) {
    logger.error('Error fetching district spending', error as Error);
    return null;
  }
}

/**
 * Fetch relevant hearings based on committee topics
 */
async function fetchRelevantHearings(
  topics: string[],
  chamber: string
): Promise<RelevantHearing[]> {
  try {
    const chamberParam = chamber === 'Senate' ? 'senate' : 'house';
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/govinfo/hearings?chamber=${chamberParam}&page_size=50`
    );

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.success) return [];

    // Filter hearings by topic relevance
    const relevant: RelevantHearing[] = [];
    const topicsLower = topics.map(t => t.toLowerCase());

    for (const hearing of data.hearings || []) {
      const titleLower = hearing.title.toLowerCase();
      const matchedTopic = topicsLower.find(topic => titleLower.includes(topic));

      if (matchedTopic) {
        relevant.push({
          id: hearing.id,
          title: hearing.title,
          chamber: hearing.chamber,
          dateIssued: hearing.dateIssued,
          relevance: `Related to ${matchedTopic}`,
          pdfUrl: hearing.pdfUrl,
        });
      }

      if (relevant.length >= 5) break;
    }

    return relevant;
  } catch (error) {
    logger.error('Error fetching relevant hearings', error as Error);
    return [];
  }
}

/**
 * Fetch open comment periods relevant to representative's committees
 */
async function fetchRelevantCommentPeriods(
  agencies: AgencyInfo[],
  topics: string[]
): Promise<OpenCommentPeriod[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/federal-register/comment-periods`
    );

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.success) return [];

    const relevant: OpenCommentPeriod[] = [];
    const agencySlugs = agencies.map(a => a.slug);
    const agencyNames = agencies.map(a => a.name.toLowerCase());
    const topicsLower = topics.map(t => t.toLowerCase());

    for (const period of data.openComments || []) {
      const agencyLower = (period.agency || '').toLowerCase();
      const titleLower = (period.title || '').toLowerCase();
      const summaryLower = (period.summary || '').toLowerCase();

      // Check agency match
      const matchedAgency = agencyNames.find(
        name => agencyLower.includes(name) || name.includes(agencyLower)
      );

      // Check topic match in title or summary
      const matchedTopic = topicsLower.find(
        topic => titleLower.includes(topic) || summaryLower.includes(topic)
      );

      if (matchedAgency || matchedTopic) {
        relevant.push({
          id: period.id,
          title: period.title,
          agency: period.agency,
          summary: period.summary?.substring(0, 200) + '...',
          daysUntilClose: period.daysUntilClose,
          commentUrl: period.commentUrl,
          relevance: matchedAgency
            ? `${period.agency} is overseen by your representative's committees`
            : `Related to ${matchedTopic}`,
        });
      }

      if (relevant.length >= 10) break;
    }

    // Sort by urgency (days until close)
    return relevant.sort((a, b) => a.daysUntilClose - b.daysUntilClose);
  } catch (error) {
    logger.error('Error fetching comment periods', error as Error);
    return [];
  }
}

/**
 * Fetch state legislators for the representative's state
 */
async function fetchStateLegislators(state: string): Promise<StateLegislator[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/state-legislature/${state}`
    );

    if (!response.ok) return [];

    const data = await response.json();

    // Return a sample of legislators (not all 200+)
    const legislators = (data.legislators || []).slice(0, 10);

    return legislators.map(
      (leg: {
        id: string;
        name: string;
        current_role?: { title?: string; district?: string };
        party?: string;
      }) => ({
        id: leg.id,
        name: leg.name,
        chamber: leg.current_role?.title?.includes('Senator') ? 'Senate' : 'House',
        district: leg.current_role?.district || 'Unknown',
        party: leg.party || 'Unknown',
      })
    );
  } catch (error) {
    logger.error('Error fetching state legislators', error as Error);
    return [];
  }
}

/**
 * Fetch city council members for major cities in the state
 */
async function fetchCityCouncils(
  state: string
): Promise<Array<{ city: string; members: CityCouncilMember[] }>> {
  const cities = getCitiesForState(state);
  if (cities.length === 0) return [];

  const results: Array<{ city: string; members: CityCouncilMember[] }> = [];

  for (const city of cities) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/city/${city}/council?active=true`
      );

      if (!response.ok) continue;

      const data = await response.json();
      if (!data.success) continue;

      results.push({
        city: data.city?.name || city,
        members: (data.members || [])
          .slice(0, 10)
          .map((m: { id: number; name: string; title: string | null }) => ({
            id: m.id,
            name: m.name,
            city: data.city?.name || city,
            title: m.title,
          })),
      });
    } catch (error) {
      logger.error('Error fetching city council', error as Error, { city });
    }
  }

  return results;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse<ConnectionsResponse>> {
  const startTime = Date.now();

  try {
    const { bioguideId } = await params;
    const upperBioguideId = bioguideId.toUpperCase();

    const cacheKey = `connections-${upperBioguideId}`;

    logger.info('Connections API request', { bioguideId: upperBioguideId });

    const result = await cachedFetch(
      cacheKey,
      async () => {
        // Step 1: Get representative data
        const rep = await getEnhancedRepresentative(upperBioguideId);

        if (!rep) {
          return { error: 'Representative not found' };
        }

        // Step 2: Extract committee names
        const committeeNames = (rep.committees || []).map(c => c.name);

        // Step 3: Map committees to agencies and topics
        const relevantAgencies = getAgenciesForCommittees(committeeNames);
        const relevantTopics = getTopicsForCommittees(committeeNames);

        // Step 4: Fetch all connected data in parallel
        const [
          districtSpending,
          relevantHearings,
          openCommentPeriods,
          stateLegislators,
          cityCouncils,
        ] = await Promise.all([
          fetchDistrictSpending(rep.state, rep.district?.toString() || null),
          fetchRelevantHearings(relevantTopics, rep.chamber),
          fetchRelevantCommentPeriods(relevantAgencies, relevantTopics),
          fetchStateLegislators(rep.state),
          fetchCityCouncils(rep.state),
        ]);

        return {
          representative: {
            bioguideId: rep.bioguideId,
            name: rep.name,
            state: rep.state,
            district: rep.district?.toString() || null,
            chamber: rep.chamber,
          },
          connections: {
            districtSpending,
            relevantAgencies,
            relevantTopics,
            relevantHearings,
            openCommentPeriods,
            stateLegislators,
            cityCouncils,
          },
          civicActions: {
            canComment: openCommentPeriods.length,
            upcomingDeadlines: openCommentPeriods
              .filter(p => p.daysUntilClose <= 7)
              .map(p => ({
                title: p.title,
                daysLeft: p.daysUntilClose,
                url: p.commentUrl,
              })),
          },
        };
      },
      6 * 60 * 60 * 1000 // 6 hour cache
    );

    if ('error' in result && typeof result.error === 'string') {
      return NextResponse.json(
        {
          success: false,
          representative: { bioguideId, name: '', state: '', district: null, chamber: '' },
          connections: {
            districtSpending: null,
            relevantAgencies: [],
            relevantTopics: [],
            relevantHearings: [],
            openCommentPeriods: [],
            stateLegislators: [],
            cityCouncils: [],
          },
          civicActions: { canComment: 0, upcomingDeadlines: [] },
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: [],
          },
          error: result.error,
        },
        { status: 404 }
      );
    }

    const duration = Date.now() - startTime;
    logger.info('Connections API response', { bioguideId, duration });

    return NextResponse.json(
      {
        success: true,
        ...(result as Omit<ConnectionsResponse, 'success' | 'metadata'>),
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSources: [
            'congress-legislators',
            'usaspending.gov',
            'govinfo.gov',
            'federalregister.gov',
            'openstates.org',
            'legistar.com',
          ],
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Connections API error', error as Error);

    return NextResponse.json(
      {
        success: false,
        representative: { bioguideId: '', name: '', state: '', district: null, chamber: '' },
        connections: {
          districtSpending: null,
          relevantAgencies: [],
          relevantTopics: [],
          relevantHearings: [],
          openCommentPeriods: [],
          stateLegislators: [],
          cityCouncils: [],
        },
        civicActions: { canComment: 0, upcomingDeadlines: [] },
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSources: [],
        },
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
