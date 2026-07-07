/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  weekIdForDate,
  parseWeekId,
  latestCompleteWeekId,
  previousWeekIds,
  isCompleteWeek,
  formatWeekRange,
} from '@/lib/digest/week';

describe('digest week math', () => {
  describe('weekIdForDate', () => {
    it('assigns midweek dates to their ISO week', () => {
      expect(weekIdForDate(new Date(Date.UTC(2026, 6, 7)))).toBe('2026-W28'); // Tue Jul 7 2026
    });

    it('keeps Sunday in the same ISO week as the preceding Monday', () => {
      expect(weekIdForDate(new Date(Date.UTC(2026, 6, 12)))).toBe('2026-W28'); // Sun Jul 12
      expect(weekIdForDate(new Date(Date.UTC(2026, 6, 13)))).toBe('2026-W29'); // Mon Jul 13
    });

    it('handles year boundaries by ISO week-year', () => {
      // Jan 1 2027 is a Friday — still ISO week 53 of 2026.
      expect(weekIdForDate(new Date(Date.UTC(2027, 0, 1)))).toBe('2026-W53');
      // Dec 29 2025 (Mon) opens ISO week 1 of 2026.
      expect(weekIdForDate(new Date(Date.UTC(2025, 11, 29)))).toBe('2026-W01');
    });
  });

  describe('parseWeekId', () => {
    it('round-trips with weekIdForDate', () => {
      const range = parseWeekId('2026-W28');
      expect(range).not.toBeNull();
      expect(weekIdForDate(range!.start)).toBe('2026-W28');
      expect(weekIdForDate(range!.end)).toBe('2026-W28');
    });

    it('produces a Monday-to-Sunday UTC window', () => {
      const range = parseWeekId('2026-W28')!;
      expect(range.start.toISOString()).toBe('2026-07-06T00:00:00.000Z');
      expect(range.end.toISOString()).toBe('2026-07-12T23:59:59.999Z');
      expect(range.start.getUTCDay()).toBe(1);
      expect(range.end.getUTCDay()).toBe(0);
    });

    it('rejects malformed ids', () => {
      expect(parseWeekId('2026-28')).toBeNull();
      expect(parseWeekId('2026-W00')).toBeNull();
      expect(parseWeekId('2026-W54')).toBeNull();
      expect(parseWeekId('garbage')).toBeNull();
    });

    it('rejects week 53 in 52-week years', () => {
      // 2026 has 53 ISO weeks; 2025 has 52.
      expect(parseWeekId('2026-W53')).not.toBeNull();
      expect(parseWeekId('2025-W53')).toBeNull();
    });
  });

  describe('latestCompleteWeekId', () => {
    it('returns the previous week during a running week', () => {
      expect(latestCompleteWeekId(new Date(Date.UTC(2026, 6, 7, 12)))).toBe('2026-W27');
    });

    it('returns last week even on Monday morning of a new week', () => {
      expect(latestCompleteWeekId(new Date(Date.UTC(2026, 6, 13, 0)))).toBe('2026-W28');
    });
  });

  describe('previousWeekIds', () => {
    it('counts back across year boundaries', () => {
      expect(previousWeekIds('2026-W02', 3)).toEqual(['2026-W02', '2026-W01', '2025-W52']);
    });
  });

  describe('isCompleteWeek', () => {
    it('is false for the running week and true once it ends', () => {
      const during = new Date(Date.UTC(2026, 6, 8));
      const after = new Date(Date.UTC(2026, 6, 13));
      expect(isCompleteWeek('2026-W28', during)).toBe(false);
      expect(isCompleteWeek('2026-W28', after)).toBe(true);
    });
  });

  describe('formatWeekRange', () => {
    it('formats the Monday–Sunday span', () => {
      const range = parseWeekId('2026-W28')!;
      expect(formatWeekRange(range)).toBe('Jul 6 – Jul 12, 2026');
    });
  });
});
