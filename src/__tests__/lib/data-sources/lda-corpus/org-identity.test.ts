/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  addVariant,
  organizationKey,
  pickDisplayName,
} from '@/lib/data-sources/lda-corpus/org-identity';

describe('organizationKey', () => {
  it('collapses the spellings one company files under', () => {
    const keys = new Set(
      ['Acme Corp.', 'ACME CORPORATION', 'Acme Corp', 'acme corp.'].map(organizationKey)
    );

    expect(keys.size).toBe(1);
  });

  it('keeps genuinely different organizations apart', () => {
    expect(organizationKey('Acme Corp')).not.toBe(organizationKey('Acme Health Systems'));
  });

  it('falls back to a trimmed uppercase form rather than dropping a name', () => {
    // A name the normalizer cannot reduce must still produce a usable key —
    // an empty key would silently merge unrelated rows into one bucket.
    expect(organizationKey('  ...  ')).not.toBe('');
    expect(organizationKey('  ...  ')).toBe(organizationKey('...'));
  });
});

describe('pickDisplayName', () => {
  it('shows the spelling the organization files under most often', () => {
    const variants = new Map<string, number>();
    for (let i = 0; i < 3; i++) addVariant(variants, 'Acme Corporation');
    addVariant(variants, 'ACME CORP.');

    expect(pickDisplayName(variants)).toBe('Acme Corporation');
  });

  it('breaks a tie toward the more complete name', () => {
    const variants = new Map<string, number>();
    addVariant(variants, 'Acme Corp');
    addVariant(variants, 'Acme Corporation');

    expect(pickDisplayName(variants)).toBe('Acme Corporation');
  });

  it('never returns a canonical key, which is not a name a citizen should read', () => {
    const variants = new Map<string, number>();
    addVariant(variants, 'Chamber of Commerce of the U.S.A.');

    const shown = pickDisplayName(variants);
    expect(shown).toBe('Chamber of Commerce of the U.S.A.');
    expect(shown).not.toBe(organizationKey('Chamber of Commerce of the U.S.A.'));
  });

  it('returns an empty string for an empty group so callers can fall back', () => {
    expect(pickDisplayName(new Map())).toBe('');
  });
});
