/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Lobbying Filings Dataset Generator
 *
 * Every Senate LDA quarterly report (LD-2) in the corpus window, rolled up per
 * organization per quarter.
 *
 * This dataset used to be a sample and said so: the LDA list endpoint serves 25
 * filings per page, the client did not paginate, and so each quarter
 * contributed 25 rows — 25 of 27,446 for 2025 Q1, about 0.09%. Roughly 175 rows
 * in total. Individual rows were real, but nothing could be summed from them.
 *
 * It now reads data/lda-filings.json.br, the committed corpus mirror refreshed
 * weekly. Totals, rankings and market shares are safe to compute.
 *
 * Grain is organization × quarter rather than one row per filing. An
 * organization commonly files through several registrants in the same quarter,
 * and the filing rows themselves carry no LDA UUID to key on — the corpus drops
 * them because 155k high-entropy strings would have tripled the artifact.
 * Rolling up gives every row a stable identity (client + quarter) and keeps a
 * complete quarterly time series for each organization.
 *
 * Change detection is off (`skipDiff`). A row-level diff of 123,561 rows would
 * write megabytes to Redis on every download, and the corpus already carries
 * its own generatedAt stamp and freshness canary.
 */

import { forEachFiling } from '@/lib/data-sources/lda-corpus/load-filings';
import { getFilingCorpusMeta } from '@/lib/data-sources/lda-corpus/load-filings';
import type { DatasetResult, DatasetColumn } from '@/types/dataset';

const COLUMNS: DatasetColumn[] = [
  {
    key: 'clientQuarter',
    label: 'Client + Quarter',
    description: 'Row identity: client name and quarter',
    type: 'string',
  },
  {
    key: 'client',
    label: 'Client',
    description: 'Organization on whose behalf the lobbying was reported',
    type: 'string',
  },
  {
    key: 'quarter',
    label: 'Quarter',
    description: 'Reporting quarter (e.g. 2026-Q1)',
    type: 'string',
  },
  {
    key: 'registrants',
    label: 'Registrants',
    description: 'Lobbying firms filing for this client (semicolon-separated)',
    type: 'string',
  },
  {
    key: 'amount',
    label: 'Amount',
    description:
      'Reported lobbying spending in dollars (income for firms, expenses for in-house filers), plausibility-gated',
    type: 'number',
  },
  {
    key: 'filingCount',
    label: 'Filings',
    description: 'Quarterly reports behind this row',
    type: 'number',
  },
  {
    key: 'issueCodes',
    label: 'Issue Codes',
    description: 'General issue area codes (semicolon-separated)',
    type: 'string',
  },
  {
    key: 'governmentEntities',
    label: 'Government Entities',
    description: 'Government bodies lobbied (semicolon-separated)',
    type: 'string',
  },
  {
    key: 'committeeCodes',
    label: 'Committee Codes',
    description:
      'Congressional committees the filings touch, by disclosed entity or issue jurisdiction (semicolon-separated)',
    type: 'string',
  },
];

interface Rollup {
  client: string;
  quarter: string;
  registrants: Set<string>;
  amount: number;
  filingCount: number;
  issueCodes: Set<string>;
  governmentEntities: Set<string>;
  committeeCodes: Set<string>;
}

export async function generateLobbyingFilings(): Promise<DatasetResult> {
  const meta = await getFilingCorpusMeta();
  const rollups = new Map<string, Rollup>();

  const available = await forEachFiling(filing => {
    const key = `${filing.clientName}|${filing.quarter}`;
    let row = rollups.get(key);
    if (!row) {
      row = {
        client: filing.clientName,
        quarter: filing.quarter,
        registrants: new Set(),
        amount: 0,
        filingCount: 0,
        issueCodes: new Set(),
        governmentEntities: new Set(),
        committeeCodes: new Set(),
      };
      rollups.set(key, row);
    }
    row.registrants.add(filing.registrantName);
    row.amount += filing.amount;
    row.filingCount += 1;
    for (const code of filing.issueCodes) row.issueCodes.add(code);
    for (const entity of filing.governmentEntities) row.governmentEntities.add(entity);
    for (const code of filing.committeeCodes) row.committeeCodes.add(code);
  });

  // The download route turns an empty dataset into a 503 rather than serving a
  // file that looks like "no lobbying happened".
  const data = available
    ? Array.from(rollups.entries())
        .sort(([, a], [, b]) => b.amount - a.amount)
        .map(([key, row]) => ({
          clientQuarter: key,
          client: row.client,
          quarter: row.quarter,
          registrants: Array.from(row.registrants).join('; '),
          amount: row.amount,
          filingCount: row.filingCount,
          issueCodes: Array.from(row.issueCodes).join('; '),
          governmentEntities: Array.from(row.governmentEntities).join('; '),
          committeeCodes: Array.from(row.committeeCodes).join('; '),
        }))
    : [];

  const window =
    meta && meta.quarters.length > 0
      ? `${meta.quarters[0]} through ${meta.quarters[meta.quarters.length - 1]}`
      : 'the covered window';

  return {
    metadata: {
      name: 'Lobbying Disclosure Filings',
      slug: 'lobbying-filings',
      description:
        `Complete Senate Lobbying Disclosure Act (LDA) quarterly reports for ${window}, ` +
        'rolled up per organization per quarter. Every LD-2 report in the window is included — ' +
        'this is the full record, not a sample, so totals, rankings and market shares are safe to compute. ' +
        'Amounts are the reported figure (income for lobbying firms, expenses for in-house filers) with ' +
        'implausible values gated out, and amendments deduped so the latest supersedes the original. ' +
        'Committee attribution resolves each filing’s disclosed government entities and issue-code jurisdiction; ' +
        'a filing touching several committees is listed under each.',
      source: 'Senate LDA API (CIV.IQ corpus mirror)',
      sourceUrl: 'https://lda.gov',
      generated: new Date().toISOString(),
      recordCount: data.length,
      license: 'Public Domain',
      columns: COLUMNS,
    },
    data,
  };
}
