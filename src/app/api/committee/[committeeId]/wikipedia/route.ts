/**
 * API endpoint for committee Wikipedia biographical data
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { wikipediaService, type CommitteeBiographicalData } from '@/lib/services/wikipedia.service';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

interface WikipediaAPIResponse {
  data: CommitteeBiographicalData | null;
  metadata: {
    committeeId: string;
    committeeName: string;
    chamber: string;
    lastUpdated: string;
    cacheable: boolean;
    sources: string[];
    hasWikipedia: boolean;
    hasWikidata: boolean;
  };
  errors?: Array<{
    code: string;
    message: string;
  }>;
}

// Committee ID to name mapping for better Wikipedia searches
const COMMITTEE_NAMES: Record<string, { name: string; chamber: 'House' | 'Senate' | 'Joint' }> = {
  SSJU: { name: 'Committee on the Judiciary', chamber: 'Senate' },
  SSAP: { name: 'Committee on Appropriations', chamber: 'Senate' },
  SSAS: { name: 'Committee on Armed Services', chamber: 'Senate' },
  SSBK: { name: 'Committee on Banking, Housing, and Urban Affairs', chamber: 'Senate' },
  SSBU: { name: 'Committee on the Budget', chamber: 'Senate' },
  SSCM: { name: 'Committee on Commerce, Science, and Transportation', chamber: 'Senate' },
  SSEG: { name: 'Committee on Energy and Natural Resources', chamber: 'Senate' },
  SSEV: { name: 'Committee on Environment and Public Works', chamber: 'Senate' },
  SSFI: { name: 'Committee on Finance', chamber: 'Senate' },
  SSFO: { name: 'Committee on Foreign Relations', chamber: 'Senate' },
  SSGA: { name: 'Committee on Homeland Security and Governmental Affairs', chamber: 'Senate' },
  SSHR: { name: 'Committee on Health, Education, Labor and Pensions', chamber: 'Senate' },
  SLIA: { name: 'Committee on Indian Affairs', chamber: 'Senate' },
  SSRA: { name: 'Committee on Rules and Administration', chamber: 'Senate' },
  SSSB: { name: 'Committee on Small Business and Entrepreneurship', chamber: 'Senate' },
  SSVA: { name: "Committee on Veterans' Affairs", chamber: 'Senate' },
  HSAG: { name: 'Committee on Agriculture', chamber: 'House' },
  HSAP: { name: 'Committee on Appropriations', chamber: 'House' },
  HSAS: { name: 'Committee on Armed Services', chamber: 'House' },
  HSBA: { name: 'Committee on Financial Services', chamber: 'House' },
  HSBU: { name: 'Committee on the Budget', chamber: 'House' },
  HSED: { name: 'Committee on Education and the Workforce', chamber: 'House' },
  HSIF: { name: 'Committee on Energy and Commerce', chamber: 'House' },
  HSFA: { name: 'Committee on Foreign Affairs', chamber: 'House' },
  HSGO: { name: 'Committee on Oversight and Accountability', chamber: 'House' },
  HSHA: { name: 'Committee on House Administration', chamber: 'House' },
  HSII: { name: 'Committee on Natural Resources', chamber: 'House' },
  HSJU: { name: 'Committee on the Judiciary', chamber: 'House' },
  HSPW: { name: 'Committee on Transportation and Infrastructure', chamber: 'House' },
  HSRU: { name: 'Committee on Rules', chamber: 'House' },
  HSSM: { name: 'Committee on Small Business', chamber: 'House' },
  HSSY: { name: 'Committee on Science, Space, and Technology', chamber: 'House' },
  HSVR: { name: "Committee on Veterans' Affairs", chamber: 'House' },
  HSWM: { name: 'Committee on Ways and Means', chamber: 'House' },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ committeeId: string }> }
): Promise<NextResponse<WikipediaAPIResponse>> {
  const startTime = Date.now();

  try {
    const { committeeId: rawCommitteeId } = await params;

    if (!rawCommitteeId) {
      return NextResponse.json(
        {
          data: null,
          metadata: {
            committeeId: '',
            committeeName: '',
            chamber: '',
            lastUpdated: new Date().toISOString(),
            cacheable: false,
            sources: [],
            hasWikipedia: false,
            hasWikidata: false,
          },
          errors: [{ code: 'MISSING_COMMITTEE_ID', message: 'Committee ID is required' }],
        },
        { status: 400 }
      );
    }

    const committeeId = rawCommitteeId.toUpperCase();
    const committeeInfo = COMMITTEE_NAMES[committeeId];

    if (!committeeInfo) {
      logger.warn(`Unknown committee ID: ${committeeId}`);
      return NextResponse.json(
        {
          data: null,
          metadata: {
            committeeId,
            committeeName: `Unknown Committee ${committeeId}`,
            chamber: '',
            lastUpdated: new Date().toISOString(),
            cacheable: false,
            sources: [],
            hasWikipedia: false,
            hasWikidata: false,
          },
          errors: [
            { code: 'UNKNOWN_COMMITTEE', message: `Committee ID ${committeeId} not recognized` },
          ],
        },
        { status: 404 }
      );
    }

    logger.info(`Fetching Wikipedia data for committee: ${committeeId} (${committeeInfo.name})`);

    // Fetch biographical data using the Wikipedia service
    const biographicalData = await wikipediaService.getCommitteeBiographicalData(
      committeeInfo.name,
      committeeInfo.chamber,
      committeeId
    );

    const executionTime = Date.now() - startTime;
    logger.info(`Wikipedia API completed for ${committeeId} in ${executionTime}ms`);

    if (!biographicalData) {
      return NextResponse.json(
        {
          data: null,
          metadata: {
            committeeId,
            committeeName: committeeInfo.name,
            chamber: committeeInfo.chamber,
            lastUpdated: new Date().toISOString(),
            cacheable: true,
            sources: [],
            hasWikipedia: false,
            hasWikidata: false,
          },
          errors: [
            { code: 'NO_DATA_FOUND', message: 'No biographical data found for this committee' },
          ],
        },
        { status: 404 }
      );
    }

    // Determine sources
    const sources = [];
    if (biographicalData.wikipedia) sources.push('Wikipedia');
    if (biographicalData.wikidata) sources.push('Wikidata');

    const response: WikipediaAPIResponse = {
      data: biographicalData,
      metadata: {
        committeeId,
        committeeName: committeeInfo.name,
        chamber: committeeInfo.chamber,
        lastUpdated: new Date().toISOString(),
        cacheable: true,
        sources,
        hasWikipedia: !!biographicalData.wikipedia,
        hasWikidata: !!biographicalData.wikidata,
      },
    };

    // Cache for 6 hours (biographical data doesn't change frequently)
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=21600, s-maxage=21600, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    const { committeeId: errorCommitteeId } = await params;
    logger.error(`Wikipedia API error for committee ${errorCommitteeId}:`, error as Error);

    return NextResponse.json(
      {
        data: null,
        metadata: {
          committeeId: errorCommitteeId || '',
          committeeName: '',
          chamber: '',
          lastUpdated: new Date().toISOString(),
          cacheable: false,
          sources: [],
          hasWikipedia: false,
          hasWikidata: false,
        },
        errors: [
          {
            code: 'INTERNAL_SERVER_ERROR',
            message: errorMessage,
          },
        ],
      },
      { status: 500 }
    );
  }
}
