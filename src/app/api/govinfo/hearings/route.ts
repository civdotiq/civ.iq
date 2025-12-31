/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  HearingsResponse,
  GovInfoDocument,
  GovInfoCollectionResponse,
  GovInfoPackage,
} from '@/types/govinfo';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;
export const dynamic = 'force-dynamic';

const GOVINFO_API = 'https://api.govinfo.gov';
// Use DEMO_KEY for development - production should use env variable
const API_KEY = process.env.GOVINFO_API_KEY ?? 'DEMO_KEY';

/**
 * Parse chamber from document class
 */
function parseChamber(docClass: string): 'House' | 'Senate' | 'Joint' {
  if (docClass.startsWith('H')) return 'House';
  if (docClass.startsWith('S')) return 'Senate';
  return 'Joint';
}

/**
 * Transform GovInfo package to simplified document format
 */
function transformHearing(pkg: GovInfoPackage): GovInfoDocument {
  return {
    id: pkg.packageId,
    title: pkg.title,
    type: 'hearing',
    congress: parseInt(pkg.congress) || 119,
    chamber: parseChamber(pkg.docClass),
    dateIssued: pkg.dateIssued,
    lastModified: pkg.lastModified,
    pages: null, // Would need detail fetch
    detailsUrl: `https://www.govinfo.gov/app/details/${pkg.packageId}`,
    pdfUrl: `https://api.govinfo.gov/packages/${pkg.packageId}/pdf?api_key=${API_KEY}`,
  };
}

/**
 * Fetch congressional hearings from GovInfo API
 */
async function fetchHearings(
  pageSize: number,
  offsetMark: string,
  congress?: number
): Promise<{ hearings: GovInfoDocument[]; count: number; nextPage: string | null }> {
  // Start from 1 year ago to get recent hearings
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);
  const startDateStr = startDate.toISOString().replace(/\.\d{3}Z$/, 'Z');

  const cacheKey = `govinfo-hearings-${pageSize}-${offsetMark}-${congress ?? 'all'}`;

  return cachedFetch(
    cacheKey,
    async () => {
      try {
        const params = new URLSearchParams();
        params.set('pageSize', pageSize.toString());
        params.set('offsetMark', offsetMark);
        params.set('api_key', API_KEY);
        if (congress) {
          params.set('congress', congress.toString());
        }

        const url = `${GOVINFO_API}/collections/CHRG/${startDateStr}?${params.toString()}`;

        logger.info('Fetching congressional hearings', { url: url.replace(API_KEY, '***') });

        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
          },
        });

        if (!response.ok) {
          logger.error('GovInfo API error', new Error(`HTTP ${response.status}`));
          return { hearings: [], count: 0, nextPage: null };
        }

        const data: GovInfoCollectionResponse = await response.json();
        const hearings = data.packages.map(transformHearing);

        // Clean nextPage URL to remove API key for client
        let nextPage = data.nextPage;
        if (nextPage) {
          const nextUrl = new URL(nextPage);
          nextPage = nextUrl.searchParams.get('offsetMark') ?? null;
        }

        return {
          hearings,
          count: data.count,
          nextPage,
        };
      } catch (error) {
        logger.error('Error fetching hearings', error as Error);
        return { hearings: [], count: 0, nextPage: null };
      }
    },
    60 * 60 * 1000 // 1 hour cache
  );
}

export async function GET(request: NextRequest): Promise<NextResponse<HearingsResponse>> {
  try {
    const { searchParams } = request.nextUrl;

    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') ?? '20')));
    const offsetMark = searchParams.get('offset') ?? '*';
    const congressParam = searchParams.get('congress');
    const congress = congressParam ? parseInt(congressParam) : undefined;
    const chamberFilter = searchParams.get('chamber')?.toLowerCase();

    logger.info('Hearings API request', { pageSize, offsetMark, congress, chamberFilter });

    const { hearings, count, nextPage } = await fetchHearings(pageSize, offsetMark, congress);

    // Filter by chamber if specified
    const filteredHearings = chamberFilter
      ? hearings.filter(h => h.chamber.toLowerCase() === chamberFilter)
      : hearings;

    return NextResponse.json(
      {
        success: true,
        hearings: filteredHearings,
        pagination: {
          count,
          pageSize,
          nextPage,
        },
        filters: {
          congress,
          chamber: chamberFilter,
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSource: 'govinfo.gov',
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Hearings API error', error as Error);

    return NextResponse.json(
      {
        success: false,
        hearings: [],
        pagination: { count: 0, pageSize: 20, nextPage: null },
        filters: {},
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSource: 'govinfo.gov',
        },
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
