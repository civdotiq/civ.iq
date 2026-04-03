/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Senate Stock Trades Dataset Generator
 *
 * STOCK Act periodic transaction reports for U.S. Senators.
 * Source: Senate Stock Watcher (pre-parsed from Senate eFD system).
 */

import { senateDisclosureService } from '@/lib/data-sources/senate-disclosure-service';
import type { DatasetResult, DatasetColumn } from '@/types/dataset';

const COLUMNS: DatasetColumn[] = [
  {
    key: 'bioguideId',
    label: 'Bioguide ID',
    description: 'Senator bioguide identifier',
    type: 'string',
  },
  { key: 'memberName', label: 'Senator Name', description: 'Full name', type: 'string' },
  { key: 'transactionDate', label: 'Transaction Date', description: 'Date of trade', type: 'date' },
  { key: 'ticker', label: 'Ticker', description: 'Stock ticker symbol', type: 'string' },
  {
    key: 'assetDescription',
    label: 'Asset Description',
    description: 'Description of asset',
    type: 'string',
  },
  {
    key: 'assetType',
    label: 'Asset Type',
    description: 'Type of asset (ST, OP, etc.)',
    type: 'string',
  },
  {
    key: 'transactionType',
    label: 'Transaction Type',
    description: 'Purchase, Sale, Exchange',
    type: 'string',
  },
  {
    key: 'amount',
    label: 'Amount Range',
    description: 'Dollar range of transaction',
    type: 'string',
  },
  {
    key: 'owner',
    label: 'Owner',
    description: 'Self, Spouse, Joint, or Dependent',
    type: 'string',
  },
  { key: 'filingDate', label: 'Filing Date', description: 'Date PTR was filed', type: 'date' },
  {
    key: 'daysToDisclose',
    label: 'Days to Disclose',
    description: 'Days between trade and filing',
    type: 'number',
  },
  {
    key: 'isLateFiling',
    label: 'Late Filing',
    description: 'Filed after 45-day STOCK Act deadline',
    type: 'boolean',
  },
  {
    key: 'sourceUrl',
    label: 'Source URL',
    description: 'Link to original PTR filing',
    type: 'string',
  },
];

export async function generateSenateStockTrades(): Promise<DatasetResult> {
  const tradesMap = await senateDisclosureService.getAllSenatorTrades();

  const data: Record<string, unknown>[] = [];
  for (const [, trades] of tradesMap) {
    for (const trade of trades) {
      data.push({
        bioguideId: trade.bioguideId,
        memberName: trade.memberName,
        transactionDate: trade.transactionDate,
        ticker: trade.ticker ?? '',
        assetDescription: trade.assetDescription,
        assetType: trade.assetTypeLabel,
        transactionType: trade.transactionType,
        amount: trade.amount,
        owner: trade.owner,
        filingDate: trade.filingDate,
        daysToDisclose: trade.daysToDisclose,
        isLateFiling: trade.isLateFiling,
        sourceUrl: trade.sourceUrl,
      });
    }
  }

  return {
    metadata: {
      name: 'Senate Stock Trades (STOCK Act)',
      slug: 'senate-stock-trades',
      description:
        'Periodic transaction reports for U.S. Senators under the STOCK Act, including ticker, amount range, transaction type, and filing timeliness.',
      source: 'Senate Stock Watcher / Senate eFD',
      sourceUrl: 'https://efdsearch.senate.gov',
      generated: new Date().toISOString(),
      recordCount: data.length,
      license: 'Public Domain',
      columns: COLUMNS,
    },
    data,
  };
}
