/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Peer-award endpoint (PR 18) — same recipient (UEI) + same awarding
 * top-tier agency, excluding the current award.
 *
 * The client passes `uei` and `agency` (top-tier toptier_agency.name)
 * once it has the detail payload. Keeping the recipient + agency
 * resolution on the client avoids a redundant /awards/{id}/ fetch
 * here (which would otherwise stack ~2s of cold-start latency on top
 * of the 3-5s peer search).
 *
 * Example payload:
 *   POST /search/spending_by_award/
 *   {
 *     "limit": 7,
 *     "fields": ["Award ID","Recipient Name","Award Amount",
 *       "Awarding Agency","Start Date","Description","generated_internal_id"],
 *     "sort": "Award Amount",
 *     "order": "desc",
 *     "filters": {
 *       "recipient_search_text": ["HLWWEH2CCXW5"],
 *       "agencies": [{"type":"awarding","tier":"toptier","name":"NASA"}],
 *       "award_type_codes": ["A","B","C","D"],
 *       "time_period": [{"start_date":"2008-10-01","end_date":"2030-09-30"}]
 *     }
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import type { USASpendingAwardResponse } from '@/types/spending';

export const dynamic = 'force-dynamic';
export const maxDuration = 12;

const USASPENDING_API = 'https://api.usaspending.gov/api/v2';
const AWARD_ID_RE = /^[A-Z0-9_\-]{8,200}$/i;

const CONTRACT_CODES = ['A', 'B', 'C', 'D'];
const ASSISTANCE_CODES = ['02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];

const SEARCH_FIELDS = [
  'Award ID',
  'Recipient Name',
  'Award Amount',
  'Awarding Agency',
  'Start Date',
  'Description',
  'generated_internal_id',
];

function awardCodesFor(awardId: string): string[] {
  if (awardId.startsWith('CONT_')) return CONTRACT_CODES;
  if (awardId.startsWith('ASST_')) return ASSISTANCE_CODES;
  return [...CONTRACT_CODES, ...ASSISTANCE_CODES];
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const awardId = (id ?? '').trim();

  if (!AWARD_ID_RE.test(awardId)) {
    return NextResponse.json({ error: 'Invalid award ID format.' }, { status: 400 });
  }

  const uei = (request.nextUrl.searchParams.get('uei') ?? '').trim();
  const agency = (request.nextUrl.searchParams.get('agency') ?? '').trim();

  if (!uei || !agency) {
    return NextResponse.json(
      { awardId, related: [], error: 'Missing uei or agency query param' },
      { status: 400 }
    );
  }

  try {
    const today = new Date();
    const endDate = `${today.getFullYear() + 5}-09-30`;

    const res = await fetch(`${USASPENDING_API}/search/spending_by_award/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
      },
      body: JSON.stringify({
        subawards: false,
        limit: 7,
        page: 1,
        fields: SEARCH_FIELDS,
        sort: 'Award Amount',
        order: 'desc',
        filters: {
          recipient_search_text: [uei],
          agencies: [{ type: 'awarding', tier: 'toptier', name: agency }],
          award_type_codes: awardCodesFor(awardId),
          time_period: [{ start_date: '2008-10-01', end_date: endDate }],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      logger.warn(`[spending/awards/related] USASpending returned ${res.status} for ${awardId}`);
      return NextResponse.json(
        { awardId, related: [], error: `USASpending API responded with ${res.status}` },
        { status: res.status === 400 ? 400 : 502 }
      );
    }

    const json = (await res.json()) as USASpendingAwardResponse;
    const related = (json.results ?? [])
      .filter(r => r.generated_internal_id && r.generated_internal_id !== awardId)
      .slice(0, 6);

    return NextResponse.json(
      {
        awardId,
        related,
        dataAsOf: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    logger.error('[spending/awards/related] failed', error as Error, { awardId });
    return NextResponse.json(
      { awardId, related: [], error: 'Failed to fetch peer awards' },
      { status: 502 }
    );
  }
}
