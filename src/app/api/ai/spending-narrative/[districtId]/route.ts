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
import logger from '@/lib/logging/simple-logger';
import { InputValidator } from '@/lib/validation/input-validator';
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
 * Fetch district spending data from existing government spending API
 */
async function fetchDistrictSpending(districtId: string): Promise<DistrictSpending | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/districts/${districtId}/government-spending`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const gov = data.government;

    if (!gov?.federalInvestment) {
      return null;
    }

    // Map existing government spending format to DistrictSpending interface
    const categories: DistrictSpending['categories'] = [];
    const totalAmount = gov.federalInvestment.totalAnnualSpending || 0;

    if (gov.federalInvestment.infrastructureInvestment > 0) {
      categories.push({
        name: 'Infrastructure',
        amount: gov.federalInvestment.infrastructureInvestment,
        percentage:
          totalAmount > 0
            ? Math.round((gov.federalInvestment.infrastructureInvestment / totalAmount) * 100)
            : 0,
      });
    }

    if (gov.socialServices) {
      const socialTotal =
        (gov.socialServices.snapBeneficiaries || 0) +
        (gov.socialServices.medicaidEnrollment || 0) +
        (gov.socialServices.housingAssistanceUnits || 0) +
        (gov.socialServices.veteransServices || 0);

      if (socialTotal > 0) {
        categories.push({
          name: 'Social Services',
          amount: socialTotal,
          percentage: totalAmount > 0 ? Math.round((socialTotal / totalAmount) * 100) : 0,
        });
      }
    }

    const topContracts: DistrictSpending['topContracts'] = [];
    if (gov.federalInvestment.majorProjects) {
      for (const project of gov.federalInvestment.majorProjects.slice(0, 5)) {
        topContracts.push({
          recipient: project.name || project.recipient || 'Federal project',
          amount: project.amount || 0,
          description: project.description || project.name || '',
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
