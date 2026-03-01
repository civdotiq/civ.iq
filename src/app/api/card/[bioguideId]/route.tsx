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
import { NextRequest } from 'next/server';
import {
  fetchProfileCardData,
  fetchMoneyCardData,
  fetchVoteCardData,
  fetchAlignmentCardData,
  fetchLegislationCardData,
} from '@/features/trading-cards/card-data';
import { renderCard } from '@/features/trading-cards/og/card-renderer';
import type { CardType } from '@/features/trading-cards/types';
import logger from '@/lib/logging/simple-logger';

export const runtime = 'nodejs';
export const revalidate = 3600;

const VALID_TYPES: CardType[] = ['profile', 'money', 'vote', 'alignment', 'legislation'];

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

    // Fetch card data based on type
    const dataPromise = (() => {
      switch (type) {
        case 'profile':
          return fetchProfileCardData(id);
        case 'money':
          return fetchMoneyCardData(id);
        case 'vote':
          return fetchVoteCardData(id, billId);
        case 'alignment':
          return fetchAlignmentCardData(id);
        case 'legislation':
          return fetchLegislationCardData(id);
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
