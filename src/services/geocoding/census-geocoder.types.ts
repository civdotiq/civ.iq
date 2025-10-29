/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * U.S. Census Geocoder API Type Definitions
 *
 * API Documentation: https://geocoding.geo.census.gov/geocoder/
 * Endpoint: /geocoder/geographies/address
 */

// ============================================================================
// Request Types
// ============================================================================

export interface CensusGeocodeRequest {
  street: string;
  city: string;
  state: string;
  zip?: string;
  benchmark?: string; // Default: 'Public_AR_Current'
  vintage?: string; // Default: 'Current_Current'
}

// ============================================================================
// Response Types (Census API structure)
// ============================================================================

export interface CensusGeocodeResponse {
  result: {
    input: {
      address: {
        street?: string;
        city?: string;
        state?: string;
        zip?: string;
      };
      benchmark: {
        isDefault: boolean;
        benchmarkDescription: string;
        id: string;
        benchmarkName: string;
      };
    };
    addressMatches: CensusAddressMatch[];
  };
}

export interface CensusAddressMatch {
  matchedAddress: string;
  coordinates: {
    x: number; // Longitude
    y: number; // Latitude
  };
  tigerLine: {
    side: string;
    tigerLineId: string;
  };
  addressComponents: {
    zip?: string;
    streetName?: string;
    preType?: string;
    city?: string;
    preDirection?: string;
    suffixDirection?: string;
    fromAddress?: string;
    state?: string;
    suffixType?: string;
    toAddress?: string;
    suffixQualifier?: string;
    preQualifier?: string;
  };
  geographies: CensusGeographies;
}

export interface CensusGeographies {
  'Census Tracts'?: CensusGeography[];
  'Census Block Groups'?: CensusGeography[];
  'Census Blocks'?: CensusGeography[];
  '2020 Census Blocks'?: CensusGeography[];
  'State Legislative District - Upper Chamber'?: CensusGeography[];
  'State Legislative District - Lower Chamber'?: CensusGeography[];
  '2024 State Legislative Districts - Upper'?: CensusGeography[];
  '2024 State Legislative Districts - Lower'?: CensusGeography[];
  '2022 State Legislative Districts - Upper'?: CensusGeography[];
  '2022 State Legislative Districts - Lower'?: CensusGeography[];
  '116th Congressional Districts'?: CensusGeography[];
  '117th Congressional Districts'?: CensusGeography[];
  '118th Congressional Districts'?: CensusGeography[];
  '119th Congressional Districts'?: CensusGeography[];
  Counties?: CensusGeography[];
  'County Subdivisions'?: CensusGeography[];
  'Incorporated Places'?: CensusGeography[];
  'Voting Districts'?: CensusGeography[];
  'ZIP Code Tabulation Areas'?: CensusGeography[];
  States?: CensusGeography[];
  'Combined Statistical Areas'?: CensusGeography[];
  'Urban Areas'?: CensusGeography[];
  [key: string]: CensusGeography[] | undefined;
}

export interface CensusGeography {
  GEOID: string; // Geographic identifier (e.g., "26003" for MI district 3)
  CENTLAT: string; // Centroid latitude
  AREALAND: number; // Land area in square meters
  CENTLON: string; // Centroid longitude
  NAME: string; // Human-readable name
  BASENAME: string; // Base name
  LSADC: string; // Legal/Statistical Area Description Code
  FUNCSTAT: string; // Functional status
  INTPTLAT: string; // Internal point latitude
  OBJECTID: number; // Object ID
  OID: string; // Object identifier
  MTFCC: string; // MAF/TIGER Feature Class Code
  AREAWATER: number; // Water area in square meters
  INTPTLON: string; // Internal point longitude
}

// ============================================================================
// Parsed/Normalized Types (Our internal structure)
// ============================================================================

export interface ParsedDistrictInfo {
  /** Normalized matched address from Census */
  matchedAddress: string;

  /** Coordinates of the address */
  coordinates: {
    lat: number;
    lon: number;
  };

  /** State legislative district - Upper chamber (State Senate) */
  upperDistrict: {
    /** District number (e.g., "3") */
    number: string;
    /** Full GEOID from Census (e.g., "26003") */
    geoid: string;
    /** Human-readable name (e.g., "State Senate District 3") */
    name: string;
  } | null;

  /** State legislative district - Lower chamber (State House) */
  lowerDistrict: {
    /** District number (e.g., "7") */
    number: string;
    /** Full GEOID from Census (e.g., "26007") */
    geoid: string;
    /** Human-readable name (e.g., "State House District 7") */
    name: string;
  } | null;

  /** Congressional district (for reference) */
  congressionalDistrict?: {
    number: string;
    geoid: string;
    name: string;
  };

  /** Additional geographic context */
  county?: string;
  place?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export enum CensusGeocoderError {
  ADDRESS_NOT_FOUND = 'ADDRESS_NOT_FOUND',
  NO_ADDRESS_MATCHES = 'NO_ADDRESS_MATCHES',
  MISSING_DISTRICT_DATA = 'MISSING_DISTRICT_DATA',
  API_ERROR = 'API_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

export class CensusGeocoderException extends Error {
  constructor(
    public readonly errorType: CensusGeocoderError,
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'CensusGeocoderException';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/** Helper to parse Census GEOID to district number */
export interface DistrictGEOID {
  /** Full GEOID (e.g., "26003") */
  geoid: string;
  /** State FIPS code (e.g., "26" for Michigan) */
  stateFips: string;
  /** District number with leading zeros (e.g., "003") */
  districtPadded: string;
  /** District number without leading zeros (e.g., "3") */
  districtNumber: string;
}
