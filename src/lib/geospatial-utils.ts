/**
 * Geospatial Utilities for Civic Intel Hub
 *
 * CRITICAL: All coordinate system conversions must go through these utilities
 * to prevent coordinate system bugs that could mislead citizens about their
 * congressional districts and representatives.
 *
 * Coordinate Systems:
 * - TMS (Tile Map Service): Y-axis inverted, origin at bottom-left
 * - XYZ (Google/OSM): Y-axis normal, origin at top-left
 * - WGS84: Geographic coordinates (longitude, latitude)
 */

export enum CoordinateSystem {
  TMS = 'TMS',
  XYZ = 'XYZ',
  WGS84 = 'WGS84',
}

export interface TileCoordinate {
  x: number;
  y: number;
  z: number;
}

export interface GeographicCoordinate {
  longitude: number;
  latitude: number;
}

export interface GeographicBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/**
 * US Geographic Bounds for validation
 * Includes all states, territories, and possessions
 */
export const US_BOUNDS: GeographicBounds = {
  minLat: -14.7, // American Samoa (southern hemisphere)
  maxLat: 72.0, // Northern Alaska
  minLon: -180.0, // Western Aleutians (crosses date line)
  maxLon: -65.0, // Eastern Maine (most US territory is west of this)
};

/**
 * Continental US bounds (excludes territories)
 */
export const CONTINENTAL_US_BOUNDS: GeographicBounds = {
  minLat: 18.0, // Southern tip of Hawaii
  maxLat: 72.0, // Northern Alaska
  minLon: -180.0, // Western Aleutians
  maxLon: -65.0, // Eastern Maine
};

/**
 * Known landmark coordinates for validation
 */
export const GOLDEN_COORDINATES = {
  // CA-12: San Francisco Congressional District
  CA12_SAN_FRANCISCO: {
    longitude: -122.44,
    latitude: 37.76,
    tolerance: 0.5, // degrees
  },

  // NY-14: Bronx/Queens Congressional District
  NY14_BRONX_QUEENS: {
    longitude: -73.87,
    latitude: 40.85,
    tolerance: 0.5, // degrees
  },

  // AS-AL: American Samoa At-Large (Southern Hemisphere)
  AS_AL_AMERICAN_SAMOA: {
    longitude: -170.7,
    latitude: -14.3,
    tolerance: 1.0, // degrees (territory bounds less precise)
  },
} as const;

/**
 * Convert TMS tile coordinates to XYZ tile coordinates
 *
 * TMS uses inverted Y-axis: TMS_Y = (2^zoom - 1) - XYZ_Y
 * This is the critical conversion that was missing and caused
 * the hemisphere inversion bug.
 *
 * @param tmsCoord - TMS tile coordinate
 * @returns XYZ tile coordinate
 */
export function convertTMStoXYZ(tmsCoord: TileCoordinate): TileCoordinate {
  if (tmsCoord.z < 0 || tmsCoord.z > 22) {
    throw new Error(`Invalid zoom level: ${tmsCoord.z}. Must be 0-22.`);
  }

  if (tmsCoord.x < 0 || tmsCoord.y < 0) {
    throw new Error(
      `Invalid tile coordinates: x=${tmsCoord.x}, y=${tmsCoord.y}. Must be non-negative.`
    );
  }

  const maxTileIndex = Math.pow(2, tmsCoord.z) - 1;

  if (tmsCoord.x > maxTileIndex || tmsCoord.y > maxTileIndex) {
    throw new Error(
      `Tile coordinates out of bounds for zoom ${tmsCoord.z}: ` +
        `x=${tmsCoord.x}, y=${tmsCoord.y}. Max: ${maxTileIndex}`
    );
  }

  return {
    x: tmsCoord.x,
    y: maxTileIndex - tmsCoord.y, // Y-axis inversion
    z: tmsCoord.z,
  };
}

/**
 * Convert tile coordinates to WGS84 geographic coordinates
 *
 * This handles the tile-to-geographic conversion using Web Mercator projection.
 * The coordinate system parameter determines whether to apply TMS conversion first.
 *
 * @param tileCoord - Input tile coordinate
 * @param system - Source coordinate system
 * @returns Geographic coordinate in WGS84
 */
export function convertTileToWGS84(
  tileCoord: TileCoordinate,
  system: CoordinateSystem = CoordinateSystem.XYZ
): GeographicCoordinate {
  let xyzCoord = tileCoord;

  // Convert TMS to XYZ if needed
  if (system === CoordinateSystem.TMS) {
    xyzCoord = convertTMStoXYZ(tileCoord);
  }

  // Convert XYZ tile to geographic coordinates using Web Mercator
  const n = Math.pow(2, xyzCoord.z);

  // Longitude conversion
  const longitude = (xyzCoord.x / n) * 360.0 - 180.0;

  // Latitude conversion (Web Mercator inverse)
  const latitudeRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * xyzCoord.y) / n)));
  const latitude = (latitudeRad * 180.0) / Math.PI;

  return {
    longitude,
    latitude,
  };
}

/**
 * Validate geographic coordinates against US bounds
 *
 * @param coord - Geographic coordinate to validate
 * @param bounds - Bounds to check against (default: all US including territories)
 * @returns Validation result with details
 */
export function validateUSCoordinate(
  coord: GeographicCoordinate,
  bounds: GeographicBounds = US_BOUNDS
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic coordinate validation
  if (coord.latitude < -90 || coord.latitude > 90) {
    errors.push(`Invalid latitude: ${coord.latitude}°. Must be [-90, 90].`);
  }

  if (coord.longitude < -180 || coord.longitude > 180) {
    errors.push(`Invalid longitude: ${coord.longitude}°. Must be [-180, 180].`);
  }

  // US bounds validation
  if (coord.latitude < bounds.minLat || coord.latitude > bounds.maxLat) {
    errors.push(
      `Latitude ${coord.latitude.toFixed(4)}° outside US bounds ` +
        `[${bounds.minLat}, ${bounds.maxLat}]`
    );
  }

  // Handle longitude bounds validation
  if (coord.longitude < bounds.minLon || coord.longitude > bounds.maxLon) {
    errors.push(
      `Longitude ${coord.longitude.toFixed(4)}° outside US bounds ` +
        `[${bounds.minLon}, ${bounds.maxLon}]`
    );
  }

  // Warnings for unusual coordinates
  if (coord.latitude < 0 && bounds !== US_BOUNDS) {
    warnings.push(
      `Negative latitude ${coord.latitude.toFixed(4)}° - verify this is correct for US territories`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate coordinate against known golden records
 *
 * @param coord - Coordinate to validate
 * @param goldenRecord - Expected coordinate with tolerance
 * @returns Whether coordinate matches golden record within tolerance
 */
export function validateAgainstGoldenRecord(
  coord: GeographicCoordinate,
  goldenRecord: (typeof GOLDEN_COORDINATES)[keyof typeof GOLDEN_COORDINATES]
): {
  isValid: boolean;
  latDifference: number;
  lonDifference: number;
  message: string;
} {
  const latDiff = Math.abs(coord.latitude - goldenRecord.latitude);
  const lonDiff = Math.abs(coord.longitude - goldenRecord.longitude);

  const isValid = latDiff <= goldenRecord.tolerance && lonDiff <= goldenRecord.tolerance;

  return {
    isValid,
    latDifference: latDiff,
    lonDifference: lonDiff,
    message: isValid
      ? `Coordinate matches golden record within tolerance`
      : `Coordinate differs from golden record: lat±${latDiff.toFixed(4)}°, lon±${lonDiff.toFixed(4)}°`,
  };
}

/**
 * Extract first coordinate from GeoJSON geometry
 *
 * @param geometry - GeoJSON geometry object
 * @returns First coordinate pair or null if invalid
 */
export function extractFirstCoordinate(geometry: {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}): GeographicCoordinate | null {
  try {
    let firstPoint: number[] | undefined;

    if (geometry.type === 'Polygon') {
      const ring = geometry.coordinates[0];
      if (Array.isArray(ring) && ring.length > 0) {
        firstPoint = ring[0] as number[];
      }
    } else if (geometry.type === 'MultiPolygon') {
      const polygon = geometry.coordinates[0];
      if (Array.isArray(polygon) && polygon.length > 0) {
        const ring = polygon[0];
        if (Array.isArray(ring) && ring.length > 0) {
          firstPoint = ring[0] as number[];
        }
      }
    }

    if (!firstPoint || firstPoint.length < 2) {
      return null;
    }

    const longitude = firstPoint[0];
    const latitude = firstPoint[1];

    if (typeof longitude !== 'number' || typeof latitude !== 'number') {
      return null;
    }

    return { longitude, latitude };
  } catch {
    return null;
  }
}

/**
 * Comprehensive district data validation
 *
 * Validates a district's GeoJSON data against all quality criteria:
 * - Coordinate system correctness
 * - US geographic bounds
 * - Golden record matching (if applicable)
 *
 * @param districtGeoJSON - District GeoJSON data
 * @param districtId - District identifier for golden record lookup
 * @returns Comprehensive validation result
 */
export function validateDistrictData(
  districtGeoJSON: {
    type: 'Feature';
    geometry: {
      type: 'Polygon' | 'MultiPolygon';
      coordinates: number[][][] | number[][][][];
    };
    properties: {
      GEOID?: string;
      INTPTLAT?: string;
      INTPTLON?: string;
      [key: string]: unknown;
    };
  },
  districtId: string
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  coordinate: GeographicCoordinate | null;
  goldenRecordCheck?: ReturnType<typeof validateAgainstGoldenRecord>;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Extract first coordinate
  const coordinate = extractFirstCoordinate(districtGeoJSON.geometry);

  if (!coordinate) {
    errors.push('Failed to extract valid coordinates from GeoJSON geometry');
    return { isValid: false, errors, warnings, coordinate: null };
  }

  // Validate against US bounds
  const boundsValidation = validateUSCoordinate(coordinate, US_BOUNDS);
  errors.push(...boundsValidation.errors);
  warnings.push(...boundsValidation.warnings);

  // Check against golden records if available
  let goldenRecordCheck: ReturnType<typeof validateAgainstGoldenRecord> | undefined;

  const normalizedId = districtId.replace(/[^0-9]/g, '');

  if (normalizedId === '0612') {
    // CA-12
    goldenRecordCheck = validateAgainstGoldenRecord(
      coordinate,
      GOLDEN_COORDINATES.CA12_SAN_FRANCISCO
    );
    if (!goldenRecordCheck.isValid) {
      errors.push(`CA-12 golden record validation failed: ${goldenRecordCheck.message}`);
    }
  } else if (normalizedId === '3614') {
    // NY-14
    goldenRecordCheck = validateAgainstGoldenRecord(
      coordinate,
      GOLDEN_COORDINATES.NY14_BRONX_QUEENS
    );
    if (!goldenRecordCheck.isValid) {
      errors.push(`NY-14 golden record validation failed: ${goldenRecordCheck.message}`);
    }
  } else if (districtId.includes('AS') || normalizedId === '6000') {
    // American Samoa
    goldenRecordCheck = validateAgainstGoldenRecord(
      coordinate,
      GOLDEN_COORDINATES.AS_AL_AMERICAN_SAMOA
    );
    if (!goldenRecordCheck.isValid) {
      warnings.push(`AS-AL golden record validation failed: ${goldenRecordCheck.message}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    coordinate,
    goldenRecordCheck,
  };
}
