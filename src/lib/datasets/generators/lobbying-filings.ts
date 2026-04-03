/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Lobbying Filings Dataset Generator
 *
 * Recent lobbying disclosure filings from the Senate LDA API.
 * Covers the last 2 years of quarterly filings.
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
      name: 'Lobbying Disclosure Filings',
      slug: 'lobbying-filings',
      description:
        'Recent lobbying disclosure filings from the Senate Lobbying Disclosure Act (LDA) database, including registrants, clients, income, and issue areas.',
      source: 'Senate LDA API',
      sourceUrl: 'https://lda.senate.gov',
      generated: new Date().toISOString(),
      recordCount: data.length,
      license: 'Public Domain',
      columns: COLUMNS,
    },
    data,
  };
}
