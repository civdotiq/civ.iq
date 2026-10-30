/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import { formatDateOnly } from '@/lib/utils/date-only';

const LINE_DATE = { month: 'short', day: 'numeric', year: 'numeric' } as const;

/**
 * The dates on a profile's "Sources and method" line: "Latest record: Oct
 * 29, 2026 · Checked: Oct 30, 2026". A date that isn't known is left out.
 * Client-safe (profile-dates.ts, which reads them, is server-only).
 */
export function profileDatesLine(
  dates: { latestRecord: string | null; checkedAt: string | null } | null | undefined
): string | undefined {
  if (!dates) return undefined;
  const parts = [
    dates.latestRecord && `Latest record: ${formatDateOnly(dates.latestRecord, LINE_DATE)}`,
    dates.checkedAt && `Checked: ${formatDateOnly(dates.checkedAt, LINE_DATE)}`,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}
