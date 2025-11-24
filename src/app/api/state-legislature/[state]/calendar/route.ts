/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Legislative Calendar API
 *
 * GET /api/state-legislature/[state]/calendar
 * Returns upcoming legislative events (hearings, floor sessions, committee meetings)
 */

import { NextRequest, NextResponse } from 'next/server';
import { openStatesAPI, OpenStatesEvent } from '@/lib/openstates-api';
import logger from '@/lib/logging/simple-logger';
import type { StateLegislativeEvent, LegislativeCalendarResponse } from '@/types/state-legislature';

// ISR: Revalidate every 24 hours (events change daily)
export const revalidate = 86400; // 24 hours

export const dynamic = 'force-dynamic';

/**
 * Transform OpenStates event to our StateLegislativeEvent format
 */
function transformEvent(event: OpenStatesEvent): StateLegislativeEvent {
  return {
    id: event.id,
    name: event.name,
    description: event.description ?? undefined,
    classification: event.classification as StateLegislativeEvent['classification'],
    start_date: event.start_date,
    end_date: event.end_date ?? undefined,
    timezone: event.timezone,
    all_day: event.all_day,
    status: event.status as StateLegislativeEvent['status'],
    location: event.location
      ? {
          name: event.location.name ?? undefined,
          note: event.location.note ?? undefined,
          url: event.location.url ?? undefined,
        }
      : undefined,
    participants: event.participants.map(p => ({
      entity_type: p.entity_type,
      entity_id: p.entity_id,
      entity_name: p.entity_name,
      note: p.note ?? undefined,
    })),
    agenda: event.agenda.map(item => ({
      order: item.order ?? undefined,
      description: item.description,
      bill_id: item.related_entities?.find(e => e.entity_type === 'bill')?.bill?.id,
      bill_identifier: item.related_entities?.find(e => e.entity_type === 'bill')?.bill?.identifier,
    })),
    media: event.media.map(m => ({
      name: m.name,
      url: m.url,
      media_type: m.media_type,
      date: m.date ?? undefined,
    })),
    sources: event.sources.map(s => ({
      url: s.url,
      note: s.note ?? undefined,
    })),
    created_at: event.created_at,
    updated_at: event.updated_at,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string }> }
) {
  const startTime = Date.now();

  try {
    const { state } = await params;
    const { searchParams } = request.nextUrl;

    const startDate = searchParams.get('startDate') ?? undefined; // ISO 8601 format: YYYY-MM-DD
    const endDate = searchParams.get('endDate') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100); // Max 100

    if (!state || state.length !== 2) {
      logger.warn('Invalid state parameter for calendar API', { state });
      return NextResponse.json(
        {
          success: false,
          error: 'Valid 2-letter state code is required',
        } as LegislativeCalendarResponse,
        { status: 400 }
      );
    }

    logger.info('Fetching legislative calendar', {
      state: state.toUpperCase(),
      startDate,
      endDate,
      limit,
    });

    // Fetch events from OpenStates API
    const events = await openStatesAPI.getEvents(state, startDate, endDate, limit);

    // Transform to our format
    const transformedEvents: StateLegislativeEvent[] = events.map(transformEvent);

    const responseTime = Date.now() - startTime;

    const response: LegislativeCalendarResponse = {
      success: true,
      state: state.toUpperCase(),
      events: transformedEvents,
      total: transformedEvents.length,
      dateRange:
        startDate && endDate
          ? {
              start: startDate,
              end: endDate,
            }
          : undefined,
    };

    logger.info('Legislative calendar fetched successfully', {
      state: state.toUpperCase(),
      eventCount: transformedEvents.length,
      responseTime,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('State legislative calendar API error', error as Error, {
      state: (await params).state.toUpperCase(),
    });

    const errorResponse: LegislativeCalendarResponse = {
      success: false,
      state: (await params).state.toUpperCase(),
      events: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch legislative calendar',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
