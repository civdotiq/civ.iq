/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * EMERGENCY HOTFIX: Simplified finance API route to restore production functionality
 * This is a minimal implementation to get the API working again
 * Full implementation to be restored from git history
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;

  try {
    logger.info('[Finance API] Emergency endpoint called', { bioguideId });

    // TEMPORARY: Return empty finance data structure to prevent frontend crashes
    // This maintains the API contract while we restore the full implementation
    const response = {
      totalRaised: 0,
      totalSpent: 0,
      cashOnHand: 0,
      individualContributions: 0,
      pacContributions: 0,
      partyContributions: 0,
      candidateContributions: 0,
      
      industryBreakdown: [],
      geographicBreakdown: [],
      
      dataQuality: {
        industry: {
          totalContributionsAnalyzed: 0,
          contributionsWithEmployer: 0,
          completenessPercentage: 0,
        },
        geography: {
          totalContributionsAnalyzed: 0,
          contributionsWithState: 0,
          completenessPercentage: 0,
        },
        overallDataConfidence: 'low' as const,
      },
      
      candidateId: '',
      cycle: 2024,
      lastUpdated: new Date().toISOString(),
      fecDataSources: {
        financialSummary: 'Emergency hotfix - data unavailable',
        contributions: 'Emergency hotfix - data unavailable',
      },
      
      metadata: {
        note: 'EMERGENCY HOTFIX: Finance API temporarily returning empty data to restore production stability',
        bioguideId,
      },
    };

    logger.warn('[Finance API] Returning emergency empty response', { bioguideId });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('[Finance API] Emergency endpoint error', error as Error, { bioguideId });
    
    return NextResponse.json(
      { error: 'Finance API temporarily unavailable' },
      { status: 503 }
    );
  }
}
