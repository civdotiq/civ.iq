/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Inverse ZIP-to-district lookup: given a district like "NY-08", return the
 * ZIP codes that fall (wholly or partially) inside it. Backed by the same
 * 119th Congress mapping the rest of the platform uses.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { ZIP_TO_DISTRICT_MAP_119TH } from '@/lib/data/zip-district-mapping-119th';

// ISR: revalidate daily — boundaries don't change inside a Congress.
export const revalidate = 86400;

interface ZipShare {
  zip: string;
  share: number; // 0-1 share of district population covered
  primary: boolean;
}

function buildZipsForDistrict(state: string, district: string): ZipShare[] {
  const matches: ZipShare[] = [];
  const upperState = state.toUpperCase();
  // The 119th Congress mapping encodes at-large districts as "00" while the
  // CIV.IQ URL convention uses "AL". Match both forms when AL is requested.
  const districtAliases = district === 'AL' ? new Set(['AL', '00']) : new Set([district]);

  for (const [zip, value] of Object.entries(ZIP_TO_DISTRICT_MAP_119TH)) {
    const entries = Array.isArray(value) ? value : [value];
    let isMatch = false;
    let isPrimary = false;
    for (const entry of entries) {
      if (entry.state === upperState && districtAliases.has(entry.district)) {
        isMatch = true;
        if (entry.primary) isPrimary = true;
      }
    }
    if (!isMatch) continue;
    // Approximate population share when a ZIP spans multiple districts.
    // We don't have block-level weights here — split equally across the
    // districts that own this ZIP (so a 2-way ZIP shows 50%, a single-district
    // ZIP shows 100%). Caveat is surfaced in the UI disclaimer.
    const share = entries.length === 1 ? 1 : isPrimary ? 1 / entries.length : 1 / entries.length;
    matches.push({ zip, share, primary: isPrimary });
  }

  matches.sort((a, b) => a.zip.localeCompare(b.zip));
  return matches;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
) {
  try {
    const { districtId } = await params;
    const parsed = districtId.match(/^([A-Z]{2})-(\d{1,2}|AL)$/i);
    if (!parsed || !parsed[1] || !parsed[2]) {
      return NextResponse.json(
        { error: 'Invalid district ID', zips: [], metadata: { total: 0 } },
        { status: 400 }
      );
    }
    const state = parsed[1].toUpperCase();
    const districtRaw = parsed[2].toUpperCase();
    const district = districtRaw === 'AL' ? 'AL' : districtRaw.padStart(2, '0');

    const zips = buildZipsForDistrict(state, district);
    logger.info('District ZIPs lookup', { districtId, count: zips.length });

    return NextResponse.json(
      {
        districtId: `${state}-${district}`,
        zips,
        metadata: {
          timestamp: new Date().toISOString(),
          total: zips.length,
          source: 'OpenSourceActivismTech/us-zipcodes-congress · 119th Congress',
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
        },
      }
    );
  } catch (error) {
    const resolved = await params;
    logger.error('District ZIPs API error', error as Error, { districtId: resolved.districtId });
    return NextResponse.json(
      {
        error: 'Failed to compute ZIP list',
        zips: [],
        metadata: { total: 0 },
      },
      { status: 500 }
    );
  }
}
