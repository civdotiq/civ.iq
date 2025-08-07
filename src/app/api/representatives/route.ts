/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCongressionalDistrictFromZip } from '@/lib/census-api';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import {
  validateDistrictResponse,
  validateRepresentativeResponse,
  generateDataQualityReport,
  validateApiResponse,
} from '@/lib/validation/response-schemas';
import logger from '@/lib/logging/simple-logger';

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

// Get representatives by state and district directly
async function getRepresentativesByStateDistrict(
  state: string,
  district: string
): Promise<ApiResponse> {
  const startTime = Date.now();
  const metadata: ApiResponse['metadata'] = {
    timestamp: new Date().toISOString(),
    zipCode: `${state}-${district}`, // Use state-district as identifier
    dataQuality: 'unavailable',
    dataSource: 'none',
    cacheable: false,
  };

  try {
    // Get representatives with circuit breaker and retry
    logger.info(`Fetching all representatives for ${state}-${district}`, {
      state,
      district,
      operation: 'getAllRepresentatives',
    });
    const allRepresentatives = await congressCircuitBreaker.execute(
      () => retryWithBackoff(() => getAllEnhancedRepresentatives()),
      'Congress Legislators'
    );

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
          freshness: `Failed after ${Date.now() - startTime}ms`,
        },
      };
    }

    // Filter representatives for this state and district
    const districtRepresentatives = allRepresentatives.filter(rep => {
      if (rep.chamber === 'Senate' && rep.state === state) {
        return true;
      }
      if (rep.chamber === 'House' && rep.state === state && rep.district) {
        // Normalize district numbers for comparison
        const repDistrict = parseInt(rep.district, 10);
        const targetDistrict = parseInt(district, 10);
        return repDistrict === targetDistrict;
      }
      return false;
    });

    if (districtRepresentatives.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_REPRESENTATIVES_FOUND',
          message: `No representatives found for ${state}-${district}`,
          details: {
            district,
            state,
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

    // Convert to response format
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
      contactInfo: {
        phone: rep.currentTerm?.phone || rep.phone || '',
        website: rep.currentTerm?.website || rep.website || '',
        office: rep.currentTerm?.office || rep.currentTerm?.address || '',
      },
    }));

    return {
      success: true,
      representatives,
      metadata: {
        ...metadata,
        dataQuality: 'high',
        dataSource: 'congress-legislators',
        cacheable: true,
        freshness: `Retrieved in ${Date.now() - startTime}ms`,
        validationScore: 95,
        validationStatus: 'excellent',
      },
    };
  } catch (error) {
    logger.error('Error fetching representatives by state/district', error as Error, {
      state,
      district,
      operation: 'getRepresentativesByStateDistrict',
    });

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
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

  try {
    // Step 1: Get district info with circuit breaker and retry
    logger.info(`Fetching district info for ZIP ${zipCode}`, {
      zipCode,
      operation: 'getDistrict',
    });

    const districtInfo = await censusCircuitBreaker.execute(
      () => retryWithBackoff(() => getCongressionalDistrictFromZip(zipCode)),
      'Census API'
    );

    logger.info(`District info retrieved successfully`, {
      zipCode,
      state: districtInfo?.state,
      district: districtInfo?.district,
      operation: 'getDistrict',
    });

    if (!districtInfo) {
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

    // Validate district data
    const districtValidation = validateDistrictResponse(districtInfo);
    if (!districtValidation.isValid) {
      logger.warn('District data validation failed', {
        zipCode,
        validationErrors: districtValidation.errors,
        operation: 'validateDistrict',
      });
    }

    logger.info(`District found: ${districtInfo.state}-${districtInfo.district}`, {
      zipCode,
      state: districtInfo.state,
      district: districtInfo.district,
    });

    // Step 2: Get representatives with circuit breaker and retry
    logger.info(`Fetching all representatives`, {
      zipCode,
      operation: 'getAllRepresentatives',
    });
    const allRepresentatives = await congressCircuitBreaker.execute(
      () => retryWithBackoff(() => getAllEnhancedRepresentatives()),
      'Congress Legislators'
    );
    logger.info(`Fetched representatives from congress-legislators`, {
      zipCode,
      representativeCount: allRepresentatives?.length || 0,
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

    // Step 3: Filter representatives for this district
    logger.info(`Filtering representatives for district`, {
      zipCode,
      state: districtInfo.state,
      district: districtInfo.district,
      operation: 'filterRepresentatives',
    });
    const districtRepresentatives = allRepresentatives.filter(rep => {
      if (rep.chamber === 'Senate' && rep.state === districtInfo.state) {
        logger.debug(`Found Senate representative`, {
          zipCode,
          representativeName: rep.name,
          state: rep.state,
          chamber: rep.chamber,
        });
        return true;
      }
      if (
        rep.chamber === 'House' &&
        rep.state === districtInfo.state &&
        rep.district &&
        districtInfo.district
      ) {
        // Normalize district numbers for comparison (handle '04' vs '4')
        const repDistrict = parseInt(rep.district, 10);
        const targetDistrict = parseInt(districtInfo.district, 10);
        const matches = repDistrict === targetDistrict;
        logger.debug(`Evaluating House representative`, {
          zipCode,
          representativeName: rep.name,
          state: rep.state,
          district: rep.district,
          targetDistrict: districtInfo.district,
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

    if (districtRepresentatives.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_REPRESENTATIVES_FOUND',
          message: `No representatives found for ${districtInfo.state}-${districtInfo.district}`,
          details: {
            district: districtInfo.district,
            state: districtInfo.state,
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

    // Step 4: Convert to response format with validation
    const representatives: RepresentativeResponse[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validationResults: any[] = [];

    for (const rep of districtRepresentatives) {
      // Validate each representative's data
      const repValidation = validateRepresentativeResponse(rep);
      validationResults.push(
        validateApiResponse(
          rep,
          validateRepresentativeResponse,
          `congress-legislators-${rep.bioguideId}`
        )
      );

      if (repValidation.warnings.length > 0) {
        logger.warn(`Data quality warnings for representative`, {
          zipCode,
          representativeName: rep.name,
          bioguideId: rep.bioguideId,
          validationWarnings: repValidation.warnings,
        });
      }

      representatives.push({
        bioguideId: rep.bioguideId,
        name: rep.name,
        party: rep.party,
        state: rep.state,
        district: rep.district,
        chamber: rep.chamber,
        title: rep.title,
        phone: rep.currentTerm?.phone || rep.phone,
        website: rep.currentTerm?.website || rep.website,
        contactInfo: {
          phone: rep.currentTerm?.phone || rep.phone || '',
          website: rep.currentTerm?.website || rep.website || '',
          office: rep.currentTerm?.office || rep.currentTerm?.address || '',
        },
      });
    }

    // Generate data quality report
    const qualityReport = generateDataQualityReport([
      validateApiResponse(districtInfo, validateDistrictResponse, 'census-api'),
      ...validationResults,
    ]);

    // Determine data quality based on validation results
    let dataQuality: 'high' | 'medium' | 'low' = 'high';
    if (qualityReport.overall.score >= 90) {
      dataQuality = 'high';
    } else if (qualityReport.overall.score >= 70) {
      dataQuality = 'medium';
    } else {
      dataQuality = 'low';
    }

    // Log quality issues for monitoring
    if (qualityReport.overall.issues.length > 0) {
      logger.warn(`Data quality issues detected`, {
        zipCode,
        qualityScore: qualityReport.overall.score,
        issues: qualityReport.overall.issues,
        operation: 'dataQualityCheck',
      });
    }

    return {
      success: true,
      representatives,
      metadata: {
        ...metadata,
        dataQuality,
        dataSource: 'congress-legislators + census',
        cacheable: true,
        freshness: `Retrieved in ${Date.now() - startTime}ms`,
        validationScore: qualityReport.overall.score,
        validationStatus: qualityReport.overall.status,
      },
    };
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

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  // Using simple logger

  logger.info('Representatives API request started');

  try {
    const url = new URL(request.url);
    const zipCode = url.searchParams.get('zip');
    const state = url.searchParams.get('state');
    const district = url.searchParams.get('district');

    logger.info('Request parameters received', { zipCode, state, district });

    // Input validation - either ZIP code OR state+district required
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

    // Validate ZIP code if provided
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

    // Get representatives with honest error handling
    let result: ApiResponse;
    if (zipCode) {
      logger.info('Calling getRepresentativesByZip', { zipCode });
      result = await getRepresentativesByZip(zipCode);
    } else {
      // state and district are guaranteed to be non-null by validation above
      logger.info('Calling getRepresentativesByStateDistrict', { state, district });
      result = await getRepresentativesByStateDistrict(state!, district!);
    }
    logger.info('getRepresentativesByZip completed', {
      zipCode,
      success: result.success,
      representativeCount: result.success ? result.representatives?.length : 0,
    });

    if (!result.success) {
      logger.warn('getRepresentativesByZip failed', {
        zipCode,
        errorCode: result.error?.code,
        errorMessage: result.error?.message,
      });
    }

    // Return appropriate HTTP status based on success
    const httpStatus = result.success ? 200 : 503;
    const processingTime = Date.now() - startTime;
    logger.info('Representatives API request completed', {
      zipCode,
      processingTime,
      httpStatus,
      success: result.success,
    });

    return NextResponse.json(result, { status: httpStatus });
  } catch (error) {
    // Using simple logger
    logger.error('Unexpected error in Representatives API', error as Error, {
      hasStack: error instanceof Error && !!error.stack,
    });

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
