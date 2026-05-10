/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Pure helpers for the federal award detail page (PR 18). Formatters,
 * contract-pricing-type label map, government-recipient detection, and
 * cumulative-obligation aggregation. No data fetching here — SWR lives
 * in the client component.
 */

import type { USASpendingAwardDetailResponse, USASpendingTransactionRow } from '@/types/spending';
import type { ModificationRow } from './types';

export const HERO_TITLE_MAX = 80;
export const MODIFICATIONS_RENDER_LIMIT = 12;

export function formatCompactDollars(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${Math.round(n / 1e3).toLocaleString()}K`;
  return `$${n.toLocaleString('en-US')}`;
}

export function formatExactDollars(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return `$${Math.round(n).toLocaleString('en-US')}`;
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

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function truncate(text: string | null | undefined, max = HERO_TITLE_MAX): string {
  if (!text) return '';
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

/**
 * USASpending action type codes:
 *   A — additional work (new agreement)
 *   B — supplemental
 *   C — funding only action
 *   D — change order
 *   E — termination for default
 *   F — termination for convenience
 *   M — others
 *   etc.
 * The label map covers the common four. Unknown codes pass through.
 */
const ACTION_TYPE_LABEL: Record<string, string> = {
  A: 'Additional work',
  B: 'Supplemental agreement',
  C: 'Funding only action',
  D: 'Change order',
  E: 'Termination — default',
  F: 'Termination — convenience',
  G: 'Exercise an option',
  M: 'Other administrative',
};

export function actionTypeLabel(code: string | null | undefined): string {
  if (!code) return 'Modification';
  const upper = code.trim().toUpperCase();
  return ACTION_TYPE_LABEL[upper] ?? `Action ${upper}`;
}

/**
 * Compose the human action label for a transaction row. Mod 0 = initial
 * award; otherwise pair the action type with the modification number.
 */
export function modificationLabel(row: USASpendingTransactionRow): string {
  const mod = (row.Mod ?? '').trim();
  if (!mod || mod === '0' || mod === '00') return 'Initial award';
  const action = actionTypeLabel(row['Action Type']);
  return `Mod ${mod} · ${action}`;
}

export function buildModificationRows(
  transactions: USASpendingTransactionRow[]
): ModificationRow[] {
  let cumulative = 0;
  return transactions.map((t, i) => {
    const obligated = Number.isFinite(t['Transaction Amount']) ? t['Transaction Amount'] : 0;
    cumulative += obligated;
    return {
      index: i,
      date: t['Action Date'],
      modNumber: t.Mod ?? null,
      actionType: t['Action Type'] ?? null,
      description: t['Transaction Description'] ?? null,
      obligated,
      cumulative,
    };
  });
}

export interface ContractTypeLabel {
  category: string;
  pricing: string | null;
}

const AWARD_CATEGORY_LABEL: Record<string, string> = {
  contract: 'Contract',
  idv: 'Indefinite delivery',
  grant: 'Grant',
  loan: 'Loan',
  insurance: 'Insurance',
  direct_payment: 'Direct payment',
  other: 'Other assistance',
};

const AWARD_TYPE_LABEL: Record<string, string> = {
  A: 'Type A · BPA call',
  B: 'Type B · Purchase order',
  C: 'Type C · Delivery order',
  D: 'Type D · Definitive contract',
};

export function contractTypeLabel(award: USASpendingAwardDetailResponse): ContractTypeLabel {
  const categoryRaw = (award.category ?? '').toLowerCase();
  const category = AWARD_CATEGORY_LABEL[categoryRaw] ?? award.category ?? 'Award';
  const typeCode = (award.type ?? '').toUpperCase();
  const typeLabel = AWARD_TYPE_LABEL[typeCode] ?? award.type_description ?? null;

  const pricing =
    award.latest_transaction_contract_data?.type_of_contract_pricing_description?.trim() ?? null;

  const parts = [category];
  if (typeLabel) parts.push(typeLabel.toUpperCase());
  if (pricing) parts.push(pricing.toUpperCase());

  return { category: parts.join(' · '), pricing };
}

/**
 * Decide whether to render the recipient PartyCard with a green stripe
 * (private vendor) or an ink stripe (inter-government transfer).
 *
 * NOTE — DESIGN-SYSTEM EXCEPTION. Project rules normally reserve red
 * and green for partisan identity. On this page the binary is "did
 * taxpayer money leave the public sector?" — a load-bearing semantic
 * for an award-detail file. Documenting the carve-out here so future
 * readers understand the intent.
 */
export function isGovernmentRecipient(award: USASpendingAwardDetailResponse): boolean {
  const cats = (award.recipient.business_categories ?? []).map(c => c.toLowerCase());
  if (
    cats.some(
      c =>
        c.includes('government') ||
        c.includes('federal') ||
        c.includes('state government') ||
        c.includes('city or township') ||
        c.includes('county government') ||
        c.includes('special district') ||
        c.includes('tribal') ||
        c.includes('school district') ||
        c.includes('public/state controlled')
    )
  ) {
    return true;
  }
  const name = (award.recipient.recipient_name ?? '').toLowerCase();
  return /\b(department of|u\.s\. army|u\.s\. navy|u\.s\. air force|federal\b|government of)\b/.test(
    name
  );
}

export function recipientStripeVar(award: USASpendingAwardDetailResponse | null): string {
  if (!award) return 'var(--ink)';
  return isGovernmentRecipient(award) ? 'var(--ink)' : 'var(--civiq-green)';
}

export function locationLine(
  loc: USASpendingAwardDetailResponse['place_of_performance'] | null
): string {
  if (!loc) return '—';
  const city = loc.city_name ?? null;
  const state = loc.state_code ?? loc.state_name ?? null;
  if (city && state) return `${titleCase(city)}, ${state}`;
  if (state) return state;
  if (city) return titleCase(city);
  return '—';
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .map(p => (p.length > 0 ? p[0]!.toUpperCase() + p.slice(1) : p))
    .join(' ');
}

export function progressPct(obligated: number | null, ceiling: number | null): number {
  if (!obligated || !ceiling || ceiling <= 0) return 0;
  const pct = (obligated / ceiling) * 100;
  return Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
}

/**
 * Distance from period-of-performance start to the current date as a
 * fraction of the full POP. Used by PerformancePeriodBand for the
 * "today" tick and by the plain-reading paragraph for "% through POP".
 */
export function periodElapsedPct(
  start: string | null | undefined,
  end: string | null | undefined,
  now: Date = new Date()
): number {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
  const t = now.getTime();
  if (t <= s) return 0;
  if (t >= e) return 100;
  return Math.round(((t - s) / (e - s)) * 100);
}

export function safeNumber(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  return value;
}
