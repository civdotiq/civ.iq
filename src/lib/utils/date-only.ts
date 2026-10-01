/**
 * Format dates from government APIs ("2026-09-15" or "2025-07-17T06:30:35Z").
 *
 * `new Date('2026-09-15')` is UTC midnight, so rendering it in a US timezone
 * shows the previous day. Date-only strings are formatted in UTC so the
 * displayed day matches the source record.
 *
 * Full timestamps are formatted on Congress's clock (Eastern), never the
 * viewer's: a Senate vote at 2:30 AM Eastern on July 17 is a July 17 vote,
 * even for a reader in California. One fixed zone also keeps server-rendered
 * HTML (UTC on Vercel) and the browser's hydration render in agreement.
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const CONGRESS_TIME_ZONE = 'America/New_York';

export function formatDateOnly(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    timeZone: CONGRESS_TIME_ZONE,
    ...options,
    ...(DATE_ONLY.test(value) ? { timeZone: 'UTC' } : {}),
  });
}
