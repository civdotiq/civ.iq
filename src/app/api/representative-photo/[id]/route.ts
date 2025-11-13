/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import fs from 'fs/promises';
import path from 'path';

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

const PHOTO_SOURCES = [
  {
    name: 'unitedstates-github-450',
    urlPattern: (id: string) =>
      `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/${id.toUpperCase()}.jpg`,
  },
  {
    name: 'unitedstates-github-225',
    urlPattern: (id: string) =>
      `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/225x275/${id.toUpperCase()}.jpg`,
  },
  {
    name: 'unitedstates-github-original',
    urlPattern: (id: string) =>
      `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/original/${id.toUpperCase()}.jpg`,
  },
];

// Simple in-memory cache to avoid repeated fetches
const photoCache = new Map<string, { data: Buffer; contentType: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bioguideId = id.toUpperCase();

  // Check in-memory cache first
  const cached = photoCache.get(bioguideId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new NextResponse(cached.data, {
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Access-Control-Allow-Origin': getSecureCorsOrigins(),
      },
    });
  }

  // Try loading from local file system (WebP first, then JPG)
  const localPaths = [
    path.join(process.cwd(), 'public', 'photos', 'webp', `${bioguideId}.webp`),
    path.join(process.cwd(), 'public', 'photos', `${bioguideId}.jpg`),
  ];

  for (const localPath of localPaths) {
    try {
      const buffer = await fs.readFile(localPath);
      const contentType = localPath.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

      // Cache the successful response
      photoCache.set(bioguideId, {
        data: buffer,
        contentType,
        timestamp: Date.now(),
      });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
          'Access-Control-Allow-Origin': getSecureCorsOrigins(),
        },
      });
    } catch {
      // File doesn't exist, try next path or fallback to remote
      continue;
    }
  }

  // Fallback to remote sources if not found locally
  for (const source of PHOTO_SOURCES) {
    try {
      const url = source.urlPattern(bioguideId);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CivicIntelHub/1.0 (https://github.com/yourusername/civic-intel-hub)',
        },
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = Buffer.from(await response.arrayBuffer());

        // Cache the successful response
        photoCache.set(bioguideId, {
          data: buffer,
          contentType,
          timestamp: Date.now(),
        });

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            'Access-Control-Allow-Origin': getSecureCorsOrigins(),
          },
        });
      }
    } catch (error) {
      logger.error(`Failed to fetch photo from ${source.name}`, error as Error, {
        bioguideId,
        sourceName: source.name,
        operation: 'fetchPhoto',
      });
      continue;
    }
  }

  // If no photo found, return 404
  return NextResponse.json({ error: 'Photo not found', bioguideId }, { status: 404 });
}

// Clean up old cache entries periodically
interface GlobalWithCleanupInterval {
  _photoCleanupInterval?: NodeJS.Timeout;
}

const globalWithInterval = global as unknown as GlobalWithCleanupInterval;

if (typeof global !== 'undefined' && !globalWithInterval._photoCleanupInterval) {
  globalWithInterval._photoCleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, value] of photoCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          photoCache.delete(key);
        }
      }
    },
    60 * 60 * 1000
  ); // Check every hour
}
