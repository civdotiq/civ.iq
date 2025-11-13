/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Expenditure Categories Analysis API Route
 * Provides OpenSecrets-style spending breakdown
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { bioguideToFECMapping } from '@/lib/data/bioguide-fec-mapping';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { govCache } from '@/services/cache';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;

interface ExpenditureAnalysisResponse {
  totalDisbursements: number;
  expenditureCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
    description: string;
  }>;
  operatingExpenses: {
    total: number;
    breakdown: Array<{
      type: string;
      amount: number;
      percentage: number;
    }>;
  };
  dataAvailability: {
    hasDetailedData: boolean;
    dataSource: string;
    limitation: string;
  };
  metadata: {
    bioguideId: string;
    cycle: number;
    lastUpdated: string;
    fecTransparencyLink: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const startTime = Date.now();

  try {
    logger.info('[Expenditures API] Called', { bioguideId });

    const cacheKey = `finance-expenditures:${bioguideId}:2024`;
    const cached = await govCache.get<ExpenditureAnalysisResponse>(cacheKey);

    if (cached) {
      return NextResponse.json(cached);
    }

    const fecMapping = bioguideToFECMapping[bioguideId];
    if (!fecMapping) {
      return NextResponse.json({
        totalDisbursements: 0,
        expenditureCategories: [],
        operatingExpenses: {
          total: 0,
          breakdown: [],
        },
        dataAvailability: {
          hasDetailedData: false,
          dataSource: 'None',
          limitation: 'No FEC mapping available',
        },
        metadata: {
          bioguideId,
          cycle: 2024,
          lastUpdated: new Date().toISOString(),
          fecTransparencyLink: '',
        },
      });
    }

    const financialSummary = await fecApiService.getFinancialSummary(fecMapping.fecId, 2024);

    if (!financialSummary) {
      return NextResponse.json({
        totalDisbursements: 0,
        expenditureCategories: [],
        operatingExpenses: {
          total: 0,
          breakdown: [],
        },
        dataAvailability: {
          hasDetailedData: false,
          dataSource: 'FEC.gov',
          limitation: 'No financial data available for 2024 cycle',
        },
        metadata: {
          bioguideId,
          cycle: 2024,
          lastUpdated: new Date().toISOString(),
          fecTransparencyLink: `https://www.fec.gov/data/candidate/${fecMapping.fecId}`,
        },
      });
    }

    const totalDisbursements =
      financialSummary.disbursements || financialSummary.total_disbursements || 0;

    const response: ExpenditureAnalysisResponse = {
      totalDisbursements,
      expenditureCategories: [
        {
          category: 'Operating Expenses',
          amount: totalDisbursements,
          percentage: 100,
          description: 'Total campaign disbursements as reported to FEC',
        },
      ],
      operatingExpenses: {
        total: totalDisbursements,
        breakdown: [
          {
            type: 'Campaign Operations',
            amount: totalDisbursements,
            percentage: 100,
          },
        ],
      },
      dataAvailability: {
        hasDetailedData: false,
        dataSource: 'FEC.gov Financial Summary',
        limitation: 'Detailed expenditure breakdown requires Schedule B data analysis',
      },
      metadata: {
        bioguideId,
        cycle: 2024,
        lastUpdated: new Date().toISOString(),
        fecTransparencyLink: `https://www.fec.gov/data/candidate/${fecMapping.fecId}`,
      },
    };

    await govCache.set(cacheKey, response, {
      ttl: 21600000,
      source: 'fec-api',
      dataType: 'finance',
    });

    logger.info('[Expenditures API] Success', {
      bioguideId,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('[Expenditures API] Error', error as Error, { bioguideId });
    return NextResponse.json({ error: 'Failed to fetch expenditure analysis' }, { status: 500 });
  }
}
