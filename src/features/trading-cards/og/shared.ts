/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * OG Image Shared Utilities
 *
 * Colors, formatters, and helpers for Satori-compatible OG card rendering.
 * Follows Aicher/Ulm design system.
 */

/** Party accent colors (matching Aicher design system) */
export function getPartyColor(party: string): string {
  const p = party.toLowerCase();
  if (p.includes('democrat')) return '#3ea2d4';
  if (p.includes('republican')) return '#e11d07';
  if (p.includes('independent')) return '#6b7280';
  return '#666666';
}

/** Party abbreviation */
export function getPartyAbbrev(party: string): string {
  const p = party.toLowerCase();
  if (p.includes('democrat')) return 'D';
  if (p.includes('republican')) return 'R';
  if (p.includes('independent')) return 'I';
  return party.charAt(0).toUpperCase();
}

/** Format currency for card display */
export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${amount.toFixed(0)}`;
}

/** Format percentage */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/** Format large number with commas */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

/** Truncate text to max length with ellipsis */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '\u2026';
}

/** Card type display labels */
export function getCardTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    profile: 'PROFILE',
    money: 'CAMPAIGN FINANCE',
    vote: 'VOTE RECORD',
    alignment: 'PARTY ALIGNMENT',
    legislation: 'LEGISLATION',
  };
  return labels[type] || type.toUpperCase();
}

/** Format date for card display */
export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Location label (e.g., "CA-12" or "CA") */
export function getLocationLabel(state: string, district?: string): string {
  if (district) return `${state}-${district}`;
  return state;
}
