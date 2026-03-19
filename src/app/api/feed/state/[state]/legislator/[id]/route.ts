/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Legislator Activity Atom Feed
 *
 * Atom feed for a specific state legislator's sponsored bills via OpenStates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAtomFeed, createStateLegislatorFeedConfig } from '@/lib/feeds/atom-generator';
import type { AtomEntry } from '@/lib/feeds/atom-generator';
import { openStatesAPI } from '@/lib/openstates-api';
import { getStateName } from '@/lib/data/us-states';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ state: string; id: string }> }
) {
  const { state, id } = await params;
  const stateUpper = state.toUpperCase();

  const stateName = getStateName(stateUpper);
  if (!stateName) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><error>Unknown state code: ${state.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}</error>`,
      {
        status: 400,
        headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
      }
    );
  }

  if (!id) {
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><error>Legislator ID is required</error>',
      {
        status: 400,
        headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
      }
    );
  }

  try {
    // Fetch legislator's sponsored bills
    const personId = id.startsWith('ocd-person/') ? id : `ocd-person/${id}`;
    const bills = await openStatesAPI.getBillsBySponsor(personId, stateUpper, undefined, 20);

    // Derive legislator name from sponsorship data
    let legislatorName = 'State Legislator';
    if (bills.length > 0) {
      const sponsorship = bills[0]?.sponsorships?.find(
        s => s.primary && s.entity_type === 'person'
      );
      if (sponsorship) {
        legislatorName = sponsorship.name;
      }
    }

    const baseUrl = 'https://civdotiq.org';
    const entries: AtomEntry[] = bills.map(bill => ({
      id: `${baseUrl}/state-bills/${stateUpper}/${bill.identifier}`,
      title: `${bill.identifier}: ${bill.title}`,
      link: bill.openstates_url || `${baseUrl}/state-bills/${stateUpper}`,
      updated: new Date(bill.updated_at || bill.latest_action_date || new Date().toISOString()),
      published: bill.first_action_date ? new Date(bill.first_action_date) : undefined,
      author: { name: legislatorName },
      summary: bill.latest_action_description ?? bill.title,
      categories: [
        { term: 'state-legislation' },
        { term: stateUpper },
        ...(bill.classification?.map(c => ({ term: c })) ?? []),
      ],
    }));

    const config = createStateLegislatorFeedConfig(stateUpper, id, legislatorName);
    const xml = generateAtomFeed(config, entries);

    logger.info('State legislator feed generated', {
      state: stateUpper,
      legislatorId: id,
      entries: entries.length,
      operation: 'state_feed',
    });

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/atom+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    logger.error('State legislator feed error', error as Error, {
      state: stateUpper,
      legislatorId: id,
    });
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate legislator feed</error>',
      {
        status: 500,
        headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
      }
    );
  }
}
