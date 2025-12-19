/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Legislator Detail API
 *
 * GET /api/state-legislature/[state]/legislator/[id]
 * Returns detailed information about a specific state legislator using StateLegislatureCoreService.
 */

import { NextRequest, NextResponse } from 'next/server';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import logger from '@/lib/logging/simple-logger';
import { decodeBase64Url } from '@/lib/url-encoding';
import { getStateLegislatorBiography } from '@/lib/api/wikidata-state-legislators';

// ISR: Election-aware revalidation (3 days Oct-Dec, 30 days Jan-Sep)
// Legislator profiles change primarily during biennial election cycles
export const revalidate = 259200; // 3 days

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string; id: string }> }
) {
  const startTime = Date.now();

  try {
    const { state, id } = await params;
    const legislatorId = decodeBase64Url(id); // Decode Base64 ID

    if (!state || !legislatorId) {
      logger.warn('State legislator API request missing parameters', { state, id: legislatorId });
      return NextResponse.json(
        { success: false, error: 'State and legislator ID are required' },
        { status: 400 }
      );
    }

    logger.info('Fetching state legislator via core service', {
      state: state.toUpperCase(),
      legislatorId,
    });

    // Use StateLegislatureCoreService for direct access (NO HTTP calls!)
    const legislator = await StateLegislatureCoreService.getStateLegislatorById(
      state.toUpperCase(),
      legislatorId
    );

    if (!legislator) {
      logger.warn('State legislator not found', {
        state: state.toUpperCase(),
        legislatorId,
      });
      return NextResponse.json(
        { success: false, error: 'State legislator not found' },
        { status: 404 }
      );
    }

    // Enrich with Wikidata biographical information
    logger.info('Enriching state legislator with Wikidata', {
      legislatorName: legislator.name,
      chamber: legislator.chamber,
    });

    const wikidataBio = await getStateLegislatorBiography(
      legislator.name,
      state.toUpperCase(),
      legislator.chamber
    );

    // Merge Wikidata biographical data if available
    if (wikidataBio) {
      legislator.bio = {
        ...legislator.bio,
        birthday: wikidataBio.birthDate || legislator.bio?.birthday,
        birthplace: wikidataBio.birthPlace || legislator.bio?.birthplace,
        education: wikidataBio.education || legislator.bio?.education,
      };

      // Add Wikipedia URL if available
      if (wikidataBio.wikipediaUrl && legislator.links) {
        const hasWikipedia = legislator.links.some(link => link.url === wikidataBio.wikipediaUrl);
        if (!hasWikipedia) {
          legislator.links.push({
            url: wikidataBio.wikipediaUrl,
            note: 'Wikipedia',
          });
        }
      }

      logger.info('State legislator enriched with Wikidata', {
        legislatorName: legislator.name,
        hasEducation: !!wikidataBio.education?.length,
        hasBirthplace: !!wikidataBio.birthPlace,
        hasWikipedia: !!wikidataBio.wikipediaUrl,
      });
    } else {
      logger.info('No Wikidata biographical data found for legislator', {
        legislatorName: legislator.name,
      });
    }

    // NOTE: Wikipedia article content is now fetched by StateLegislatureCoreService.getStateLegislatorById()
    // with proper state-legislator-specific search and validation. No duplicate fetch needed here.

    logger.info('State legislator request successful', {
      state: state.toUpperCase(),
      legislatorId,
      legislatorName: legislator.name,
      chamber: legislator.chamber,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        legislator,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('State legislator request failed', error as Error, {
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch state legislator',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
