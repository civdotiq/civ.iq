/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Sector Leaderboard
 *
 * Returns legislators ranked by alignment score for a given industry sector.
 * Supports filtering by chamber (house/senate) and party (D/R/I).
 *
 * Endpoint: GET /api/intelligence/sector/[sector]/leaderboard
 *   ?chamber=house|senate  (optional, defaults to all)
 *   ?party=D|R|I           (optional, defaults to all)
 *   ?limit=20              (optional, 1-100, defaults to 20)
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { buildSectorLeaderboard } from '@/lib/intelligence/analyzers/sector-leaderboard-analyzer';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';
import type { SectorLeaderboardResponse } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';

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
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sector: string }> }
): Promise<NextResponse<SectorLeaderboardResponse | { error: string }>> {
  const { sector: sectorSlug } = await params;

  // Validate sector slug
  const sector = SLUG_TO_SECTOR[sectorSlug];
  if (!sector) {
    const validSlugs = Object.keys(SLUG_TO_SECTOR).join(', ');
    return NextResponse.json(
      { error: `Invalid sector slug: "${sectorSlug}". Valid slugs: ${validSlugs}` },
      { status: 404 }
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

  let limit = DEFAULT_LIMIT;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= MAX_LIMIT) {
      limit = parsed;
    }
  }

  try {
    logger.info('[Intelligence] Sector leaderboard request', {
      sector,
      chamber: chamber ?? 'all',
      party: party ?? 'all',
      limit,
    });

    const result = await buildSectorLeaderboard(sector, { chamber, party, limit });

    if (!result) {
      return NextResponse.json(
        { error: `No leaderboard data available for sector: ${sector}` },
        { status: 404 }
      );
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('[Intelligence] Sector leaderboard error', error as Error, {
      sector,
      chamber: chamber ?? 'all',
      party: party ?? 'all',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
