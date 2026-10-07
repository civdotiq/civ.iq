/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State legislator share image: portrait, name, office, district and capitol
 * phone. Corpus only, like the page; the photo comes from the legislature's
 * own site with a short timeout.
 */

import { PAGE_CARD_SIZE, pageCardResponse } from '@/features/trading-cards/og/page-card';
import { legislatorCard } from '@/features/trading-cards/og/page-card-data';
import { fetchPortrait } from '@/features/trading-cards/og/portrait';
import { getLegislator } from './get-legislator';

export const runtime = 'nodejs';
export const alt = 'State legislator: name, office, district and capitol phone';
export const size = PAGE_CARD_SIZE;
export const contentType = 'image/jpeg';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const legislator = await getLegislator(id);
  if (!legislator) return new Response('Legislator not found', { status: 404 });

  const photo = legislator.photo_url ? await fetchPortrait([legislator.photo_url]) : undefined;
  return pageCardResponse(legislatorCard(legislator), { format: 'jpeg', photo });
}
