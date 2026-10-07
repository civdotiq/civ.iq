/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Roll-call vote share image: question, measure, yeas, nays and result.
 * Past the budget the card shows only what the id spells out (chamber,
 * Congress, roll number) and is cached for a minute; the fetch keeps running
 * for the next scrape. Ids that don't name a chamber get no fallback, since
 * parseVoteId only guesses Senate for them.
 */

import { after } from 'next/server';
import {
  PAGE_CARD_SIZE,
  pageCardResponse,
  withinBudget,
} from '@/features/trading-cards/og/page-card';
import { voteCard, voteFallbackCard } from '@/features/trading-cards/og/page-card-data';
import { getVoteDetailsService, parseVoteId } from '@/lib/services/vote.service';

export const runtime = 'nodejs';
export const alt = 'Roll-call vote: question, yeas, nays and result';
export const size = PAGE_CARD_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ voteId: string }> }) {
  const { voteId } = await params;

  const details = getVoteDetailsService(voteId);
  after(() =>
    details.then(
      () => undefined,
      () => undefined
    )
  );
  const vote = await withinBudget(details);
  if (vote) return pageCardResponse(voteCard(vote), { format: 'png' });

  if (!/^(house|senate)-\d+-/.test(voteId)) {
    return new Response('Vote unavailable', { status: 404 });
  }
  return pageCardResponse(voteFallbackCard(parseVoteId(voteId)), {
    format: 'png',
    fallback: true,
  });
}
