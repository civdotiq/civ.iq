/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Bills Atom Feed
 *
 * Atom feed for recent state legislature bills via OpenStates.
 * Subscription infrastructure for citizens who care about their
 * state legislature — this doesn't exist elsewhere.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAtomFeed, createStateBillsFeedConfig } from '@/lib/feeds/atom-generator';
import type { AtomEntry } from '@/lib/feeds/atom-generator';
import { openStatesAPI } from '@/lib/openstates-api';
import { getStateName } from '@/lib/data/us-states';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ state: string }> }
) {
  const { state } = await params;
  const stateUpper = state.toUpperCase();

  // Validate state code
  const stateName = getStateName(stateUpper);
  if (!stateName) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><error>Unknown state code: ${state.replace(/[<>&]/g, '')}</error>`,
      {
        status: 400,
        headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
      }
    );
  }

  try {
    const bills = await openStatesAPI.getBills(stateUpper, undefined, undefined, undefined, 20);

    const baseUrl = 'https://civdotiq.org';
    const entries: AtomEntry[] = bills.map(bill => ({
      id: `${baseUrl}/state-bills/${stateUpper}/${bill.identifier}`,
      title: `${bill.identifier}: ${bill.title}`,
      link: bill.openstates_url || `${baseUrl}/state-bills/${stateUpper}`,
      updated: new Date(bill.updated_at || bill.latest_action_date || new Date().toISOString()),
      published: bill.first_action_date ? new Date(bill.first_action_date) : undefined,
      summary: buildBillSummary(bill),
      categories: [
        { term: 'state-legislation' },
        { term: stateUpper },
        ...(bill.classification?.map(c => ({ term: c })) ?? []),
        ...(bill.subject?.slice(0, 3).map(s => ({ term: s })) ?? []),
      ],
    }));

    const config = createStateBillsFeedConfig(stateUpper, stateName);
    const xml = generateAtomFeed(config, entries);

    logger.info('State bills feed generated', {
      state: stateUpper,
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
    logger.error('State bills feed error', error as Error, { state: stateUpper });
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate state bills feed</error>',
      {
        status: 500,
        headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
      }
    );
  }
}

function buildBillSummary(bill: {
  chamber?: 'upper' | 'lower';
  latest_action_description?: string;
  sponsorships?: Array<{ name: string; primary: boolean }>;
}): string {
  const parts: string[] = [];

  if (bill.chamber) {
    parts.push(bill.chamber === 'upper' ? 'Senate' : 'House');
  }

  const primarySponsor = bill.sponsorships?.find(s => s.primary);
  if (primarySponsor) {
    parts.push(`Sponsor: ${primarySponsor.name}`);
  }

  if (bill.latest_action_description) {
    parts.push(`Latest: ${bill.latest_action_description}`);
  }

  return parts.join(' | ') || 'State legislation';
}
