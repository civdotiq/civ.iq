/**
 * Tests for district-ID canonicalization.
 * Regression coverage for Phase 7d of AUDIT-federal-demo-readiness.md:
 * four input shapes (`NY-8`, `ny-08`, `NY-08`, `NY8`) must all normalize
 * to the same canonical slug.
 */

import { canonicalizeDistrictId } from '@/lib/helpers/url-builders';

describe('canonicalizeDistrictId', () => {
  it('normalizes all four accepted variants to the same canonical form', () => {
    const variants = ['NY-8', 'ny-08', 'NY-08', 'NY8'];
    const canonicals = variants.map(v => canonicalizeDistrictId(v)?.canonical);
    expect(canonicals).toEqual(['NY-08', 'NY-08', 'NY-08', 'NY-08']);
  });

  it('uppercases the state code', () => {
    expect(canonicalizeDistrictId('ca-12')?.canonical).toBe('CA-12');
  });

  it('zero-pads single-digit districts', () => {
    expect(canonicalizeDistrictId('MI-1')?.canonical).toBe('MI-01');
    expect(canonicalizeDistrictId('MI-9')?.canonical).toBe('MI-09');
  });

  it('preserves two-digit districts', () => {
    expect(canonicalizeDistrictId('CA-52')?.canonical).toBe('CA-52');
  });

  it('canonicalizes at-large districts to AL', () => {
    expect(canonicalizeDistrictId('AK-AL')?.canonical).toBe('AK-AL');
    expect(canonicalizeDistrictId('ak-al')?.canonical).toBe('AK-AL');
    expect(canonicalizeDistrictId('AKAL')?.canonical).toBe('AK-AL');
    expect(canonicalizeDistrictId('AK-0')?.canonical).toBe('AK-AL');
    expect(canonicalizeDistrictId('AK-00')?.canonical).toBe('AK-AL');
  });

  it('canonicalizes STATE (senate) suffix, only when hyphenated', () => {
    expect(canonicalizeDistrictId('NY-STATE')?.canonical).toBe('NY-STATE');
    expect(canonicalizeDistrictId('ny-state')?.canonical).toBe('NY-STATE');
    expect(canonicalizeDistrictId('NYSTATE')).toBeNull();
  });

  it('flags canonical when no change is needed', () => {
    const result = canonicalizeDistrictId('NY-08');
    expect(result).not.toBeNull();
    expect(result?.canonical).toBe('NY-08');
    expect(result?.canonical === 'NY-08').toBe(true);
  });

  it('returns null for malformed input', () => {
    expect(canonicalizeDistrictId('')).toBeNull();
    expect(canonicalizeDistrictId('NEWYORK-8')).toBeNull();
    expect(canonicalizeDistrictId('NY-999')).toBeNull();
    expect(canonicalizeDistrictId('NY--8')).toBeNull();
    expect(canonicalizeDistrictId('8-NY')).toBeNull();
    expect(canonicalizeDistrictId('N-8')).toBeNull();
  });

  it('detects whether input already matches canonical', () => {
    const canonical = canonicalizeDistrictId('NY-08');
    const nonCanonical = canonicalizeDistrictId('ny-8');
    expect(canonical?.canonical).toBe('NY-08');
    expect(nonCanonical?.canonical).toBe('NY-08');
    // Page.tsx guards on: parsed.canonical !== inputDistrictId
    expect('NY-08' === canonical?.canonical).toBe(true);
    expect('ny-8' === nonCanonical?.canonical).toBe(false);
  });
});
