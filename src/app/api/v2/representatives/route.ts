/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { getCongressionalDistrictFromZip } from '@/lib/census-api';
import logger from '@/lib/logging/simple-logger';
import type { EnhancedRepresentative, RepresentativeSummary } from '@/types/representative';

// Response format types
type ResponseFormat = 'simple' | 'detailed' | 'full';

// Validation schemas (without Zod for now)

interface ValidatedQuery {
  zip?: string;
  state?: string;
  district?: string;
  party?: string;
  chamber?: 'House' | 'Senate';
  format: ResponseFormat;
  includeMultiDistrict: boolean;
  fields?: string[];
  limit: number;
  offset: number;
}

// Validation helper
function validateAndParseQuery(searchParams: URLSearchParams): {
  isValid: boolean;
  data?: ValidatedQuery;
  errors?: string[];
} {
  const errors: string[] = [];

  const zip = searchParams.get('zip');
  const state = searchParams.get('state');
  const district = searchParams.get('district');
  const party = searchParams.get('party');
  const chamber = searchParams.get('chamber') as 'House' | 'Senate';
  const format = (searchParams.get('format') as ResponseFormat) || 'simple';
  const includeMultiDistrict = searchParams.get('includeMultiDistrict') === 'true';
  const fields = searchParams.get('fields');
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');

  // Validate ZIP code format
  if (zip && !/^\d{5}(-\d{4})?$/.test(zip)) {
    errors.push('ZIP code must be 5 digits (e.g., 10001) or 9 digits (e.g., 10001-1234)');
  }

  // Validate state format
  if (state && !/^[A-Z]{2}$/.test(state.toUpperCase())) {
    errors.push('State must be a 2-letter abbreviation (e.g., CA)');
  }

  // Validate district format
  if (district && !/^\d{1,2}$/.test(district)) {
    errors.push('District must be a 1-2 digit number');
  }

  // Validate chamber
  if (chamber && !['House', 'Senate'].includes(chamber)) {
    errors.push('Chamber must be either "House" or "Senate"');
  }

  // Validate format
  if (!['simple', 'detailed', 'full'].includes(format)) {
    errors.push('Format must be "simple", "detailed", or "full"');
  }

  // Validate party
  if (party && !['Democratic', 'Republican', 'Independent'].includes(party)) {
    errors.push('Party must be "Democratic", "Republican", or "Independent"');
  }

  // Parse and validate numeric fields
  const parsedLimit = limit ? parseInt(limit, 10) : 100;
  const parsedOffset = offset ? parseInt(offset, 10) : 0;

  if (limit && (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000)) {
    errors.push('Limit must be a number between 1 and 1000');
  }

  if (offset && (isNaN(parsedOffset) || parsedOffset < 0)) {
    errors.push('Offset must be a non-negative number');
  }

  // Parse fields
  const parsedFields = fields ? fields.split(',').map(f => f.trim()) : undefined;

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    data: {
      zip: zip ?? undefined,
      state: state?.toUpperCase() ?? undefined,
      district: district ?? undefined,
      party: party ?? undefined,
      chamber,
      format,
      includeMultiDistrict,
      fields: parsedFields,
      limit: parsedLimit,
      offset: parsedOffset,
    },
  };
}

// Field selection helper
function selectFields<T extends Record<string, unknown>>(data: T, fields?: string[]): Partial<T> {
  if (!fields || fields.length === 0) {
    return data;
  }

  const selected: Partial<T> = {};
  for (const field of fields) {
    if (field in data) {
      (selected as Record<string, unknown>)[field] = data[field];
    }
  }
  return selected;
}

// Format conversion helpers
function toSimpleFormat(rep: EnhancedRepresentative): RepresentativeSummary {
  return {
    bioguideId: rep.bioguideId,
    name: rep.name,
    party: rep.party,
    state: rep.state,
    district: rep.district,
    chamber: rep.chamber,
    title: rep.title,
    imageUrl: rep.imageUrl,
    website: rep.currentTerm?.website || rep.website,
    phone: rep.currentTerm?.phone || rep.phone,
  };
}

function toDetailedFormat(rep: EnhancedRepresentative) {
  return {
    ...toSimpleFormat(rep),
    firstName: rep.firstName,
    lastName: rep.lastName,
    email: rep.email,
    currentTerm: rep.currentTerm,
    socialMedia: rep.socialMedia,
    ids: rep.ids,
    committees: rep.committees,
  };
}

// Main handler
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const validation = validateAndParseQuery(searchParams);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validation.errors,
          },
        },
        { status: 400 }
      );
    }

    const query = validation.data!;

    logger.info('V2 Representatives API request', {
      query,
      userAgent: request.headers.get('user-agent'),
    });

    // Get all representatives
    const allReps = await getAllEnhancedRepresentatives();

    if (!allReps || allReps.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATA_UNAVAILABLE',
            message: 'Representative data is temporarily unavailable',
          },
        },
        { status: 503 }
      );
    }

    // Filter representatives based on query parameters
    let filteredReps = allReps;

    // Filter by ZIP code (requires district lookup)
    if (query.zip) {
      try {
        const districtInfo = await getCongressionalDistrictFromZip(query.zip);
        if (districtInfo) {
          filteredReps = filteredReps.filter(rep => {
            if (rep.chamber === 'Senate' && rep.state === districtInfo.state) {
              return true;
            }
            if (rep.chamber === 'House' && rep.state === districtInfo.state) {
              const repDistrict = parseInt(rep.district || '0', 10);
              const targetDistrict = parseInt(districtInfo.district || '0', 10);
              return repDistrict === targetDistrict;
            }
            return false;
          });
        } else {
          filteredReps = [];
        }
      } catch (error) {
        logger.error('Failed to lookup ZIP code', error as Error, { zip: query.zip });
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'ZIP_LOOKUP_FAILED',
              message: 'Failed to lookup congressional district for ZIP code',
            },
          },
          { status: 500 }
        );
      }
    }

    // Filter by state and district
    if (query.state) {
      filteredReps = filteredReps.filter(rep => rep.state === query.state);
    }

    if (query.district) {
      const targetDistrict = parseInt(query.district, 10);
      filteredReps = filteredReps.filter(rep => {
        if (rep.chamber === 'House') {
          const repDistrict = parseInt(rep.district || '0', 10);
          return repDistrict === targetDistrict;
        }
        return false; // Senate doesn't have districts
      });
    }

    // Filter by party
    if (query.party) {
      filteredReps = filteredReps.filter(rep => rep.party === query.party);
    }

    // Filter by chamber
    if (query.chamber) {
      filteredReps = filteredReps.filter(rep => rep.chamber === query.chamber);
    }

    // Handle multi-district filtering
    if (!query.includeMultiDistrict) {
      // This would filter out representatives that serve multiple districts
      // For now, this is a placeholder
    }

    // Apply pagination
    const total = filteredReps.length;
    const paginatedReps = filteredReps.slice(query.offset, query.offset + query.limit);

    // Format data based on requested format
    let formattedData: unknown[];
    switch (query.format) {
      case 'simple':
        formattedData = paginatedReps.map(rep => {
          const simple = toSimpleFormat(rep);
          return selectFields(simple as unknown as Record<string, unknown>, query.fields);
        });
        break;
      case 'detailed':
        formattedData = paginatedReps.map(rep => {
          const detailed = toDetailedFormat(rep);
          return selectFields(detailed as unknown as Record<string, unknown>, query.fields);
        });
        break;
      case 'full':
        formattedData = paginatedReps.map(rep =>
          selectFields(rep as unknown as Record<string, unknown>, query.fields)
        );
        break;
      default:
        formattedData = paginatedReps.map(rep => toSimpleFormat(rep));
    }

    const response = {
      success: true,
      data: {
        representatives: formattedData,
        pagination: {
          total,
          count: formattedData.length,
          offset: query.offset,
          limit: query.limit,
          hasMore: query.offset + query.limit < total,
        },
        filters: {
          zip: query.zip,
          state: query.state,
          district: query.district,
          party: query.party,
          chamber: query.chamber,
        },
        format: query.format,
        fields: query.fields,
      },
      metadata: {
        apiVersion: 'v2',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        cached: false,
        dataSource: 'congress-legislators',
      },
    };

    logger.info('V2 Representatives API response', {
      total,
      returned: formattedData.length,
      format: query.format,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('V2 Representatives API error', error as Error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal server error occurred',
        },
        metadata: {
          apiVersion: 'v2',
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
        },
      },
      { status: 500 }
    );
  }
}
