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

// Types matching the committee/[committeeId]/meetings endpoint
interface CommitteeMeeting {
  eventId: string;
  date: string;
  title: string;
  type: 'Hearing' | 'Markup' | 'Meeting';
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Postponed';
  chamber: 'House' | 'Senate';
  location?: {
    building?: string;
    room?: string;
  };
  committees: Array<{
    name: string;
    systemCode: string;
  }>;
  videos: Array<{
    name: string;
    url: string;
    isYouTube: boolean;
  }>;
  witnesses: Array<{
    name: string;
    organization?: string;
    position?: string;
  }>;
  documents: Array<{
    type: string;
    name?: string;
    url?: string;
    format?: string;
  }>;
  hasTranscript: boolean;
  congressGovUrl: string;
}

interface CommitteeMeetingsResponse {
  success: boolean;
  meetings: CommitteeMeeting[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  metadata: {
    lastUpdated: string;
    dataSource: string;
    congress: number;
    chamber: string;
  };
  liveFloor: {
    houseUrl: string;
    senateUrl: string;
    youtubeChannel: string;
  };
  error?: string;
}

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const CURRENT_CONGRESS = 119;

interface CongressMeetingDetail {
  chamber: string;
  congress: number;
  eventId: string;
  date: string;
  title: string;
  type: string;
  meetingStatus: string;
  updateDate: string;
  location?: {
    building?: string;
    room?: string;
  };
  committees?: Array<{
    name: string;
    systemCode: string;
    url: string;
  }>;
  videos?: Array<{
    name: string;
    url: string;
  }>;
  witnesses?: Array<{
    name: string;
    organization?: string;
    position?: string;
  }>;
  meetingDocuments?: Array<{
    documentType: string;
    format?: string;
    name?: string;
    url?: string;
  }>;
  witnessDocuments?: Array<{
    documentType: string;
    format?: string;
    name?: string;
    url?: string;
  }>;
  hearingTranscript?: Array<{
    jacketNumber: number;
    url: string;
  }>;
}

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

function mapMeetingStatus(status: string): 'Scheduled' | 'Completed' | 'Cancelled' | 'Postponed' {
  const statusLower = status?.toLowerCase() || '';
  if (statusLower.includes('cancel')) return 'Cancelled';
  if (statusLower.includes('postpone')) return 'Postponed';
  if (statusLower.includes('schedul')) return 'Scheduled';
  return 'Completed';
}

async function fetchAllMeetings(
  chamber: 'house' | 'senate' | 'all',
  limit: number,
  offset: number,
  withVideosOnly: boolean
): Promise<{ meetings: CommitteeMeeting[]; total: number }> {
  if (!CONGRESS_API_KEY) {
    logger.warn('CONGRESS_API_KEY not configured');
    return { meetings: [], total: 0 };
  }

  const cacheKey = `all-committee-meetings-${chamber}-${limit}-${offset}-${withVideosOnly}`;

  return cachedFetch(
    cacheKey,
    async () => {
      const chambers = chamber === 'all' ? ['house', 'senate'] : [chamber];
      const allMeetings: CommitteeMeeting[] = [];
      let totalCount = 0;

      for (const ch of chambers) {
        try {
          // Fetch more than needed to account for filtering
          const fetchLimit = withVideosOnly ? limit * 5 : limit;
          const listUrl = `https://api.congress.gov/v3/committee-meeting/${CURRENT_CONGRESS}/${ch}?limit=${fetchLimit}&offset=${offset}&api_key=${CONGRESS_API_KEY}`;

          const listResponse = await fetch(listUrl, {
            headers: { Accept: 'application/json' },
          });

          if (!listResponse.ok) continue;

          const listData = await listResponse.json();
          const meetingsList = listData.committeeMeetings || [];
          totalCount += listData.pagination?.count || 0;

          // Fetch details for each meeting (batch of limit)
          const detailPromises = meetingsList
            .slice(0, withVideosOnly ? fetchLimit : limit)
            .map(async (m: { eventId: string }) => {
              const details = await fetchMeetingDetails(m.eventId, ch);
              if (!details) return null;

              // Filter for videos only if requested
              if (withVideosOnly && (!details.videos || details.videos.length === 0)) {
                return null;
              }

              const transformed: CommitteeMeeting = {
                eventId: details.eventId,
                date: details.date,
                title: details.title || 'Untitled Meeting',
                type: (details.type as CommitteeMeeting['type']) || 'Meeting',
                status: mapMeetingStatus(details.meetingStatus),
                chamber: details.chamber === 'House' ? 'House' : 'Senate',
                location: details.location,
                committees:
                  details.committees?.map(c => ({
                    name: c.name,
                    systemCode: c.systemCode,
                  })) || [],
                videos:
                  details.videos?.map(v => ({
                    name: v.name,
                    url: v.url,
                    isYouTube: v.url.includes('youtube.com') || v.url.includes('youtu.be'),
                  })) || [],
                witnesses:
                  details.witnesses?.map(w => ({
                    name: w.name,
                    organization: w.organization,
                    position: w.position,
                  })) || [],
                documents: [
                  ...(details.meetingDocuments || []),
                  ...(details.witnessDocuments || []),
                ].map(d => ({
                  type: d.documentType,
                  name: d.name,
                  url: d.url,
                  format: d.format,
                })),
                hasTranscript: (details.hearingTranscript?.length || 0) > 0,
                congressGovUrl: `https://www.congress.gov/event/${CURRENT_CONGRESS}th-Congress/${ch}-event/${details.eventId}`,
              };

              return transformed;
            });

          const results = await Promise.all(detailPromises);
          const validMeetings = results.filter((m): m is CommitteeMeeting => m !== null);
          allMeetings.push(...validMeetings);
        } catch (error) {
          logger.error('Error fetching meetings for chamber', error as Error, { chamber: ch });
        }
      }

      // Sort by date descending (most recent first)
      allMeetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      logger.info('Fetched all committee meetings', {
        chamber,
        totalMeetings: allMeetings.length,
        withVideos: allMeetings.filter(m => m.videos.length > 0).length,
      });

      return {
        meetings: allMeetings.slice(0, limit),
        total: totalCount,
      };
    },
    60 * 60 * 1000 // 1 hour cache
  );
}

export async function GET(request: NextRequest): Promise<NextResponse<CommitteeMeetingsResponse>> {
  try {
    const { searchParams } = request.nextUrl;

    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');
    const chamberParam = searchParams.get('chamber')?.toLowerCase() || 'all';
    const withVideosOnly = searchParams.get('withVideos') === 'true';

    const chamber =
      chamberParam === 'house' || chamberParam === 'h'
        ? 'house'
        : chamberParam === 'senate' || chamberParam === 's'
          ? 'senate'
          : 'all';

    logger.info('Committee meetings list API request', {
      limit,
      offset,
      chamber,
      withVideosOnly,
    });

    const { meetings, total } = await fetchAllMeetings(chamber, limit, offset, withVideosOnly);

    return NextResponse.json(
      {
        success: true,
        meetings,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + meetings.length < total,
        },
        metadata: {
          lastUpdated: new Date().toISOString(),
          dataSource: 'congress.gov',
          congress: CURRENT_CONGRESS,
          chamber,
        },
        liveFloor: {
          houseUrl: 'https://live.house.gov/',
          senateUrl: 'https://www.senate.gov/floor/',
          youtubeChannel: 'https://www.youtube.com/@USHouseClerk',
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

    logger.error('Committee meetings list API error', error as Error);

    return NextResponse.json(
      {
        success: false,
        meetings: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
        metadata: {
          lastUpdated: new Date().toISOString(),
          dataSource: 'congress.gov',
          congress: CURRENT_CONGRESS,
          chamber: 'all',
        },
        liveFloor: {
          houseUrl: 'https://live.house.gov/',
          senateUrl: 'https://www.senate.gov/floor/',
          youtubeChannel: 'https://www.youtube.com/@USHouseClerk',
        },
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
