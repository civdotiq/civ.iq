/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Counterfactual Analysis API
 *
 * POST /api/mesh/influence/counterfactual
 * Body: { bioguideId, maskSectors, billId? }
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { runCounterfactual } from '@/lib/mesh/propagation/counterfactual';
import { ApiErrors } from '@/lib/api/error-responses';
import type { IndustrySector } from '@/lib/fec/industry-taxonomy';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface RequestBody {
  bioguideId: string;
  maskSectors: IndustrySector[];
  billId?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    let body: Partial<RequestBody>;
    try {
      body = (await request.json()) as Partial<RequestBody>;
    } catch {
      return ApiErrors.validation('Invalid JSON in request body');
    }

    if (!body.bioguideId || !body.maskSectors || body.maskSectors.length === 0) {
      return ApiErrors.validation('bioguideId and maskSectors (non-empty array) are required');
    }

    logger.info('[API:Counterfactual] Request', {
      bioguideId: body.bioguideId,
      sectors: body.maskSectors,
    });

    const result = await runCounterfactual({
      bioguideId: body.bioguideId,
      maskSectors: body.maskSectors,
      billId: body.billId,
    });

    if (!result) {
      return ApiErrors.notFound('Counterfactual data', body.bioguideId);
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  } catch (error) {
    logger.error('[API:Counterfactual] Error', error as Error);
    return ApiErrors.serverError(error as Error);
  }
}
