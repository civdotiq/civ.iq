/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Pure helpers for the LocalCouncilPage (PR 20). Municipality-id
 * validation, formatters, and legislation status-to-chip mapping.
 */

import { CITY_CONFIGS } from '@/lib/local-government/pilot-cities';
import type { LegistarCityConfig } from '@/types/legistar';

const MUNI_ID_RE = /^[a-z][a-z0-9_-]{1,40}$/;

export function isValidMunicipalityId(id: string): boolean {
  return MUNI_ID_RE.test(id);
}

export function getCityConfig(id: string): LegistarCityConfig | null {
  return CITY_CONFIGS[id.toLowerCase()] ?? null;
}

export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Map Legistar /Matters status to a CqChip variant.
 *
 * Design-system carve-out: when `status` is literally "Adopted" or
 * "Enacted", we render a filled 'd' (green) chip to signal passed
 * status. The 'd' variant token is also the Democrat color in this
 * design system; here it encodes "this measure passed", not partisan
 * identity. This mirrors PR 18's `isGovernmentRecipient` carve-out.
 * Anything else renders as an outline 'info' chip.
 */
export function legislationStatusChip(status: string | null | undefined): {
  variant: 'd' | 'info';
  filled: boolean;
  label: string;
} {
  const text = (status ?? '').trim();
  const passed = /^(adopted|enacted)$/i.test(text);
  return {
    variant: passed ? 'd' : 'info',
    filled: passed,
    label: text || '—',
  };
}
