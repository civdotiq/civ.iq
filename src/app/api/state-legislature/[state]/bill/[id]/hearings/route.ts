/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill Hearings API
 *
 * GET /api/state-legislature/[state]/bill/[id]/hearings
 * Returns upcoming hearings and events for a specific bill
 */

import { NextRequest, NextResponse } from 'next/server';
import { openStatesAPI, OpenStatesEvent } from '@/lib/openstates-api';
import logger from '@/lib/logging/simple-logger';
import { decodeBase64Url } from '@/lib/url-encoding';
import type { StateLegislativeEvent, LegislativeCalendarResponse } from '@/types/state-legislature';

// ISR: Revalidate every 24 hours (hearings change daily)
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
  { params }: { params: Promise<{ state: string; id: string }> }
) {
  const startTime = Date.now();

  try {
    const { state, id } = await params;
    const billId = decodeBase64Url(id); // Decode Base64 bill ID

    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50); // Max 50

    if (!state || state.length !== 2) {
      logger.warn('Invalid state parameter for bill hearings API', { state });
      return NextResponse.json(
        {
          success: false,
          error: 'Valid 2-letter state code is required',
        } as LegislativeCalendarResponse,
        { status: 400 }
      );
    }

    if (!billId) {
      logger.warn('Missing bill ID for hearings API', { state });
      return NextResponse.json(
        {
          success: false,
          error: 'Bill ID is required',
        } as LegislativeCalendarResponse,
        { status: 400 }
      );
    }

    logger.info('Fetching bill hearings', {
      state: state.toUpperCase(),
      billId,
      limit,
    });

    // Fetch events for this bill from OpenStates API
    const events = await openStatesAPI.getEventsByBill(billId, limit);

    // Transform to our format
    const transformedEvents: StateLegislativeEvent[] = events.map(transformEvent);

    const responseTime = Date.now() - startTime;

    const response: LegislativeCalendarResponse = {
      success: true,
      state: state.toUpperCase(),
      events: transformedEvents,
      total: transformedEvents.length,
    };

    logger.info('Bill hearings fetched successfully', {
      state: state.toUpperCase(),
      billId,
      eventCount: transformedEvents.length,
      responseTime,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Bill hearings API error', error as Error, {
      state: (await params).state.toUpperCase(),
      billId: (await params).id,
    });

    const errorResponse: LegislativeCalendarResponse = {
      success: false,
      state: (await params).state.toUpperCase(),
      events: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch bill hearings',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
