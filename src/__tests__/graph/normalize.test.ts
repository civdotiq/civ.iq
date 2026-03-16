/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  toCanonicalId,
  parseCanonicalId,
  normalizeOrgName,
  formatNodeLabel,
  toEdgeId,
} from '@/lib/graph/normalize';

describe('Graph Normalize', () => {
  describe('toCanonicalId', () => {
    it('creates representative IDs', () => {
      expect(toCanonicalId('representative', 'P000197')).toBe('rep:P000197');
    });

    it('creates bill IDs', () => {
      expect(toCanonicalId('bill', '119-hr-1234')).toBe('bill:119-hr-1234');
    });

    it('creates committee IDs', () => {
      expect(toCanonicalId('committee', 'SSAS')).toBe('cmte:SSAS');
    });

    it('creates agency IDs', () => {
      expect(toCanonicalId('agency', 'department-of-defense')).toBe('agency:department-of-defense');
    });

    it('creates organization IDs', () => {
      expect(toCanonicalId('organization', 'lockheed-martin')).toBe('org:lockheed-martin');
    });

    it('creates sector IDs', () => {
      expect(toCanonicalId('sector', 'defense')).toBe('sector:defense');
    });

    it('creates contract IDs', () => {
      expect(toCanonicalId('contract', 'W911NF-20-C-0001')).toBe('contract:W911NF-20-C-0001');
    });

    it('creates regulation IDs', () => {
      expect(toCanonicalId('regulation', '2024-12345')).toBe('reg:2024-12345');
    });
  });

  describe('parseCanonicalId', () => {
    it('parses representative IDs', () => {
      expect(parseCanonicalId('rep:P000197')).toEqual({
        type: 'representative',
        identifier: 'P000197',
      });
    });

    it('parses bill IDs', () => {
      expect(parseCanonicalId('bill:119-hr-1234')).toEqual({
        type: 'bill',
        identifier: '119-hr-1234',
      });
    });

    it('parses committee IDs', () => {
      expect(parseCanonicalId('cmte:SSAS')).toEqual({
        type: 'committee',
        identifier: 'SSAS',
      });
    });

    it('returns null for invalid format', () => {
      expect(parseCanonicalId('invalid')).toBeNull();
    });

    it('returns null for empty identifier', () => {
      expect(parseCanonicalId('rep:')).toBeNull();
    });

    it('returns null for unknown prefix', () => {
      expect(parseCanonicalId('foo:bar')).toBeNull();
    });
  });

  describe('normalizeOrgName', () => {
    it('lowercases and slugifies', () => {
      expect(normalizeOrgName('Lockheed Martin Corp.')).toBe('lockheed-martin-corp');
    });

    it('strips leading/trailing hyphens', () => {
      expect(normalizeOrgName('--ACME Inc--')).toBe('acme-inc');
    });

    it('collapses special characters', () => {
      expect(normalizeOrgName('AT&T / Verizon')).toBe('at-t-verizon');
    });
  });

  describe('formatNodeLabel', () => {
    it('formats representative with party-state', () => {
      expect(
        formatNodeLabel('representative', { name: 'Nancy Pelosi', party: 'D', state: 'CA' })
      ).toBe('Nancy Pelosi (D-CA)');
    });

    it('formats representative with name only', () => {
      expect(formatNodeLabel('representative', { name: 'John Doe' })).toBe('John Doe');
    });

    it('formats bill with number and title', () => {
      expect(formatNodeLabel('bill', { number: 'HR 1234', title: 'Some Act' })).toBe(
        'HR 1234: Some Act'
      );
    });

    it('formats committee', () => {
      expect(formatNodeLabel('committee', { name: 'Armed Services' })).toBe('Armed Services');
    });

    it('formats contract with dollar amount', () => {
      expect(formatNodeLabel('contract', { recipientName: 'Boeing', amount: 2_500_000_000 })).toBe(
        'Boeing ($2500.0M)'
      );
    });

    it('returns fallback for missing data', () => {
      expect(formatNodeLabel('representative', {})).toBe('Unknown Representative');
    });
  });

  describe('toEdgeId', () => {
    it('builds deterministic edge ID', () => {
      expect(toEdgeId('org:lockheed', 'donated_to', 'rep:P000197')).toBe(
        'org:lockheed->donated_to->rep:P000197'
      );
    });
  });
});
