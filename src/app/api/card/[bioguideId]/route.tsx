/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Trading Card OG Image Route
 *
 * Single route for all 5 card types:
 *   /api/card/[bioguideId]?type=profile|money|vote|alignment|legislation
 *   Vote card also accepts &billId=hr1234-119
 *
 * Returns 1200x630 PNG via Satori/ImageResponse.
 */

import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { NextRequest } from 'next/server';
import {
  fetchMoneyCardData,
  fetchVoteCardData,
  fetchAlignmentCardData,
  fetchLegislationCardData,
  fetchRecordSummaryCardData,
} from '@/features/trading-cards/card-data';
import { renderCard } from '@/features/trading-cards/og/card-renderer';
import type { CardType } from '@/features/trading-cards/types';
import logger from '@/lib/logging/simple-logger';
import { getServerBaseUrl } from '@/lib/server-url';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { getChamberBaselines } from '@/lib/intelligence/analyzers/chamber-baselines';
import { getCachedRepresentativeSummary } from '@/services/batch/representative-batch.service';
import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import { buildProfilePreview } from '@/features/trading-cards/og/profile-preview-data';
import { renderProfilePreview } from '@/features/trading-cards/og/profile-preview';

export const runtime = 'nodejs';
export const revalidate = 3600;

const VALID_TYPES: CardType[] = ['profile', 'money', 'vote', 'alignment', 'legislation', 'record'];

/** Fetch representative photo as base64 data URI for Satori embedding */
async function fetchPhotoBase64(bioguideId: string): Promise<string | undefined> {
  try {
    const url = `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/225x275/${bioguideId.toUpperCase()}.jpg`;
    const res = await fetch(url);
    if (!res.ok) return undefined;

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch {
    return undefined;
  }
}

/**
 * Portrait for the profile card: the 450x550 unitedstates photo, else the
 * site's photo route (Commons / House Clerk tiers; covers new members the
 * unitedstates set lags on). Each try gives up after 2.5s so the card still
 * ships. Normalised to JPEG because the photo route can answer WebP, which
 * Satori can't draw.
 */
async function fetchPortraitBase64(bioguideId: string): Promise<string | undefined> {
  const sources = [
    `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/${bioguideId}.jpg`,
    `${getServerBaseUrl()}/api/representative-photo/${bioguideId}`,
  ];
  for (const url of sources) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
      if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) continue;
      const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
        .resize(450, 550, { fit: 'cover', position: 'top' })
        .jpeg({ quality: 90 })
        .toBuffer();
      return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
    } catch {
      // try the next source
    }
  }
  return undefined;
}

async function profilePreviewResponse(id: string): Promise<Response> {
  const rep = await getEnhancedRepresentative(id);
  if (!rep) return new Response('Representative not found', { status: 404 });

  const [baselines, summary, photo] = await Promise.all([
    getChamberBaselines(rep.chamber),
    getCachedRepresentativeSummary(id),
    fetchPortraitBase64(id),
  ]);
  const preview = buildProfilePreview(rep, baselines, summary, getCurrentCongressNumber());

  const png = new ImageResponse(renderProfilePreview(preview, photo), {
    width: 1200,
    height: 630,
  });
  // A photo-led PNG is ~600KB; WhatsApp drops previews much over 300KB.
  // Cache-Control comes from the blanket /api rule in next.config (300s),
  // which also refreshes a card rendered before the summary was cached.
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(jpeg), { headers: { 'Content-Type': 'image/jpeg' } });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;

  // Validate bioguide ID format
  if (!bioguideId || !/^[A-Za-z]\d{6}$/.test(bioguideId)) {
    return new Response('Invalid representative ID', { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const type = (searchParams.get('type') || 'profile') as CardType;
  const billId = searchParams.get('billId') || '';

  if (!VALID_TYPES.includes(type)) {
    return new Response(`Invalid card type. Valid types: ${VALID_TYPES.join(', ')}`, {
      status: 400,
    });
  }

  if (type === 'vote' && !billId) {
    return new Response('Vote card requires billId parameter', { status: 400 });
  }

  try {
    const id = bioguideId.toUpperCase();

    // The profile card is the page's og:image. Scrapers give up after a few
    // seconds, so it reads only stored data (see profile-preview-data.ts).
    if (type === 'profile') return await profilePreviewResponse(id);

    // Fetch card data based on type
    const dataPromise = (() => {
      switch (type) {
        case 'money':
          return fetchMoneyCardData(id);
        case 'vote':
          return fetchVoteCardData(id, billId);
        case 'alignment':
          return fetchAlignmentCardData(id);
        case 'legislation':
          return fetchLegislationCardData(id);
        case 'record':
          return fetchRecordSummaryCardData(id);
      }
    })();

    // Fetch photo in parallel with card data
    const [cardData, photoBase64] = await Promise.all([dataPromise, fetchPhotoBase64(id)]);

    if (!cardData) {
      return new Response('Card data unavailable for this representative', { status: 404 });
    }

    const element = renderCard(cardData, photoBase64);

    return new ImageResponse(element, {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('Failed to generate trading card image', {
      bioguideId,
      type,
      error,
    });
    return new Response('Failed to generate card image', { status: 500 });
  }
}
