/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Congressional district share image: the seat, who holds it, their portrait
 * and DC phone. Read from the roster only (no Census or Wikidata call), and
 * checked against the 119th seat list like the page.
 */

import type { EnhancedRepresentative } from '@/types/representative';
import {
  PAGE_CARD_SIZE,
  pageCardResponse,
  withinBudget,
} from '@/features/trading-cards/og/page-card';
import { districtCard, type DistrictSeat } from '@/features/trading-cards/og/page-card-data';
import { fetchMemberPortrait } from '@/features/trading-cards/og/portrait';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { canonicalizeDistrictId } from '@/lib/helpers/url-builders';
import { checkDistrictId } from '@/lib/districts/known-districts';
import { getVacancyInfo } from '@/lib/data/congressional-vacancies';

export const runtime = 'nodejs';
export const alt = 'Congressional district: the seat and who represents it';
export const size = PAGE_CARD_SIZE;
export const contentType = 'image/jpeg';

/** The House member for a seat; a single-seat (AL) state has exactly one. */
function memberForSeat(
  roster: EnhancedRepresentative[],
  state: string,
  district: string
): EnhancedRepresentative | null {
  const house = roster.filter(r => r.chamber === 'House' && r.state === state);
  if (district === 'AL') return house.length === 1 ? (house[0] ?? null) : null;
  const seat = district.replace(/^0+/, '');
  return house.find(r => (r.district ?? '').replace(/^0+/, '') === seat) ?? null;
}

async function seatFor(state: string, district: string): Promise<DistrictSeat> {
  // Statewide pages are about a state's senators, not one House seat.
  if (district === 'STATE') return { kind: 'unknown' };
  const roster = await withinBudget(getAllEnhancedRepresentatives());
  if (!roster) return { kind: 'unknown' };
  const member = memberForSeat(roster, state, district);
  if (member) return { kind: 'member', member };
  const vacancy = getVacancyInfo(state, district === 'AL' ? '00' : district);
  return vacancy ? { kind: 'vacant', since: vacancy.vacantSince } : { kind: 'unlisted' };
}

export default async function Image({ params }: { params: Promise<{ districtId: string }> }) {
  const { districtId } = await params;
  const parsed = canonicalizeDistrictId(districtId);
  if (!parsed || checkDistrictId(parsed.state, parsed.district).kind !== 'known') {
    return new Response('District not found', { status: 404 });
  }

  const seat = await seatFor(parsed.state, parsed.district);
  const photo =
    seat.kind === 'member' ? await fetchMemberPortrait(seat.member.bioguideId) : undefined;

  return pageCardResponse(districtCard(parsed.state, parsed.district, seat), {
    format: 'jpeg',
    photo,
    // A slow roster read: try again soon rather than pin a card without the member.
    fallback: seat.kind === 'unknown' && parsed.district !== 'STATE',
  });
}
