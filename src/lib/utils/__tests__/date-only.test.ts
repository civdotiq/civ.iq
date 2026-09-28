import { formatDateOnly } from '../date-only';

describe('formatDateOnly', () => {
  it('keeps the source calendar day for date-only strings', () => {
    expect(formatDateOnly('2026-09-15')).toBe('9/15/2026');
    expect(formatDateOnly('2026-09-15', { month: 'short', day: 'numeric', year: 'numeric' })).toBe(
      'Sep 15, 2026'
    );
  });

  it('returns empty string for missing or invalid input', () => {
    expect(formatDateOnly(undefined)).toBe('');
    expect(formatDateOnly('not a date')).toBe('');
  });
});
