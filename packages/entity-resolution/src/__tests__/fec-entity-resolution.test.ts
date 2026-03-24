import { describe, it, expect } from 'vitest';
import { entitiesMatch, normalizeEntity } from '../fec-entity-resolution';

describe('entitiesMatch - abbreviation expansion', () => {
  it('matches J&J to Johnson & Johnson', () => {
    expect(entitiesMatch({ name: 'J&J' }, { name: 'Johnson & Johnson' })).toBe(true);
  });

  it('matches GM to General Motors Corp', () => {
    expect(entitiesMatch({ name: 'GM' }, { name: 'General Motors Corp' })).toBe(true);
  });

  it('matches GE to General Electric', () => {
    expect(entitiesMatch({ name: 'GE' }, { name: 'General Electric' })).toBe(true);
  });

  it('does not match IBM to Intl Business Machines (partial abbreviation not in table)', () => {
    expect(entitiesMatch({ name: 'IBM' }, { name: 'Intl Business Machines' })).toBe(false);
  });

  it('matches AT&T to AT&T Inc', () => {
    expect(entitiesMatch({ name: 'AT&T' }, { name: 'AT&T Inc' })).toBe(true);
  });

  it('matches JPMorgan to JPMorgan Chase', () => {
    expect(entitiesMatch({ name: 'JPMorgan' }, { name: 'JPMorgan Chase' })).toBe(true);
  });

  it('matches BofA to Bank of America', () => {
    expect(entitiesMatch({ name: 'BofA' }, { name: 'Bank of America' })).toBe(true);
  });
});

describe('entitiesMatch - existing Levenshtein behavior preserved', () => {
  it('matches exact names', () => {
    expect(entitiesMatch({ name: 'Google Inc' }, { name: 'Google Inc' })).toBe(true);
  });

  it('matches similar names above threshold', () => {
    expect(entitiesMatch({ name: 'Google Inc' }, { name: 'Google Inc.' })).toBe(true);
  });

  it('rejects dissimilar names', () => {
    expect(entitiesMatch({ name: 'Google' }, { name: 'Microsoft' })).toBe(false);
  });
});

describe('normalizeEntity', () => {
  it('normalizes organization names', () => {
    const result = normalizeEntity('Google Inc.');
    expect(result.entityType).toBe('organization');
    expect(result.normalizedName).toBe('GOOGLE');
  });

  it('normalizes individual names from LAST, FIRST format', () => {
    const result = normalizeEntity('SMITH, JOHN');
    expect(result.entityType).toBe('individual');
    expect(result.displayName).toBe('JOHN SMITH');
  });
});
