/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Types for /api/representatives-multi-district (a ZIP-based API kept for
 * outside developers). The client-side ZIP checks that used to live here went
 * with the homepage's ZIP answers: a ZIP can't place anyone (Phase 4b).
 */

import type { BackboneResponse } from '@/types/backbone-response';

export interface DistrictInfo {
  state: string;
  district: string;
  primary?: boolean;
  confidence?: 'high' | 'medium' | 'low';
}

export interface MultiDistrictPayload {
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
    };
  };
}

/**
 * BackboneResponse envelope: dataQuality/sourceStatus/accuracyNote sit at
 * the top level. ZIP input is never 'complete' — the ZIP ↔ district join is
 * 10–20% wrong, so successful lookups are 'partial' with accuracyNote.
 * Presence of `error` (not a success flag) signals failure.
 */
export type MultiDistrictResponse = BackboneResponse<MultiDistrictPayload> & {
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
};

/**
 * Format district display name
 */
export function formatDistrictName(district: DistrictInfo): string {
  if (district.district === '00' || district.district === 'AL') {
    return `${district.state} At-Large`;
  }

  return `${district.state}-${district.district}`;
}
