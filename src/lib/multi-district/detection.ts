/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import logger from '@/lib/logging/simple-logger';

export interface DistrictInfo {
  state: string;
  district: string;
  primary?: boolean;
  confidence?: 'high' | 'medium' | 'low';
}

export interface MultiDistrictResponse {
  success: boolean;
  zipCode: string;
  isMultiDistrict: boolean;
  districts: DistrictInfo[];
  primaryDistrict?: DistrictInfo;
  representatives?: unknown[];
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

/**
 * Check if a ZIP code spans multiple congressional districts
 */
export async function checkMultiDistrict(zipCode: string): Promise<MultiDistrictResponse> {
  try {
    const response = await fetch(
      `/api/representatives-multi-district?zip=${encodeURIComponent(zipCode)}`
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: MultiDistrictResponse = await response.json();

    logger.info('Multi-district check completed', {
      zipCode,
      isMultiDistrict: data.isMultiDistrict,
      districtCount: data.districts.length,
      success: data.success,
    });

    return data;
  } catch (error) {
    logger.error('Multi-district check failed', error as Error, { zipCode });

    // Return fallback response
    return {
      success: false,
      zipCode,
      isMultiDistrict: false,
      districts: [],
      error: {
        code: 'DETECTION_FAILED',
        message: 'Unable to check multi-district status',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        dataSource: 'error',
        totalDistricts: 0,
        lookupMethod: 'fallback',
        processingTime: 0,
        coverage: {
          zipFound: false,
          representativesFound: false,
          dataQuality: 'poor',
        },
      },
    };
  }
}

/**
 * Get all districts for a ZIP code with user selection
 */
export async function getDistrictsForZip(
  zipCode: string,
  selectedDistrict?: string
): Promise<MultiDistrictResponse> {
  try {
    let url = `/api/representatives-multi-district?zip=${encodeURIComponent(zipCode)}`;

    if (selectedDistrict) {
      url += `&district=${encodeURIComponent(selectedDistrict)}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: MultiDistrictResponse = await response.json();

    logger.info('Districts retrieved for ZIP', {
      zipCode,
      selectedDistrict,
      districtCount: data.districts.length,
      representativeCount: data.representatives?.length || 0,
    });

    return data;
  } catch (error) {
    logger.error('Failed to get districts for ZIP', error as Error, {
      zipCode,
      selectedDistrict,
    });

    throw error;
  }
}

/**
 * Format district display name
 */
export function formatDistrictName(district: DistrictInfo): string {
  if (district.district === '00' || district.district === 'AL') {
    return `${district.state} At-Large`;
  }

  return `${district.state}-${district.district}`;
}

/**
 * Get display name for multiple districts
 */
export function formatMultiDistrictSummary(districts: DistrictInfo[]): string {
  if (districts.length === 0) return 'No districts found';
  if (districts.length === 1) return formatDistrictName(districts[0]);

  const stateGroups = districts.reduce(
    (acc, district) => {
      if (!acc[district.state]) {
        acc[district.state] = [];
      }
      acc[district.state].push(district.district);
      return acc;
    },
    {} as Record<string, string[]>
  );

  const stateStrings = Object.entries(stateGroups).map(([state, districtNums]) => {
    if (districtNums.length === 1) {
      return `${state}-${districtNums[0]}`;
    }
    return `${state} (${districtNums.length} districts)`;
  });

  return stateStrings.join(', ');
}

/**
 * Estimate which district is most likely for a user
 * Based on population and geographic factors
 */
export function suggestPrimaryDistrict(districts: DistrictInfo[]): DistrictInfo | null {
  if (districts.length === 0) return null;
  if (districts.length === 1) return districts[0];

  // First, check if there's already a primary district marked
  const markedPrimary = districts.find(d => d.primary === true);
  if (markedPrimary) return markedPrimary;

  // Then, prefer districts with higher confidence
  const highConfidence = districts.filter(d => d.confidence === 'high');
  if (highConfidence.length > 0) return highConfidence[0];

  // Finally, just return the first district
  return districts[0];
}

/**
 * Check if ZIP code is likely to be multi-district based on patterns
 * This is a quick client-side check before API call
 */
export function quickMultiDistrictCheck(zipCode: string): boolean {
  // Common multi-district ZIP patterns (major urban areas)
  const commonMultiDistrictPrefixes = [
    '100',
    '101',
    '102', // NYC area
    '112',
    '113',
    '114', // Queens/Brooklyn
    '900',
    '902',
    '906',
    '917', // LA area
    '606',
    '607',
    '608', // Chicago
    '770',
    '772',
    '773', // Houston
    '480',
    '481',
    '482', // Phoenix
    '191',
    '190', // Philadelphia
    '021',
    '022',
    '024', // Boston
    '200',
    '202',
    '204', // DC area
  ];

  const prefix = zipCode.substring(0, 3);
  return commonMultiDistrictPrefixes.includes(prefix);
}
