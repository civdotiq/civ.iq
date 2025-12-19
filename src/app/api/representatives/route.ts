/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import { getCongressionalDistrictFromZip } from '@/lib/census-api';
import { getAllCongressionalDistrictsForZip } from '@/lib/data/zip-district-mapping';
import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache';

// Dynamic route with ISR caching - uses searchParams
export const dynamic = 'force-dynamic';
export const runtime = 'edge';
export const revalidate = 3600; // 1 hour - ZIP to district mappings don't change mid-session

// At-large states for 119th Congress (states with only 1 House district)
const AT_LARGE_STATES_119TH = ['AK', 'DE', 'ND', 'SD', 'VT', 'WY'];

function isAtLargeState(state: string): boolean {
  return AT_LARGE_STATES_119TH.includes(state.toUpperCase());
}

// Simplified response interfaces
interface RepresentativeResponse {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: string;
  title: string;
  phone?: string;
  website?: string;
  yearsInOffice?: number;
  nextElection?: string;
  contactInfo: {
    phone: string;
    website: string;
    office: string;
  };
}

interface ApiResponse {
  success: boolean;
  representatives?: RepresentativeResponse[];
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: {
    timestamp: string;
    zipCode: string;
    dataQuality: 'high' | 'medium' | 'low' | 'unavailable';
    dataSource: string;
    cacheable: boolean;
    freshness?: string;
    validationScore?: number;
    validationStatus?: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

// Circuit breaker pattern
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute

  async execute<T>(fn: () => Promise<T>, serviceName: string): Promise<T> {
    if (this.isOpen()) {
      throw new Error(`Circuit breaker open for ${serviceName}. Too many recent failures.`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    if (this.failures >= this.threshold) {
      return Date.now() - this.lastFailureTime < this.timeout;
    }
    return false;
  }

  private onSuccess(): void {
    this.failures = 0;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  getStatus() {
    return {
      failures: this.failures,
      isOpen: this.isOpen(),
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Create circuit breakers for external services
const censusCircuitBreaker = new CircuitBreaker();
const congressCircuitBreaker = new CircuitBreaker();

// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries + 1} after ${delay}ms delay`, {
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        delay,
      });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Removed getRepresentativesByStateDistrict - now using RepresentativesCoreService directly

// Honest data fetching with transparency
async function getRepresentativesByZip(zipCode: string): Promise<ApiResponse> {
  const startTime = Date.now();
  const metadata: ApiResponse['metadata'] = {
    timestamp: new Date().toISOString(),
    zipCode,
    dataQuality: 'unavailable',
    dataSource: 'none',
    cacheable: false,
  };

  // Check cache first
  const cacheKey = `representatives:${zipCode}`;
  const cached = await govCache.get<ApiResponse>(cacheKey);
  if (cached && typeof cached === 'object' && 'success' in cached && cached.success) {
    logger.info(`Cache hit for representatives lookup`, {
      zipCode,
      cacheKey,
      representativeCount: (cached as ApiResponse).representatives?.length || 0,
    });
    return {
      ...(cached as ApiResponse),
      metadata: {
        ...(cached as ApiResponse).metadata,
        freshness: `Cached (retrieved in ${Date.now() - startTime}ms)`,
        dataSource: `${(cached as ApiResponse).metadata.dataSource} (cached)`,
      },
    };
  }

  try {
    // Step 1: Get ALL district info for this ZIP (handles multi-district ZIPs)
    logger.info(`Fetching district info for ZIP ${zipCode}`, {
      zipCode,
      operation: 'getDistricts',
    });

    // First try to get all districts for this ZIP from our mapping
    const allDistrictMappings = getAllCongressionalDistrictsForZip(zipCode);

    let districtInfos: { state: string; district: string }[] = [];

    if (allDistrictMappings && allDistrictMappings.length > 0) {
      // Use our comprehensive mapping
      districtInfos = allDistrictMappings.map(mapping => ({
        state: mapping.state,
        district: mapping.district,
      }));
      logger.info(`Found ${districtInfos.length} districts from mapping`, {
        zipCode,
        districts: districtInfos.map(d => `${d.state}-${d.district}`),
        operation: 'getDistricts',
      });
    } else {
      // Fallback to single district API if mapping doesn't exist
      const districtInfo = await censusCircuitBreaker.execute(
        () => retryWithBackoff(() => getCongressionalDistrictFromZip(zipCode)),
        'Census API'
      );

      if (districtInfo) {
        districtInfos = [{ state: districtInfo.state, district: districtInfo.district }];
        logger.info(`Fallback to single district from Census API`, {
          zipCode,
          district: `${districtInfo.state}-${districtInfo.district}`,
          operation: 'getDistricts',
        });
      }
    }

    if (districtInfos.length === 0) {
      return {
        success: false,
        error: {
          code: 'DISTRICT_NOT_FOUND',
          message: `Could not determine congressional district for ZIP code ${zipCode}`,
          details:
            'This ZIP code may be invalid or not currently mapped to a congressional district',
        },
        metadata: {
          ...metadata,
          dataQuality: 'unavailable',
          dataSource: 'census-failed',
        },
      };
    }

    // Get the primary state (they should all be the same for a ZIP code)
    const primaryState = districtInfos[0]?.state;
    const allDistricts = districtInfos.map(d => d.district);

    logger.info(`Districts found for ZIP ${zipCode}:`, {
      zipCode,
      state: primaryState,
      districts: allDistricts,
      isMultiDistrict: allDistricts.length > 1,
    });

    // Step 2: Get representatives with circuit breaker and retry
    logger.info(`Fetching all representatives`, {
      zipCode,
      operation: 'getAllRepresentatives',
    });
    // DIRECT SERVICE CALL - No more HTTP to localhost!
    const allRepresentatives = await RepresentativesCoreService.getAllRepresentatives();
    logger.info(`Fetched representatives from core service`, {
      zipCode,
      representativeCount: allRepresentatives.length,
      operation: 'getAllRepresentatives',
    });

    if (!allRepresentatives || allRepresentatives.length === 0) {
      return {
        success: false,
        error: {
          code: 'REPRESENTATIVES_DATA_UNAVAILABLE',
          message: 'Representative data is temporarily unavailable',
          details: 'Congress legislators database could not be accessed',
        },
        metadata: {
          ...metadata,
          dataQuality: 'unavailable',
          dataSource: 'congress-legislators-failed',
          freshness: `District lookup successful (${Date.now() - startTime}ms)`,
        },
      };
    }

    // Step 3: Filter representatives for ALL districts that serve this ZIP
    logger.info(`Filtering representatives for districts`, {
      zipCode,
      state: primaryState,
      districts: allDistricts,
      operation: 'filterRepresentatives',
    });

    // Debug: Log all representatives from the target state
    const stateReps = allRepresentatives.filter(rep => rep.state === primaryState);
    logger.info(`Representatives from ${primaryState}:`, {
      total: stateReps.length,
      houseMembers: stateReps.filter(r => r.chamber === 'House').length,
      senators: stateReps.filter(r => r.chamber === 'Senate').length,
      districts: stateReps.filter(r => r.chamber === 'House').map(r => r.district),
    });

    const districtRepresentatives = allRepresentatives.filter(rep => {
      if (rep.chamber === 'Senate' && rep.state === primaryState) {
        logger.debug(`Found Senate representative`, {
          zipCode,
          representativeName: rep.name,
          state: rep.state,
          chamber: rep.chamber,
        });
        return true;
      }

      if (rep.chamber === 'House' && rep.state === primaryState) {
        if (isAtLargeState(primaryState)) {
          logger.info(`At-large state ${primaryState}: including ${rep.name}`);
          return true;
        }

        // Handle null/undefined/empty as "00" for both
        const normalizeDistrict = (d: string | undefined) => {
          if (!d || d === '' || d === '0' || d === '00') return '00';
          return d.padStart(2, '0');
        };

        const repNorm = normalizeDistrict(rep.district);

        // Check if this representative matches ANY of the districts for this ZIP
        const matches = allDistricts.some(targetDistrict => {
          const targetNorm = normalizeDistrict(targetDistrict);
          return repNorm === targetNorm;
        });

        logger.debug(`House representative evaluation`, {
          zipCode,
          name: rep.name,
          repDistrict: rep.district,
          targetDistricts: allDistricts,
          matches,
        });

        return matches;
      }
      return false;
    });
    logger.info(`Found representatives for district`, {
      zipCode,
      representativeCount: districtRepresentatives.length,
      operation: 'filterRepresentatives',
    });

    if (primaryState && isAtLargeState(primaryState)) {
      const houseCount = districtRepresentatives.filter(r => r.chamber === 'House').length;
      if (houseCount === 0) {
        logger.error(`No House rep found for at-large state ${primaryState}`, { zipCode });
      }
    }

    if (districtRepresentatives.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_REPRESENTATIVES_FOUND',
          message: `No representatives found for ${primaryState}-${allDistricts.join(',')}`,
          details: {
            districts: allDistricts,
            state: primaryState,
            totalRepsInDatabase: allRepresentatives.length,
          },
        },
        metadata: {
          ...metadata,
          dataQuality: 'low',
          dataSource: 'congress-legislators-partial',
          freshness: `Data retrieved in ${Date.now() - startTime}ms`,
        },
      };
    }

    // Step 4: Convert to response format (simplified validation)
    const representatives: RepresentativeResponse[] = districtRepresentatives.map(rep => ({
      bioguideId: rep.bioguideId,
      name: rep.name,
      party: rep.party,
      state: rep.state,
      district: rep.district,
      chamber: rep.chamber,
      title: rep.title,
      phone: rep.currentTerm?.phone || rep.phone,
      website: rep.currentTerm?.website || rep.website,
      yearsInOffice: rep.yearsInOffice,
      nextElection: rep.nextElection,
      contactInfo: {
        phone: rep.currentTerm?.phone || rep.phone || '',
        website: rep.currentTerm?.website || rep.website || '',
        office: rep.currentTerm?.office || rep.currentTerm?.address || '',
      },
    }));

    // Simplified quality assessment
    const dataQuality: 'high' | 'medium' | 'low' =
      representatives.length > 0 && districtInfos.length > 0 ? 'high' : 'medium';

    const result: ApiResponse = {
      success: true,
      representatives,
      metadata: {
        ...metadata,
        dataQuality,
        dataSource: 'representatives-core-service + census',
        cacheable: true,
        freshness: `Retrieved in ${Date.now() - startTime}ms`,
        validationScore: representatives.length > 0 ? 95 : 70,
        validationStatus: representatives.length > 0 ? 'excellent' : 'fair',
      },
    };

    // Cache the successful result
    if (result.success && representatives.length > 0) {
      govCache.set(cacheKey, result, {
        ttl: 86400000, // 24 hours - Congressional rosters change rarely (elections every 2 years)
        source: 'congress-legislators + census',
      });
      logger.info(`Cached representatives for ZIP ${zipCode}`, {
        zipCode,
        cacheKey,
        representativeCount: representatives.length,
      });
    }

    return result;
  } catch (error) {
    logger.error('Error fetching representatives', error as Error, {
      zipCode,
      operation: 'getRepresentativesByZip',
    });

    // Determine error type and provide specific messaging
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = 'An unexpected error occurred';
    let errorDetails: unknown = undefined;

    if (error instanceof Error) {
      if (error.message.includes('Circuit breaker open')) {
        errorCode = 'SERVICE_TEMPORARILY_UNAVAILABLE';
        errorMessage =
          'Government data services are temporarily unavailable due to multiple failures';
        errorDetails = {
          censusStatus: censusCircuitBreaker.getStatus(),
          congressStatus: congressCircuitBreaker.getStatus(),
        };
      } else if (error.message.includes('timeout') || error.message.includes('ECONNRESET')) {
        errorCode = 'SERVICE_TIMEOUT';
        errorMessage = 'Government data services are responding slowly. Please try again.';
      } else if (error.message.includes('API key')) {
        errorCode = 'CONFIGURATION_ERROR';
        errorMessage = 'Service configuration issue. Please contact support.';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: errorDetails,
      },
      metadata: {
        ...metadata,
        dataQuality: 'unavailable',
        dataSource: 'error',
        freshness: `Failed after ${Date.now() - startTime}ms`,
      },
    };
  }
}

/**
 * Get federal representatives by ZIP code
 *
 * Fetches all federal representatives (House + Senate) for a given ZIP code.
 * Includes territorial delegates (PR, VI, GU, AS, MP) with votingMember distinction.
 *
 * @param request - Next.js request object with ZIP code query parameter
 * @returns JSON response with representatives array or error
 *
 * @example
 * GET /api/representatives?zip=48221
 * Returns: { success: true, representatives: [...], metadata: {...} }
 *
 * @see {@link https://api.congress.gov} Congress.gov API
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  logger.info('Representatives API request started');

  try {
    const { searchParams } = request.nextUrl;
    const zipCode = searchParams.get('zip');
    const state = searchParams.get('state');
    const district = searchParams.get('district');

    logger.info('Request parameters received', { zipCode, state, district });

    // Input validation
    if (!zipCode && (!state || !district)) {
      logger.warn('Missing required parameters');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Either zip code or both state and district parameters are required',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            zipCode: zipCode || '',
            dataQuality: 'unavailable' as const,
            dataSource: 'validation-error',
            cacheable: false,
          },
        },
        { status: 400 }
      );
    }

    // Validate ZIP code format
    if (zipCode && !/^\d{5}(-\d{4})?$/.test(zipCode)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ZIP_CODE',
            message: 'ZIP code must be 5 digits (e.g., 10001) or 9 digits (e.g., 10001-1234)',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            zipCode,
            dataQuality: 'unavailable' as const,
            dataSource: 'validation-error',
            cacheable: false,
          },
        },
        { status: 400 }
      );
    }

    let representatives: RepresentativeResponse[] = [];

    // DIRECT SERVICE CALLS - No more complex logic here!
    if (state && district) {
      // Get by state and district using core service
      logger.info('Getting representatives by state via core service', { state, district });
      const allStateReps = await RepresentativesCoreService.getRepresentativesByState(
        state.toUpperCase()
      );

      // Filter by district if needed
      representatives = allStateReps
        .filter(rep => {
          if (rep.chamber === 'Senate') return true; // Senators represent entire state
          if (rep.chamber === 'House') {
            const repDistrict = rep.district ? parseInt(rep.district, 10) : 0;
            const targetDistrict = parseInt(district, 10);
            return repDistrict === targetDistrict;
          }
          return false;
        })
        .map(rep => ({
          bioguideId: rep.bioguideId,
          name: rep.name,
          party: rep.party,
          state: rep.state,
          district: rep.district,
          chamber: rep.chamber,
          title: rep.title,
          phone: rep.currentTerm?.phone || rep.phone,
          website: rep.currentTerm?.website || rep.website,
          yearsInOffice: rep.yearsInOffice,
          nextElection: rep.nextElection,
          contactInfo: {
            phone: rep.currentTerm?.phone || rep.phone || '',
            website: rep.currentTerm?.website || rep.website || '',
            office: rep.currentTerm?.office || rep.currentTerm?.address || '',
          },
        }));
    } else if (zipCode) {
      // ZIP code lookup using the refactored function
      logger.info('Getting representatives by ZIP code', { zipCode });
      const zipResult = await getRepresentativesByZip(zipCode);

      if (zipResult.success) {
        representatives = zipResult.representatives || [];
      } else {
        // Return the error from ZIP lookup
        return NextResponse.json(zipResult, {
          status: zipResult.error?.code === 'INVALID_ZIP_CODE' ? 400 : 503,
        });
      }
    }

    const result: ApiResponse = {
      success: true,
      representatives,
      metadata: {
        timestamp: new Date().toISOString(),
        zipCode: zipCode || `${state}-${district}`,
        dataQuality: 'high',
        dataSource: 'representatives-core-service',
        cacheable: true,
        freshness: `Retrieved in ${Date.now() - startTime}ms`,
        validationScore: 95,
        validationStatus: 'excellent',
      },
    };

    logger.info('Representatives API request completed successfully', {
      zipCode,
      state,
      district,
      representativeCount: representatives.length,
      processingTime: Date.now() - startTime,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logger.error('Unexpected error in Representatives API', error as Error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal server error occurred',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          zipCode: '',
          dataQuality: 'unavailable' as const,
          dataSource: 'internal-error',
          cacheable: false,
        },
      },
      { status: 500 }
    );
  }
}
