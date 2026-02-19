/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * District Impact API Endpoint
 *
 * Returns AI-generated analysis of how a specific bill impacts a congressional district.
 * Cross-references bill summary with district-level economic and spending data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DistrictImpactAnalyzer } from '@/features/legislation/services/ai/district-impact-analyzer';
import { BillSummaryCache } from '@/features/legislation/services/ai/bill-summary-cache';
import { PLAIN_LANGUAGE_ATTRIBUTION } from '@/lib/ai/plain-language';
import logger from '@/lib/logging/simple-logger';
import { InputValidator } from '@/lib/validation/input-validator';
import type { EconomicProfile, GovernmentServicesProfile } from '@/types/district-enhancements';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string; districtId: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const { billId, districtId } = await params;

    // Validate billId
    const billIdErrors = InputValidator.validateValue(billId, {
      required: true,
      minLength: 5,
      maxLength: 20,
      pattern: /^[A-Z0-9\-\.]+$/i,
    });

    if (billIdErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid bill ID', details: billIdErrors },
        { status: 400 }
      );
    }

    // Validate districtId (format: XX-## like CA-12, NY-7, or at-large like AK-0)
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

    logger.info('District impact request received', {
      billId,
      districtId: normalizedDistrictId,
      operation: 'district_impact_api',
    });

    // Fetch bill summary and district data in parallel
    const [billSummary, economicData, spendingData] = await Promise.all([
      fetchBillSummary(billId),
      fetchEconomicProfile(normalizedDistrictId),
      fetchGovernmentSpending(normalizedDistrictId),
    ]);

    if (!billSummary) {
      return NextResponse.json(
        {
          error: 'Bill summary not found',
          message: 'Unable to retrieve bill summary for impact analysis',
        },
        { status: 404 }
      );
    }

    // Generate district impact analysis
    const impact = await DistrictImpactAnalyzer.analyzeImpact(
      billSummary.text,
      {
        districtId: normalizedDistrictId,
        economic: economicData,
        government: spendingData,
      },
      {
        billId,
        title: billSummary.title,
        number: billSummary.number,
      }
    );

    const responseTime = Date.now() - startTime;

    logger.info('District impact analysis completed', {
      billId,
      districtId: normalizedDistrictId,
      responseTime,
      overallImpact: impact.overallImpact,
      confidence: impact.confidence,
      source: impact.source,
      operation: 'district_impact_api',
    });

    return NextResponse.json(
      {
        impact,
        metadata: {
          responseTime,
          districtId: normalizedDistrictId,
          billId,
          dataSources: {
            billSummary: 'CIV.IQ AI Summary',
            economic: 'Bureau of Labor Statistics, FCC',
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

    logger.error('District impact analysis failed', error as Error, {
      billId: resolvedParams.billId,
      districtId: resolvedParams.districtId,
      responseTime,
      operation: 'district_impact_api',
    });

    return NextResponse.json(
      {
        error: 'Impact analysis failed',
        message: 'Unable to generate district impact analysis at this time',
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch bill summary from cache or summary API
 */
async function fetchBillSummary(
  billId: string
): Promise<{ text: string; title: string; number: string } | null> {
  try {
    // Try cache first
    const cached = await BillSummaryCache.getSummary(billId);
    if (cached) {
      return {
        text: cached.summary || cached.whatItDoes || '',
        title: cached.title,
        number: billId,
      };
    }

    // Fallback: fetch from summary API
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/bill/${billId}/summary`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.summary) {
      return {
        text: data.summary.summary || data.summary.whatItDoes || '',
        title: data.summary.title || '',
        number: billId,
      };
    }

    return null;
  } catch (error) {
    logger.warn('Failed to fetch bill summary for impact analysis', {
      billId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Fetch district economic profile from existing API
 */
async function fetchEconomicProfile(districtId: string): Promise<EconomicProfile> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/districts/${districtId}/economic-profile`, {
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.economic) {
        return data.economic;
      }
    }
  } catch (error) {
    logger.warn('Failed to fetch economic profile', {
      districtId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Return zero values on failure
  return {
    employment: {
      unemploymentRate: 0,
      laborForceParticipation: 0,
      jobGrowthRate: 0,
      majorIndustries: [],
      averageWage: 0,
    },
    infrastructure: {
      bridgeConditionRating: 0,
      highwayFunding: 0,
      broadbandAvailability: 0,
      publicTransitAccessibility: 0,
    },
    connectivity: {
      fiberAvailability: 0,
      averageDownloadSpeed: 0,
      averageUploadSpeed: 0,
      digitalDivideIndex: 0,
    },
  };
}

/**
 * Fetch district government spending data from existing API
 */
async function fetchGovernmentSpending(districtId: string): Promise<GovernmentServicesProfile> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/districts/${districtId}/government-spending`, {
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.government) {
        return data.government;
      }
    }
  } catch (error) {
    logger.warn('Failed to fetch government spending', {
      districtId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Return zero values on failure
  return {
    federalInvestment: {
      totalAnnualSpending: 0,
      contractsAndGrants: 0,
      majorProjects: [],
      infrastructureInvestment: 0,
    },
    socialServices: {
      snapBeneficiaries: 0,
      medicaidEnrollment: 0,
      housingAssistanceUnits: 0,
      veteransServices: 0,
    },
    representation: {
      billsAffectingDistrict: [],
      federalFacilities: [],
      appropriationsSecured: 0,
    },
  };
}
