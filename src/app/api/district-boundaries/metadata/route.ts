/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { cachedFetch } from '@/lib/cache';
import { structuredLogger } from '@/lib/logging/logger';
import type { DistrictBoundary, StateMetadata } from '@/lib/helpers/district-boundary-utils';

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
    const TTL_1_HOUR = 60 * 60 * 1000; // 1 hour cache

    const metadata = await cachedFetch(
      cacheKey,
      async (): Promise<DistrictMetadataResponse> => {
        // Try to load from the REAL Census data file first, fall back to demo
        const realDataPath = join(
          process.cwd(),
          'data',
          'districts',
          'district_metadata_real.json'
        );
        const _demoDataPath = join(process.cwd(), 'data', 'districts', 'district_metadata.json');

        try {
          const fileContent = readFileSync(realDataPath, 'utf8');
          const parsedData = JSON.parse(fileContent);

          structuredLogger.info(
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
          structuredLogger.warn(
            'REAL district metadata file not found, generating fallback',
            {
              operation: 'district_metadata_fallback',
              error: fileError instanceof Error ? fileError.message : 'Unknown error',
              path: realDataPath,
            },
            request
          );

          // Fallback: Generate basic metadata structure
          // This would be populated when the data processing script runs
          return {
            districts: {},
            states: {},
            summary: {
              total_districts: 0,
              states_with_districts: 0,
              last_updated: new Date().toISOString(),
              source: 'Fallback - Run npm run process-district-boundaries to generate real data',
            },
          };
        }
      },
      TTL_1_HOUR
    );

    return NextResponse.json(metadata);
  } catch (error) {
    structuredLogger.error(
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
