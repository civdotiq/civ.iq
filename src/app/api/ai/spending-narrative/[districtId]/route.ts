/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Federal Spending Narrative API
 *
 * Returns AI-generated narrative of federal spending in a congressional district.
 * Translates USASpending.gov data into community context.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SpendingNarrativeGenerator } from '@/features/legislation/services/ai/spending-narrative-generator';
import { PLAIN_LANGUAGE_ATTRIBUTION } from '@/lib/ai/plain-language';
import logger from '@/lib/logging/simple-logger';
import { InputValidator } from '@/lib/validation/input-validator';
import { getServerBaseUrl } from '@/lib/server-url';
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
      pattern: /^[A-Z]{2}-\d{1,2}$/i,
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

    // Fetch spending data from USASpending.gov via existing API
    const spending = await fetchDistrictSpending(normalizedDistrictId);

    if (!spending) {
      return NextResponse.json(
        {
          error: 'Spending data not found',
          message: 'Unable to retrieve spending data for this district',
        },
        { status: 404 }
      );
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

/**
 * Fetch district spending data from working USASpending district API
 */
async function fetchDistrictSpending(districtId: string): Promise<DistrictSpending | null> {
  try {
    const baseUrl = getServerBaseUrl();
    const response = await fetch(`${baseUrl}/api/spending/district/${districtId}`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.summary) {
      return null;
    }

    const { summary, recentContracts } = data;
    const totalAmount = summary.totalSpending || 0;

    // Build categories from contract/grant breakdown
    const categories: DistrictSpending['categories'] = [];

    if (summary.contractSpending > 0) {
      categories.push({
        name: 'Federal Contracts',
        amount: summary.contractSpending,
        percentage:
          totalAmount > 0 ? Math.round((summary.contractSpending / totalAmount) * 100) : 0,
      });
    }

    if (summary.grantSpending > 0) {
      categories.push({
        name: 'Federal Grants',
        amount: summary.grantSpending,
        percentage: totalAmount > 0 ? Math.round((summary.grantSpending / totalAmount) * 100) : 0,
      });
    }

    // Map recent contracts to topContracts
    const topContracts: DistrictSpending['topContracts'] = [];
    if (recentContracts?.length) {
      for (const contract of recentContracts.slice(0, 5)) {
        topContracts.push({
          recipient: contract.recipientName || 'Federal contractor',
          amount: contract.amount || 0,
          description: contract.description || '',
        });
      }
    }

    return {
      totalAmount,
      categories,
      topContracts,
    };
  } catch (error) {
    logger.warn('Failed to fetch district spending', {
      districtId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}
