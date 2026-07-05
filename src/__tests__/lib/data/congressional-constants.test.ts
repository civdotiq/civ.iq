/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Boundary tests for the dynamic Congress helpers (2026-07 audit item 3).
 * The Jan 3 convening rule (20th Amendment) is the crux: Jan 1–2 of an odd
 * year still belongs to the outgoing Congress.
 */

import {
  getCurrentCongressNumber,
  getCurrentCongressSession,
  getCongressDateRange,
  getCongressNumber,
  CONGRESS_SESSIONS,
} from '@/lib/data/congressional-constants';

describe('getCurrentCongressNumber', () => {
  it('returns 119 throughout 2026', () => {
    expect(getCurrentCongressNumber(new Date('2026-07-05T12:00:00Z'))).toBe(119);
    expect(getCurrentCongressNumber(new Date('2026-12-31T23:59:59Z'))).toBe(119);
  });

  it('keeps the outgoing Congress on Jan 1-2 of an odd year', () => {
    expect(getCurrentCongressNumber(new Date('2027-01-01T00:00:00Z'))).toBe(119);
    expect(getCurrentCongressNumber(new Date('2027-01-02T23:59:59Z'))).toBe(119);
  });

  it('rolls to the new Congress at Jan 3 UTC of an odd year', () => {
    expect(getCurrentCongressNumber(new Date('2027-01-03T00:00:00Z'))).toBe(120);
    expect(getCurrentCongressNumber(new Date('2027-06-01T00:00:00Z'))).toBe(120);
  });

  it('handles the 2025 boundary the same way', () => {
    expect(getCurrentCongressNumber(new Date('2025-01-02T12:00:00Z'))).toBe(118);
    expect(getCurrentCongressNumber(new Date('2025-01-03T00:00:00Z'))).toBe(119);
  });
});

describe('getCongressDateRange', () => {
  it('matches the hardcoded CONGRESS_SESSIONS table for every entry', () => {
    for (const session of Object.values(CONGRESS_SESSIONS)) {
      const range = getCongressDateRange(session.number);
      expect(range.start.toISOString().slice(0, 10)).toBe(session.startDate);
      expect(range.end.toISOString().slice(0, 10)).toBe(session.endDate);
    }
  });
});

describe('getCurrentCongressSession', () => {
  it('returns the 119th session today', () => {
    expect(getCurrentCongressSession(new Date('2026-07-05T12:00:00Z'))?.number).toBe(119);
  });

  it('returns undefined past the last table entry (signal to update the table)', () => {
    expect(getCurrentCongressSession(new Date('2031-06-01T00:00:00Z'))).toBeUndefined();
  });
});

describe('getCongressNumber', () => {
  it('maps years to Congress numbers', () => {
    expect(getCongressNumber(2025)).toBe(119);
    expect(getCongressNumber(2026)).toBe(119);
    expect(getCongressNumber(2027)).toBe(120);
  });
});
