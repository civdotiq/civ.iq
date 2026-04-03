/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Federal Register Rules Dataset Generator
 *
 * Recent proposed rules, final rules, and executive orders from
 * the Federal Register API. Metadata only (no preamble text).
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  FederalRegisterAPIDocument,
  FederalRegisterAPIResponse,
} from '@/types/federal-register';
import type { DatasetResult, DatasetColumn } from '@/types/dataset';

const FR_API = 'https://www.federalregister.gov/api/v1';

const COLUMNS: DatasetColumn[] = [
  {
    key: 'documentNumber',
    label: 'Document Number',
    description: 'Federal Register document number',
    type: 'string',
  },
  { key: 'title', label: 'Title', description: 'Document title', type: 'string' },
  {
    key: 'type',
    label: 'Type',
    description: 'Rule, Proposed Rule, Notice, or Presidential Document',
    type: 'string',
  },
  {
    key: 'agencies',
    label: 'Agencies',
    description: 'Issuing agencies (semicolon-separated)',
    type: 'string',
  },
  {
    key: 'publicationDate',
    label: 'Publication Date',
    description: 'Date published in Federal Register',
    type: 'date',
  },
  {
    key: 'effectiveDate',
    label: 'Effective Date',
    description: 'Date rule takes effect',
    type: 'date',
  },
  {
    key: 'commentCloseDate',
    label: 'Comment Close Date',
    description: 'Deadline for public comments',
    type: 'date',
  },
  { key: 'abstract', label: 'Abstract', description: 'Summary of the document', type: 'string' },
  {
    key: 'htmlUrl',
    label: 'HTML URL',
    description: 'Link to document on federalregister.gov',
    type: 'string',
  },
  { key: 'pdfUrl', label: 'PDF URL', description: 'Link to PDF version', type: 'string' },
];

async function fetchRecentDocuments(): Promise<FederalRegisterAPIDocument[]> {
  const cacheKey = 'dataset:fr-recent-rules';

  return cachedFetch(
    cacheKey,
    async () => {
      const fields = [
        'document_number',
        'title',
        'abstract',
        'type',
        'publication_date',
        'html_url',
        'pdf_url',
        'agencies',
        'comments_close_on',
        'effective_on',
      ];

      const params = new URLSearchParams({
        per_page: '100',
        order: 'newest',
      });
      params.append('conditions[type][]', 'Rule');
      params.append('conditions[type][]', 'Proposed Rule');
      params.append('conditions[type][]', 'Presidential Document');
      for (const f of fields) {
        params.append('fields[]', f);
      }

      const url = `${FR_API}/documents.json?${params.toString()}`;
      logger.info('[FRDataset] Fetching recent Federal Register documents');

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        throw new Error(`Federal Register API returned ${response.status}`);
      }

      const data: FederalRegisterAPIResponse = await response.json();
      return data.results ?? [];
    },
    3600
  );
}

export async function generateFederalRegisterRules(): Promise<DatasetResult> {
  const documents = await fetchRecentDocuments();

  const data = documents.map(doc => ({
    documentNumber: doc.document_number,
    title: doc.title,
    type: doc.type,
    agencies: (doc.agencies ?? [])
      .map((a: { name?: string }) => a.name ?? '')
      .filter(Boolean)
      .join('; '),
    publicationDate: doc.publication_date,
    effectiveDate: doc.effective_on ?? '',
    commentCloseDate: doc.comments_close_on ?? '',
    abstract: doc.abstract ?? '',
    htmlUrl: doc.html_url,
    pdfUrl: doc.pdf_url,
  }));

  return {
    metadata: {
      name: 'Federal Register Rules & Orders',
      slug: 'federal-register-rules',
      description:
        'Recent proposed rules, final rules, and presidential documents from the Federal Register. Metadata and links only.',
      source: 'Federal Register API',
      sourceUrl: 'https://www.federalregister.gov',
      generated: new Date().toISOString(),
      recordCount: data.length,
      license: 'Public Domain',
      columns: COLUMNS,
    },
    data,
  };
}
