/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const CURRENT_CONGRESS = 119;

// Types for witness data
interface Witness {
  name: string;
  organization?: string;
  position?: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  chamber: 'House' | 'Senate';
  committees: string[];
  congressGovUrl: string;
}

interface WitnessSearchResponse {
  success: boolean;
  witnesses: Witness[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  metadata: {
    generatedAt: string;
    dataSource: string;
    congress: number;
    searchQuery?: string;
  };
  error?: string;
}

// Congress.gov API types
interface CongressMeetingListItem {
  chamber: string;
  congress: number;
  eventId: string;
  updateDate: string;
}

interface CongressMeetingDetail {
  chamber: string;
  congress: number;
  eventId: string;
  date: string;
  title: string;
  type: string;
  committees?: Array<{
    name: string;
    systemCode: string;
  }>;
  witnesses?: Array<{
    name: string;
    organization?: string;
    position?: string;
  }>;
}

/**
 * Fetch meeting details from Congress.gov API
 */
async function fetchMeetingDetails(
  eventId: string,
  chamber: string
): Promise<CongressMeetingDetail | null> {
  if (!CONGRESS_API_KEY) return null;

  try {
    const url = `https://api.congress.gov/v3/committee-meeting/${CURRENT_CONGRESS}/${chamber.toLowerCase()}/${eventId}?api_key=${CONGRESS_API_KEY}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.committeeMeeting as CongressMeetingDetail;
  } catch {
    return null;
  }
}

/**
 * Aggregate witnesses from committee meetings
 */
async function aggregateWitnesses(
  searchQuery: string | null,
  chamber: 'house' | 'senate' | 'all',
  limit: number,
  offset: number
): Promise<{ witnesses: Witness[]; total: number }> {
  if (!CONGRESS_API_KEY) {
    logger.warn('CONGRESS_API_KEY not configured');
    return { witnesses: [], total: 0 };
  }

  const cacheKey = `witnesses-${chamber}-${searchQuery ?? 'all'}-${limit}-${offset}`;

  return cachedFetch(
    cacheKey,
    async () => {
      const chambers = chamber === 'all' ? ['house', 'senate'] : [chamber];
      const allWitnesses: Witness[] = [];

      for (const ch of chambers) {
        try {
          // Fetch recent meetings (last 100 to get good witness coverage)
          const listUrl = `https://api.congress.gov/v3/committee-meeting/${CURRENT_CONGRESS}/${ch}?limit=100&api_key=${CONGRESS_API_KEY}`;
          const listResponse = await fetch(listUrl, {
            headers: { Accept: 'application/json' },
          });

          if (!listResponse.ok) continue;

          const listData = await listResponse.json();
          const meetingsList: CongressMeetingListItem[] = listData.committeeMeetings ?? [];

          // Fetch details for meetings (batch to avoid rate limits)
          const batchSize = 20;
          for (let i = 0; i < Math.min(meetingsList.length, 50); i += batchSize) {
            const batch = meetingsList.slice(i, i + batchSize);
            const detailPromises = batch.map(m => fetchMeetingDetails(m.eventId, ch));
            const details = await Promise.all(detailPromises);

            for (const detail of details) {
              if (!detail?.witnesses?.length) continue;

              for (const witness of detail.witnesses) {
                // Apply search filter if provided
                if (searchQuery) {
                  const query = searchQuery.toLowerCase();
                  const nameMatch = witness.name?.toLowerCase().includes(query);
                  const orgMatch = witness.organization?.toLowerCase().includes(query);
                  const posMatch = witness.position?.toLowerCase().includes(query);
                  const titleMatch = detail.title?.toLowerCase().includes(query);

                  if (!nameMatch && !orgMatch && !posMatch && !titleMatch) {
                    continue;
                  }
                }

                allWitnesses.push({
                  name: witness.name ?? 'Unknown',
                  organization: witness.organization,
                  position: witness.position,
                  eventId: detail.eventId,
                  eventTitle: detail.title ?? 'Untitled Event',
                  eventDate: detail.date,
                  chamber: detail.chamber === 'House' ? 'House' : 'Senate',
                  committees: detail.committees?.map(c => c.name) ?? [],
                  congressGovUrl: `https://www.congress.gov/event/${CURRENT_CONGRESS}th-Congress/${ch}-event/${detail.eventId}`,
                });
              }
            }
          }
        } catch (error) {
          logger.error('Error fetching witnesses for chamber', error as Error, { chamber: ch });
        }
      }

      // Sort by date descending
      allWitnesses.sort(
        (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
      );

      logger.info('Aggregated witnesses', {
        total: allWitnesses.length,
        chamber,
        searchQuery,
      });

      return {
        witnesses: allWitnesses,
        total: allWitnesses.length,
      };
    },
    60 * 60 * 1000 // 1 hour cache
  );
}

export async function GET(request: NextRequest): Promise<NextResponse<WitnessSearchResponse>> {
  try {
    const { searchParams } = request.nextUrl;

    const searchQuery = searchParams.get('q') ?? searchParams.get('query');
    const chamberParam = searchParams.get('chamber')?.toLowerCase() ?? 'all';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const chamber =
      chamberParam === 'house' || chamberParam === 'h'
        ? 'house'
        : chamberParam === 'senate' || chamberParam === 's'
          ? 'senate'
          : 'all';

    logger.info('Witnesses API request', {
      searchQuery,
      chamber,
      limit,
      offset,
    });

    const { witnesses, total } = await aggregateWitnesses(searchQuery, chamber, limit, offset);

    // Apply pagination
    const paginatedWitnesses = witnesses.slice(offset, offset + limit);

    return NextResponse.json(
      {
        success: true,
        witnesses: paginatedWitnesses,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + paginatedWitnesses.length < total,
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSource: 'congress.gov',
          congress: CURRENT_CONGRESS,
          searchQuery: searchQuery ?? undefined,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Witnesses API error', error as Error);

    return NextResponse.json(
      {
        success: false,
        witnesses: [],
        pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSource: 'congress.gov',
          congress: CURRENT_CONGRESS,
        },
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
