/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/representatives/route'
import { createMockRequest, mockFetchResponse, mockRepresentative } from '../utils/test-helpers'

// Mock the cache module
jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((key, fetcher) => fetcher())
}))

describe('/api/representatives', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('ZIP code lookup', () => {
    it('should return representatives for valid ZIP code', async () => {
      const mockCongressResponse = {
        results: [mockRepresentative]
      }

      global.fetch = jest.fn().mockResolvedValueOnce(
        mockFetchResponse(mockCongressResponse)
      )

      const request = createMockRequest('http://localhost:3000/api/representatives?zip=10001')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('representatives')
      expect(data.representatives).toHaveLength(1)
      expect(data.representatives[0]).toMatchObject({
        bioguideId: 'S000148',
        name: 'Charles E. Schumer',
        state: 'NY'
      })
    })

    it('should return 400 for missing ZIP code', async () => {
      const request = createMockRequest('http://localhost:3000/api/representatives')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error', 'ZIP code is required')
    })

    it('should return 400 for invalid ZIP code format', async () => {
      const request = createMockRequest('http://localhost:3000/api/representatives?zip=invalid')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should handle Congress API errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('API Error'))

      const request = createMockRequest('http://localhost:3000/api/representatives?zip=10001')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200) // Should fallback to mock data
      expect(data).toHaveProperty('representatives')
      expect(data.metadata.dataSource).toBe('mock')
    })

    it('should validate ZIP code length', async () => {
      const testCases = [
        { zip: '1', shouldPass: false },
        { zip: '12345', shouldPass: true },
        { zip: '12345-6789', shouldPass: true },
        { zip: '123456789012345', shouldPass: false }
      ]

      for (const { zip, shouldPass } of testCases) {
        const request = createMockRequest(`http://localhost:3000/api/representatives?zip=${zip}`)
        const response = await GET(request)

        if (shouldPass) {
          expect([200, 500]).toContain(response.status) // 200 for success, 500 for API errors
        } else {
          expect(response.status).toBe(400)
        }
      }
    })
  })

  describe('Response format', () => {
    it('should return data in correct format', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce(
        mockFetchResponse({ results: [mockRepresentative] })
      )

      const request = createMockRequest('http://localhost:3000/api/representatives?zip=10001')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toHaveProperty('representatives')
      expect(data).toHaveProperty('metadata')
      expect(data.metadata).toHaveProperty('dataSource')
      expect(data.metadata).toHaveProperty('timestamp')
      
      if (data.representatives.length > 0) {
        const rep = data.representatives[0]
        expect(rep).toHaveProperty('bioguideId')
        expect(rep).toHaveProperty('name')
        expect(rep).toHaveProperty('state')
        expect(rep).toHaveProperty('party')
        expect(rep).toHaveProperty('chamber')
      }
    })
  })

  describe('Caching', () => {
    it('should use cached data when available', async () => {
      const cachedFetch = require('@/lib/cache').cachedFetch
      cachedFetch.mockResolvedValueOnce({ results: [mockRepresentative] })

      const request = createMockRequest('http://localhost:3000/api/representatives?zip=10001')
      await GET(request)

      expect(cachedFetch).toHaveBeenCalledWith(
        expect.stringContaining('representatives-10001'),
        expect.any(Function),
        expect.any(Number)
      )
    })
  })

  describe('Error handling', () => {
    it('should handle malformed API responses', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce(
        mockFetchResponse({ invalid: 'response' })
      )

      const request = createMockRequest('http://localhost:3000/api/representatives?zip=10001')
      const response = await GET(request)

      expect(response.status).toBe(200) // Should fallback gracefully
      const data = await response.json()
      expect(data.metadata.dataSource).toBe('mock')
    })

    it('should handle network timeouts', async () => {
      global.fetch = jest.fn().mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      )

      const request = createMockRequest('http://localhost:3000/api/representatives?zip=10001')
      const response = await GET(request)

      expect(response.status).toBe(200) // Should fallback
      const data = await response.json()
      expect(data.metadata.dataSource).toBe('mock')
    })
  })
})