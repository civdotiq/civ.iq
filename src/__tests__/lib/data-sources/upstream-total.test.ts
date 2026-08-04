/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { parseUpstreamTotal } from '@/lib/data-sources/upstream-total';

describe('parseUpstreamTotal', () => {
  it('accepts a numeric count', () => {
    expect(parseUpstreamTotal(3158)).toBe(3158);
  });

  it('accepts a numeric string, which is how ECHO reports QueryRows', () => {
    expect(parseUpstreamTotal('3158')).toBe(3158);
    expect(parseUpstreamTotal(' 607 ')).toBe(607);
  });

  it('preserves a genuine zero rather than losing it as unknown', () => {
    expect(parseUpstreamTotal(0)).toBe(0);
    expect(parseUpstreamTotal('0')).toBe(0);
  });

  it('returns null when the field is missing or unparseable', () => {
    // Null means "upstream did not say", and callers must not substitute the
    // row count — that is the number this field exists to replace.
    expect(parseUpstreamTotal(undefined)).toBeNull();
    expect(parseUpstreamTotal(null)).toBeNull();
    expect(parseUpstreamTotal('')).toBeNull();
    expect(parseUpstreamTotal('unknown')).toBeNull();
    expect(parseUpstreamTotal({})).toBeNull();
  });

  it('rejects non-finite numbers instead of propagating them into a total', () => {
    expect(parseUpstreamTotal(NaN)).toBeNull();
    expect(parseUpstreamTotal(Infinity)).toBeNull();
  });
});
