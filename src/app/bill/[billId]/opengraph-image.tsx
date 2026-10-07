/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill share image: number, title, status, sponsor and cosponsors. A cold
 * Congress.gov fetch can take 5-9s, longer than scrapers wait, so past the
 * budget the card shows only what the URL proves and is cached for a minute;
 * the fetch keeps running and fills the cache for the next scrape.
 */

import { after } from 'next/server';
import {
  PAGE_CARD_SIZE,
  pageCardResponse,
  withinBudget,
} from '@/features/trading-cards/og/page-card';
import { billCard, billFallbackCard } from '@/features/trading-cards/og/page-card-data';
import { lookupBill } from '@/lib/services/bill.service';
import { parseBillSlug } from '@/lib/data/route-slugs';

export const runtime = 'nodejs';
export const alt = 'Bill: number, title, status, sponsor and cosponsors';
export const size = PAGE_CARD_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ billId: string }> }) {
  const { billId } = await params;
  const parsed = parseBillSlug(billId);
  if (parsed.kind === 'invalid') return new Response('Bill not found', { status: 404 });

  const lookup = lookupBill(parsed.canonical);
  after(() =>
    lookup.then(
      () => undefined,
      () => undefined
    )
  );
  const result = await withinBudget(lookup);

  if (result?.status === 'not_found') return new Response('Bill not found', { status: 404 });
  if (result?.status === 'found') return pageCardResponse(billCard(result.bill), { format: 'png' });
  return pageCardResponse(billFallbackCard(parsed.canonical), { format: 'png', fallback: true });
}
