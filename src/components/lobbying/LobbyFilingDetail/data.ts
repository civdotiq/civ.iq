/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Loader for the redesigned LobbyFilingDetail page. Wraps the existing
 * Senate LDA service with a normalized shape suited to the redesign.
 */

import { senateLobbyingAPI } from '@/lib/data-sources/senate-lobbying-api';
import type { RawLDAFiling } from '@/lib/data-sources/senate-lobbying-api';
import { getLDAIssueLabel } from '@/lib/intelligence/entity-resolution/lda-issue-policy-map';
import logger from '@/lib/logging/simple-logger';
import type {
  LobbyFilingContact,
  LobbyFilingDetailData,
  LobbyFilingIssue,
  LobbyFilingLobbyist,
} from './types';

// Senate LDA exposes a few more fields than RawLDAFiling captures (posting
// dates, document URLs, contact metadata). We don't extend the canonical
// type — just narrow what we consume here.
type ExtendedRawFiling = RawLDAFiling & {
  filing_type?: string;
  filing_type_display?: string;
  filing_period_display?: string;
  dt_posted?: string;
  posted_by_name?: string;
  termination_date?: string | null;
  document_url?: string;
  registrant?: RawLDAFiling['registrant'] & {
    contact_name?: string;
    country_name?: string;
  };
  client?: RawLDAFiling['client'] & {
    country_name?: string;
    ppb_country_name?: string;
  };
  lobbying_activities?: Array<
    RawLDAFiling['lobbying_activities'][number] & {
      foreign_entity_issues?: string[];
    }
  >;
};

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function normalizeIssues(raw: ExtendedRawFiling): LobbyFilingIssue[] {
  const seen = new Map<string, LobbyFilingIssue>();
  for (const activity of raw.lobbying_activities ?? []) {
    const code = activity.general_issue_code;
    if (!code) continue;
    const description = activity.description?.trim() ?? '';
    const existing = seen.get(code);
    if (existing) {
      if (description && existing.description.length < description.length) {
        existing.description = description;
      }
    } else {
      seen.set(code, {
        code,
        label: activity.general_issue_code_display || getLDAIssueLabel(code) || code,
        description: description || activity.general_issue_code_display || code,
      });
    }
  }
  return Array.from(seen.values());
}

function normalizeLobbyists(raw: ExtendedRawFiling): LobbyFilingLobbyist[] {
  const seen = new Map<string, LobbyFilingLobbyist>();
  for (const activity of raw.lobbying_activities ?? []) {
    for (const lob of activity.lobbyists ?? []) {
      const name = lob.name?.trim();
      if (!name) continue;
      if (!seen.has(name)) {
        seen.set(name, {
          name,
          coveredOfficialPosition: lob.covered_official_position?.trim() || null,
        });
      } else if (lob.covered_official_position && !seen.get(name)?.coveredOfficialPosition) {
        const existing = seen.get(name);
        if (existing) existing.coveredOfficialPosition = lob.covered_official_position.trim();
      }
    }
  }
  return Array.from(seen.values());
}

function normalizeContacts(raw: ExtendedRawFiling): LobbyFilingContact[] {
  const byBody = new Map<string, { officials: Set<string>; issueCode: string | null }>();
  for (const activity of raw.lobbying_activities ?? []) {
    const code = activity.general_issue_code ?? null;
    for (const ge of activity.government_entities ?? []) {
      const body = ge.name?.trim();
      if (!body) continue;
      let entry = byBody.get(body);
      if (!entry) {
        entry = { officials: new Set<string>(), issueCode: code };
        byBody.set(body, entry);
      }
      // Collect lobbyist names whose covered_official_position points back at
      // a chamber/agency — they're effectively the contacts on record. The
      // LDA API does not surface "who they met" structurally; the closest
      // available signal is the lobbyists assigned to each activity.
      for (const lob of activity.lobbyists ?? []) {
        const role = lob.covered_official_position?.trim();
        if (role) entry.officials.add(`${lob.name} — ${role}`);
      }
    }
  }
  return Array.from(byBody.entries()).map(([body, value]) => ({
    body,
    officials: value.officials.size > 0 ? Array.from(value.officials).join('; ') : null,
    issueCode: value.issueCode,
  }));
}

function extractBills(raw: ExtendedRawFiling): string[] {
  const re = /\b(?:H\.?\s?R\.?|S\.?|H\.?J\.?\s?Res\.?|S\.?J\.?\s?Res\.?)\s*\d+/gi;
  const found: string[] = [];
  for (const activity of raw.lobbying_activities ?? []) {
    const text = activity.description ?? '';
    const matches = text.match(re);
    if (matches) found.push(...matches.map(m => m.replace(/\s+/g, ' ').toUpperCase()));
  }
  return unique(found);
}

function pickAmount(raw: ExtendedRawFiling): {
  amount: number;
  income: number | null;
  expenses: number | null;
  kind: 'income' | 'expenses' | 'unknown';
} {
  const incomeRaw = raw.income !== null && raw.income !== undefined ? parseFloat(raw.income) : NaN;
  const expensesRaw =
    raw.expenses !== null && raw.expenses !== undefined ? parseFloat(raw.expenses) : NaN;
  const income = Number.isFinite(incomeRaw) ? incomeRaw : null;
  const expenses = Number.isFinite(expensesRaw) ? expensesRaw : null;
  if (income !== null && income > 0) return { amount: income, income, expenses, kind: 'income' };
  if (expenses !== null && expenses > 0) {
    return { amount: expenses, income, expenses, kind: 'expenses' };
  }
  return { amount: 0, income, expenses, kind: 'unknown' };
}

export async function loadLobbyFilingDetailData(
  filingUuid: string
): Promise<LobbyFilingDetailData | null> {
  if (!filingUuid) return null;

  let raw: ExtendedRawFiling | null = null;
  try {
    raw = (await senateLobbyingAPI.fetchFilingByUuid(filingUuid)) as ExtendedRawFiling | null;
  } catch (error) {
    logger.error('LobbyFilingDetail: load failed', error as Error, { filingUuid });
    return null;
  }
  if (!raw) return null;

  const { amount, income, expenses, kind } = pickAmount(raw);

  return {
    filingUuid: raw.filing_uuid,
    registrant: {
      id: String(raw.registrant?.id ?? ''),
      name: raw.registrant?.name ?? 'Unknown registrant',
    },
    client: {
      id: String(raw.client?.id ?? ''),
      name: raw.client?.name ?? 'Unknown client',
    },
    filingType: raw.filing_type ?? '',
    filingTypeDisplay: raw.filing_type_display ?? raw.filing_type ?? 'LDA filing',
    filingPeriod: raw.filing_period_display ?? raw.filing_period ?? '',
    filingYear: raw.filing_year,
    income,
    expenses,
    amount,
    amountKind: kind,
    postedDate: raw.dt_posted ?? null,
    filingDate: raw.dt_posted ?? null,
    termination: Boolean(raw.termination_date),
    registrantContactName: raw.registrant?.contact_name ?? null,
    registrantCountry: raw.registrant?.country_name ?? null,
    clientCountry: raw.client?.country_name ?? raw.client?.ppb_country_name ?? null,
    issues: normalizeIssues(raw),
    lobbyists: normalizeLobbyists(raw),
    contacts: normalizeContacts(raw),
    bills: extractBills(raw),
    documentUrl: raw.document_url ?? null,
  };
}
