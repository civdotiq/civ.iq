/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { displayName, titleCase } from '@/components/elections/ElectionPage/data';

describe('FEC candidate name casing', () => {
  it('reorders "LAST, FIRST" and title-cases', () => {
    expect(displayName('MORTON, MAURICE GERARD')).toBe('Maurice Gerard Morton');
  });

  it('keeps the inner capital in Mc surnames', () => {
    expect(displayName('MCKINNEY, DONAVAN')).toBe('Donavan McKinney');
  });

  it('capitalizes apostrophe and hyphen segments', () => {
    expect(displayName("O'ROURKE, ROBERT")).toBe("Robert O'Rourke");
    expect(titleCase('ALEXANDRIA OCASIO-CORTEZ')).toBe('Alexandria Ocasio-Cortez');
  });

  it('keeps roman-numeral suffixes uppercase', () => {
    expect(titleCase('JOHN SMITH III')).toBe('John Smith III');
  });
});
