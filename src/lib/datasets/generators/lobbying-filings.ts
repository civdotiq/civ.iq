/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Lobbying Filings Dataset Generator
 *
 * Lobbying disclosure filings from the Senate LDA API, spanning the last two
 * years of quarters.
 *
 * It samples those quarters rather than covering them. The LDA list endpoint
 * serves 25 filings per page and the client does not paginate, so each quarter
 * contributes 25 rows — measured 2026-07-31 against 2025 Q1, that is 25 of
 * 27,446 matching filings, or 0.09%. Roughly 175 rows total, not the ~2,000
 * the registry used to claim.
 *
 * The rows themselves are real filings and safe to read individually. Summing
 * them is not: this is the first page in the API's own ordering, not a random
 * draw. Fix is tracked in PLAN-lobbying-corpus-2026-07.md.
 */

import { SenateLobbyingAPI } from '@/lib/data-sources/senate-lobbying-api';
import type { DatasetResult, DatasetColumn } from '@/types/dataset';

const COLUMNS: DatasetColumn[] = [
  { key: 'filingId', label: 'Filing ID', description: 'Senate LDA filing UUID', type: 'string' },
  {
    key: 'registrant',
    label: 'Registrant',
    description: 'Lobbying firm or organization',
    type: 'string',
  },
  { key: 'client', label: 'Client', description: 'Client being represented', type: 'string' },
  {
    key: 'income',
    label: 'Income',
    description: 'Reported lobbying income (dollars)',
    type: 'number',
  },
  {
    key: 'expenses',
    label: 'Expenses',
    description: 'Reported lobbying expenses (dollars)',
    type: 'number',
  },
  {
    key: 'filingPeriod',
    label: 'Filing Period',
    description: 'Quarter (Q1-Q4, mid-year, year-end)',
    type: 'string',
  },
  {
    key: 'filingYear',
    label: 'Filing Year',
    description: 'Calendar year of filing',
    type: 'number',
  },
  {
    key: 'issueCodes',
    label: 'Issue Codes',
    description: 'General issue area codes (semicolon-separated)',
    type: 'string',
  },
  {
    key: 'lobbyistNames',
    label: 'Lobbyist Names',
    description: 'Names of lobbyists on filing (semicolon-separated)',
    type: 'string',
  },
  {
    key: 'governmentEntities',
    label: 'Government Entities',
    description: 'Government bodies lobbied (semicolon-separated)',
    type: 'string',
  },
];

export async function generateLobbyingFilings(): Promise<DatasetResult> {
  const api = new SenateLobbyingAPI();
  const filings = await api.fetchRecentFilings();

  const data = filings.map(filing => ({
    filingId: filing.id,
    registrant: filing.registrant.name,
    client: filing.client.name,
    income: filing.income,
    expenses: filing.expenses,
    filingPeriod: filing.filingPeriod,
    filingYear: filing.filingYear,
    issueCodes: filing.issues.map(i => i.code).join('; '),
    lobbyistNames: filing.lobbyists.map(l => l.name).join('; '),
    governmentEntities: filing.government_entities.join('; '),
  }));

  return {
    metadata: {
      name: 'Lobbying Disclosure Filings (sample)',
      slug: 'lobbying-filings',
      description:
        'SAMPLE, NOT A COMPLETE SET. Lobbying disclosure filings from the Senate Lobbying Disclosure Act (LDA) database, including registrants, clients, income, and issue areas. The LDA API serves 25 filings per page and this dataset takes only the first page of each quarter — roughly 25 of the ~27,000 filings matching a quarter, about 0.09%. Individual rows are accurate; totals, rankings, and market shares computed across them are not, because this is the first page in the API ordering rather than a random sample.',
      source: 'Senate LDA API',
      sourceUrl: 'https://lda.gov',
      generated: new Date().toISOString(),
      recordCount: data.length,
      license: 'Public Domain',
      columns: COLUMNS,
    },
    data,
  };
}
