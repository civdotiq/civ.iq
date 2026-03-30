/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fdaService } from '@/lib/data-sources/fda-service';
import logger from '@/lib/logging/simple-logger';

export const revalidate = 43200; // 12 hours

// Map industry sectors to FDA search keywords
const SECTOR_KEYWORDS: Record<string, string[]> = {
  Health: ['drug', 'medical device', 'pharmaceutical', 'biologic'],
  Agribusiness: ['food', 'dietary supplement', 'animal feed'],
  'Misc Business': ['cosmetic', 'tobacco'],
};

/**
 * FDA recalls for an industry sector.
 *
 * Returns active recalls with severity classifications from openFDA.
 *
 * @example GET /api/industry/Health/recalls
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sector: string }> }
) {
  const { sector } = await params;

  if (!sector || typeof sector !== 'string') {
    return NextResponse.json({ error: 'Sector is required' }, { status: 400 });
  }

  const decodedSector = decodeURIComponent(sector);
  const keywords = SECTOR_KEYWORDS[decodedSector];

  if (!keywords) {
    return NextResponse.json(
      {
        sector: decodedSector,
        recalls: [],
        message:
          'FDA recall data is available for Health, Agribusiness, and Misc Business sectors.',
        dataSource: 'openFDA',
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=21600',
        },
      }
    );
  }

  try {
    // Fetch recalls for each keyword in parallel
    const recallResults = await Promise.all(
      keywords.map(keyword =>
        fdaService.searchRecalls({ product: keyword, limit: 10 }).catch(e => {
          logger.error('FDA recalls fetch failed', e as Error, { sector: decodedSector, keyword });
          return [];
        })
      )
    );

    // Flatten and deduplicate by recall number
    const seen = new Set<string>();
    const allRecalls = recallResults
      .flat()
      .filter(r => {
        if (seen.has(r.recallNumber)) return false;
        seen.add(r.recallNumber);
        return true;
      })
      .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
      .slice(0, 25);

    // Summary stats
    const classI = allRecalls.filter(r => r.classification === 'Class I').length;
    const classII = allRecalls.filter(r => r.classification === 'Class II').length;
    const classIII = allRecalls.filter(r => r.classification === 'Class III').length;

    return NextResponse.json(
      {
        sector: decodedSector,
        recalls: allRecalls,
        summary: {
          total: allRecalls.length,
          classI,
          classII,
          classIII,
        },
        dataSource: 'openFDA Enforcement Reports',
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=21600',
        },
      }
    );
  } catch (error) {
    logger.error('FDA recalls error', error as Error, { sector: decodedSector });
    return NextResponse.json({ error: 'Failed to fetch recall data' }, { status: 500 });
  }
}
