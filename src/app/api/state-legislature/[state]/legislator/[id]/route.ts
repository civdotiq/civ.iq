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
import { fetchBiography } from '@/lib/api/wikipedia';

export const dynamic = 'force-dynamic';

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

    // Enrich with Wikipedia article content
    logger.info('Enriching state legislator with Wikipedia', {
      legislatorName: legislator.name,
    });

    try {
      const wikipediaBio = await fetchBiography(legislator.name, 'state-legislator');

      if (wikipediaBio?.wikipediaSummary) {
        // Add Wikipedia fields to legislator object
        legislator.wikipedia = {
          summary: wikipediaBio.wikipediaSummary,
          htmlSummary: wikipediaBio.wikipediaHtmlSummary,
          imageUrl: wikipediaBio.wikipediaImageUrl,
          pageUrl: wikipediaBio.wikipediaPageUrl,
          lastUpdated: wikipediaBio.lastUpdated,
        };

        logger.info('State legislator enriched with Wikipedia', {
          legislatorName: legislator.name,
          hasSummary: !!wikipediaBio.wikipediaSummary,
          hasImage: !!wikipediaBio.wikipediaImageUrl,
        });
      } else {
        logger.info('No Wikipedia article found for legislator', {
          legislatorName: legislator.name,
        });
      }
    } catch (error) {
      logger.warn('Wikipedia enrichment failed for state legislator', {
        legislatorName: legislator.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

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
