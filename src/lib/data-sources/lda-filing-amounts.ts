/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Plausibility caps for self-reported LDA dollar amounts.
 *
 * `income` is what a hired lobbying firm bills ONE client for ONE quarter —
 * the largest firms top out around $1-2M. `expenses` is what a self-filing
 * organization spends in-house per quarter — the biggest (US Chamber) reaches
 * $15-25M. The LDA database accepts filings without review, so crank filings
 * (e.g., a $20M "anticipated" income from a sovereign-citizen registrant)
 * otherwise swamp every aggregate. Gated filings keep a $0 amount so they
 * remain visible as filing-only activity.
 *
 * Standalone module so API routes can use the gate without importing the
 * full senate-lobbying-api (which pulls in the embeddings pipeline).
 */
const MAX_PLAUSIBLE_QUARTERLY_INCOME = 5_000_000;
const MAX_PLAUSIBLE_QUARTERLY_EXPENSES = 50_000_000;

/**
 * Dollar amount to attribute to a filing. LDA filings report either `income`
 * (hired firm, per-client) or `expenses` (self-filing organization) — never
 * both meaningfully — so summing covers both filer types.
 */
export function reportedFilingAmount(filing: { income: number; expenses: number }): number {
  const income = filing.income <= MAX_PLAUSIBLE_QUARTERLY_INCOME ? filing.income : 0;
  const expenses = filing.expenses <= MAX_PLAUSIBLE_QUARTERLY_EXPENSES ? filing.expenses : 0;
  return income + expenses;
}

/** Variant for callers working with raw LDA API rows (string dollar fields). */
export function reportedRawFilingAmount(raw: {
  income?: string | null;
  expenses?: string | null;
}): number {
  return reportedFilingAmount({
    income: parseFloat(raw.income ?? '0') || 0,
    expenses: parseFloat(raw.expenses ?? '0') || 0,
  });
}
