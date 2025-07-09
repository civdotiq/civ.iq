/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

import { 
  getFECIdFromBioguide, 
  hasFECMapping, 
  addFECMapping,
  bioguideToFECMapping 
} from '@/lib/data/bioguide-fec-mapping'

describe('Bioguide FEC Mapping', () => {
  describe('getFECIdFromBioguide', () => {
    it('should return FEC ID for known bioguide ID', () => {
      const fecId = getFECIdFromBioguide('S000148')
      expect(fecId).toBe('S8NY00082')
    })

    it('should return null for unknown bioguide ID', () => {
      const fecId = getFECIdFromBioguide('UNKNOWN123')
      expect(fecId).toBeNull()
    })

    it('should handle empty string', () => {
      const fecId = getFECIdFromBioguide('')
      expect(fecId).toBeNull()
    })
  })

  describe('hasFECMapping', () => {
    it('should return true for known bioguide ID', () => {
      expect(hasFECMapping('S000148')).toBe(true)
      expect(hasFECMapping('P000197')).toBe(true)
    })

    it('should return false for unknown bioguide ID', () => {
      expect(hasFECMapping('UNKNOWN123')).toBe(false)
    })

    it('should handle empty string', () => {
      expect(hasFECMapping('')).toBe(false)
    })
  })

  describe('addFECMapping', () => {
    beforeEach(() => {
      // Clean up any test mappings
      delete bioguideToFECMapping['TEST123']
    })

    afterEach(() => {
      // Clean up test mappings
      delete bioguideToFECMapping['TEST123']
    })

    it('should add new mapping', () => {
      const testMapping = {
        fecId: 'TEST_FEC_ID',
        name: 'TEST, MEMBER',
        state: 'NY',
        office: 'H' as const,
        lastUpdated: '2024-01-01'
      }

      addFECMapping('TEST123', testMapping)

      expect(hasFECMapping('TEST123')).toBe(true)
      expect(getFECIdFromBioguide('TEST123')).toBe('TEST_FEC_ID')
    })

    it('should update existing mapping', () => {
      const initialMapping = {
        fecId: 'INITIAL_FEC_ID',
        name: 'INITIAL, MEMBER',
        state: 'CA',
        office: 'S' as const,
        lastUpdated: '2024-01-01'
      }

      const updatedMapping = {
        fecId: 'UPDATED_FEC_ID',
        name: 'UPDATED, MEMBER',
        state: 'TX',
        office: 'H' as const,
        lastUpdated: '2024-02-01'
      }

      addFECMapping('TEST123', initialMapping)
      expect(getFECIdFromBioguide('TEST123')).toBe('INITIAL_FEC_ID')

      addFECMapping('TEST123', updatedMapping)
      expect(getFECIdFromBioguide('TEST123')).toBe('UPDATED_FEC_ID')
    })
  })

  describe('Data Integrity', () => {
    it('should have valid FEC IDs for all mappings', () => {
      Object.entries(bioguideToFECMapping).forEach(([bioguideId, mapping]) => {
        expect(bioguideId).toBeTruthy()
        expect(mapping.fecId).toBeTruthy()
        expect(mapping.name).toBeTruthy()
        expect(mapping.state).toBeTruthy()
        expect(['H', 'S'].includes(mapping.office)).toBe(true)
        expect(mapping.lastUpdated).toBeTruthy()
      })
    })

    it('should have consistent state abbreviations', () => {
      const validStates = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
      ]

      Object.values(bioguideToFECMapping).forEach(mapping => {
        expect(validStates).toContain(mapping.state)
      })
    })

    it('should have unique FEC IDs', () => {
      const fecIds = Object.values(bioguideToFECMapping).map(mapping => mapping.fecId)
      const uniqueFecIds = new Set(fecIds)
      expect(fecIds.length).toBe(uniqueFecIds.size)
    })

    it('should have proper date format', () => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/

      Object.values(bioguideToFECMapping).forEach(mapping => {
        expect(mapping.lastUpdated).toMatch(dateRegex)
      })
    })
  })
})