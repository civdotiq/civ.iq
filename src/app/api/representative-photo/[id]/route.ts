/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Representative Photo API — 4-tier waterfall architecture
 *
 * Serves the best available official portrait for a Congress member.
 *
 * Tier 1: Local cache (WebP/JPG on disk)
 * Tier 2: Wikidata/Wikimedia Commons (highest resolution, most current)
 * Tier 3: House Clerk ziplook.house.gov (House members only, official)
 * Tier 4: unitedstates/images GitHub repo (legacy fallback)
 *
 * All sources serve public domain images per 17 U.S.C. § 105.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import fs from 'fs/promises';
import path from 'path';
import { getPhotoByBioguideId } from '@/lib/api/wikidata-photos';
import { getHouseClerkPhotoUrl } from '@/lib/api/house-clerk-photos';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';

// ISR: Revalidate every 1 week
export const revalidate = 604800;

// Get secure CORS origins
function getSecureCorsOrigins(): string {
  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? ['https://civic-intel-hub.vercel.app', 'https://civiq.app', 'https://www.civiq.app']
      : [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
        ];

  const customOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];
  const allAllowedOrigins = [...allowedOrigins, ...customOrigins];

  return allAllowedOrigins.join(', ');
}

/** Standard response headers for photo responses */
function photoHeaders(contentType: string): Record<string, string> {
  return {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
    'Access-Control-Allow-Origin': getSecureCorsOrigins(),
  };
}

/** Tier 4 fallback: unitedstates/images GitHub repo */
const LEGACY_PHOTO_SOURCES = [
  {
    name: 'unitedstates-github-450',
    urlPattern: (id: string) =>
      `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/${id}.jpg`,
  },
  {
    name: 'unitedstates-github-original',
    urlPattern: (id: string) =>
      `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/original/${id}.jpg`,
  },
];

// In-memory cache for fetched remote photos
// Capped at 100 entries (~10-50MB) to prevent unbounded heap growth in serverless
const MAX_CACHE_ENTRIES = 100;
const photoCache = new Map<string, { data: Buffer; contentType: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/** Fetch a remote image and return it as a Buffer, or null on failure */
async function fetchRemoteImage(
  url: string,
  sourceName: string,
  bioguideId: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CivicIntelHub/1.0 (https://civdotiq.org) Government Data Portal',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return null;

    const buffer = Buffer.from(await response.arrayBuffer());

    // Sanity check: reject suspiciously small responses (likely error pages)
    if (buffer.length < 1000) return null;

    logger.info('Remote photo fetched', { bioguideId, source: sourceName, size: buffer.length });
    return { buffer, contentType };
  } catch (error) {
    logger.debug('Remote photo fetch failed', {
      bioguideId,
      source: sourceName,
      error: (error as Error).message,
    });
    return null;
  }
}

/** Create a successful photo response and cache the result */
function createPhotoResponse(
  bioguideId: string,
  buffer: Buffer,
  contentType: string
): NextResponse {
  // Evict oldest entry if cache is full
  if (photoCache.size >= MAX_CACHE_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, value] of photoCache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }
    if (oldestKey) photoCache.delete(oldestKey);
  }

  photoCache.set(bioguideId, { data: buffer, contentType, timestamp: Date.now() });

  return new NextResponse(new Uint8Array(buffer), {
    headers: photoHeaders(contentType),
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bioguideId = id.toUpperCase();

  // Validate bioguide ID format to prevent path traversal
  if (!/^[A-Z]\d{6}$/.test(bioguideId)) {
    return new NextResponse('Invalid representative ID', { status: 400 });
  }

  // ── In-memory cache ──────────────────────────────────────────────
  const cached = photoCache.get(bioguideId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new NextResponse(new Uint8Array(cached.data), {
      headers: photoHeaders(cached.contentType),
    });
  }

  // ── Tier 0: Local filesystem (pre-downloaded photos) ─────────────
  const localPaths = [
    path.join(process.cwd(), 'public', 'photos', 'webp', `${bioguideId}.webp`),
    path.join(process.cwd(), 'public', 'photos', `${bioguideId}.jpg`),
  ];

  for (const localPath of localPaths) {
    try {
      const buffer = await fs.readFile(localPath);
      const contentType = localPath.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      return createPhotoResponse(bioguideId, buffer, contentType);
    } catch {
      continue;
    }
  }

  // ── Tier 1: Wikidata / Wikimedia Commons ─────────────────────────
  // Highest resolution, most current — community updates photos fast
  try {
    const wikidataResult = await getPhotoByBioguideId(bioguideId);

    if (wikidataResult.found && wikidataResult.thumbnailUrl) {
      const result = await fetchRemoteImage(
        wikidataResult.thumbnailUrl,
        'Wikimedia Commons',
        bioguideId
      );
      if (result) {
        return createPhotoResponse(bioguideId, result.buffer, result.contentType);
      }

      // Try the full-resolution Commons URL as fallback
      if (wikidataResult.commonsUrl) {
        const fullResult = await fetchRemoteImage(
          wikidataResult.commonsUrl,
          'Wikimedia Commons (full)',
          bioguideId
        );
        if (fullResult) {
          return createPhotoResponse(bioguideId, fullResult.buffer, fullResult.contentType);
        }
      }
    }
  } catch (error) {
    logger.warn('Tier 1 (Wikidata) failed', {
      bioguideId,
      error: (error as Error).message,
    });
  }

  // ── Tier 2: House Clerk ziplook.house.gov (House only) ───────────
  // Requires member metadata (state, district, last name)
  try {
    const member = await RepresentativesCoreService.getRepresentativeById(bioguideId);

    if (member && member.chamber === 'House') {
      const ziplookUrl = getHouseClerkPhotoUrl(member.state, member.district, member.lastName);

      if (ziplookUrl) {
        const result = await fetchRemoteImage(ziplookUrl, 'House Clerk (ziplook)', bioguideId);
        if (result) {
          return createPhotoResponse(bioguideId, result.buffer, result.contentType);
        }
      }
    }
  } catch (error) {
    logger.warn('Tier 2 (House Clerk) failed', {
      bioguideId,
      error: (error as Error).message,
    });
  }

  // ── Tier 3: unitedstates/images GitHub repo ──────────────────────
  // Legacy fallback — good for senior members, lags for freshmen
  for (const source of LEGACY_PHOTO_SOURCES) {
    const url = source.urlPattern(bioguideId);
    const result = await fetchRemoteImage(url, source.name, bioguideId);
    if (result) {
      return createPhotoResponse(bioguideId, result.buffer, result.contentType);
    }
  }

  // ── No photo found ───────────────────────────────────────────────
  logger.warn('All photo tiers exhausted', { bioguideId });
  return NextResponse.json({ error: 'Photo not found', bioguideId }, { status: 404 });
}

// Clean up old cache entries periodically
declare global {
  var _photoCleanupInterval: NodeJS.Timeout | undefined;
}

if (typeof global !== 'undefined' && !globalThis._photoCleanupInterval) {
  globalThis._photoCleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, value] of photoCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          photoCache.delete(key);
        }
      }
    },
    60 * 60 * 1000
  );
}
