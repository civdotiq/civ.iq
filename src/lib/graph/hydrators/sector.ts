/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Sector Neighborhood Hydrator
 *
 * Builds the center node for an industry sector. It produces no
 * sector → representative `donated_to` edges.
 *
 * Those edges used to come from the sector leaderboard: the top members by
 * yes-vote rate, labeled and weighted with `sectorDonationAmount`. That
 * amount is a 250-contribution sample per member, not a sector total, so
 * the edges showed a sample as if it were money given. No real per-member
 * sector total exists yet; add edges back only from one.
 */

import { toCanonicalId, formatNodeLabel } from '../normalize';
import type { GraphNode } from '@/types/graph';
import type { HydrationSource } from '../types';

interface HydrationPlan {
  center: GraphNode;
  sources: HydrationSource[];
}

export async function hydrateSector(sectorKey: string): Promise<HydrationPlan | null> {
  // Reconstruct display name from key
  const displayName = sectorKey
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const center: GraphNode = {
    id: toCanonicalId('sector', sectorKey),
    type: 'sector',
    label: formatNodeLabel('sector', { name: displayName }),
    properties: { name: displayName },
    dataAsOf: new Date().toISOString(),
    sourceLabel: 'CIV.IQ sector analysis',
  };

  return { center, sources: [] };
}
