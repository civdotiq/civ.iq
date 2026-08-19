/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type { DistrictBoundary, StateMetadata } from '@/lib/helpers/district-boundary-utils';

export const dynamic = 'force-dynamic';

interface DistrictMetadataResponse {
  districts: Record<string, DistrictBoundary>;
  states: Record<string, StateMetadata>;
  summary: {
    total_districts: number;
    states_with_districts: number;
    last_updated: string;
    source: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const cacheKey = 'district-boundaries-metadata';
    const TTL_1_HOUR = 60 * 60; // cachedFetch takes seconds, not milliseconds

    const metadata = await cachedFetch(
      cacheKey,
      async (): Promise<DistrictMetadataResponse> => {
        // The corpus lives in data/, which Next.js does not serve — read it
        // from disk (shipped via outputFileTracingIncludes), never over HTTP.
        const metadataPath = join(
          process.cwd(),
          'data',
          'districts',
          'district_metadata_real.json'
        );

        try {
          const parsedData = JSON.parse(
            await readFile(metadataPath, 'utf8')
          ) as DistrictMetadataResponse;

          logger.info(
            'Loaded REAL district metadata from Census data',
            {
              operation: 'district_metadata_load',
              districts_count: Object.keys(parsedData.districts || {}).length,
              states_count: Object.keys(parsedData.states || {}).length,
              source: 'real_census_data',
            },
            request
          );

          return parsedData;
        } catch (fileError) {
          logger.warn(
            'REAL district metadata file not found, generating fallback',
            {
              operation: 'district_metadata_fallback',
              error: fileError instanceof Error ? fileError.message : 'Unknown error',
              path: metadataPath,
            },
            request
          );

          // Empty fallback — regenerate with `node scripts/generate-real-metadata.mjs`
          return {
            districts: {},
            states: {},
            summary: {
              total_districts: 0,
              states_with_districts: 0,
              last_updated: new Date().toISOString(),
              source: 'Fallback - run node scripts/generate-real-metadata.mjs to regenerate',
            },
          };
        }
      },
      TTL_1_HOUR
    );

    return NextResponse.json(metadata, {
      headers: {
        'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=1209600',
      },
    });
  } catch (error) {
    logger.error(
      'District metadata API error',
      error as Error,
      {
        operation: 'district_metadata_api_error',
      },
      request
    );

    return NextResponse.json(
      {
        error: 'Failed to load district metadata',
        districts: {},
        states: {},
        summary: {
          total_districts: 0,
          states_with_districts: 0,
          last_updated: new Date().toISOString(),
          source: 'Error fallback',
        },
      },
      { status: 500 }
    );
  }
}
