/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { parseBillSlug } from '@/lib/data/bill-slug';
import { CURRENT_CONGRESS } from '@/lib/data/congressional-constants';

describe('parseBillSlug', () => {
  describe('canonical shape', () => {
    it('accepts `<congress>-<type>-<number>`', () => {
      expect(parseBillSlug('119-hr-7682')).toEqual({
        kind: 'canonical',
        canonical: '119-hr-7682',
      });
    });

    it('lowercases the type segment', () => {
      expect(parseBillSlug('119-HR-7682')).toEqual({
        kind: 'canonical',
        canonical: '119-hr-7682',
      });
    });

    it('accepts all recognized bill types', () => {
      for (const type of ['hr', 's', 'hres', 'sres', 'hjres', 'sjres', 'hconres', 'sconres']) {
        const result = parseBillSlug(`119-${type}-1`);
        expect(result.kind).toBe('canonical');
      }
    });

    it('rejects unknown bill types', () => {
      expect(parseBillSlug('119-xyz-1')).toEqual({ kind: 'invalid' });
    });
  });

  describe('recoverable shapes', () => {
    const currentCongress = String(CURRENT_CONGRESS.number);

    it('recovers `<type>-<number>` by assuming current Congress', () => {
      expect(parseBillSlug('hr-7682')).toEqual({
        kind: 'recoverable',
        canonical: `${currentCongress}-hr-7682`,
      });
    });

    it('recovers `<TYPE><number>` (no dashes, uppercase)', () => {
      expect(parseBillSlug('HR7682')).toEqual({
        kind: 'recoverable',
        canonical: `${currentCongress}-hr-7682`,
      });
    });

    it('recovers `<type><number>-<congress>`', () => {
      expect(parseBillSlug('hr7682-119')).toEqual({
        kind: 'recoverable',
        canonical: '119-hr-7682',
      });
    });
  });

  describe('invalid inputs', () => {
    it.each([
      ['empty string', ''],
      ['garbage', 'not-a-bill'],
      ['trailing slash', 'hr-7682/'],
      ['zero number', 'hr-0'],
      ['letters in number', 'hr-abc'],
      ['negative sign', '-hr-7682'],
      ['unknown suffix', '119-hr-7682-extra'],
    ])('rejects %s', (_label, slug) => {
      expect(parseBillSlug(slug)).toEqual({ kind: 'invalid' });
    });
  });
});
