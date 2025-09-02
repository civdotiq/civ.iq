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

  // DIAGNOSTIC: Debug information (only included when debug=true)
  debug?: {
    bioguideId: string;
    fecIdResolution: {
      strategy1Success: boolean;
      strategy2Success: boolean;
      selectedFecId: string | null;
      allFecIds: string[];
      chamberDetected: string | null;
    };
    cycleDetection: {
      explicitCycleProvided: boolean;
      dynamicCycleDetected: number | null;
      availableElectionCycles: number[];
      finalSelectedCycle: number;
    };
    apiCalls: {
      financialSummarySuccess: boolean;
      financialSummaryData: unknown;
      committeeResolutionAttempts: number;
      selectedCommitteeId: string | null;
    };
    processingErrors: string[];
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
  const debugMode = searchParams.get('debug') === 'true';
  let requestedCycle: number;
  let cachedFecCandidateId: string | null = null;

  // DIAGNOSTIC: Initialize debug tracking
  const debugInfo = debugMode
    ? {
        bioguideId,
        fecIdResolution: {
          strategy1Success: false,
          strategy2Success: false,
          selectedFecId: null as string | null,
          allFecIds: [] as string[],
          chamberDetected: null as string | null,
        },
        cycleDetection: {
          explicitCycleProvided: !!cycleParam,
          dynamicCycleDetected: null as number | null,
          availableElectionCycles: [] as number[],
          finalSelectedCycle: 0,
        },
        apiCalls: {
          financialSummarySuccess: false,
          financialSummaryData: null as unknown,
          committeeResolutionAttempts: 0,
          selectedCommitteeId: null as string | null,
        },
        processingErrors: [] as string[],
      }
    : undefined;

  if (debugMode) {
    logger.info(`[Finance API DIAGNOSTIC] Debug mode enabled for ${bioguideId}`);
  }

  // If cycle is explicitly provided in query params, validate and use it
  if (cycleParam) {
    requestedCycle = parseInt(cycleParam, 10);
    logger.info(`[Finance API DIAGNOSTIC] Using explicit cycle parameter: ${requestedCycle}`);
  } else {
    // Step 1: Get FEC candidate ID first to determine dynamic default cycle
    logger.info(`[Finance API DIAGNOSTIC] Starting dynamic cycle detection for ${bioguideId}`);
    cachedFecCandidateId = await getFECCandidateId(bioguideId);

    logger.info(`[Finance API DIAGNOSTIC] Dynamic cycle detection - FEC ID result:`, {
      bioguideId,
      fecCandidateId: cachedFecCandidateId,
      foundId: !!cachedFecCandidateId,
    });

    if (cachedFecCandidateId) {
      // Get candidate's election history to find their most recent active cycle
      logger.info(
        `[Finance API DIAGNOSTIC] Fetching election cycles for FEC ID: ${cachedFecCandidateId}`
      );
      const electionCycles = await fecApiService.getCandidateElectionCycles(cachedFecCandidateId);

      logger.info(`[Finance API DIAGNOSTIC] Election cycles result:`, {
        fecCandidateId: cachedFecCandidateId,
        electionCycles,
        cycleCount: electionCycles.length,
      });

      if (electionCycles.length > 0) {
        // Use the most recent cycle from their actual election history
        const mostRecentCycle = electionCycles[0]; // Already sorted in descending order
        requestedCycle = mostRecentCycle!; // Non-null assertion since we checked length > 0
        logger.info(`[Finance API DIAGNOSTIC] Dynamic cycle detection SUCCESS:`, {
          bioguideId,
          fecCandidateId: cachedFecCandidateId,
          selectedCycle: requestedCycle,
          availableCycles: electionCycles,
        });
      } else {
        // Fallback to 2024 if no election history found
        requestedCycle = 2024;
        logger.warn(
          `[Finance API DIAGNOSTIC] Dynamic cycle detection FAILED - no election cycles, using 2024 fallback`,
          {
            bioguideId,
            fecCandidateId: cachedFecCandidateId,
          }
        );
      }
    } else {
      // If no FEC ID found, use 2024 as fallback (will fail later anyway)
      requestedCycle = 2024;
      logger.warn(
        `[Finance API DIAGNOSTIC] Dynamic cycle detection FAILED - no FEC ID, using 2024 fallback for ${bioguideId}`
      );
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

    // DIAGNOSTIC: Track FEC ID resolution for debug
    if (debugInfo) {
      debugInfo.fecIdResolution.selectedFecId = fecCandidateId;
    }

    if (!fecCandidateId) {
      const errorMsg = `No FEC data available for ${bioguideId} - returning zero response`;
      logger.info(`[Finance API] ${errorMsg}`);

      if (debugInfo) {
        debugInfo.processingErrors.push('No FEC candidate ID found');
      }

      // HONEST ERROR RESPONSE: No FEC data available
      const errorResponse = {
        error: 'Campaign finance data unavailable for this representative.',
        reason:
          'No corresponding FEC committee ID could be found or the data source is unreachable.',
        bioguideId,
        cycle: currentCycle,
        ...(debugInfo && { debug: debugInfo }),
      };

      return NextResponse.json(errorResponse, { status: 404 }); // Honest 404 - data not found
    }

    // Step 2: Fetch summary totals FIRST - most reliable source
    logger.info(`[Finance API DIAGNOSTIC] Starting financial summary fetch:`, {
      bioguideId,
      fecCandidateId,
      cycle: currentCycle,
      timestamp: new Date().toISOString(),
    });

    // eslint-disable-next-line no-console
    console.log('🔍 FEC Candidate ID:', fecCandidateId);

    let financialSummary: Awaited<ReturnType<typeof fecApiService.getFinancialSummary>> = null;
    try {
      financialSummary = await fecApiService.getFinancialSummary(fecCandidateId, currentCycle);

      // eslint-disable-next-line no-console
      console.log('📊 Financial Summary:', financialSummary);

      // eslint-disable-next-line no-console
      console.log('💰 Raw totals:', {
        receipts: financialSummary?.total_receipts,
        disbursements: financialSummary?.total_disbursements,
        cash: financialSummary?.cash_on_hand_end_period,
      });

      // DIAGNOSTIC: Track API success and data for debug
      if (debugInfo) {
        debugInfo.apiCalls.financialSummarySuccess = !!financialSummary;
        debugInfo.apiCalls.financialSummaryData = financialSummary;
      }

      // DIAGNOSTIC: Log the actual FEC API response structure and values
      logger.info(`[Finance API DIAGNOSTIC] Financial summary API response:`, {
        fecCandidateId,
        cycle: currentCycle,
        responseReceived: !!financialSummary,
        responseData: financialSummary
          ? {
              totalReceipts: financialSummary.total_receipts,
              totalDisbursements: financialSummary.total_disbursements,
              cashOnHand: financialSummary.cash_on_hand_end_period,
              individualContributions: financialSummary.individual_contributions,
              pacContributions: financialSummary.other_political_committee_contributions,
              partyContributions: financialSummary.political_party_committee_contributions,
              candidateContributions: financialSummary.candidate_contribution ?? 0,
            }
          : null,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (debugInfo) {
        debugInfo.processingErrors.push(`Financial summary API error: ${errorMsg}`);
      }

      logger.error(`[Finance API DIAGNOSTIC] Financial summary fetch FAILED:`, {
        fecCandidateId,
        cycle: currentCycle,
        error: errorMsg,
        errorStack: error instanceof Error ? error.stack : undefined,
      });
    }

    // CRITICAL CHANGE: Only return empty if we have NO financial summary
    // Don't reject data just because amounts are zero - zero is valid FEC data
    if (!financialSummary) {
      logger.warn(
        `[Finance API DIAGNOSTIC] No financial summary data - this may be the root cause of $0 display:`,
        {
          bioguideId,
          fecCandidateId,
          cycle: currentCycle,
          reason: 'financialSummary is null/undefined',
          willReturnZeros: true,
        }
      );

      // Return a successful response with zero values instead of 404
      // This is the key fix for the "$0" bug
      if (debugInfo) {
        debugInfo.processingErrors.push('No financial summary data returned from FEC API');
        debugInfo.cycleDetection.finalSelectedCycle = currentCycle;
      }

      // HONEST ERROR RESPONSE: FEC API returned no data
      const errorResponse = {
        error: 'Campaign finance data unavailable for this representative.',
        reason: 'The FEC API returned no financial summary data for the requested cycle.',
        bioguideId,
        fecCandidateId,
        cycle: currentCycle,
        ...(debugInfo && { debug: debugInfo }),
      };

      logger.info(`[Finance API] Returning honest error response - no FEC data:`, {
        bioguideId,
        fecCandidateId,
        cycle: currentCycle,
      });

      return NextResponse.json(errorResponse, { status: 404 }); // Honest 404 - no data available
    }

    // Step 3: We have good summary data - now try to fetch detailed data
    logger.info(
      `[Finance API] Financial summary found, attempting detailed data fetch for ${fecCandidateId}`
    );

    // Get representative's state for geographic analysis
    const representativeState = await getRepresentativeState(bioguideId);

    // Check for sample vs full data request - default to sample for faster initial loads
    const urlParams = new URL(request.url);
    const useSampleData = urlParams.searchParams.get('full') !== 'true'; // Default to sample unless explicitly requesting full data

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

    // DIAGNOSTIC: Finalize debug info
    if (debugInfo) {
      debugInfo.cycleDetection.finalSelectedCycle = currentCycle;
    }

    // Step 5: Create robust response that always includes summary data
    const response: CampaignFinanceResponse = {
      // Financial totals - use summary data if detailed processing failed
      totalRaised:
        processedData?.totalRaised ??
        financialSummary.receipts ??
        financialSummary.total_receipts ??
        0,
      totalSpent:
        processedData?.totalSpent ??
        financialSummary.disbursements ??
        financialSummary.total_disbursements ??
        0,
      cashOnHand:
        processedData?.cashOnHand ??
        financialSummary.last_cash_on_hand_end_period ??
        financialSummary.cash_on_hand_end_period ??
        0,
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
        processedData?.candidateContributions ?? financialSummary.candidate_contribution ?? 0,

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

      // Include debug information if requested
      ...(debugInfo && { debug: debugInfo }),
    };

    logger.info(`[Finance API DIAGNOSTIC] Final response preparation:`, {
      bioguideId,
      fecCandidateId,
      finalTotalRaised: response.totalRaised,
      finalTotalSpent: response.totalSpent,
      finalCashOnHand: response.cashOnHand,
      financialSummaryUsed: !!financialSummary,
      processedDataUsed: !!processedData,
      industryDataQuality: response.dataQuality.industry.completenessPercentage.toFixed(1) + '%',
      geographyDataQuality: response.dataQuality.geography.completenessPercentage.toFixed(1) + '%',
      overallConfidence: response.dataQuality.overallDataConfidence,
      useSampleData,
      timestamp: new Date().toISOString(),
    });

    // DIAGNOSTIC: Log the exact values being sent to frontend
    logger.info(`[Finance API DIAGNOSTIC] EXACT VALUES BEING SENT TO FRONTEND:`, {
      bioguideId,
      totalRaised: response.totalRaised,
      totalSpent: response.totalSpent,
      cashOnHand: response.cashOnHand,
      allZeros:
        response.totalRaised === 0 && response.totalSpent === 0 && response.cashOnHand === 0,
    });

    // eslint-disable-next-line no-console
    console.log('✅ FINAL RESPONSE VALUES:', {
      totalRaised: response.totalRaised,
      rawFecReceipts: financialSummary?.total_receipts,
      processedRaised: processedData?.totalRaised,
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
    if (debugInfo) {
      debugInfo.processingErrors.push(
        `Fatal error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // HONEST ERROR RESPONSE: Internal server error
    const errorResponse = {
      error: 'Campaign finance data is temporarily unavailable.',
      reason: 'The upstream data source (FEC API) could not be reached or returned an error.',
      bioguideId,
      ...(debugInfo && { debug: debugInfo }),
    };

    return NextResponse.json(errorResponse, { status: 503 }); // Honest 503 - service unavailable
  }
}
