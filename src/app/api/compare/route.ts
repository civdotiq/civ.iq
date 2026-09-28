/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * GET /api/compare?bioguideId=X — one side of a two-official comparison.
 *
 * Numbers come from the record-card headline (the one canonical per-member
 * stats source, so this endpoint agrees with /representative/[id] and
 * /record). Earlier versions of this route returned hard-coded zeros for
 * bills and finance and a page-capped vote count; both are gone. A section
 * that cannot be computed is null, never zero. Campaign finance is served
 * by /api/representative/[id]/finance and is not duplicated here.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { ApiErrors } from '@/lib/api/error-responses';
import { getRecordCardHeadline } from '@/features/record-card/record-card-data';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';

export const dynamic = 'force-dynamic';

const BIOGUIDE_RX = /^[A-Z][0-9]{6}$/;

interface LegislationSlice {
  billsSponsored: number;
  billsEnacted: number;
  billsCosponsored: number;
}

export interface ComparisonData {
  bioguideId: string;
  chamber: 'House' | 'Senate';
  congress: number;
  /** null when chamber baselines are unavailable for this member. */
  votingRecord: {
    /** Yea + Nay + Present across the analyzed roll calls. */
    totalVotes: number;
    appearances: number;
    missedPct: number;
    /** Party-majority alignment 0–100; null below the minimum vote floor or for independents. */
    partyLoyaltyScore: number | null;
    rollCallsAnalyzed: number;
    fullCoverage: boolean;
    dataAsOf: string;
  } | null;
  /** null when the legislation rollup could not be built. */
  effectiveness: {
    /** Current-Congress counts (what the profile stat band shows). */
    current: LegislationSlice;
    career: LegislationSlice;
    /** True when the cosponsored sample was truncated: treat `current.billsCosponsored` as a floor. */
    billsCosponsoredIsLowerBound: boolean;
    /** null when the committee roster could not be resolved for this member. */
    committeeMemberships: number | null;
    dataAsOf: string;
  } | null;
  methodology: string;
}

const METHODOLOGY =
  'Sponsored and cosponsored counts from Congress.gov member bill lists; enacted counts from bill status. ' +
  'Vote totals and party alignment from chamber roll-call baselines. ' +
  'Counts describe a record; they do not measure influence.';

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('bioguideId');
  if (!raw) {
    return ApiErrors.validation('bioguideId is required');
  }
  const bioguideId = raw.toUpperCase();
  if (!BIOGUIDE_RX.test(bioguideId)) {
    return ApiErrors.validation('bioguideId must be a letter followed by six digits');
  }

  try {
    const representative = await getEnhancedRepresentative(bioguideId);
    if (!representative) {
      return ApiErrors.notFound('Representative', bioguideId);
    }

    const headline = await getRecordCardHeadline(bioguideId, representative);
    const legislation = headline?.legislation ?? null;
    const voting = headline?.voting ?? null;

    const data: ComparisonData = {
      bioguideId,
      chamber: representative.chamber,
      congress: getCurrentCongressNumber(),
      votingRecord: voting
        ? {
            totalVotes: voting.stats.cast,
            appearances: voting.stats.appearances,
            missedPct: voting.stats.missedPct,
            partyLoyaltyScore: voting.stats.partyAlignmentPct,
            rollCallsAnalyzed: voting.rollCallsAnalyzed,
            fullCoverage: voting.fullCoverage,
            dataAsOf: voting.dataAsOf,
          }
        : null,
      effectiveness: legislation
        ? {
            current: {
              billsSponsored: legislation.current.introduced,
              billsEnacted: legislation.current.enactedFromSponsored,
              billsCosponsored: legislation.current.cosponsored,
            },
            career: {
              billsSponsored: legislation.career.introduced,
              billsEnacted: legislation.career.enactedFromSponsored,
              billsCosponsored: legislation.career.cosponsored,
            },
            billsCosponsoredIsLowerBound:
              legislation.cosponsoredSample.currentIsLowerBound ?? false,
            committeeMemberships: representative.committees
              ? representative.committees.length
              : null,
            dataAsOf: legislation.dataAsOf,
          }
        : null,
      methodology: METHODOLOGY,
    };

    // A missing legislation rollup is a cold-start gap (the walk is still
    // running): don't let the CDN pin it. A missing voting section can be
    // structural (delegates cast no floor roll calls), so cache it briefly
    // rather than never. Note: next.config's global /api header rule
    // currently overrides this with s-maxage=300 on every API route; the
    // values here state intent and take effect if that rule is narrowed.
    const cacheControl =
      data.effectiveness === null
        ? 'no-store'
        : data.votingRecord === null
          ? 'public, s-maxage=600, stale-while-revalidate=3600'
          : 'public, s-maxage=3600, stale-while-revalidate=86400';
    return NextResponse.json(data, { headers: { 'Cache-Control': cacheControl } });
  } catch (error) {
    logger.error(
      'Comparison API Error',
      error instanceof Error ? error : new Error(String(error)),
      {
        bioguideId,
      }
    );
    return ApiErrors.serverError();
  }
}
