/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Bill pages render on the server (UTC on Vercel) and hydrate in the reader's
 * browser. Any date that depends on the runtime's timezone prints a different
 * day on each side, which breaks hydration (React #418) and shows readers a
 * different day than the record.
 */

import { formatDateOnly } from '@/lib/utils/date-only';

describe('formatDateOnly', () => {
  it('keeps a date-only record on its own day', () => {
    expect(formatDateOnly('2025-07-17')).toBe('7/17/2025');
  });

  it("puts a timestamp on Congress's clock: 06:30Z is 2:30 AM Eastern, July 17", () => {
    // In Pacific time this instant is still July 16; in UTC it is July 17.
    expect(formatDateOnly('2025-07-17T06:30:35Z')).toBe('7/17/2025');
  });

  it('reads 04:00Z as midnight Eastern, the day Congress.gov means', () => {
    expect(formatDateOnly('2025-07-24T04:00:00Z', { month: 'long', day: 'numeric' })).toBe(
      'July 24'
    );
  });

  it('lets a caller choose another zone for timestamps', () => {
    expect(formatDateOnly('2025-07-17T06:30:35Z', { timeZone: 'America/Los_Angeles' })).toBe(
      '7/16/2025'
    );
  });

  it('returns empty for missing or invalid input', () => {
    expect(formatDateOnly(undefined)).toBe('');
    expect(formatDateOnly('not a date')).toBe('');
  });
});
