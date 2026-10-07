/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State legislature hub share image: seats and party split per chamber, and
 * the next regular election. Corpus + NCSL, like the page.
 */

import { PAGE_CARD_SIZE, pageCardResponse } from '@/features/trading-cards/og/page-card';
import { stateHubCard } from '@/features/trading-cards/og/page-card-data';
import { loadStateHub } from '@/lib/state-hub/load-state-hub';

export const runtime = 'nodejs';
export const alt = 'State legislature: seats and party split per chamber';
export const size = PAGE_CARD_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const hub = await loadStateHub(state);
  if (!hub) return new Response('State not found', { status: 404 });
  return pageCardResponse(stateHubCard(hub), { format: 'png' });
}
