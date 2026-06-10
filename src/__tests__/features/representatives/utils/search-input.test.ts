/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { classifySearchInput, extractZip5 } from '@/features/representatives/utils/search-input';

describe('classifySearchInput', () => {
  it('classifies 5-digit ZIPs as zip', () => {
    expect(classifySearchInput('48201')).toBe('zip');
    expect(classifySearchInput(' 49503 ')).toBe('zip');
  });

  it('classifies ZIP+4 as zip', () => {
    expect(classifySearchInput('48201-1234')).toBe('zip');
  });

  it('classifies full street addresses as address', () => {
    expect(classifySearchInput('123 Main St, Detroit, MI')).toBe('address');
    expect(classifySearchInput('1600 Pennsylvania Ave NW, Washington, DC 20500')).toBe('address');
  });

  it('does not treat non-ZIP numerics as zip', () => {
    expect(classifySearchInput('1234')).toBe('address');
    expect(classifySearchInput('123456')).toBe('address');
  });

  it('flags inputs under 3 characters as too-short', () => {
    expect(classifySearchInput('MI')).toBe('too-short');
    expect(classifySearchInput('  a ')).toBe('too-short');
    expect(classifySearchInput('')).toBe('too-short');
  });
});

describe('extractZip5', () => {
  it('returns the 5-digit prefix of a ZIP+4', () => {
    expect(extractZip5('48201-1234')).toBe('48201');
  });

  it('returns a plain 5-digit ZIP unchanged', () => {
    expect(extractZip5(' 48201 ')).toBe('48201');
  });
});
