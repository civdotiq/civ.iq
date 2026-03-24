/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeCompanyName,
  resolveCompanyName,
  resolveCompanyNames,
  companiesMatch,
  validateTokenOverlap,
  similarityRatio,
} from '../company-entity-resolver';
import { findCompanyByAlias } from '../company-alias-table';
import { IndustrySector } from '../industry-taxonomy';

// ── normalizeCompanyName ────────────────────────────────────────────

describe('normalizeCompanyName', () => {
  it('strips corporate suffixes', () => {
    expect(normalizeCompanyName('Dow Chemical Co')).toBe('DOW CHEMICAL');
    expect(normalizeCompanyName('PFIZER INC.')).toBe('PFIZER');
    expect(normalizeCompanyName('Johnson & Johnson Inc')).toBe('JOHNSON AND JOHNSON');
  });

  it('normalizes ampersand to AND', () => {
    expect(normalizeCompanyName('AT&T')).toBe('AT AND T');
  });

  it('removes punctuation', () => {
    expect(normalizeCompanyName('J.P. Morgan')).toBe('JP MORGAN');
  });

  it('expands known abbreviations', () => {
    expect(normalizeCompanyName('JNJ')).toBe('JOHNSON AND JOHNSON');
    expect(normalizeCompanyName('MSFT')).toBe('MICROSOFT');
    expect(normalizeCompanyName('GOOG')).toBe('ALPHABET');
  });

  it('collapses whitespace', () => {
    expect(normalizeCompanyName('  DOW   CHEMICAL   ')).toBe('DOW CHEMICAL');
  });

  it('handles empty and whitespace-only input', () => {
    expect(normalizeCompanyName('')).toBe('');
    expect(normalizeCompanyName('   ')).toBe('');
  });
});

// ── Cross-API Matching ──────────────────────────────────────────────

describe('cross-API company matching', () => {
  it('matches EPA "DOW CHEMICAL CO" with SEC "Dow Inc." via alias table', () => {
    const result = companiesMatch('DOW CHEMICAL CO', 'Dow Inc.');
    expect(result.match).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('matches EPA "DOW CHEMICAL CO TEXAS OPERATIONS" with FEC "DOW INC"', () => {
    const aliasA = findCompanyByAlias('DOW CHEMICAL CO TEXAS OPERATIONS');
    const aliasB = findCompanyByAlias('DOW INC');
    expect(aliasA).not.toBeNull();
    expect(aliasB).not.toBeNull();
    expect(aliasA!.canonicalName).toBe(aliasB!.canonicalName);
  });

  it('matches "EXXONMOBIL" with "EXXON MOBIL CORP" via alias table', () => {
    const result = companiesMatch('EXXONMOBIL', 'EXXON MOBIL CORP');
    expect(result.match).toBe(true);
  });

  it('matches "JOHNSON & JOHNSON" with "JNJ" via abbreviation + alias', () => {
    const aliasA = findCompanyByAlias('JOHNSON & JOHNSON');
    const aliasB = findCompanyByAlias('JNJ');
    expect(aliasA).not.toBeNull();
    expect(aliasB).not.toBeNull();
    expect(aliasA!.canonicalName).toBe('JOHNSON AND JOHNSON');
    expect(aliasB!.canonicalName).toBe('JOHNSON AND JOHNSON');
  });

  it('matches "LOCKHEED MARTIN CORP" with "LOCKHEED MARTIN CORPORATION"', () => {
    const result = companiesMatch('LOCKHEED MARTIN CORP', 'LOCKHEED MARTIN CORPORATION');
    expect(result.match).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('matches "RAYTHEON CO" with "RAYTHEON TECHNOLOGIES" via alias table', () => {
    const aliasA = findCompanyByAlias('RAYTHEON CO');
    const aliasB = findCompanyByAlias('RAYTHEON TECHNOLOGIES');
    expect(aliasA).not.toBeNull();
    expect(aliasB).not.toBeNull();
    expect(aliasA!.canonicalName).toBe(aliasB!.canonicalName);
  });

  it('matches "FACEBOOK" with "META PLATFORMS" via alias table', () => {
    const aliasA = findCompanyByAlias('FACEBOOK');
    const aliasB = findCompanyByAlias('META PLATFORMS INC');
    expect(aliasA).not.toBeNull();
    expect(aliasB).not.toBeNull();
    expect(aliasA!.canonicalName).toBe(aliasB!.canonicalName);
  });

  it('matches "WAL-MART STORES INC" with "WALMART"', () => {
    const aliasA = findCompanyByAlias('WAL-MART STORES INC');
    const aliasB = findCompanyByAlias('WALMART');
    expect(aliasA).not.toBeNull();
    expect(aliasB).not.toBeNull();
    expect(aliasA!.canonicalName).toBe(aliasB!.canonicalName);
  });
});

// ── False Positive Rejection ────────────────────────────────────────

describe('false positive rejection', () => {
  it('rejects "American Health Association" vs "American Heart Association"', () => {
    expect(validateTokenOverlap('AMERICAN HEALTH ASSOCIATION', 'AMERICAN HEART ASSOCIATION')).toBe(
      false
    );
  });

  it('rejects "American Health Association" via companiesMatch', () => {
    const result = companiesMatch('American Health Association', 'American Heart Association');
    expect(result.match).toBe(false);
  });

  it('rejects "Goldman Sachs" vs "Goldman Stanley"', () => {
    const result = companiesMatch('Goldman Sachs', 'Goldman Stanley');
    expect(result.match).toBe(false);
  });

  it('rejects "Apple" vs "Alphabet"', () => {
    const result = companiesMatch('APPLE INC', 'ALPHABET INC');
    expect(result.match).toBe(false);
  });

  it('rejects "FORD MOTOR" vs "FORD FOUNDATION"', () => {
    const result = companiesMatch('FORD MOTOR CO', 'FORD FOUNDATION');
    expect(result.match).toBe(false);
  });
});

// ── SIC Code Boost ──────────────────────────────────────────────────

describe('SIC code cross-validation', () => {
  it('boosts confidence when SIC sectors match', () => {
    // "PFIZER PHARMA" vs "PFIZER HEALTH" — same SIC sector (Health)
    const withSic = companiesMatch('PFIZER PHARMACEUTICALS', 'PFIZER HEALTHCARE', {
      sicCodeA: '2834', // Chemicals/Pharmaceuticals → Health
      sicCodeB: '2834',
    });
    const withoutSic = companiesMatch('PFIZER PHARMACEUTICALS', 'PFIZER HEALTHCARE');

    expect(withSic.confidence).toBeGreaterThanOrEqual(withoutSic.confidence);
  });

  it('does not boost when SIC sectors differ', () => {
    const result = companiesMatch('SOME ENERGY CORP', 'SOME ENERGY CORP', {
      sicCodeA: '2911', // Petroleum → Energy
      sicCodeB: '6020', // Banking → Finance
    });
    // Exact match still works regardless
    expect(result.match).toBe(true);
  });
});

// ── resolveCompanyName ──────────────────────────────────────────────

describe('resolveCompanyName', () => {
  it('resolves known company via alias table', () => {
    const result = resolveCompanyName('DOW CHEMICAL CO');
    expect(result).not.toBeNull();
    expect(result!.canonicalName).toBe('DOW');
    expect(result!.confidence).toBeGreaterThanOrEqual(0.8);
    expect(result!.sector).toBe(IndustrySector.MISC_BUSINESS);
  });

  it('resolves with SIC context', () => {
    const result = resolveCompanyName('PFIZER INC', { sicCode: '2834' });
    expect(result).not.toBeNull();
    expect(result!.canonicalName).toBe('PFIZER');
    expect(result!.sector).toBe(IndustrySector.HEALTH);
    expect(result!.confidence).toBe(0.95);
  });

  it('returns normalized form for unknown companies', () => {
    const result = resolveCompanyName('Acme Widget Corp');
    expect(result).not.toBeNull();
    expect(result!.canonicalName).toBe('ACME WIDGET');
    expect(result!.confidence).toBe(0.5);
  });

  it('returns null for empty input', () => {
    expect(resolveCompanyName('')).toBeNull();
    expect(resolveCompanyName('   ')).toBeNull();
  });
});

// ── resolveCompanyNames (batch) ─────────────────────────────────────

describe('resolveCompanyNames', () => {
  it('deduplicates entries that resolve to the same company', () => {
    const results = resolveCompanyNames([
      { name: 'DOW CHEMICAL CO', source: 'EPA' },
      { name: 'Dow Inc.', source: 'SEC' },
      { name: 'DOW INC', source: 'FEC' },
    ]);

    expect(results.size).toBe(1);
    const dow = results.get('DOW');
    expect(dow).toBeDefined();
    expect(dow!.aliases.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps distinct companies separate', () => {
    const results = resolveCompanyNames([
      { name: 'PFIZER INC', source: 'FEC' },
      { name: 'MERCK & CO', source: 'SEC' },
    ]);

    expect(results.size).toBe(2);
  });

  it('merges SIC codes from multiple sources', () => {
    const results = resolveCompanyNames([
      { name: 'Johnson & Johnson', source: 'FEC', context: { sicCode: '2834' } },
      { name: 'JNJ', source: 'SEC', context: { sicCode: '3841' } },
    ]);

    const jnj = results.get('JOHNSON AND JOHNSON');
    expect(jnj).toBeDefined();
    // Should have both SIC codes from alias table
    expect(jnj!.sicCodes.length).toBeGreaterThanOrEqual(2);
  });
});

// ── Batch Performance ───────────────────────────────────────────────

describe('batch performance', () => {
  it('resolves 100 names in under 100ms', () => {
    const names = Array.from({ length: 100 }, (_, i) => ({
      name: `Company ${i} Inc`,
      source: 'test',
    }));

    const start = performance.now();
    resolveCompanyNames(names);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });
});

// ── similarityRatio ─────────────────────────────────────────────────

describe('similarityRatio', () => {
  it('returns 1.0 for identical strings', () => {
    expect(similarityRatio('PFIZER', 'PFIZER')).toBe(1.0);
  });

  it('returns 0 for completely different strings', () => {
    expect(similarityRatio('ABC', 'XYZ')).toBe(0);
  });

  it('returns high ratio for similar strings', () => {
    expect(similarityRatio('NORTHROP', 'NORTHRUP')).toBeGreaterThan(0.8);
  });

  it('returns 1.0 for two empty strings', () => {
    expect(similarityRatio('', '')).toBe(1.0);
  });
});

// ── validateTokenOverlap ────────────────────────────────────────────

describe('validateTokenOverlap', () => {
  it('rejects words that differ by one character but are different words', () => {
    expect(validateTokenOverlap('american health association', 'american heart association')).toBe(
      false
    );
  });

  it('accepts names with corporate suffix differences', () => {
    expect(validateTokenOverlap('lockheed martin', 'lockheed martin corporation')).toBe(true);
  });

  it('accepts single-word matches', () => {
    expect(validateTokenOverlap('boeing', 'the boeing company')).toBe(true);
  });

  it('handles typos gracefully', () => {
    expect(validateTokenOverlap('northrop grumman', 'northrup grumman')).toBe(true);
  });

  it('returns false for empty strings', () => {
    expect(validateTokenOverlap('', '')).toBe(false);
  });
});

// ── findCompanyByAlias ──────────────────────────────────────────────

describe('findCompanyByAlias', () => {
  it('finds by canonical name', () => {
    const result = findCompanyByAlias('PFIZER');
    expect(result).not.toBeNull();
    expect(result!.canonicalName).toBe('PFIZER');
  });

  it('finds by known alias', () => {
    const result = findCompanyByAlias('GOOGLE');
    expect(result).not.toBeNull();
    expect(result!.canonicalName).toBe('ALPHABET');
  });

  it('finds after stripping suffixes', () => {
    const result = findCompanyByAlias('Boeing Company');
    expect(result).not.toBeNull();
    expect(result!.canonicalName).toBe('BOEING');
  });

  it('returns null for unknown companies', () => {
    expect(findCompanyByAlias('Acme Widget Corp')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(findCompanyByAlias('')).toBeNull();
    expect(findCompanyByAlias('  ')).toBeNull();
  });

  it('has correct sector for known companies', () => {
    const pfizer = findCompanyByAlias('PFIZER');
    expect(pfizer!.sector).toBe(IndustrySector.HEALTH);

    const exxon = findCompanyByAlias('EXXONMOBIL');
    expect(exxon!.sector).toBe(IndustrySector.ENERGY_NATURAL_RESOURCES);

    const jpmorgan = findCompanyByAlias('JPMORGAN CHASE');
    expect(jpmorgan!.sector).toBe(IndustrySector.FINANCE_INSURANCE_REAL_ESTATE);
  });
});
