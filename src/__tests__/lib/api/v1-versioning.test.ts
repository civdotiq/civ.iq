/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * V1 Versioning Header Tests
 */

import { addVersionHeaders, API_VERSION } from '@/lib/api/v1-versioning';

describe('V1 Versioning', () => {
  describe('API_VERSION', () => {
    it('should be a semver string', () => {
      expect(API_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('addVersionHeaders()', () => {
    it('should set X-API-Version header', () => {
      const headers = new Headers();
      addVersionHeaders(headers);
      expect(headers.get('X-API-Version')).toBe(API_VERSION);
    });

    it('should not set Sunset header when not configured', () => {
      const headers = new Headers();
      addVersionHeaders(headers);
      expect(headers.get('Sunset')).toBeNull();
    });

    it('should not set Deprecation header when not configured', () => {
      const headers = new Headers();
      addVersionHeaders(headers);
      expect(headers.get('Deprecation')).toBeNull();
    });

    it('should not set Link header when not configured', () => {
      const headers = new Headers();
      addVersionHeaders(headers);
      expect(headers.get('Link')).toBeNull();
    });

    it('should preserve existing headers', () => {
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      addVersionHeaders(headers);
      expect(headers.get('Content-Type')).toBe('application/json');
      expect(headers.get('X-API-Version')).toBe(API_VERSION);
    });
  });
});
