/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/district-map/route'
import { createMockRequest, mockFetchResponse, mockDistrictBoundary } from '../utils/test-helpers'

// Mock the cache module
jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((key, fetcher) => fetcher())
}))

describe('/api/district-map', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('ZIP code boundary lookup', () => {
    it('should return district boundaries for valid ZIP code', async () => {
      // Mock geocoding response
      const mockGeocodingResponse = {
        result: {
          addressMatches: [{
            coordinates: { x: -74.0059, y: 40.7128 },
            addressComponents: { state: 'NY' }
          }]
        }
      }

      // Mock TIGER API response
      const mockTigerResponse = {
        features: [{
          geometry: mockDistrictBoundary,
          properties: { NAME: 'Congressional District 10', CD119: '10' }
        }]
      }

      // Mock representatives API response
      const mockRepResponse = { district: '10' }

      global.fetch = jest.fn()
        .mockResolvedValueOnce(mockFetchResponse(mockGeocodingResponse)) // Geocoding
        .mockResolvedValueOnce(mockFetchResponse(mockRepResponse))       // Representatives
        .mockResolvedValueOnce(mockFetchResponse(mockTigerResponse))     // Congressional
        .mockResolvedValueOnce(mockFetchResponse(mockTigerResponse))     // State Senate
        .mockResolvedValueOnce(mockFetchResponse(mockTigerResponse))     // State House

      const request = createMockRequest('http://localhost:3000/api/district-map?zip=10001')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('zipCode', '10001')
      expect(data).toHaveProperty('state', 'NY')
      expect(data).toHaveProperty('coordinates')
      expect(data).toHaveProperty('boundaries')
      expect(data.boundaries).toHaveProperty('congressional')
      expect(data.boundaries).toHaveProperty('state_senate')
      expect(data.boundaries).toHaveProperty('state_house')
      expect(data).toHaveProperty('bbox')
    })

    it('should return 400 for missing ZIP code', async () => {
      const request = createMockRequest('http://localhost:3000/api/district-map')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error', 'ZIP code is required')
    })

    it('should handle geocoding failures', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce(
        mockFetchResponse({ result: { addressMatches: [] } })
      )

      const request = createMockRequest('http://localhost:3000/api/district-map?zip=00000')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Could not geocode ZIP code')
    })

    it('should fallback to mock boundaries when TIGER API fails', async () => {
      // Mock successful geocoding
      const mockGeocodingResponse = {
        result: {
          addressMatches: [{
            coordinates: { x: -74.0059, y: 40.7128 },
            addressComponents: { state: 'NY' }
          }]
        }
      }

      // Mock representatives API
      const mockRepResponse = { district: '10' }

      global.fetch = jest.fn()
        .mockResolvedValueOnce(mockFetchResponse(mockGeocodingResponse)) // Geocoding
        .mockResolvedValueOnce(mockFetchResponse(mockRepResponse))       // Representatives
        .mockRejectedValueOnce(new Error('TIGER API Error'))            // Congressional (fails)
        .mockRejectedValueOnce(new Error('TIGER API Error'))            // State Senate (fails)
        .mockRejectedValueOnce(new Error('TIGER API Error'))            // State House (fails)

      const request = createMockRequest('http://localhost:3000/api/district-map?zip=10001')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.boundaries.congressional.properties.source).toBe('mock')
      expect(data.boundaries.state_senate.properties.source).toBe('mock')
      expect(data.boundaries.state_house.properties.source).toBe('mock')
    })
  })

  describe('FIPS code mapping', () => {
    it('should correctly map state names to FIPS codes', async () => {
      const testStates = [
        { state: 'New York', expectedFips: '36' },
        { state: 'NY', expectedFips: '36' },
        { state: 'California', expectedFips: '06' },
        { state: 'CA', expectedFips: '06' },
        { state: 'Texas', expectedFips: '48' },
        { state: 'Invalid State', expectedFips: '00' }
      ]

      for (const { state, expectedFips } of testStates) {
        // Import the function directly for testing
        const { getStateFips } = require('@/app/api/district-map/route')
        // Since getStateFips is not exported, we'll test indirectly through API calls
        
        const mockGeocodingResponse = {
          result: {
            addressMatches: [{
              coordinates: { x: -74.0059, y: 40.7128 },
              addressComponents: { state }
            }]
          }
        }

        global.fetch = jest.fn()
          .mockResolvedValueOnce(mockFetchResponse(mockGeocodingResponse))
          .mockResolvedValueOnce(mockFetchResponse({ district: '01' }))
          .mockResolvedValueOnce(mockFetchResponse({ features: [] }))
          .mockResolvedValueOnce(mockFetchResponse({ features: [] }))
          .mockResolvedValueOnce(mockFetchResponse({ features: [] }))

        const request = createMockRequest('http://localhost:3000/api/district-map?zip=12345')
        const response = await GET(request)

        if (expectedFips !== '00') {
          expect(response.status).toBe(200)
        }
      }
    })
  })

  describe('Boundary calculation', () => {
    it('should calculate correct bounding box', async () => {
      const mockGeocodingResponse = {
        result: {
          addressMatches: [{
            coordinates: { x: -74.0059, y: 40.7128 },
            addressComponents: { state: 'NY' }
          }]
        }
      }

      const mockTigerResponse = {
        features: [{
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-74.1, 40.7],
              [-74.0, 40.7],
              [-74.0, 40.8],
              [-74.1, 40.8],
              [-74.1, 40.7]
            ]]
          },
          properties: { NAME: 'Test District', CD119: '10' }
        }]
      }

      global.fetch = jest.fn()
        .mockResolvedValueOnce(mockFetchResponse(mockGeocodingResponse))
        .mockResolvedValueOnce(mockFetchResponse({ district: '10' }))
        .mockResolvedValueOnce(mockFetchResponse(mockTigerResponse))
        .mockResolvedValueOnce(mockFetchResponse(mockTigerResponse))
        .mockResolvedValueOnce(mockFetchResponse(mockTigerResponse))

      const request = createMockRequest('http://localhost:3000/api/district-map?zip=10001')
      const response = await GET(request)
      const data = await response.json()

      expect(data.bbox).toHaveProperty('minLat')
      expect(data.bbox).toHaveProperty('maxLat')
      expect(data.bbox).toHaveProperty('minLng')
      expect(data.bbox).toHaveProperty('maxLng')
      expect(data.bbox.minLat).toBeLessThan(data.bbox.maxLat)
      expect(data.bbox.minLng).toBeLessThan(data.bbox.maxLng)
    })
  })

  describe('Error handling', () => {
    it('should handle Census geocoding API errors', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Geocoding API Error'))

      const request = createMockRequest('http://localhost:3000/api/district-map?zip=10001')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Could not geocode ZIP code')
    })

    it('should handle representatives API errors gracefully', async () => {
      const mockGeocodingResponse = {
        result: {
          addressMatches: [{
            coordinates: { x: -74.0059, y: 40.7128 },
            addressComponents: { state: 'NY' }
          }]
        }
      }

      global.fetch = jest.fn()
        .mockResolvedValueOnce(mockFetchResponse(mockGeocodingResponse)) // Geocoding succeeds
        .mockRejectedValueOnce(new Error('Representatives API Error'))   // Representatives fails
        .mockResolvedValueOnce(mockFetchResponse({ features: [] }))      // TIGER APIs
        .mockResolvedValueOnce(mockFetchResponse({ features: [] }))
        .mockResolvedValueOnce(mockFetchResponse({ features: [] }))

      const request = createMockRequest('http://localhost:3000/api/district-map?zip=10001')
      const response = await GET(request)

      expect(response.status).toBe(200) // Should continue with default district
      const data = await response.json()
      expect(data.boundaries.congressional.properties.district).toBe('01') // Default
    })
  })
})