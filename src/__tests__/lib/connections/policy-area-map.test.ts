/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for policy-area-map.ts
 *
 * Validates all lookup functions, edge cases, and reverse lookups.
 */

import {
  getPolicyAreaMapping,
  getAgencySlugsForPolicyArea,
  getTopicsForPolicyArea,
  getIndustrySectorsForPolicyArea,
  getPolicyAreasForSector,
  getAllPolicyAreas,
  getJurisdictionSectorsForTopics,
} from '@/lib/connections/policy-area-map';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';

describe('policy-area-map', () => {
  describe('getPolicyAreaMapping', () => {
    it('returns mapping for known policy area', () => {
      const mapping = getPolicyAreaMapping('Health');
      expect(mapping).not.toBeNull();
      expect(mapping!.policyArea).toBe('Health');
      expect(mapping!.industrySectors).toContain(IndustrySector.HEALTH);
      expect(mapping!.agencySlugs).toContain('department-of-health-and-human-services');
    });

    it('is case-insensitive', () => {
      const upper = getPolicyAreaMapping('HEALTH');
      const lower = getPolicyAreaMapping('health');
      const mixed = getPolicyAreaMapping('HeAlTh');
      expect(upper).toEqual(lower);
      expect(lower).toEqual(mixed);
    });

    it('returns null for unknown policy area', () => {
      expect(getPolicyAreaMapping('Nonexistent Area')).toBeNull();
    });
  });

  describe('getAgencySlugsForPolicyArea', () => {
    it('returns agency slugs for defense', () => {
      const slugs = getAgencySlugsForPolicyArea('Armed Forces and National Security');
      expect(slugs).toContain('department-of-defense');
      expect(slugs).toContain('department-of-veterans-affairs');
    });

    it('returns empty array for unknown area', () => {
      expect(getAgencySlugsForPolicyArea('Unknown')).toEqual([]);
    });

    it('returns empty array for areas with no agencies', () => {
      const slugs = getAgencySlugsForPolicyArea('Congress');
      expect(slugs).toEqual([]);
    });
  });

  describe('getTopicsForPolicyArea', () => {
    it('returns topics for energy', () => {
      const topics = getTopicsForPolicyArea('Energy');
      expect(topics).toContain('energy');
      expect(topics).toContain('natural resources');
    });

    it('returns empty array for unknown area', () => {
      expect(getTopicsForPolicyArea('Unknown')).toEqual([]);
    });
  });

  describe('getIndustrySectorsForPolicyArea', () => {
    it('returns sectors for finance', () => {
      const sectors = getIndustrySectorsForPolicyArea('Finance and Financial Sector');
      expect(sectors).toContain(IndustrySector.FINANCE_INSURANCE_REAL_ESTATE);
    });

    it('returns multiple sectors for housing', () => {
      const sectors = getIndustrySectorsForPolicyArea('Housing and Community Development');
      expect(sectors).toContain(IndustrySector.CONSTRUCTION);
      expect(sectors).toContain(IndustrySector.FINANCE_INSURANCE_REAL_ESTATE);
    });

    it('returns empty array for areas with no sectors', () => {
      const sectors = getIndustrySectorsForPolicyArea('Congress');
      expect(sectors).toEqual([]);
    });
  });

  describe('getPolicyAreasForSector', () => {
    it('returns policy areas for defense sector', () => {
      const areas = getPolicyAreasForSector(IndustrySector.DEFENSE);
      expect(areas).toContain('Armed Forces and National Security');
      expect(areas).toContain('Emergency Management');
      expect(areas).toContain('International Affairs');
    });

    it('returns policy areas for health sector', () => {
      const areas = getPolicyAreasForSector(IndustrySector.HEALTH);
      expect(areas).toContain('Health');
      expect(areas).toContain('Families');
    });
  });

  describe('getAllPolicyAreas', () => {
    it('returns all known policy areas', () => {
      const areas = getAllPolicyAreas();
      expect(areas.length).toBeGreaterThanOrEqual(30);
      expect(areas).toContain('Health');
      expect(areas).toContain('Energy');
      expect(areas).toContain('Taxation');
    });
  });

  describe('getJurisdictionSectorsForTopics', () => {
    it('returns sectors for defense topics', () => {
      const sectors = getJurisdictionSectorsForTopics(['defense', 'military']);
      expect(sectors).toContain(IndustrySector.DEFENSE);
    });

    it('returns multiple sectors for mixed topics', () => {
      const sectors = getJurisdictionSectorsForTopics(['health', 'energy']);
      expect(sectors).toContain(IndustrySector.HEALTH);
      expect(sectors).toContain(IndustrySector.ENERGY_NATURAL_RESOURCES);
    });

    it('deduplicates sectors across topics', () => {
      const sectors = getJurisdictionSectorsForTopics(['environment', 'energy']);
      // Both map to ENERGY_NATURAL_RESOURCES but should appear only once
      const energyCount = sectors.filter(s => s === IndustrySector.ENERGY_NATURAL_RESOURCES).length;
      expect(energyCount).toBe(1);
    });

    it('is case-insensitive', () => {
      const lower = getJurisdictionSectorsForTopics(['defense']);
      const upper = getJurisdictionSectorsForTopics(['DEFENSE']);
      expect(lower).toEqual(upper);
    });

    it('returns empty array for unknown topics', () => {
      expect(getJurisdictionSectorsForTopics(['nonexistent'])).toEqual([]);
    });

    it('returns empty array for empty input', () => {
      expect(getJurisdictionSectorsForTopics([])).toEqual([]);
    });
  });
});
