/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Boundary and Demographics Types
 *
 * Types for U.S. state boundaries from Census TIGER/Line shapefiles
 * and state-level demographics from the Census API.
 */

// GeoJSON geometry types
export interface GeoJSONGeometry {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

// State boundary properties from TIGER/Line
export interface StateBoundaryProperties {
  REGION: string;
  DIVISION: string;
  STATEFP: string;
  STATENS: string;
  GEOID: string;
  GEOIDFQ: string;
  STUSPS: string; // State abbreviation (e.g., "MN")
  NAME: string; // State full name (e.g., "Minnesota")
  LSAD: string;
  MTFCC: string;
  FUNCSTAT: string;
  ALAND: number; // Land area in square meters
  AWATER: number; // Water area in square meters
  INTPTLAT: string; // Internal point latitude
  INTPTLON: string; // Internal point longitude
  state_abbr: string;
  state_name: string;
  state_fips: string;
}

// State boundary GeoJSON feature
export interface StateBoundaryFeature {
  type: 'Feature';
  properties: StateBoundaryProperties;
  geometry: GeoJSONGeometry;
}

// State demographics from Census API
export interface StateDemographics {
  stateCode: string;
  stateName: string;
  population: number;
  medianAge: number;
  medianIncome: number;
  povertyRate: number;
  unemploymentRate: number;
  highSchoolGradRate: number;
  bachelorsDegreeRate: number;
  urbanPopulationPct: number;
  ruralPopulationPct: number;
  raceEthnicity: {
    white: number;
    black: number;
    hispanic: number;
    asian: number;
    nativeAmerican: number;
    pacificIslander: number;
    other: number;
    twoOrMore: number;
  };
  lastUpdated: string;
}

// Combined state data
export interface StateData {
  boundary: StateBoundaryFeature;
  demographics?: StateDemographics;
  senators?: Array<{
    bioguideId: string;
    name: string;
    party: string;
    rank: 'senior' | 'junior';
  }>;
}

// API response types
export interface StateBoundaryResponse {
  success: boolean;
  data?: StateBoundaryFeature;
  error?: string;
  cached?: boolean;
  executionTime?: number;
}

export interface StateDemographicsResponse {
  success: boolean;
  data?: StateDemographics;
  error?: string;
  cached?: boolean;
  executionTime?: number;
}

export interface StateDataResponse {
  success: boolean;
  data?: StateData;
  error?: string;
  cached?: boolean;
  executionTime?: number;
}

// State list metadata
export interface StateManifest {
  generated: string;
  total_states: number;
  source: string;
  source_url: string;
  extraction_stats?: {
    duration_ms: number;
    errors: number;
  };
  states: string[];
}

// Type guards
export function isValidStateCode(code: unknown): code is string {
  return typeof code === 'string' && code.length === 2 && /^[A-Z]{2}$/.test(code);
}

export function isStateBoundaryFeature(obj: unknown): obj is StateBoundaryFeature {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    (obj as Record<string, unknown>).type === 'Feature' &&
    'properties' in obj &&
    'geometry' in obj
  );
}

// Utility types
export type StateCode = string; // Two-letter state abbreviation
export type StateFIPS = string; // Two-digit FIPS code

// Map projection types for rendering
export type MapProjection = 'mercator' | 'albers' | 'equalEarth';

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface StateMapConfig {
  stateCode: StateCode;
  projection: MapProjection;
  bounds: MapBounds;
  center: [number, number]; // [lng, lat]
  zoom: number;
}
