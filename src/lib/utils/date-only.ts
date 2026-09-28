/**
 * Format calendar dates from government APIs ("2026-09-15").
 *
 * `new Date('2026-09-15')` is UTC midnight, so rendering it in a US timezone
 * shows the previous day. Date-only strings are formatted in UTC so the
 * displayed day matches the source record; full timestamps are left alone.
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function formatDateOnly(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    ...options,
    ...(DATE_ONLY.test(value) ? { timeZone: 'UTC' } : {}),
  });
}
