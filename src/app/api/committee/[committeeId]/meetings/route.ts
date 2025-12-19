/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';

// ISR: Revalidate every 1 hour (meetings change frequently)
export const revalidate = 3600;
export const dynamic = 'force-dynamic';

// Types for Congress.gov committee meeting API response
interface CongressMeetingListItem {
  chamber: string;
  congress: number;
  eventId: string;
  updateDate: string;
  url: string;
}

interface CongressMeetingVideo {
  name: string;
  url: string;
}

interface CongressMeetingWitness {
  name: string;
  organization?: string;
  position?: string;
}

interface CongressMeetingDocument {
  documentType: string;
  format?: string;
  name?: string;
  url?: string;
}

interface CongressMeetingCommittee {
  name: string;
  systemCode: string;
  url: string;
}

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
  committees?: CongressMeetingCommittee[];
  videos?: CongressMeetingVideo[];
  witnesses?: CongressMeetingWitness[];
  meetingDocuments?: CongressMeetingDocument[];
  witnessDocuments?: CongressMeetingDocument[];
  hearingTranscript?: Array<{
    jacketNumber: number;
    url: string;
  }>;
}

// Response types for our API
export interface CommitteeMeeting {
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
  committeeId: string;
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
  };
  error?: string;
}

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const CURRENT_CONGRESS = 119;

/**
 * Fetch meeting details from Congress.gov API
 */
async function fetchMeetingDetails(
  eventId: string,
  chamber: string
): Promise<CongressMeetingDetail | null> {
  if (!CONGRESS_API_KEY) {
    logger.warn('CONGRESS_API_KEY not configured');
    return null;
  }

  try {
    const url = `https://api.congress.gov/v3/committee-meeting/${CURRENT_CONGRESS}/${chamber.toLowerCase()}/${eventId}?api_key=${CONGRESS_API_KEY}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      logger.warn('Failed to fetch meeting details', {
        eventId,
        status: response.status,
      });
      return null;
    }

    const data = await response.json();
    return data.committeeMeeting as CongressMeetingDetail;
  } catch (error) {
    logger.error('Error fetching meeting details', error as Error, { eventId });
    return null;
  }
}

/**
 * Fetch committee meetings from Congress.gov API
 */
async function fetchCommitteeMeetings(
  committeeId: string,
  chamber: 'house' | 'senate',
  limit: number,
  offset: number
): Promise<{ meetings: CommitteeMeeting[]; total: number }> {
  if (!CONGRESS_API_KEY) {
    logger.warn('CONGRESS_API_KEY not configured');
    return { meetings: [], total: 0 };
  }

  const cacheKey = `committee-meetings-${committeeId}-${chamber}-${limit}-${offset}`;

  return cachedFetch(
    cacheKey,
    async () => {
      try {
        // Fetch list of meetings for the chamber
        const listUrl = `https://api.congress.gov/v3/committee-meeting/${CURRENT_CONGRESS}/${chamber}?limit=${Math.min(limit * 3, 100)}&offset=${offset}&api_key=${CONGRESS_API_KEY}`;
        const listResponse = await fetch(listUrl, {
          headers: { Accept: 'application/json' },
        });

        if (!listResponse.ok) {
          logger.error('Failed to fetch committee meetings list', {
            status: listResponse.status,
          });
          return { meetings: [], total: 0 };
        }

        const listData = await listResponse.json();
        const meetingsList: CongressMeetingListItem[] = listData.committeeMeetings || [];
        const total = listData.pagination?.count || 0;

        // Fetch details for each meeting in parallel (limited batch)
        const meetingPromises = meetingsList.slice(0, limit).map(async meeting => {
          const details = await fetchMeetingDetails(meeting.eventId, chamber);
          if (!details) return null;

          // Filter by committee ID if provided
          const committeeUpper = committeeId.toUpperCase();
          const matchesCommittee =
            !committeeId ||
            committeeId === 'all' ||
            details.committees?.some(
              c =>
                c.systemCode.toUpperCase() === committeeUpper ||
                c.systemCode.toUpperCase().startsWith(committeeUpper)
            );

          if (!matchesCommittee) return null;

          // Transform to our response format
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
            congressGovUrl: `https://www.congress.gov/event/${CURRENT_CONGRESS}th-Congress/${chamber}-event/${details.eventId}`,
          };

          return transformed;
        });

        const results = await Promise.all(meetingPromises);
        const meetings = results.filter((m): m is CommitteeMeeting => m !== null);

        logger.info('Fetched committee meetings', {
          committeeId,
          chamber,
          requestedCount: limit,
          returnedCount: meetings.length,
          withVideos: meetings.filter(m => m.videos.length > 0).length,
        });

        return { meetings, total };
      } catch (error) {
        logger.error('Error fetching committee meetings', error as Error, {
          committeeId,
          chamber,
        });
        return { meetings: [], total: 0 };
      }
    },
    60 * 60 * 1000 // 1 hour cache
  );
}

function mapMeetingStatus(status: string): 'Scheduled' | 'Completed' | 'Cancelled' | 'Postponed' {
  const statusLower = status?.toLowerCase() || '';
  if (statusLower.includes('cancel')) return 'Cancelled';
  if (statusLower.includes('postpone')) return 'Postponed';
  if (statusLower.includes('schedul')) return 'Scheduled';
  return 'Completed';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ committeeId: string }> }
): Promise<NextResponse<CommitteeMeetingsResponse>> {
  try {
    const { committeeId } = await params;
    const { searchParams } = request.nextUrl;

    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');
    const chamberParam = searchParams.get('chamber')?.toLowerCase();

    logger.info('Committee meetings API request', {
      committeeId,
      limit,
      offset,
      chamber: chamberParam,
    });

    // Determine chamber from committee ID if not specified
    let chamber: 'house' | 'senate' = 'house';
    if (chamberParam === 'senate' || chamberParam === 's') {
      chamber = 'senate';
    } else if (chamberParam === 'house' || chamberParam === 'h') {
      chamber = 'house';
    } else if (
      committeeId.toUpperCase().startsWith('SS') ||
      committeeId.toUpperCase().startsWith('SJ')
    ) {
      chamber = 'senate';
    }

    const { meetings, total } = await fetchCommitteeMeetings(committeeId, chamber, limit, offset);

    return NextResponse.json(
      {
        success: true,
        committeeId,
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

    logger.error('Committee meetings API error', error as Error);

    return NextResponse.json(
      {
        success: false,
        committeeId: '',
        meetings: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
        metadata: {
          lastUpdated: new Date().toISOString(),
          dataSource: 'congress.gov',
          congress: CURRENT_CONGRESS,
        },
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
