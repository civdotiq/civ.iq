/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
 */

import { NextRequest, NextResponse } from 'next/server';

const PHOTO_SOURCES = [
  {
    name: 'unitedstates-github-450',
    urlPattern: (id: string) => `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/${id.toUpperCase()}.jpg`
  },
  {
    name: 'unitedstates-github-225',
    urlPattern: (id: string) => `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/225x275/${id.toUpperCase()}.jpg`
  },
  {
    name: 'unitedstates-github-original',
    urlPattern: (id: string) => `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/original/${id.toUpperCase()}.jpg`
  }
];

// Simple in-memory cache to avoid repeated fetches
const photoCache = new Map<string, { data: Buffer; contentType: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bioguideId = id.toUpperCase();
  
  // Check cache first
  const cached = photoCache.get(bioguideId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new NextResponse(cached.data, {
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }

  // Try each photo source in order
  for (const source of PHOTO_SOURCES) {
    try {
      const url = source.urlPattern(bioguideId);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CivicIntelHub/1.0 (https://github.com/yourusername/civic-intel-hub)'
        }
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = Buffer.from(await response.arrayBuffer());
        
        // Cache the successful response
        photoCache.set(bioguideId, {
          data: buffer,
          contentType,
          timestamp: Date.now()
        });

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }
    } catch (error) {
      console.error(`Failed to fetch photo from ${source.name} for ${bioguideId}:`, error);
      continue;
    }
  }

  // If no photo found, return 404
  return NextResponse.json(
    { error: 'Photo not found', bioguideId },
    { status: 404 }
  );
}

// Clean up old cache entries periodically
if (typeof global !== 'undefined' && !global._photoCleanupInterval) {
  global._photoCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of photoCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        photoCache.delete(key);
      }
    }
  }, 60 * 60 * 1000); // Check every hour
}