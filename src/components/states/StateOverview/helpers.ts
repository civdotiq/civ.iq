/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export function formatCompactCurrency(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '—';
  if (amount >= 1_000_000_000_000) return `$${(amount / 1_000_000_000_000).toFixed(1)}T`;
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

export function formatCurrencyDollars(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '—';
  return `$${Math.round(amount).toLocaleString()}`;
}

export function formatPopulation(pop: number): string {
  if (!Number.isFinite(pop) || pop <= 0) return '—';
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`;
  if (pop >= 1_000) return `${(pop / 1_000).toFixed(0)}K`;
  return pop.toLocaleString();
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
