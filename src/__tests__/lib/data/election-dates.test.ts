/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  getGeneralElectionDay,
  getGeneralElectionDayISO,
  generalElectionHasPassed,
  nextGeneralElectionYear,
} from '@/lib/data/election-dates';

describe('election-dates', () => {
  it('computes the Tuesday after the first Monday in November', () => {
    expect(getGeneralElectionDayISO(2022)).toBe('2022-11-08');
    expect(getGeneralElectionDayISO(2024)).toBe('2024-11-05');
    expect(getGeneralElectionDayISO(2026)).toBe('2026-11-03');
    expect(getGeneralElectionDayISO(2028)).toBe('2028-11-07');
  });

  it('returns a UTC-midnight Date', () => {
    const day = getGeneralElectionDay(2026);
    expect(day.getUTCHours()).toBe(0);
    expect(day.getUTCDay()).toBe(2); // Tuesday
  });

  it('treats election day as passed only after the full UTC day', () => {
    expect(generalElectionHasPassed(2026, new Date('2026-11-03T12:00:00Z'))).toBe(false);
    expect(generalElectionHasPassed(2026, new Date('2026-11-04T00:00:00Z'))).toBe(true);
    expect(generalElectionHasPassed(2024, new Date('2026-08-08T00:00:00Z'))).toBe(true);
  });

  it('rolls the next general year forward once election day has passed', () => {
    expect(nextGeneralElectionYear(new Date('2026-08-08T00:00:00Z'))).toBe(2026);
    expect(nextGeneralElectionYear(new Date('2026-11-04T00:00:00Z'))).toBe(2028);
    expect(nextGeneralElectionYear(new Date('2025-06-01T00:00:00Z'))).toBe(2026);
  });
});
