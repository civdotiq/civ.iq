/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for fec-api-service.ts
 *
 * Tests the classifyPACType function and key service methods.
 * External API calls are mocked.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/services/cache', () => ({
  govCache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/data/pac-acronyms', () => ({
  PAC_ACRONYMS: {},
}));

import { classifyPACType } from '@/lib/fec/fec-api-service';

describe('fec-api-service', () => {
  describe('classifyPACType', () => {
    it('classifies Super PACs (Independent Expenditure-Only)', () => {
      expect(classifyPACType('O', 'B')).toBe('superPac');
      expect(classifyPACType('O', '')).toBe('superPac');
    });

    it('classifies Leadership PACs', () => {
      expect(classifyPACType('N', 'D')).toBe('leadership');
      expect(classifyPACType('Q', 'J')).toBe('leadership');
    });

    it('classifies Hybrid PACs', () => {
      expect(classifyPACType('N', 'B')).toBe('hybrid');
    });

    it('classifies Traditional PACs', () => {
      expect(classifyPACType('N', 'U')).toBe('traditional');
      expect(classifyPACType('Q', 'U')).toBe('traditional');
    });

    it('returns null for unrecognized types', () => {
      expect(classifyPACType('X', 'Y')).toBeNull();
      expect(classifyPACType('', '')).toBeNull();
    });

    it('prioritizes Super PAC over other designations', () => {
      // Type 'O' = Super PAC regardless of designation
      expect(classifyPACType('O', 'D')).toBe('superPac');
    });

    it('prioritizes Leadership designation over Traditional type', () => {
      // Designation 'D' = Leadership even if type is traditional
      expect(classifyPACType('N', 'D')).toBe('leadership');
    });
  });
});
