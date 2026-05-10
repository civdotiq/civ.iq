/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Federal award transactions (modifications) endpoint (PR 18).
 *
 * Direct POST to USASpending /search/spending_by_transaction/ filtered
 * on `award_unique_id`. Each transaction is one obligation modification
 * (Mod 00 = initial award, Mod 01..N = subsequent obligations).
 * USASpending requires `time_period` for transaction search and limits
 * action_date to >= 2007-10-01. Cumulative obligations are computed
 * client-side from `Transaction Amount`.
 *
 * Example payload:
 *   POST /search/spending_by_transaction/
 *   {
 *     "limit": 100,
 *     "fields": ["Action Date","Mod","Award ID","Recipient Name",
 *       "Action Type","Award Type","Awarding Agency","Transaction Amount",
 *       "Transaction Description"],
 *     "sort": "Action Date",
 *     "order": "asc",
 *     "filters": {
 *       "award_unique_id": "CONT_AWD_NAS1510000_8000_-NONE-_-NONE-",
 *       "award_type_codes": ["A","B","C","D"],
 *       "time_period": [{"start_date":"2007-10-01","end_date":"2030-09-30"}]
 *     }
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import type { USASpendingTransactionResponse, USASpendingTransactionRow } from '@/types/spending';

export const dynamic = 'force-dynamic';
export const maxDuration = 12;

const USASPENDING_API = 'https://api.usaspending.gov/api/v2';
const AWARD_ID_RE = /^[A-Z0-9_\-]{8,200}$/i;

const CONTRACT_CODES = ['A', 'B', 'C', 'D'];
const ASSISTANCE_CODES = ['02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];

const TRANSACTION_FIELDS = [
  'Action Date',
  'Mod',
  'Award ID',
  'Recipient Name',
  'Action Type',
  'Award Type',
  'Awarding Agency',
  'Transaction Amount',
  'Transaction Description',
];

function awardCodesFor(awardId: string): string[] {
  if (awardId.startsWith('CONT_')) return CONTRACT_CODES;
  if (awardId.startsWith('ASST_')) return ASSISTANCE_CODES;
  return [...CONTRACT_CODES, ...ASSISTANCE_CODES];
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const awardId = (id ?? '').trim();

  if (!AWARD_ID_RE.test(awardId)) {
    return NextResponse.json({ error: 'Invalid award ID format.' }, { status: 400 });
  }

  try {
    const today = new Date();
    const endDate = `${today.getFullYear() + 5}-09-30`;

    const res = await fetch(`${USASPENDING_API}/search/spending_by_transaction/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
      },
      body: JSON.stringify({
        limit: 100,
        page: 1,
        fields: TRANSACTION_FIELDS,
        sort: 'Action Date',
        order: 'asc',
        filters: {
          award_unique_id: awardId,
          award_type_codes: awardCodesFor(awardId),
          time_period: [{ start_date: '2007-10-01', end_date: endDate }],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      logger.warn(
        `[spending/awards/transactions] USASpending returned ${res.status} for ${awardId}`
      );
      return NextResponse.json(
        {
          awardId,
          transactions: [],
          totalCount: 0,
          error: `USASpending API responded with ${res.status}`,
        },
        { status: res.status === 400 ? 400 : 502 }
      );
    }

    const json = (await res.json()) as USASpendingTransactionResponse;
    const rows: USASpendingTransactionRow[] = json.results ?? [];

    return NextResponse.json(
      {
        awardId,
        transactions: rows,
        totalCount: rows.length,
        truncated: json.page_metadata?.hasNext ?? false,
        dataAsOf: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    logger.error('[spending/awards/transactions] failed', error as Error, { awardId });
    return NextResponse.json(
      { awardId, transactions: [], totalCount: 0, error: 'Failed to fetch transactions' },
      { status: 502 }
    );
  }
}
