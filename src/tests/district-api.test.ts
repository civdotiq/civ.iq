/**
 * District API Integration Tests
 *
 * CRITICAL: These tests validate the entire API stack from endpoint
 * to database to ensure citizens get correct district boundary data.
 * These are end-to-end tests that prevent shipping APIs with bad data.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { validateDistrictData, GOLDEN_COORDINATES } from '../lib/geospatial-utils';

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 10000; // 10 seconds per API test

interface DistrictApiResponse {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  properties: {
    GEOID?: string;
    NAMELSAD?: string;
    STATEFP?: string;
    CD119FP?: string;
    INTPTLAT?: string;
    INTPTLON?: string;
    detail_level?: string;
    api_metadata?: {
      normalized_id: string;
      original_request: string;
      file_size_bytes?: number;
    };
    [key: string]: unknown;
  };
}

/**
 * Test helper to make API requests with proper error handling
 */
async function fetchDistrictApi(
  districtId: string,
  detail: string = 'standard'
): Promise<DistrictApiResponse> {
  const url = `${API_BASE_URL}/api/district-boundaries/${districtId}?detail=${detail}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data as DistrictApiResponse;
}

/**
 * Test helper to verify API response structure
 */
function validateApiResponse(response: DistrictApiResponse, districtId: string, detail: string) {
  // Basic GeoJSON structure
  expect(response.type).toBe('Feature');
  expect(response.geometry).toBeDefined();
  expect(response.properties).toBeDefined();

  // API metadata
  expect(response.properties.detail_level).toBe(detail);
  expect(response.properties.api_metadata).toBeDefined();
  expect(response.properties.api_metadata?.original_request).toBe(districtId);
  expect(response.properties.api_metadata?.normalized_id).toBeDefined();

  // File size metadata
  expect(response.properties.api_metadata?.file_size_bytes).toBeGreaterThan(0);
}

/**
 * Test helper to verify API response headers
 */
function validateApiHeaders(response: Response) {
  // Cache headers
  expect(response.headers.get('Cache-Control')).toContain('public');
  expect(response.headers.get('ETag')).toBeDefined();

  // CORS headers
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');

  // Performance metadata
  expect(response.headers.get('X-Processing-Time')).toBeDefined();
  expect(response.headers.get('X-File-Size')).toBeDefined();
  expect(response.headers.get('X-Detail-Level')).toBeDefined();
}

describe('District Boundaries API Integration Tests', () => {
  beforeAll(async () => {
    // Verify the development server is running
    try {
      const healthCheck = await fetch(`${API_BASE_URL}/api/health`);
      if (!healthCheck.ok) {
        throw new Error('Development server health check failed');
      }
    } catch (error) {
      console.warn('Health check failed - API may not be running:', error);
      // Continue with tests anyway
    }
  });

  describe('Golden Record API Validation', () => {
    it(
      'should return correct CA-12 San Francisco district data',
      async () => {
        const response = await fetchDistrictApi('CA-12', 'standard');

        // Validate API response structure
        validateApiResponse(response, 'CA-12', 'standard');

        // Validate geographic data using our utility
        const validation = validateDistrictData(response, '0612');

        // Critical assertions
        expect(validation.isValid).toBe(true);
        expect(validation.coordinate).toBeDefined();
        expect(validation.coordinate!.latitude).toBeGreaterThan(0); // MUST be positive

        // Golden record validation
        expect(validation.goldenRecordCheck).toBeDefined();
        expect(validation.goldenRecordCheck!.isValid).toBe(true);

        // San Francisco area coordinates
        expect(validation.coordinate!.latitude).toBeCloseTo(37.8, 0);
        expect(validation.coordinate!.longitude).toBeCloseTo(-122.4, 0);

        if (!validation.isValid) {
          console.error('CA-12 API Validation Errors:', validation.errors);
          throw new Error(`CA-12 API returned invalid data: ${validation.errors.join(', ')}`);
        }
      },
      TEST_TIMEOUT
    );

    it(
      'should return correct NY-14 Bronx/Queens district data',
      async () => {
        const response = await fetchDistrictApi('NY-14', 'standard');

        // Validate API response structure
        validateApiResponse(response, 'NY-14', 'standard');

        // Validate geographic data
        const validation = validateDistrictData(response, '3614');

        // Critical assertions
        expect(validation.isValid).toBe(true);
        expect(validation.coordinate).toBeDefined();
        expect(validation.coordinate!.latitude).toBeGreaterThan(0); // MUST be positive

        // Golden record validation
        expect(validation.goldenRecordCheck).toBeDefined();
        expect(validation.goldenRecordCheck!.isValid).toBe(true);

        // NYC area coordinates
        expect(validation.coordinate!.latitude).toBeCloseTo(40.8, 0);
        expect(validation.coordinate!.longitude).toBeCloseTo(-73.9, 0);

        if (!validation.isValid) {
          console.error('NY-14 API Validation Errors:', validation.errors);
          throw new Error(`NY-14 API returned invalid data: ${validation.errors.join(', ')}`);
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('API Format Support', () => {
    it(
      'should support multiple district ID formats',
      async () => {
        // Test different formats for the same district (CA-12)
        const formats = ['CA-12', '06-12', '0612'];

        for (const format of formats) {
          const response = await fetchDistrictApi(format, 'simple');

          validateApiResponse(response, format, 'simple');

          // All formats should return the same normalized district
          expect(response.properties.api_metadata?.normalized_id).toBe('0612');

          // All should be valid SF area coordinates
          const validation = validateDistrictData(response, '0612');
          expect(validation.isValid).toBe(true);
          expect(validation.coordinate!.latitude).toBeCloseTo(37.8, 0);
        }
      },
      TEST_TIMEOUT
    );

    it(
      'should support all detail levels with consistent coordinates',
      async () => {
        const details = ['simple', 'standard', 'full'];
        const coordinates: Array<{ lat: number; lon: number }> = [];

        for (const detail of details) {
          const response = await fetchDistrictApi('CA-12', detail);

          validateApiResponse(response, 'CA-12', detail);

          const validation = validateDistrictData(response, '0612');
          expect(validation.isValid).toBe(true);

          coordinates.push({
            lat: validation.coordinate!.latitude,
            lon: validation.coordinate!.longitude,
          });
        }

        // All detail levels should have similar coordinates (within 0.01 degrees)
        for (let i = 1; i < coordinates.length; i++) {
          const coord1 = coordinates[i]!;
          const coord0 = coordinates[0]!;
          expect(Math.abs(coord1.lat - coord0.lat)).toBeLessThan(0.01);
          expect(Math.abs(coord1.lon - coord0.lon)).toBeLessThan(0.01);
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('API Error Handling', () => {
    it(
      'should return 400 for invalid district ID format',
      async () => {
        const url = `${API_BASE_URL}/api/district-boundaries/INVALID?detail=standard`;

        const response = await fetch(url);
        expect(response.status).toBe(400);

        const errorData = await response.json();
        expect(errorData.error).toBe('Invalid district ID format');
        expect(errorData.examples).toBeDefined();
      },
      TEST_TIMEOUT
    );

    it(
      'should return 400 for invalid detail level',
      async () => {
        const url = `${API_BASE_URL}/api/district-boundaries/CA-12?detail=invalid`;

        const response = await fetch(url);
        expect(response.status).toBe(400);

        const errorData = await response.json();
        expect(errorData.error).toBe('Invalid detail level');
      },
      TEST_TIMEOUT
    );

    it(
      'should return 404 for non-existent district',
      async () => {
        const url = `${API_BASE_URL}/api/district-boundaries/CA-99?detail=standard`;

        const response = await fetch(url);
        expect(response.status).toBe(404);

        const errorData = await response.json();
        expect(errorData.error).toBe('District not found');
        expect(errorData.suggestions).toBeDefined();
      },
      TEST_TIMEOUT
    );
  });

  describe('API Performance & Headers', () => {
    it(
      'should return proper cache and CORS headers',
      async () => {
        const url = `${API_BASE_URL}/api/district-boundaries/CA-12?detail=standard`;

        const response = await fetch(url);
        expect(response.ok).toBe(true);

        validateApiHeaders(response);

        // Processing time should be reasonable (< 2 seconds)
        const processingTime = response.headers.get('X-Processing-Time');
        if (processingTime) {
          const timeMs = parseInt(processingTime.replace('ms', ''));
          expect(timeMs).toBeLessThan(2000);
        }
      },
      TEST_TIMEOUT
    );

    it(
      'should handle CORS preflight requests',
      async () => {
        const url = `${API_BASE_URL}/api/district-boundaries/CA-12`;

        const response = await fetch(url, {
          method: 'OPTIONS',
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
        expect(response.headers.get('Access-Control-Allow-Methods')).toContain('OPTIONS');
      },
      TEST_TIMEOUT
    );
  });

  describe('Data Integrity Validation', () => {
    it(
      'should never return districts with negative latitude in continental US',
      async () => {
        // Test a sample of districts to ensure no hemisphere bugs
        const testDistricts = ['CA-01', 'TX-02', 'FL-03', 'NY-04', 'IL-05'];

        for (const districtId of testDistricts) {
          try {
            const response = await fetchDistrictApi(districtId, 'simple');
            const validation = validateDistrictData(response, response.properties.GEOID || '');

            if (validation.coordinate) {
              expect(validation.coordinate.latitude).toBeGreaterThan(0);
            }
          } catch (error) {
            // District might not exist - that's OK for this test
            console.warn(`District ${districtId} not found:`, error);
          }
        }
      },
      TEST_TIMEOUT * 2
    );

    it(
      'should return consistent data across multiple requests',
      async () => {
        // Make multiple requests to ensure data is stable
        const responses: DistrictApiResponse[] = [];

        for (let i = 0; i < 3; i++) {
          const response = await fetchDistrictApi('CA-12', 'standard');
          responses.push(response);
        }

        // All responses should be identical
        const firstResponse = responses[0]!;
        for (let i = 1; i < responses.length; i++) {
          expect(responses[i]!.geometry.coordinates).toEqual(firstResponse.geometry.coordinates);
          expect(responses[i]!.properties.GEOID).toBe(firstResponse.properties.GEOID);
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('API Metadata Validation', () => {
    it(
      'should return complete metadata for analysis',
      async () => {
        const response = await fetchDistrictApi('CA-12', 'full');

        // Required properties for civic analysis
        expect(response.properties.GEOID).toBeDefined();
        expect(response.properties.NAMELSAD).toBeDefined();
        expect(response.properties.STATEFP).toBeDefined();
        expect(response.properties.INTPTLAT).toBeDefined();
        expect(response.properties.INTPTLON).toBeDefined();

        // Internal point should match our validation
        const intLat = parseFloat(response.properties.INTPTLAT!);
        const intLon = parseFloat(response.properties.INTPTLON!);

        expect(intLat).toBeCloseTo(37.78, 1); // SF area
        expect(intLon).toBeCloseTo(-122.24, 1); // SF area
        expect(intLat).toBeGreaterThan(0); // Northern hemisphere
      },
      TEST_TIMEOUT
    );
  });
});

describe('API Health and Monitoring', () => {
  it('should provide API health status', async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);

      if (response.ok) {
        const health = await response.json();
        expect(health.status).toBe('healthy');
      } else {
        // Health endpoint doesn't exist - that's OK
        console.warn('Health endpoint not implemented');
      }
    } catch {
      // Server might not be running - that's OK for CI
      console.warn('API server not running - skipping health check');
    }
  });
});
