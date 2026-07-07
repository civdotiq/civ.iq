/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/** Shared number/date formatting for Record Card surfaces. */

export const fmtInt = (n: number) => n.toLocaleString('en-US');

export const fmtMoney = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export const fmtMoneyCompact = (n: number) =>
  n >= 1_000_000_000
    ? `$${(n / 1_000_000_000).toFixed(2)}B`
    : n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : `$${Math.round(n / 1_000)}K`;

export const fmtPct = (n: number) => `${n.toFixed(1).replace(/\.0$/, '')}%`;

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
