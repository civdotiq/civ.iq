/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Unified Geocode Result Type
 * Shared type for the unified geocoding response that returns all districts and representatives
 */

export interface UnifiedGeocodeResult {
  success: boolean;
  matchedAddress?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
  districts?: {
    federal: {
      state: string;
      district: string;
      districtId: string;
    };
    stateSenate?: {
      number: string;
      name: string;
    };
    stateHouse?: {
      number: string;
      name: string;
    };
  };
  federalRepresentatives?: Array<{
    bioguideId: string;
    name: string;
    party: string;
    state: string;
    district?: string;
    chamber: 'House' | 'Senate';
    title: string;
    phone?: string;
    website?: string;
    imageUrl?: string;
  }>;
  stateLegislators?: {
    senator?: {
      id: string;
      name: string;
      party: string;
      district: string;
      chamber: 'upper';
      image?: string;
      email?: string;
      phone?: string;
      website?: string;
    };
    representative?: {
      id: string;
      name: string;
      party: string;
      district: string;
      chamber: 'lower';
      image?: string;
      email?: string;
      phone?: string;
      website?: string;
    };
  };
  error?: {
    code: string;
    message: string;
    userMessage?: string;
  };
}
