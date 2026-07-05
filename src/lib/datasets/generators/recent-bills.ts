/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Recent Bills Dataset Generator
 *
 * The 250 most recently updated bills in the current Congress.
 * Source: Congress.gov API v3.
 */

import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import logger from '@/lib/logging/simple-logger';
import type { DatasetResult, DatasetColumn } from '@/types/dataset';

const COLUMNS: DatasetColumn[] = [
  {
    key: 'billNumber',
    label: 'Bill Number',
    description: 'Official bill designation (e.g., H.R. 1)',
    type: 'string',
  },
  { key: 'title', label: 'Title', description: 'Official bill title', type: 'string' },
  { key: 'type', label: 'Type', description: 'Bill type (HR, S, HJRES, etc.)', type: 'string' },
  { key: 'congress', label: 'Congress', description: 'Congress number', type: 'number' },
  {
    key: 'chamber',
    label: 'Origin Chamber',
    description: 'Chamber where the bill originated',
    type: 'string',
  },
  {
    key: 'introducedDate',
    label: 'Introduced Date',
    description: 'Date the bill was introduced',
    type: 'date',
  },
  {
    key: 'updateDate',
    label: 'Last Updated',
    description: 'Date of most recent action',
    type: 'date',
  },
  {
    key: 'latestActionDate',
    label: 'Latest Action Date',
    description: 'Date of latest legislative action',
    type: 'date',
  },
  {
    key: 'latestActionText',
    label: 'Latest Action',
    description: 'Description of the latest legislative action',
    type: 'string',
  },
  {
    key: 'url',
    label: 'Congress.gov URL',
    description: 'Link to bill on Congress.gov',
    type: 'string',
  },
];

interface CongressBillResponse {
  number: string;
  title: string;
  type: string;
  congress: number;
  originChamber: string;
  introducedDate?: string;
  updateDate?: string;
  latestAction?: {
    actionDate: string;
    text: string;
  };
  url?: string;
}

export async function generateRecentBills(): Promise<DatasetResult> {
  const congressApiKey = process.env.CONGRESS_API_KEY;
  if (!congressApiKey) {
    logger.warn('Congress API key not configured for bills dataset');
    return emptyResult();
  }

  const congress = process.env.CURRENT_CONGRESS || String(getCurrentCongressNumber());
  const url = `https://api.congress.gov/v3/bill/${congress}?limit=250&sort=updateDate+desc&format=json`;

  const response = await fetch(url, {
    headers: { 'X-API-Key': congressApiKey },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    logger.error('Failed to fetch bills for dataset', new Error(`${response.status}`));
    return emptyResult();
  }

  const json = await response.json();
  const bills = (json.bills || []) as CongressBillResponse[];

  const data = bills.map(bill => ({
    billNumber: bill.number,
    title: bill.title,
    type: bill.type,
    congress: bill.congress,
    chamber: bill.originChamber ?? '',
    introducedDate: bill.introducedDate ?? '',
    updateDate: bill.updateDate?.split('T')[0] ?? '',
    latestActionDate: bill.latestAction?.actionDate ?? '',
    latestActionText: bill.latestAction?.text ?? '',
    url: bill.url ?? '',
  }));

  return {
    metadata: {
      name: 'Recent Bills (119th Congress)',
      slug: 'recent-bills',
      description:
        'The 250 most recently updated bills in the 119th Congress with status and latest actions.',
      source: 'Congress.gov API',
      sourceUrl: 'https://api.congress.gov',
      generated: new Date().toISOString(),
      recordCount: data.length,
      license: 'Public Domain',
      columns: COLUMNS,
    },
    data,
  };
}

function emptyResult(): DatasetResult {
  return {
    metadata: {
      name: 'Recent Bills (119th Congress)',
      slug: 'recent-bills',
      description: 'The 250 most recently updated bills in the 119th Congress.',
      source: 'Congress.gov API',
      sourceUrl: 'https://api.congress.gov',
      generated: new Date().toISOString(),
      recordCount: 0,
      license: 'Public Domain',
      columns: COLUMNS,
    },
    data: [],
  };
}
