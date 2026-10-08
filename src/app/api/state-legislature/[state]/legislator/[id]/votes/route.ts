/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Legislator Voting Records API
 *
 * GET /api/state-legislature/[state]/legislator/[id]/votes
 * Returns voting records for a specific state legislator, from the roll-call
 * corpus (src/lib/data-sources/openstates-votes). A state the corpus does not
 * cover answers `dataAvailable: false` with a reason rather than "0 votes".
 *
 * Query: page, per_page, floor=only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import logger from '@/lib/logging/simple-logger';
import { decodeBase64Url } from '@/lib/url-encoding';
import { normalizeStateIdentifier } from '@/lib/data/us-states';

export const revalidate = 3600;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string; id: string }> }
) {
  const startTime = Date.now();
  const { searchParams } = request.nextUrl;

  try {
    const { state, id } = await params;
    const legislatorId = decodeBase64Url(id); // Decode Base64 ID
    // NaN page/perPage would produce NaN slice indices — fall back to defaults
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
    const perPage = Math.min(
      Math.max(parseInt(searchParams.get('per_page') || '20', 10) || 20, 1),
      100
    );
    // California files committee roll calls under the chamber; `floor=only`
    // keeps the ones enough of the chamber voted on to be floor votes.
    const floorOnly = searchParams.get('floor') === 'only';

    // Normalize state identifier (handles both "MI" and "Michigan")
    const stateCode = normalizeStateIdentifier(state);

    if (!stateCode || !legislatorId) {
      logger.warn('State legislator votes API request missing parameters', {
        state,
        stateCode,
        id: legislatorId,
      });
      return NextResponse.json(
        { success: false, error: 'State and legislator ID are required' },
        { status: 400 }
      );
    }

    logger.info('Fetching state legislator voting records', {
      state: stateCode,
      legislatorId,
      floorOnly,
    });

    // Verify the legislator exists first
    const legislator = await StateLegislatureCoreService.getStateLegislatorById(
      stateCode,
      legislatorId
    );

    if (!legislator) {
      logger.warn('State legislator not found for votes request', {
        state: stateCode,
        legislatorId,
      });
      return NextResponse.json(
        { success: false, error: 'State legislator not found' },
        { status: 404 }
      );
    }

    // Every recorded vote, newest first; null when the state has no artifact.
    const all = await StateLegislatureCoreService.getStateLegislatorVotes(stateCode, legislatorId);
    const dataAvailable = all !== null;
    const votes = (all ?? []).filter(v => !floorOnly || v.floor);
    const totals = {
      all: all?.length ?? 0,
      floor: (all ?? []).filter(v => v.floor).length,
    };
    const provenance = dataAvailable
      ? await StateLegislatureCoreService.getStateVotesProvenance(stateCode)
      : null;

    // Statistics over the selected set, not just the page
    const statistics = {
      total: votes.length,
      yes: votes.filter(v => v.option === 'yes').length,
      no: votes.filter(v => v.option === 'no').length,
      abstain: votes.filter(v => v.option === 'abstain' || v.option === 'not voting').length,
      absent: votes.filter(v => v.option === 'absent' || v.option === 'excused').length,
      // A position the chamber recorded without naming it (California has ~100
      // per member); shown so the buckets add up to the total.
      other: votes.filter(v => v.option === 'other').length,
    };

    // Paginate the results
    const startIdx = (page - 1) * perPage;
    const endIdx = startIdx + perPage;
    const paginatedVotes = votes.slice(startIdx, endIdx);

    logger.info('State legislator votes request successful', {
      state: stateCode,
      legislatorId,
      legislatorName: legislator.name,
      voteCount: votes.length,
      page,
      perPage,
      responseTime: Date.now() - startTime,
    });

    // The corpus refreshes monthly, so a day is safe; no browser max-age so a
    // refresh is seen on the next visit rather than after the old 6 months.
    const headers = new Headers({
      'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400',
      Vary: 'Accept-Encoding',
    });

    return NextResponse.json(
      {
        success: true,
        dataAvailable,
        reason: dataAvailable
          ? undefined
          : StateLegislatureCoreService.STATE_LEGISLATOR_VOTES_UNAVAILABLE_REASON,
        dataAsOf: provenance?.generatedAt,
        sessions: provenance?.sessions,
        totals,
        floorOnly,
        votes: paginatedVotes,
        total: votes.length,
        page,
        per_page: perPage,
        legislator: {
          id: legislator.id,
          name: legislator.name,
          chamber: legislator.chamber,
          district: legislator.district,
          party: legislator.party,
        },
        statistics,
        state: stateCode,
      },
      { status: 200, headers }
    );
  } catch (error) {
    logger.error('State legislator votes request failed', error as Error, {
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch state legislator voting records',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
