/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Sector vote rates
 *
 * Returns each House member's yes-vote rate on bills classified to an
 * industry sector, ordered by state then name (no ranking, no dollar
 * figures), with the chamber average as the baseline. House only:
 * vote-finance insights are not computed for senators.
 *
 * Endpoint: GET /api/intelligence/sector/[sector]/leaderboard
 *   ?chamber=house|senate  (optional; senate always returns 404)
 *   ?party=D|R|I           (optional, defaults to all)
 *   ?limit=N               (optional cap, >= 1; defaults to every included member)
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import {
  ApiErrors,
  createErrorResponse,
  ErrorCodes,
  type ApiError,
} from '@/lib/api/error-responses';
import { buildSectorLeaderboard } from '@/lib/intelligence/analyzers/sector-leaderboard-analyzer';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';
import type { SectorLeaderboardResponse, InsightError } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── Slug-to-Sector Mapping ──────────────────────────────────────────

const SLUG_TO_SECTOR: Record<string, IndustrySector> = {
  agribusiness: IndustrySector.AGRIBUSINESS,
  'communications-electronics': IndustrySector.COMMUNICATIONS_ELECTRONICS,
  construction: IndustrySector.CONSTRUCTION,
  defense: IndustrySector.DEFENSE,
  'energy-natural-resources': IndustrySector.ENERGY_NATURAL_RESOURCES,
  'finance-insurance-real-estate': IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
  health: IndustrySector.HEALTH,
  'lawyers-lobbyists': IndustrySector.LAWYERS_LOBBYISTS,
  transportation: IndustrySector.TRANSPORTATION,
  'misc-business': IndustrySector.MISC_BUSINESS,
  labor: IndustrySector.LABOR,
  'ideology-single-issue': IndustrySector.IDEOLOGY_SINGLE_ISSUE,
  other: IndustrySector.OTHER,
};

const VALID_CHAMBERS = new Set(['house', 'senate']);
const VALID_PARTIES = new Set(['D', 'R', 'I']);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sector: string }> }
): Promise<NextResponse<SectorLeaderboardResponse | ApiError>> {
  const { sector: sectorSlug } = await params;

  // Validate sector slug
  const sector = SLUG_TO_SECTOR[sectorSlug];
  if (!sector) {
    const validSlugs = Object.keys(SLUG_TO_SECTOR).join(', ');
    return createErrorResponse(
      ErrorCodes.NOT_FOUND,
      `Invalid sector slug: "${sectorSlug}". Valid slugs: ${validSlugs}`,
      404
    );
  }

  // Parse query params
  const searchParams = request.nextUrl.searchParams;
  const chamberParam = searchParams.get('chamber');
  const partyParam = searchParams.get('party');
  const limitParam = searchParams.get('limit');

  const chamber =
    chamberParam && VALID_CHAMBERS.has(chamberParam)
      ? (chamberParam as 'house' | 'senate')
      : undefined;

  const party = partyParam && VALID_PARTIES.has(partyParam) ? partyParam : undefined;

  let limit: number | undefined;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      limit = parsed;
    }
  }

  try {
    logger.info('[Intelligence] Sector leaderboard request', {
      sector,
      chamber: chamber ?? 'all',
      party: party ?? 'all',
      limit: limit ?? 'all',
    });

    const result = await buildSectorLeaderboard(sector, { chamber, party, limit });

    if (!result) {
      return createErrorResponse(
        ErrorCodes.NOT_FOUND,
        chamber === 'senate'
          ? 'Sector vote rates cover House members only; vote-finance data is not computed for senators.'
          : `No sector vote-rate data available for sector: ${sector}`,
        404
      );
    }

    return NextResponse.json(
      { ...result, errors: [] as InsightError[], status: 'complete' as const },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    logger.error('[Intelligence] Sector leaderboard error', error as Error, {
      sector,
      chamber: chamber ?? 'all',
      party: party ?? 'all',
    });
    return ApiErrors.serverError();
  }
}
