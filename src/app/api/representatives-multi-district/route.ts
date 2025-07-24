/*
 * CIV.IQ - Civic Information Hub
 * Phase 4: Multi-District ZIP Code API
 * 
 * Enhanced API endpoint that handles ZIP codes spanning multiple congressional districts
 * with comprehensive edge case handling and user-friendly responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllCongressionalDistrictsForZip, 
  getPrimaryCongressionalDistrictForZip,
  isZipMultiDistrict,
  getZipLookupMetrics,
  zipLookupService
} from '@/lib/data/zip-district-mapping';
import { getAllEnhancedRepresentatives } from '@/lib/congress-legislators';
import { getCongressionalDistrictFromZip } from '@/lib/census-api';

// Enhanced interfaces for multi-district support
interface DistrictInfo {
  state: string;
  district: string;
  primary?: boolean;
  confidence?: 'high' | 'medium' | 'low';
}

interface MultiDistrictResponse {
  success: boolean;
  zipCode: string;
  isMultiDistrict: boolean;
  districts: DistrictInfo[];
  primaryDistrict?: DistrictInfo;
  representatives?: RepresentativeResponse[];
  warnings?: string[];
  metadata: {
    timestamp: string;
    dataSource: string;
    totalDistricts: number;
    lookupMethod: 'comprehensive' | 'census-api' | 'fallback';
    processingTime: number;
    coverage: {
      zipFound: boolean;
      representativesFound: boolean;
      dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
    };
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

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

// Enhanced logging for unmapped ZIPs
class ZipLookupLogger {
  private static instance: ZipLookupLogger;
  
  static getInstance(): ZipLookupLogger {
    if (!ZipLookupLogger.instance) {
      ZipLookupLogger.instance = new ZipLookupLogger();
    }
    return ZipLookupLogger.instance;
  }

  logUnmappedZip(zipCode: string, fallbackMethod: string, userAgent?: string): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      zipCode,
      fallbackMethod,
      userAgent,
      type: 'unmapped_zip'
    };
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('🚨 Unmapped ZIP Code:', logEntry);
    }
    
    // In production, you'd send this to your logging service
    // Example: await sendToAnalytics(logEntry);
  }

  logMultiDistrictAccess(zipCode: string, districts: DistrictInfo[], userSelection?: string): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      zipCode,
      districts: districts.length,
      userSelection,
      type: 'multi_district_access'
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.info('🗺️ Multi-District ZIP Access:', logEntry);
    }
  }

  logEdgeCase(zipCode: string, caseType: 'territory' | 'dc' | 'split_state' | 'invalid', details?: unknown): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      zipCode,
      caseType,
      details,
      type: 'edge_case'
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.info('⚠️ Edge Case:', logEntry);
    }
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const logger = ZipLookupLogger.getInstance();
  const url = new URL(request.url);
  const zipCode = url.searchParams.get('zip');
  
  try {
    const preferredDistrict = url.searchParams.get('district'); // For user selection
    const userAgent = request.headers.get('user-agent');

    // Input validation
    if (!zipCode) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_ZIP_CODE',
          message: 'ZIP code parameter is required'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          dataSource: 'validation-error',
          totalDistricts: 0,
          lookupMethod: 'fallback',
          processingTime: Date.now() - startTime,
          coverage: {
            zipFound: false,
            representativesFound: false,
            dataQuality: 'poor'
          }
        }
      } as MultiDistrictResponse, { status: 400 });
    }

    // Validate ZIP code format
    const zipRegex = /^\d{5}$/;
    if (!zipRegex.test(zipCode)) {
      return NextResponse.json({
        success: false,
        zipCode,
        isMultiDistrict: false,
        districts: [],
        error: {
          code: 'INVALID_ZIP_FORMAT',
          message: 'ZIP code must be exactly 5 digits',
          details: { provided: zipCode, expected: '5-digit format (e.g., 10001)' }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          dataSource: 'validation-error',
          totalDistricts: 0,
          lookupMethod: 'fallback',
          processingTime: Date.now() - startTime,
          coverage: {
            zipFound: false,
            representativesFound: false,
            dataQuality: 'poor'
          }
        }
      } as MultiDistrictResponse, { status: 400 });
    }

    // Step 1: Check comprehensive mapping (Phase 3 integration)
    const allDistricts = getAllCongressionalDistrictsForZip(zipCode);
    const isMultiDistrict = isZipMultiDistrict(zipCode);
    const primaryDistrict = getPrimaryCongressionalDistrictForZip(zipCode);

    let districts: DistrictInfo[] = [];
    let lookupMethod: 'comprehensive' | 'census-api' | 'fallback' = 'comprehensive';
    const warnings: string[] = [];

    if (allDistricts.length > 0) {
      // Found in comprehensive mapping
      districts = allDistricts.map(d => ({
        state: d.state,
        district: d.district,
        primary: d.primary,
        confidence: 'high' as const
      }));

      // Log multi-district access
      if (isMultiDistrict) {
        logger.logMultiDistrictAccess(zipCode, districts, preferredDistrict || undefined);
        warnings.push(`This ZIP code spans ${districts.length} congressional districts. Results show the primary district.`);
      }

      // Check for edge cases
      if (districts[0].state === 'DC') {
        logger.logEdgeCase(zipCode, 'dc', { district: districts[0].district });
        warnings.push('District of Columbia has non-voting representation in Congress.');
      }
      
      if (['GU', 'PR', 'VI', 'AS', 'MP'].includes(districts[0].state)) {
        logger.logEdgeCase(zipCode, 'territory', { territory: districts[0].state });
        warnings.push('This territory has non-voting representation in Congress.');
      }

    } else {
      // Fallback to Census API
      logger.logUnmappedZip(zipCode, 'census-api', userAgent || undefined);
      lookupMethod = 'census-api';
      
      try {
        const fallbackDistrict = await getCongressionalDistrictFromZip(zipCode);
        if (fallbackDistrict) {
          districts = [{
            state: fallbackDistrict.state,
            district: fallbackDistrict.district,
            confidence: 'medium' as const
          }];
          warnings.push('ZIP code not found in comprehensive database. Using Census API fallback.');
        }
      } catch (error) {
        logger.logUnmappedZip(zipCode, 'failed', userAgent || undefined);
        lookupMethod = 'fallback';
        warnings.push('Unable to determine congressional district. ZIP code may be invalid.');
      }
    }

    // If no districts found, return error
    if (districts.length === 0) {
      return NextResponse.json({
        success: false,
        zipCode,
        isMultiDistrict: false,
        districts: [],
        warnings,
        error: {
          code: 'DISTRICT_NOT_FOUND',
          message: `Could not determine congressional district for ZIP code ${zipCode}`,
          details: 'This ZIP code may be invalid, rural, or not currently mapped to a congressional district'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          dataSource: 'comprehensive-mapping',
          totalDistricts: 0,
          lookupMethod,
          processingTime: Date.now() - startTime,
          coverage: {
            zipFound: false,
            representativesFound: false,
            dataQuality: 'poor'
          }
        }
      } as MultiDistrictResponse, { status: 404 });
    }

    // Step 2: Get representatives for all districts
    const allRepresentatives = await getAllEnhancedRepresentatives();
    const representatives: RepresentativeResponse[] = [];

    for (const district of districts) {
      // Get House representative for this district
      const houseRep = allRepresentatives.find(rep => 
        rep.chamber === 'House' && 
        rep.state === district.state && 
        rep.district === district.district
      );

      if (houseRep) {
        representatives.push({
          bioguideId: houseRep.bioguideId,
          name: houseRep.name,
          party: houseRep.party,
          state: houseRep.state,
          district: houseRep.district,
          chamber: houseRep.chamber,
          title: houseRep.title,
          phone: houseRep.phone,
          website: houseRep.website,
          contactInfo: {
            phone: houseRep.phone || '',
            website: houseRep.website || '',
            office: (houseRep as any).office || ''
          }
        });
      }

      // Get Senate representatives for this state (only add once)
      if (district.primary !== false) { // Only add senators for primary district
        const senateReps = allRepresentatives.filter(rep => 
          rep.chamber === 'Senate' && rep.state === district.state
        );

        for (const senateRep of senateReps) {
          representatives.push({
            bioguideId: senateRep.bioguideId,
            name: senateRep.name,
            party: senateRep.party,
            state: senateRep.state,
            chamber: senateRep.chamber,
            title: senateRep.title,
            phone: senateRep.phone,
            website: senateRep.website,
            contactInfo: {
              phone: senateRep.phone || '',
              website: senateRep.website || '',
              office: (senateRep as any).office || ''
            }
          });
        }
      }
    }

    // Determine data quality
    let dataQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    if (lookupMethod === 'census-api') dataQuality = 'good';
    if (lookupMethod === 'fallback') dataQuality = 'fair';
    if (representatives.length === 0) dataQuality = 'poor';

    // Get performance metrics
    const metrics = getZipLookupMetrics();

    const response: MultiDistrictResponse = {
      success: true,
      zipCode,
      isMultiDistrict,
      districts,
      primaryDistrict: primaryDistrict ? {
        state: primaryDistrict.state,
        district: primaryDistrict.district,
        primary: primaryDistrict.primary,
        confidence: 'high' as const
      } : districts[0],
      representatives,
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata: {
        timestamp: new Date().toISOString(),
        dataSource: 'comprehensive-mapping',
        totalDistricts: districts.length,
        lookupMethod,
        processingTime: Date.now() - startTime,
        coverage: {
          zipFound: true,
          representativesFound: representatives.length > 0,
          dataQuality
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Multi-district API error:', error);
    
    return NextResponse.json({
      success: false,
      zipCode: zipCode || '',
      isMultiDistrict: false,
      districts: [],
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred while processing your request',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      metadata: {
        timestamp: new Date().toISOString(),
        dataSource: 'error',
        totalDistricts: 0,
        lookupMethod: 'fallback',
        processingTime: Date.now() - startTime,
        coverage: {
          zipFound: false,
          representativesFound: false,
          dataQuality: 'poor'
        }
      }
    } as MultiDistrictResponse, { status: 500 });
  }
}