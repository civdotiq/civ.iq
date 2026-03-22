/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Federal Spending Narrative API
 *
 * Returns AI-generated narrative of federal spending in a congressional district.
 * Translates USASpending.gov data into community context.
 *
 * Calls the spending service directly — no self-referencing HTTP fetch.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SpendingNarrativeGenerator } from '@/features/legislation/services/ai/spending-narrative-generator';
import { PLAIN_LANGUAGE_ATTRIBUTION } from '@/lib/ai/plain-language';
import logger from '@/lib/logging/simple-logger';
import { InputValidator } from '@/lib/validation/input-validator';
import { parseDistrictId, getDistrictSpending } from '@/lib/services/spending.service';
import type { DistrictSpending } from '@/types/ai';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const { districtId } = await params;

    // Validate districtId (format: XX-## like CA-12, NY-7)
    const districtIdErrors = InputValidator.validateValue(districtId, {
      required: true,
      minLength: 3,
      maxLength: 10,
      pattern: /^[A-Z]{2}-(\d{1,2}|AL|00)$/i,
    });

    if (districtIdErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid district ID', details: districtIdErrors },
        { status: 400 }
      );
    }

    const normalizedDistrictId = districtId.toUpperCase();

    logger.info('Spending narrative request received', {
      districtId: normalizedDistrictId,
      operation: 'spending_narrative_api',
    });

    // Call spending service directly — no self-referencing HTTP fetch
    const parsed = parseDistrictId(normalizedDistrictId);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid district ID format' }, { status: 400 });
    }

    const result = await getDistrictSpending(parsed.state, parsed.district);

    const totalAmount = result.aggregate?.total ?? result.contractTotal + result.grantTotal;

    if (totalAmount === 0 && result.contracts.length === 0 && result.grants.length === 0) {
      return NextResponse.json(
        {
          error: 'Spending data not found',
          message: 'Unable to retrieve spending data for this district',
        },
        { status: 404 }
      );
    }

    // Transform to DistrictSpending shape for the narrative generator
    const spending: DistrictSpending = {
      totalAmount,
      categories: [],
      topContracts: [],
    };

    if (result.contractTotal > 0) {
      spending.categories.push({
        name: 'Federal Contracts',
        amount: result.contractTotal,
        percentage: totalAmount > 0 ? Math.round((result.contractTotal / totalAmount) * 100) : 0,
      });
    }

    if (result.grantTotal > 0) {
      spending.categories.push({
        name: 'Federal Grants',
        amount: result.grantTotal,
        percentage: totalAmount > 0 ? Math.round((result.grantTotal / totalAmount) * 100) : 0,
      });
    }

    for (const contract of result.contracts.slice(0, 5)) {
      spending.topContracts.push({
        recipient: contract.recipientName || 'Federal contractor',
        amount: contract.amount || 0,
        description: contract.description || '',
      });
    }

    // Generate spending narrative
    const narrative = await SpendingNarrativeGenerator.generateNarrative(
      normalizedDistrictId,
      spending
    );

    const responseTime = Date.now() - startTime;

    logger.info('Spending narrative completed', {
      districtId: normalizedDistrictId,
      responseTime,
      confidence: narrative.confidence,
      source: narrative.source,
      operation: 'spending_narrative_api',
    });

    return NextResponse.json(
      {
        narrative,
        metadata: {
          responseTime,
          districtId: normalizedDistrictId,
          dataSources: {
            spending: 'USASpending.gov',
          },
          plainLanguage: PLAIN_LANGUAGE_ATTRIBUTION,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const resolvedParams = await params;

    logger.error('Spending narrative failed', error as Error, {
      districtId: resolvedParams.districtId,
      responseTime,
      operation: 'spending_narrative_api',
    });

    return NextResponse.json(
      {
        error: 'Spending narrative failed',
        message: 'Unable to generate spending narrative at this time',
      },
      { status: 500 }
    );
  }
}
