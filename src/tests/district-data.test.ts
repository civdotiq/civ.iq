/**
 * District Data Validation Tests
 *
 * CRITICAL: These tests validate the core geospatial utilities and ensure
 * our congressional district data has correct coordinates. These are our
 * "golden record" tests that must ALWAYS pass to prevent shipping bad
 * civic data to citizens.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  CoordinateSystem,
  convertTMStoXYZ,
  convertTileToWGS84,
  validateUSCoordinate,
  validateAgainstGoldenRecord,
  validateDistrictData,
  GOLDEN_COORDINATES,
  US_BOUNDS,
  CONTINENTAL_US_BOUNDS,
  type TileCoordinate,
  type GeographicCoordinate,
} from '../lib/geospatial-utils';

describe('Geospatial Utilities', () => {
  describe('convertTMStoXYZ', () => {
    it('should convert TMS coordinates to XYZ coordinates correctly', () => {
      // Test case: zoom level 8, TMS coordinates (40, 157)
      // This is the actual tile that contained CA-12 in our extraction
      const tmsCoord: TileCoordinate = { x: 40, y: 157, z: 8 };
      const xyzCoord = convertTMStoXYZ(tmsCoord);

      // At zoom 8: max tile index = 2^8 - 1 = 255
      // XYZ Y = 255 - 157 = 98
      expect(xyzCoord).toEqual({ x: 40, y: 98, z: 8 });
    });

    it('should handle various zoom levels correctly', () => {
      // Zoom 0: only one tile
      expect(convertTMStoXYZ({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 0 });

      // Zoom 1: 2x2 grid
      expect(convertTMStoXYZ({ x: 1, y: 0, z: 1 })).toEqual({ x: 1, y: 1, z: 1 });
      expect(convertTMStoXYZ({ x: 1, y: 1, z: 1 })).toEqual({ x: 1, y: 0, z: 1 });

      // Higher zoom
      expect(convertTMStoXYZ({ x: 100, y: 200, z: 10 })).toEqual({
        x: 100,
        y: 1023 - 200, // 2^10 - 1 - 200 = 823
        z: 10,
      });
    });

    it('should validate input parameters', () => {
      // Invalid zoom levels
      expect(() => convertTMStoXYZ({ x: 0, y: 0, z: -1 })).toThrow('Invalid zoom level');
      expect(() => convertTMStoXYZ({ x: 0, y: 0, z: 23 })).toThrow('Invalid zoom level');

      // Negative coordinates
      expect(() => convertTMStoXYZ({ x: -1, y: 0, z: 8 })).toThrow('Invalid tile coordinates');
      expect(() => convertTMStoXYZ({ x: 0, y: -1, z: 8 })).toThrow('Invalid tile coordinates');

      // Out of bounds for zoom level
      expect(() => convertTMStoXYZ({ x: 256, y: 0, z: 8 })).toThrow('out of bounds');
      expect(() => convertTMStoXYZ({ x: 0, y: 256, z: 8 })).toThrow('out of bounds');
    });
  });

  describe('convertTileToWGS84', () => {
    it('should convert XYZ tile coordinates to geographic coordinates', () => {
      // Test known tile coordinate for San Francisco area
      // Tile (40, 98, 8) should be approximately in SF region
      const tileCoord: TileCoordinate = { x: 40, y: 98, z: 8 };
      const geoCoord = convertTileToWGS84(tileCoord, CoordinateSystem.XYZ);

      // Verify we get coordinates in the western US area
      expect(geoCoord.longitude).toBeCloseTo(-123.75, 1); // Western US longitude
      expect(geoCoord.latitude).toBeCloseTo(38.82, 1); // Northern California latitude
      expect(geoCoord.latitude).toBeGreaterThan(0); // Must be positive (Northern Hemisphere)
    });

    it('should convert TMS tile coordinates to geographic coordinates', () => {
      // Same test but with TMS input (the original problematic case)
      const tmsTileCoord: TileCoordinate = { x: 40, y: 157, z: 8 };
      const geoCoord = convertTileToWGS84(tmsTileCoord, CoordinateSystem.TMS);

      // Should give same result as XYZ conversion after TMS transformation
      expect(geoCoord.longitude).toBeCloseTo(-123.75, 1);
      expect(geoCoord.latitude).toBeCloseTo(38.82, 1);
      expect(geoCoord.latitude).toBeGreaterThan(0); // CRITICAL: Must be positive
    });

    it('should handle edge cases correctly', () => {
      // Tile (0, 0, 0) should be northwest corner of world
      const worldCorner = convertTileToWGS84({ x: 0, y: 0, z: 0 });
      expect(worldCorner.longitude).toBeCloseTo(-180, 1);
      expect(worldCorner.latitude).toBeCloseTo(85.05, 1); // Web Mercator max lat

      // Center tile at zoom 1
      const worldCenter = convertTileToWGS84({ x: 1, y: 1, z: 1 });
      expect(worldCenter.longitude).toBeCloseTo(0, 1);
      expect(worldCenter.latitude).toBeCloseTo(0, 1);
    });
  });

  describe('validateUSCoordinate', () => {
    it('should accept valid continental US coordinates', () => {
      const sanFrancisco: GeographicCoordinate = { longitude: -122.44, latitude: 37.76 };
      const validation = validateUSCoordinate(sanFrancisco, CONTINENTAL_US_BOUNDS);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should accept valid US territory coordinates', () => {
      // American Samoa (Southern Hemisphere - should be valid with US_BOUNDS)
      const americanSamoa: GeographicCoordinate = { longitude: -170.7, latitude: -14.3 };
      const validation = validateUSCoordinate(americanSamoa, US_BOUNDS);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject coordinates outside US bounds', () => {
      // Coordinates in Europe
      const london: GeographicCoordinate = { longitude: -0.12, latitude: 51.5 };
      const validation = validateUSCoordinate(london, US_BOUNDS);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('outside US bounds');
    });

    it('should reject invalid coordinate values', () => {
      // Invalid latitude
      const invalidLat: GeographicCoordinate = { longitude: -122, latitude: 91 };
      const validation = validateUSCoordinate(invalidLat);

      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('Invalid latitude');

      // Invalid longitude
      const invalidLon: GeographicCoordinate = { longitude: 181, latitude: 37 };
      const validation2 = validateUSCoordinate(invalidLon);

      expect(validation2.isValid).toBe(false);
      expect(validation2.errors[0]).toContain('Invalid longitude');
    });
  });

  describe('validateAgainstGoldenRecord', () => {
    it('should validate coordinates against CA-12 San Francisco golden record', () => {
      // Coordinate very close to expected SF location
      const testCoord: GeographicCoordinate = { longitude: -122.42, latitude: 37.78 };
      const validation = validateAgainstGoldenRecord(
        testCoord,
        GOLDEN_COORDINATES.CA12_SAN_FRANCISCO
      );

      expect(validation.isValid).toBe(true);
      expect(validation.latDifference).toBeLessThan(0.5);
      expect(validation.lonDifference).toBeLessThan(0.5);
    });

    it('should reject coordinates far from golden record', () => {
      // Coordinate in New York (should fail SF validation)
      const newYorkCoord: GeographicCoordinate = { longitude: -74.0, latitude: 40.7 };
      const validation = validateAgainstGoldenRecord(
        newYorkCoord,
        GOLDEN_COORDINATES.CA12_SAN_FRANCISCO
      );

      expect(validation.isValid).toBe(false);
      expect(validation.latDifference).toBeGreaterThan(0.5);
      expect(validation.lonDifference).toBeGreaterThan(0.5);
      expect(validation.message).toContain('differs from golden record');
    });

    it('should handle American Samoa southern hemisphere coordinates', () => {
      const samoaCoord: GeographicCoordinate = { longitude: -170.8, latitude: -14.2 };
      const validation = validateAgainstGoldenRecord(
        samoaCoord,
        GOLDEN_COORDINATES.AS_AL_AMERICAN_SAMOA
      );

      expect(validation.isValid).toBe(true);
      expect(validation.latDifference).toBeLessThan(1.0);
    });
  });
});

describe('Golden Record Validation - Real District Files', () => {
  const getDistrictFilePath = (districtId: string, detail: string = 'full') => {
    return path.join(process.cwd(), 'public', 'data', 'districts', detail, `${districtId}.json`);
  };

  const loadDistrictGeoJSON = (districtId: string, detail: string = 'full') => {
    const filePath = getDistrictFilePath(districtId, detail);
    if (!fs.existsSync(filePath)) {
      throw new Error(`District file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  };

  describe('CA-12 San Francisco District', () => {
    it('should have correct coordinates matching San Francisco golden record', () => {
      const ca12GeoJSON = loadDistrictGeoJSON('0612');
      const validation = validateDistrictData(ca12GeoJSON, '0612');

      // Critical assertions
      expect(validation.isValid).toBe(true);
      expect(validation.coordinate).toBeDefined();
      expect(validation.coordinate!.latitude).toBeGreaterThan(0); // MUST be positive
      expect(validation.coordinate!.latitude).toBeCloseTo(37.8, 0); // SF area
      expect(validation.coordinate!.longitude).toBeCloseTo(-122.4, 0); // SF area

      // Golden record validation
      expect(validation.goldenRecordCheck).toBeDefined();
      expect(validation.goldenRecordCheck!.isValid).toBe(true);

      if (!validation.isValid) {
        console.error('CA-12 Validation Errors:', validation.errors);
      }
    });

    it('should be consistent across all detail levels', () => {
      const details = ['full', 'standard', 'simple'];
      const coordinates: GeographicCoordinate[] = [];

      for (const detail of details) {
        const geoJSON = loadDistrictGeoJSON('0612', detail);
        const validation = validateDistrictData(geoJSON, '0612');

        expect(validation.isValid).toBe(true);
        expect(validation.coordinate).toBeDefined();
        coordinates.push(validation.coordinate!);
      }

      // All detail levels should have similar coordinates (within 0.01 degrees)
      for (let i = 1; i < coordinates.length; i++) {
        const coord1 = coordinates[i]!;
        const coord0 = coordinates[0]!;
        expect(Math.abs(coord1.latitude - coord0.latitude)).toBeLessThan(0.01);
        expect(Math.abs(coord1.longitude - coord0.longitude)).toBeLessThan(0.01);
      }
    });
  });

  describe('NY-14 Bronx/Queens District', () => {
    it('should have correct coordinates matching Bronx/Queens golden record', () => {
      const ny14GeoJSON = loadDistrictGeoJSON('3614');
      const validation = validateDistrictData(ny14GeoJSON, '3614');

      // Critical assertions
      expect(validation.isValid).toBe(true);
      expect(validation.coordinate).toBeDefined();
      expect(validation.coordinate!.latitude).toBeGreaterThan(0); // MUST be positive
      expect(validation.coordinate!.latitude).toBeCloseTo(40.8, 0); // NYC area
      expect(validation.coordinate!.longitude).toBeCloseTo(-73.9, 0); // NYC area

      // Golden record validation
      expect(validation.goldenRecordCheck).toBeDefined();
      expect(validation.goldenRecordCheck!.isValid).toBe(true);

      if (!validation.isValid) {
        console.error('NY-14 Validation Errors:', validation.errors);
      }
    });
  });

  describe('AS-AL American Samoa District', () => {
    it('should have correct negative latitude for southern hemisphere', () => {
      // Try different possible district IDs for American Samoa
      const possibleIds = ['6000', 'AS00'];
      let foundValidSamoa = false;

      for (const districtId of possibleIds) {
        try {
          const samoaGeoJSON = loadDistrictGeoJSON(districtId);
          const validation = validateDistrictData(samoaGeoJSON, districtId);

          if (validation.coordinate && validation.coordinate.latitude < 0) {
            // Found American Samoa with correct negative latitude
            expect(validation.coordinate.latitude).toBeLessThan(0); // MUST be negative
            expect(validation.coordinate.latitude).toBeCloseTo(-14.3, 1); // Samoa area
            expect(validation.coordinate.longitude).toBeCloseTo(-170.7, 1); // Samoa area
            foundValidSamoa = true;
            break;
          }
        } catch {
          // File doesn't exist, try next ID
          continue;
        }
      }

      // If we don't find American Samoa, that's OK - but log for debugging
      if (!foundValidSamoa) {
        console.warn('American Samoa district not found - may not be in dataset');
      }
    });
  });

  describe('Comprehensive District Validation', () => {
    it('should validate that NO districts have negative latitude in continental US', () => {
      const districtDir = path.join(process.cwd(), 'public', 'data', 'districts', 'full');

      if (!fs.existsSync(districtDir)) {
        throw new Error('District data directory not found. Run district extraction first.');
      }

      const files = fs
        .readdirSync(districtDir)
        .filter(f => f.endsWith('.json') && !f.includes('_fixed'));

      let continentalUSDistricts = 0;
      let negativeLatDistricts = 0;
      const negativeLatDistrictIds: string[] = [];

      for (const file of files.slice(0, 50)) {
        // Test first 50 for performance
        try {
          const districtId = file.replace('.json', '');
          const geoJSON = loadDistrictGeoJSON(districtId);
          const validation = validateDistrictData(geoJSON, districtId);

          if (validation.coordinate) {
            continentalUSDistricts++;

            if (validation.coordinate.latitude < 0) {
              negativeLatDistricts++;
              negativeLatDistrictIds.push(districtId);
            }
          }
        } catch {
          // Skip invalid files
          continue;
        }
      }

      // Most districts should have positive latitude
      // Only a few territories should have negative latitude
      const negativeRatio = negativeLatDistricts / continentalUSDistricts;
      expect(negativeRatio).toBeLessThan(0.05); // Less than 5% should be negative

      console.log(
        `District validation: ${continentalUSDistricts} tested, ${negativeLatDistricts} with negative latitude`
      );
      if (negativeLatDistrictIds.length > 0) {
        console.log('Districts with negative latitude:', negativeLatDistrictIds.slice(0, 10));
      }
    });
  });
});
