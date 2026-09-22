/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

const BILL_TYPE_DISPLAY: Record<string, string> = {
  HR: 'H.R.',
  S: 'S.',
  HRES: 'H.Res.',
  SRES: 'S.Res.',
  HJRES: 'H.J.Res.',
  SJRES: 'S.J.Res.',
  HCONRES: 'H.Con.Res.',
  SCONRES: 'S.Con.Res.',
};

/**
 * Format a Congress.gov bill type + number for display: ("S", "2403") → "S. 2403".
 * A bare number is ambiguous across chambers, so unknown types are shown as-is
 * and a missing type returns the number alone.
 */
export function formatBillNumber(type: string | undefined, number: string): string {
  const key = (type ?? '').replace(/[.\s]/g, '').toUpperCase();
  if (!key) return number;
  return `${BILL_TYPE_DISPLAY[key] ?? key} ${number}`;
}
