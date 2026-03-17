/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Funding Cascade Simulation API
 *
 * POST /api/mesh/influence/cascade
 * Body: { sector, changePercent, committeeFilter?, billFilter? }
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { simulateCascade } from '@/lib/mesh/propagation/cascade';
import { ApiErrors } from '@/lib/api/error-responses';
import type { IndustrySector } from '@/lib/fec/industry-taxonomy';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface RequestBody {
  sector: IndustrySector;
  changePercent: number;
  committeeFilter?: string[];
  billFilter?: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Partial<RequestBody>;

    if (!body.sector || body.changePercent === undefined) {
      return ApiErrors.validation('sector and changePercent are required');
    }

    if (body.changePercent < -100 || body.changePercent > 1000) {
      return ApiErrors.validation('changePercent must be between -100 and 1000');
    }

    logger.info('[API:Cascade] Request', {
      sector: body.sector,
      changePercent: body.changePercent,
    });

    const result = await simulateCascade({
      sector: body.sector,
      changePercent: body.changePercent,
      committeeFilter: body.committeeFilter,
      billFilter: body.billFilter,
    });

    if (!result) {
      return ApiErrors.notFound('Cascade data', body.sector);
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error('[API:Cascade] Error', error as Error);
    return ApiErrors.serverError(error as Error);
  }
}
