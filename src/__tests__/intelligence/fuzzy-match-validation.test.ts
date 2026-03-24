/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for token-overlap validation in fuzzy org name matching.
 *
 * Levenshtein similarity alone produces false positives for names that
 * differ by a single word (e.g., "Health" vs "Heart"). Token overlap
 * acts as a second gate to prevent wrong-org attribution.
 */

import { validateTokenOverlap } from '@civiq/entity-resolution';

describe('validateTokenOverlap', () => {
  it('rejects "american health association" vs "american heart association"', () => {
    expect(validateTokenOverlap('american health association', 'american heart association')).toBe(
      false
    );
  });

  it('accepts "raytheon" vs "raytheon technologies"', () => {
    expect(validateTokenOverlap('raytheon', 'raytheon technologies')).toBe(true);
  });

  it('accepts "lockheed martin" vs "lockheed martin corporation"', () => {
    expect(validateTokenOverlap('lockheed martin', 'lockheed martin corporation')).toBe(true);
  });

  it('accepts "boeing" vs "the boeing company"', () => {
    expect(validateTokenOverlap('boeing', 'the boeing company')).toBe(true);
  });

  it('accepts "pfizer" vs "pfizer inc"', () => {
    expect(validateTokenOverlap('pfizer', 'pfizer inc')).toBe(true);
  });

  it('accepts "northrop grumman" vs "northrup grumman" (typo)', () => {
    // "northrop" vs "northrup" = 1 char diff, similarity ~0.875 > 0.75 token threshold
    expect(validateTokenOverlap('northrop grumman', 'northrup grumman')).toBe(true);
  });
});
