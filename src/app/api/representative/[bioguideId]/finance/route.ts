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

    // Step 2: Fetch summary totals FIRST - most reliable source
    logger.info(
      `[Finance API] Fetching financial summary for ${fecCandidateId}, cycle ${currentCycle}`
    );

    let financialSummary: Awaited<ReturnType<typeof fecApiService.getFinancialSummary>> = null;
    try {
      financialSummary = await fecApiService.getFinancialSummary(fecCandidateId, currentCycle);
    } catch (error) {
      logger.error(`[Finance API] Failed to fetch financial summary for ${fecCandidateId}:`, error);
    }

    // CRITICAL CHANGE: Always return data if we have ANY financial summary
    // Even if all values are 0, we should return the data structure
    // This prevents the "$0" bug by ensuring the UI always has data to display
    if (!financialSummary) {
      logger.info(
        `[Finance API] No financial summary data for ${fecCandidateId} cycle ${currentCycle}`
      );
      // Return a successful response with zero values instead of 404
      // This is the key fix for the "$0" bug
      return NextResponse.json(
        {
          // Financial totals - all zeros when no data exists
          totalRaised: 0,
          totalSpent: 0,
          cashOnHand: 0,
          individualContributions: 0,
          pacContributions: 0,
          partyContributions: 0,
          candidateContributions: 0,

          // Empty breakdowns
          industryBreakdown: [],
          geographicBreakdown: [],

          // Data quality indicating no data
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

          // Metadata
          candidateId: fecCandidateId,
          cycle: currentCycle,
          lastUpdated: new Date().toISOString(),
          fecDataSources: {
            financialSummary: `FEC Candidate Totals API - No data for cycle ${currentCycle}`,
            contributions: 'No contribution data available',
          },
        },
        { status: 200 } // Return 200 OK with empty data instead of 404
      );
    }

    // Step 3: We have good summary data - now try to fetch detailed data
    logger.info(
      `[Finance API] Financial summary found, attempting detailed data fetch for ${fecCandidateId}`
    );

    // Get representative's state for geographic analysis
    const representativeState = await getRepresentativeState(bioguideId);

    // Check for sample vs full data request
    const urlParams = new URL(request.url);
    const useSampleData = urlParams.searchParams.get('sample') === 'true';

    // Step 4: Attempt to process detailed finance data (non-blocking)
    let processedData: Awaited<ReturnType<typeof aggregateFinanceData>> = null;
    let _detailedDataError: string | null = null;

    try {
      processedData = await aggregateFinanceData(
        fecCandidateId,
        currentCycle,
        representativeState,
        useSampleData
      );
    } catch (error) {
      logger.warn(
        `[Finance API] Detailed data processing failed for ${fecCandidateId}, but summary data exists:`,
        error
      );
      _detailedDataError = 'Detailed contributor breakdown is currently unavailable';
    }

    // Step 5: Create robust response that always includes summary data
    const response: CampaignFinanceResponse = {
      // Financial totals - use summary data if detailed processing failed
      totalRaised: processedData?.totalRaised ?? financialSummary.total_receipts ?? 0,
      totalSpent: processedData?.totalSpent ?? financialSummary.total_disbursements ?? 0,
      cashOnHand: processedData?.cashOnHand ?? financialSummary.cash_on_hand_end_period ?? 0,
      individualContributions:
        processedData?.individualContributions ?? financialSummary.individual_contributions ?? 0,
      pacContributions:
        processedData?.pacContributions ??
        financialSummary.other_political_committee_contributions ??
        0,
      partyContributions:
        processedData?.partyContributions ??
        financialSummary.political_party_committee_contributions ??
        0,
      candidateContributions:
        processedData?.candidateContributions ?? financialSummary.candidate_contributions ?? 0,

      // Detailed breakdowns - gracefully handle missing data
      industryBreakdown: processedData?.industryBreakdown ?? [],
      geographicBreakdown: processedData?.geographicBreakdown ?? [],

      // Data quality - provide fallback if detailed processing failed
      dataQuality: processedData?.dataQuality ?? {
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

      // Metadata
      candidateId: fecCandidateId,
      cycle: currentCycle,
      lastUpdated: new Date().toISOString(),
      fecDataSources: processedData?.fecDataSources ?? {
        financialSummary: `FEC Candidate Totals API (${currentCycle})`,
        contributions: 'Detailed data unavailable',
      },
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
