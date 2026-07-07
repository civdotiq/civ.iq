/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * ISO-week helpers for the weekly digest.
 *
 * Week ids follow ISO 8601: `2026-W28` runs Monday–Sunday. The digest
 * publishes each Monday covering the week that just ended, so "latest
 * publishable week" is the last COMPLETE ISO week, never the running one.
 */

export interface WeekRange {
  weekId: string;
  /** Monday 00:00:00 UTC */
  start: Date;
  /** Sunday 23:59:59.999 UTC */
  end: Date;
}

const WEEK_ID = /^(\d{4})-W(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** ISO week number + ISO week-year for a date (UTC). */
function isoWeekParts(date: Date): { year: number; week: number } {
  // Thursday of the same ISO week determines the week-year.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // Sunday → 7
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/** Monday 00:00 UTC of the ISO week containing `date`. */
function mondayOf(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d;
}

export function weekIdForDate(date: Date): string {
  const { year, week } = isoWeekParts(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Parse a week id into its UTC date range. Returns null on bad input. */
export function parseWeekId(weekId: string): WeekRange | null {
  const match = weekId.match(WEEK_ID);
  if (!match) return null;
  const year = parseInt(match[1] ?? '', 10);
  const week = parseInt(match[2] ?? '', 10);
  if (week < 1 || week > 53) return null;

  // Jan 4 is always in ISO week 1; walk to that week's Monday, then offset.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const start = mondayOf(jan4);
  start.setUTCDate(start.getUTCDate() + (week - 1) * 7);
  // Reject week 53 of years that only have 52 weeks.
  if (weekIdForDate(start) !== weekId) return null;

  const end = new Date(start.getTime() + 7 * MS_PER_DAY - 1);
  return { weekId, start, end };
}

/** The most recent COMPLETE ISO week (the one before the week of `now`). */
export function latestCompleteWeekId(now: Date = new Date()): string {
  const thisMonday = mondayOf(now);
  const lastWeek = new Date(thisMonday.getTime() - 7 * MS_PER_DAY);
  return weekIdForDate(lastWeek);
}

/** Week ids counting back from (and including) `fromWeekId`. */
export function previousWeekIds(fromWeekId: string, count: number): string[] {
  const range = parseWeekId(fromWeekId);
  if (!range) return [];
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const monday = new Date(range.start.getTime() - i * 7 * MS_PER_DAY);
    ids.push(weekIdForDate(monday));
  }
  return ids;
}

/** True when the week has fully elapsed (safe to treat as immutable). */
export function isCompleteWeek(weekId: string, now: Date = new Date()): boolean {
  const range = parseWeekId(weekId);
  if (!range) return false;
  return range.end.getTime() < now.getTime();
}

/** Human label like "Jul 6 – Jul 12, 2026" (UTC month/day). */
export function formatWeekRange(range: WeekRange): string {
  const fmt = (d: Date, withYear: boolean) =>
    d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(withYear ? { year: 'numeric' } : {}),
      timeZone: 'UTC',
    });
  return `${fmt(range.start, false)} – ${fmt(range.end, true)}`;
}
