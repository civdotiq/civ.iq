/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Legislators by Address API Endpoint
 *
 * POST /api/state-legislators-by-address
 *
 * Accepts a full street address and returns state legislators using:
 * - U.S. Census Geocoder for district resolution
 * - OpenStates API for legislator data
 *
 * This endpoint implements the two-API chain architecture:
 * Census (address → districts) → OpenStates (districts → legislators)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  addressToLegislators,
  AddressLookupException,
  AddressLookupError,
} from '@/services/state-legislators/address-to-legislators.service';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

interface AddressRequestBody {
  street: string;
  city: string;
  state: string;
  zip?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = (await request.json()) as AddressRequestBody;

    // Validate required fields
    const validation = addressToLegislators.validate(body);
    if (!validation.valid) {
      logger.warn('Invalid address request', {
        errors: validation.errors,
        responseTime: Date.now() - startTime,
      });
      return NextResponse.json(
        {
          error: 'Invalid address',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    logger.info('Address-to-legislators API request', {
      street: body.street,
      city: body.city,
      state: body.state,
      zip: body.zip,
    });

    // Perform lookup
    const result = await addressToLegislators.findByAddress({
      street: body.street,
      city: body.city,
      state: body.state,
      zip: body.zip,
    });

    logger.info('Address-to-legislators API success', {
      address: body,
      senator: result.legislators.senator?.name,
      representative: result.legislators.representative?.name,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Address-to-legislators API failed', error as Error, {
      responseTime: Date.now() - startTime,
    });

    // Map service errors to appropriate HTTP status codes
    if (error instanceof AddressLookupException) {
      const statusCode =
        {
          [AddressLookupError.INVALID_ADDRESS]: 400,
          [AddressLookupError.ADDRESS_NOT_FOUND]: 404,
          [AddressLookupError.NO_DISTRICTS_FOUND]: 404,
          [AddressLookupError.NO_LEGISLATORS_FOUND]: 404,
          [AddressLookupError.CENSUS_API_ERROR]: 502, // Bad Gateway (upstream API failure)
          [AddressLookupError.OPENSTATES_API_ERROR]: 502,
          [AddressLookupError.UNKNOWN_ERROR]: 500,
        }[error.errorType] || 500;

      return NextResponse.json(
        {
          error: error.errorType,
          message: error.message,
        },
        { status: statusCode }
      );
    }

    // Fallback for unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

// Also support GET requests with query parameters for convenience
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = request.nextUrl;

  const street = searchParams.get('street');
  const city = searchParams.get('city');
  const state = searchParams.get('state');
  const zip = searchParams.get('zip') || undefined;

  if (!street || !city || !state) {
    logger.warn('Missing required query parameters', {
      hasStreet: !!street,
      hasCity: !!city,
      hasState: !!state,
      responseTime: Date.now() - startTime,
    });
    return NextResponse.json(
      {
        error: 'Missing required parameters',
        message: 'Query parameters required: street, city, state (zip optional)',
      },
      { status: 400 }
    );
  }

  // Reuse POST logic
  const mockRequest = {
    json: async () => ({ street, city, state, zip }),
  } as NextRequest;

  return POST(mockRequest);
}
