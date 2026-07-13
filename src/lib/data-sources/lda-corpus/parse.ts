/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { reportedFilingAmount } from '../lda-filing-amounts';
import type { CompactFiling, RawApiFiling } from './types';

const PERIOD_TO_QUARTER: Record<string, string> = {
  first_quarter: 'Q1',
  second_quarter: 'Q2',
  third_quarter: 'Q3',
  fourth_quarter: 'Q4',
};

/** Build the "2025-Q1" quarter key from an API year + filing_period. */
export function quarterKey(filingYear: number, filingPeriod: string): string | null {
  const q = PERIOD_TO_QUARTER[filingPeriod];
  return q ? `${filingYear}-${q}` : null;
}

const MAX_PLAUSIBLE_QUARTERLY_INCOME = 5_000_000;
const MAX_PLAUSIBLE_QUARTERLY_EXPENSES = 50_000_000;

/** True when an amount was reported over the plausibility cap (crank filing). */
function isGated(income: number, expenses: number): boolean {
  return income > MAX_PLAUSIBLE_QUARTERLY_INCOME || expenses > MAX_PLAUSIBLE_QUARTERLY_EXPENSES;
}

/**
 * Normalize a raw API filing to a CompactFiling, or null if it is not an
 * amount-bearing quarterly report (registrations have income and expenses both
 * null and are excluded — they represent a relationship, not quarterly spend).
 */
export function parseRawFiling(raw: RawApiFiling): CompactFiling | null {
  if (raw.income == null && raw.expenses == null) return null; // registration
  if (!raw.registrant || !raw.client) return null;

  const quarter = quarterKey(raw.filing_year, raw.filing_period);
  if (!quarter) return null;

  const income = parseFloat(raw.income ?? '0') || 0;
  const expenses = parseFloat(raw.expenses ?? '0') || 0;

  const issueCodes = new Set<string>();
  const governmentEntities = new Set<string>();
  for (const activity of raw.lobbying_activities ?? []) {
    if (activity.general_issue_code) issueCodes.add(activity.general_issue_code);
    for (const ge of activity.government_entities ?? []) {
      if (ge?.name) governmentEntities.add(ge.name);
    }
  }

  return {
    filingUuid: raw.filing_uuid,
    registrantId: String(raw.registrant.id),
    registrantName: raw.registrant.name,
    clientId: String(raw.client.id),
    clientName: raw.client.name,
    filingYear: raw.filing_year,
    filingPeriod: raw.filing_period,
    quarter,
    filingType: raw.filing_type,
    dtPosted: raw.dt_posted,
    amount: reportedFilingAmount({ income, expenses }),
    gated: isGated(income, expenses),
    issueCodes: Array.from(issueCodes),
    governmentEntities: Array.from(governmentEntities),
  };
}
