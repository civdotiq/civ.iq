/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Campaign Finance API Route - FEC Data Only
 *
 * This route provides ONLY verified FEC data with full transparency
 * about data completeness and quality. NO MOCK DATA, NO FALLBACKS.
 */

import { NextRequest, NextResponse } from 'next/server';
import { bioguideToFEC } from '@/lib/data/legislator-mappings';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { aggregateFinanceData } from '@/lib/fec/finance-aggregator';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import logger from '@/lib/logging/simple-logger';

interface CampaignFinanceResponse {
  // Raw financial totals (directly from FEC)
  totalRaised: number;
  totalSpent: number;
  cashOnHand: number;
  individualContributions: number;
  pacContributions: number;
  partyContributions: number;
  candidateContributions: number;

  // Processed breakdowns (from individual contribution analysis)
  industryBreakdown: Array<{
    industry: string;
    amount: number;
    percentage: number;
    count: number;
    topEmployers: Array<{
      name: string;
      amount: number;
      count: number;
    }>;
  }>;

  geographicBreakdown: Array<{
    state: string;
    stateName: string;
    amount: number;
    percentage: number;
    count: number;
    isHomeState: boolean;
  }>;

  // CRITICAL: Data quality transparency
  dataQuality: {
    industry: {
      totalContributionsAnalyzed: number;
      contributionsWithEmployer: number;
      completenessPercentage: number;
    };
    geography: {
      totalContributionsAnalyzed: number;
      contributionsWithState: number;
      completenessPercentage: number;
    };
    overallDataConfidence: 'high' | 'medium' | 'low';
  };

  // Metadata and sources
  candidateId: string;
  cycle: number;
  lastUpdated: string;
  fecDataSources: {
    financialSummary: string;
    contributions: string;
  };
}

/**
 * Select the appropriate FEC ID based on the representative's current office
 * Senate candidates have FEC IDs starting with 'S', House candidates start with 'H'
 */
function selectOfficeAwareFecId(
  fecIds: string[],
  chamber: 'House' | 'Senate' | null
): string | null {
  if (!fecIds.length) return null;

  // If we don't know the chamber, return the first ID (fallback to original behavior)
  if (!chamber) {
    logger.warn('[Finance API] Chamber unknown, using first FEC ID as fallback');
    return fecIds[0] || null;
  }

  // Look for office-specific FEC ID
  const targetPrefix = chamber === 'Senate' ? 'S' : 'H';
  const officeSpecificId = fecIds.find(id => id.startsWith(targetPrefix));

  if (officeSpecificId) {
    logger.info(`[Finance API] Selected ${chamber} FEC ID: ${officeSpecificId}`);
    return officeSpecificId;
  }

  // If no office-specific ID found, log warning and use first ID as fallback
  logger.warn(
    `[Finance API] No ${chamber} FEC ID found in [${fecIds.join(', ')}], using first as fallback`
  );
  return fecIds[0] || null;
}

/**
 * Get FEC candidate ID for a bioguide ID
 */
async function getFECCandidateId(bioguideId: string): Promise<string | null> {
  try {
    // Get representative info to determine current office (House vs Senate)
    let currentChamber: 'House' | 'Senate' | null = null;
    try {
      const enhancedRep = await getEnhancedRepresentative(bioguideId);
      currentChamber = enhancedRep?.chamber || null;
    } catch (error) {
      logger.warn(`[Finance API] Could not determine chamber for ${bioguideId}:`, error);
    }

    // Strategy 1: Direct mapping from congress-legislators data (office-aware)
    const fecIds = await bioguideToFEC(bioguideId);
    if (fecIds.length > 0) {
      // Select FEC ID based on current office
      const officeAwareFecId = selectOfficeAwareFecId(fecIds, currentChamber);
      logger.info(
        `[Finance API] Found ${fecIds.length} FEC IDs for ${bioguideId}, selected office-aware ID: ${officeAwareFecId} (chamber: ${currentChamber})`
      );
      if (officeAwareFecId) return officeAwareFecId;
    }

    // Strategy 2: Enhanced representative lookup (office-aware)
    try {
      const enhancedRep = await getEnhancedRepresentative(bioguideId);

      if (enhancedRep?.ids?.fec && enhancedRep.ids.fec.length > 0) {
        const officeAwareFecId = selectOfficeAwareFecId(enhancedRep.ids.fec, currentChamber);
        logger.info(
          `[Finance API] Found FEC ID via enhanced lookup: ${bioguideId} -> ${officeAwareFecId} (chamber: ${currentChamber})`
        );
        if (officeAwareFecId) return officeAwareFecId;
      }
    } catch (error) {
      logger.warn(`[Finance API] Enhanced representative lookup failed for ${bioguideId}:`, error);
    }

    logger.warn(`[Finance API] No FEC mapping found for bioguide ${bioguideId}`);
    return null;
  } catch (error) {
    logger.error(`[Finance API] Error getting FEC candidate ID for ${bioguideId}:`, error);
    return null;
  }
}

/**
 * Get representative's state for geographic analysis
 */
async function getRepresentativeState(bioguideId: string): Promise<string> {
  try {
    const enhancedRep = await getEnhancedRepresentative(bioguideId);
    const state = enhancedRep?.state;

    if (state) {
      return state;
    }

    // Fallback: try to extract from other representative data
    // This is a last resort and should rarely be needed
    logger.warn(`[Finance API] Could not determine state for ${bioguideId}, using fallback`);
    return 'Unknown';
  } catch (error) {
    logger.error(`[Finance API] Error getting representative state for ${bioguideId}:`, error);
    return 'Unknown';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const { searchParams } = new URL(request.url);

  const cycleParam = searchParams.get('cycle');
  let requestedCycle: number;
  let cachedFecCandidateId: string | null = null;

  // If cycle is explicitly provided in query params, validate and use it
  if (cycleParam) {
    requestedCycle = parseInt(cycleParam, 10);
  } else {
    // Step 1: Get FEC candidate ID first to determine dynamic default cycle
    cachedFecCandidateId = await getFECCandidateId(bioguideId);

    if (cachedFecCandidateId) {
      // Get candidate's election history to find their most recent active cycle
      const electionCycles = await fecApiService.getCandidateElectionCycles(cachedFecCandidateId);

      if (electionCycles.length > 0) {
        // Use the most recent cycle from their actual election history
        const mostRecentCycle = electionCycles[0]; // Already sorted in descending order
        requestedCycle = mostRecentCycle!; // Non-null assertion since we checked length > 0
        logger.info(
          `[Finance API] Dynamic cycle detection: Using ${requestedCycle} for ${bioguideId} (FEC: ${cachedFecCandidateId})`
        );
      } else {
        // Fallback to 2024 if no election history found
        requestedCycle = 2024;
        logger.warn(
          `[Finance API] No election cycles found for ${bioguideId}, falling back to 2024`
        );
      }
    } else {
      // If no FEC ID found, use 2024 as fallback (will fail later anyway)
      requestedCycle = 2024;
    }
  }

  // Validate cycle parameter - only allow election years with actual data
  if (
    isNaN(requestedCycle) ||
    requestedCycle < 2000 ||
    requestedCycle > 2024 ||
    requestedCycle % 2 !== 0
  ) {
    return NextResponse.json(
      {
        error: 'Invalid cycle parameter. Use even-numbered election years 2000-2024.',
      },
      { status: 400 }
    );
  }

  const currentCycle = requestedCycle;

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  // Check for API key
  if (!process.env.FEC_API_KEY) {
    logger.error('[Finance API] FEC_API_KEY environment variable is not set');
    return NextResponse.json({ error: 'FEC API service unavailable' }, { status: 503 });
  }

  try {
    // Get FEC candidate ID (reuse cached value if available from dynamic cycle detection)
    const fecCandidateId = cachedFecCandidateId || (await getFECCandidateId(bioguideId));

    if (!fecCandidateId) {
      logger.info(
        `[Finance API] No FEC data available for ${bioguideId} - returning empty response`
      );
      return NextResponse.json(
        {
          error: 'No campaign finance data available',
          reason: 'Representative not found in FEC database',
          dataAvailable: false,
          bioguideId,
          lastUpdated: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Step 2: Validate candidate has data
    const candidateValidation = await fecApiService.validateCandidateData(
      fecCandidateId,
      currentCycle
    );

    if (!candidateValidation.exists) {
      logger.info(
        `[Finance API] FEC candidate ${fecCandidateId} has no data for cycle ${currentCycle}`
      );
      return NextResponse.json(
        {
          error: 'No campaign finance data available for current cycle',
          reason: 'No financial data found in FEC database for current election cycle',
          dataAvailable: false,
          bioguideId,
          fecCandidateId,
          cycle: currentCycle,
          lastUpdated: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Step 3: Get representative's state for geographic analysis
    const representativeState = await getRepresentativeState(bioguideId);

    // Step 4: Check for sample vs full data request
    const urlParams = new URL(request.url);
    const useSampleData = urlParams.searchParams.get('sample') === 'true';

    if (useSampleData) {
      logger.info(`[Finance API] Using sample data for ${fecCandidateId} (faster response)`);
    } else {
      logger.info(`[Finance API] Using full data for ${fecCandidateId} (may take longer)`);
    }

    // Step 5: Process complete finance data
    const processedData = await aggregateFinanceData(
      fecCandidateId,
      currentCycle,
      representativeState,
      useSampleData
    );

    if (!processedData) {
      logger.warn(`[Finance API] No financial data could be processed for ${fecCandidateId}`);
      return NextResponse.json(
        {
          error: 'Unable to process campaign finance data',
          reason: 'FEC data exists but could not be processed',
          dataAvailable: false,
          bioguideId,
          fecCandidateId,
          cycle: currentCycle,
          lastUpdated: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // Step 6: Return processed data with full transparency
    const response: CampaignFinanceResponse = {
      // Financial totals
      totalRaised: processedData.totalRaised,
      totalSpent: processedData.totalSpent,
      cashOnHand: processedData.cashOnHand,
      individualContributions: processedData.individualContributions,
      pacContributions: processedData.pacContributions,
      partyContributions: processedData.partyContributions,
      candidateContributions: processedData.candidateContributions,

      // Breakdowns
      industryBreakdown: processedData.industryBreakdown,
      geographicBreakdown: processedData.geographicBreakdown,

      // CRITICAL: Data quality transparency
      dataQuality: processedData.dataQuality,

      // Metadata
      candidateId: processedData.candidateId,
      cycle: processedData.cycle,
      lastUpdated: processedData.lastUpdated,
      fecDataSources: processedData.fecDataSources,
    };

    logger.info(`[Finance API] Successfully processed data for ${bioguideId}`, {
      fecCandidateId,
      totalRaised: response.totalRaised,
      industryDataQuality: response.dataQuality.industry.completenessPercentage.toFixed(1) + '%',
      geographyDataQuality: response.dataQuality.geography.completenessPercentage.toFixed(1) + '%',
      overallConfidence: response.dataQuality.overallDataConfidence,
      useSampleData,
    });

    // Add CORS headers for transparency tools
    const headers = new Headers({
      'Content-Type': 'application/json',
      'X-Data-Source': 'fec.gov',
      'X-Data-Quality': response.dataQuality.overallDataConfidence,
      'X-Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    });

    return new NextResponse(JSON.stringify(response, null, 2), {
      status: 200,
      headers,
    });
  } catch (error) {
    logger.error(`[Finance API] Error processing request for ${bioguideId}:`, error);

    // Don't expose internal error details to client
    return NextResponse.json(
      {
        error: 'Internal server error while fetching campaign finance data',
        bioguideId,
        lastUpdated: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
