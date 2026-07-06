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
  getGeneralElectionDay,
  getNextHouseElection,
  getNextSenateElection,
  getNextSenateElectionFromTermEnd,
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

describe('getGeneralElectionDay', () => {
  it('returns the Tuesday after the first Monday in November', () => {
    // Known federal general election days
    expect(getGeneralElectionDay(2024).toISOString().slice(0, 10)).toBe('2024-11-05');
    expect(getGeneralElectionDay(2026).toISOString().slice(0, 10)).toBe('2026-11-03');
    expect(getGeneralElectionDay(2028).toISOString().slice(0, 10)).toBe('2028-11-07');
    // Nov 1 on a Tuesday pushes the first Monday (and the election) latest
    expect(getGeneralElectionDay(2022).toISOString().slice(0, 10)).toBe('2022-11-08');
  });
});

describe('getNextHouseElection', () => {
  it('returns the current even year through election day', () => {
    expect(getNextHouseElection(new Date('2026-07-06T12:00:00Z'))).toBe(2026);
    expect(getNextHouseElection(new Date('2026-11-03T23:00:00Z'))).toBe(2026);
  });

  it('rolls two years forward the day after a November election', () => {
    expect(getNextHouseElection(new Date('2026-11-04T00:00:00Z'))).toBe(2028);
    expect(getNextHouseElection(new Date('2026-12-31T00:00:00Z'))).toBe(2028);
  });

  it('returns the next even year during odd years', () => {
    expect(getNextHouseElection(new Date('2027-01-15T00:00:00Z'))).toBe(2028);
  });
});

describe('getNextSenateElection', () => {
  it('maps each class to its next cycle year from a fixed date', () => {
    const now = new Date('2026-07-06T12:00:00Z');
    expect(getNextSenateElection('OH', 1, now)).toBe(2030);
    expect(getNextSenateElection('GA', 2, now)).toBe(2026);
    expect(getNextSenateElection('AZ', 3, now)).toBe(2028);
  });

  it('rolls a class forward once its election has passed', () => {
    const after2026Election = new Date('2026-11-04T00:00:00Z');
    expect(getNextSenateElection('GA', 2, after2026Election)).toBe(2032);
    // Other classes are unaffected
    expect(getNextSenateElection('OH', 1, after2026Election)).toBe(2030);
  });

  it('falls back to the nearest class election for the state when class is unknown', () => {
    // Vermont has Class I and Class III seats: nearest from mid-2026 is 2028
    expect(getNextSenateElection('VT', undefined, new Date('2026-07-06T12:00:00Z'))).toBe(2028);
    // Georgia has Class II and Class III seats: nearest is 2026
    expect(getNextSenateElection('GA', undefined, new Date('2026-07-06T12:00:00Z'))).toBe(2026);
  });
});

describe('getNextSenateElectionFromTermEnd', () => {
  it('anchors the cycle at term end minus one (terms end Jan 3 after the election)', () => {
    const now = new Date('2026-07-06T12:00:00Z');
    expect(getNextSenateElectionFromTermEnd(2029, now)).toBe(2028);
    expect(getNextSenateElectionFromTermEnd(2031, now)).toBe(2030);
    expect(getNextSenateElectionFromTermEnd(2027, now)).toBe(2026);
  });

  it('rolls stale term data forward through 6-year cycles', () => {
    const now = new Date('2026-07-06T12:00:00Z');
    // Term ended Jan 2025 → seat was up in 2024 → next up in 2030
    expect(getNextSenateElectionFromTermEnd(2025, now)).toBe(2030);
  });
});
