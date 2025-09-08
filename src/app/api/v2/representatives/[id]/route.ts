/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import logger from '@/lib/logging/simple-logger';
import type { EnhancedRepresentative } from '@/types/representative';

// Include options for sub-resource data
interface IncludeOptions {
  votes: boolean;
  bills: boolean;
  committees: boolean;
  finance: boolean;
  news: boolean;
  partyAlignment: boolean;
  leadership: boolean;
  district: boolean;
  lobbying: boolean;
}

interface ValidatedQuery {
  include?: string[];
  fields?: string[];
  format: 'simple' | 'detailed' | 'full';
}

// Validation helper
function validateAndParseQuery(searchParams: URLSearchParams): {
  isValid: boolean;
  data?: ValidatedQuery;
  errors?: string[];
} {
  const errors: string[] = [];

  const include = searchParams.get('include');
  const fields = searchParams.get('fields');
  const format = (searchParams.get('format') as 'simple' | 'detailed' | 'full') || 'full';

  // Validate format
  if (!['simple', 'detailed', 'full'].includes(format)) {
    errors.push('Format must be "simple", "detailed", or "full"');
  }

  // Parse include options
  const validIncludes = [
    'votes',
    'bills',
    'committees',
    'finance',
    'news',
    'partyAlignment',
    'leadership',
    'district',
    'lobbying',
  ];
  const parsedIncludes = include ? include.split(',').map(i => i.trim()) : [];
  const invalidIncludes = parsedIncludes.filter(i => !validIncludes.includes(i));

  if (invalidIncludes.length > 0) {
    errors.push(`Invalid include options: ${invalidIncludes.join(', ')}`);
  }

  // Parse fields
  const parsedFields = fields ? fields.split(',').map(f => f.trim()) : undefined;

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    data: {
      include: parsedIncludes.length > 0 ? parsedIncludes : undefined,
      fields: parsedFields,
      format,
    },
  };
}

// Helper to determine what to include
function getIncludeOptions(include?: string[]): IncludeOptions {
  if (!include || include.length === 0) {
    // Default: include basic profile data
    return {
      votes: false,
      bills: false,
      committees: true,
      finance: false,
      news: false,
      partyAlignment: false,
      leadership: true,
      district: true,
      lobbying: false,
    };
  }

  return {
    votes: include.includes('votes'),
    bills: include.includes('bills'),
    committees: include.includes('committees'),
    finance: include.includes('finance'),
    news: include.includes('news'),
    partyAlignment: include.includes('partyAlignment'),
    leadership: include.includes('leadership'),
    district: include.includes('district'),
    lobbying: include.includes('lobbying'),
  };
}

// Helper to fetch additional data
async function fetchAdditionalData(
  bioguideId: string,
  options: IncludeOptions,
  baseUrl: string
): Promise<Record<string, unknown>> {
  const additionalData: Record<string, unknown> = {};
  const fetchPromises: Promise<void>[] = [];

  if (options.votes) {
    fetchPromises.push(
      (async () => {
        try {
          const response = await fetch(`${baseUrl}/api/representative/${bioguideId}/votes`);
          if (response.ok) {
            additionalData.votes = await response.json();
          }
        } catch (error) {
          logger.warn('Failed to fetch votes data', { bioguideId, error });
        }
      })()
    );
  }

  if (options.bills) {
    fetchPromises.push(
      (async () => {
        try {
          const response = await fetch(`${baseUrl}/api/representative/${bioguideId}/bills`);
          if (response.ok) {
            additionalData.bills = await response.json();
          }
        } catch (error) {
          logger.warn('Failed to fetch bills data', { bioguideId, error });
        }
      })()
    );
  }

  if (options.committees) {
    fetchPromises.push(
      (async () => {
        try {
          const response = await fetch(`${baseUrl}/api/representative/${bioguideId}/committees`);
          if (response.ok) {
            additionalData.committees = await response.json();
          }
        } catch (error) {
          logger.warn('Failed to fetch committees data', { bioguideId, error });
        }
      })()
    );
  }

  if (options.finance) {
    fetchPromises.push(
      (async () => {
        try {
          const response = await fetch(`${baseUrl}/api/representative/${bioguideId}/finance`);
          if (response.ok) {
            additionalData.finance = await response.json();
          }
        } catch (error) {
          logger.warn('Failed to fetch finance data', { bioguideId, error });
        }
      })()
    );
  }

  if (options.news) {
    fetchPromises.push(
      (async () => {
        try {
          const response = await fetch(`${baseUrl}/api/representative/${bioguideId}/news`);
          if (response.ok) {
            additionalData.news = await response.json();
          }
        } catch (error) {
          logger.warn('Failed to fetch news data', { bioguideId, error });
        }
      })()
    );
  }

  if (options.partyAlignment) {
    fetchPromises.push(
      (async () => {
        try {
          const response = await fetch(
            `${baseUrl}/api/representative/${bioguideId}/party-alignment`
          );
          if (response.ok) {
            additionalData.partyAlignment = await response.json();
          }
        } catch (error) {
          logger.warn('Failed to fetch party alignment data', { bioguideId, error });
        }
      })()
    );
  }

  if (options.leadership) {
    fetchPromises.push(
      (async () => {
        try {
          const response = await fetch(`${baseUrl}/api/representative/${bioguideId}/leadership`);
          if (response.ok) {
            additionalData.leadership = await response.json();
          }
        } catch (error) {
          logger.warn('Failed to fetch leadership data', { bioguideId, error });
        }
      })()
    );
  }

  if (options.district) {
    fetchPromises.push(
      (async () => {
        try {
          const response = await fetch(`${baseUrl}/api/representative/${bioguideId}/district`);
          if (response.ok) {
            additionalData.district = await response.json();
          }
        } catch (error) {
          logger.warn('Failed to fetch district data', { bioguideId, error });
        }
      })()
    );
  }

  if (options.lobbying) {
    fetchPromises.push(
      (async () => {
        try {
          const response = await fetch(`${baseUrl}/api/representative/${bioguideId}/lobbying`);
          if (response.ok) {
            additionalData.lobbying = await response.json();
          }
        } catch (error) {
          logger.warn('Failed to fetch lobbying data', { bioguideId, error });
        }
      })()
    );
  }

  // Wait for all data to be fetched
  await Promise.all(fetchPromises);
  return additionalData;
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

// Format helpers
function toSimpleFormat(rep: EnhancedRepresentative) {
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
    bio: rep.bio,
  };
}

// Main handler
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();

  try {
    const { id: bioguideId } = await params;
    const upperBioguideId = bioguideId?.toUpperCase();

    if (!bioguideId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_ID',
            message: 'Bioguide ID is required',
          },
        },
        { status: 400 }
      );
    }

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

    logger.info('V2 Representative Detail API request', {
      bioguideId: upperBioguideId,
      query,
      userAgent: request.headers.get('user-agent'),
    });

    // Get the base representative data
    const representative = await getEnhancedRepresentative(upperBioguideId);

    if (!representative) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'REPRESENTATIVE_NOT_FOUND',
            message: `Representative with ID ${upperBioguideId} not found`,
          },
          metadata: {
            apiVersion: 'v2',
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - startTime,
          },
        },
        { status: 404 }
      );
    }

    // Determine what additional data to include
    const includeOptions = getIncludeOptions(query.include);

    // Fetch additional data if requested
    const baseUrl = request.url.split('/api/')[0] || 'http://localhost:3000';
    const additionalData = await fetchAdditionalData(upperBioguideId!, includeOptions, baseUrl);

    // Format the representative data based on requested format
    let formattedRep: unknown;
    switch (query.format) {
      case 'simple':
        formattedRep = selectFields(
          toSimpleFormat(representative) as unknown as Record<string, unknown>,
          query.fields
        );
        break;
      case 'detailed':
        formattedRep = selectFields(
          toDetailedFormat(representative) as unknown as Record<string, unknown>,
          query.fields
        );
        break;
      case 'full':
        formattedRep = selectFields(
          representative as unknown as Record<string, unknown>,
          query.fields
        );
        break;
      default:
        formattedRep = representative;
    }

    const response = {
      success: true,
      data: {
        representative: formattedRep,
        ...additionalData,
      },
      included: Object.keys(additionalData),
      metadata: {
        apiVersion: 'v2',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        cached: false,
        dataSource: 'congress-legislators',
        format: query.format,
        fields: query.fields,
        bioguideId: upperBioguideId,
      },
    };

    logger.info('V2 Representative Detail API response', {
      bioguideId: upperBioguideId,
      format: query.format,
      includedData: Object.keys(additionalData),
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('V2 Representative Detail API error', error as Error);

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
