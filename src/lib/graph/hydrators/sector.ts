/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Sector Neighborhood Hydrator
 *
 * Builds a graph neighborhood for an industry sector by querying the
 * sector leaderboard analyzer for top-funded representatives.
 *
 * Creates donated_to edges from the sector center node to each
 * representative, weighted by sector alignment score.
 */

import logger from '@/lib/logging/simple-logger';
import { buildSectorLeaderboard } from '@/lib/intelligence/analyzers/sector-leaderboard-analyzer';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';
import { toCanonicalId, toEdgeId, formatNodeLabel } from '../normalize';
import type { GraphNode, GraphEdge } from '@/types/graph';
import type { HydrationSource } from '../types';

interface HydrationPlan {
  center: GraphNode;
  sources: HydrationSource[];
}

/** Max leaderboard entries to include in graph */
const LEADERBOARD_LIMIT = 20;

/**
 * Map a URL-friendly sector key (e.g., "defense", "finance-insurance-real-estate")
 * to the canonical IndustrySector enum value.
 *
 * Returns undefined if no match is found.
 */
function resolveIndustrySector(sectorKey: string): IndustrySector | undefined {
  const normalized = sectorKey.toLowerCase().replace(/-/g, ' ');

  for (const value of Object.values(IndustrySector)) {
    if (value.toLowerCase() === normalized) {
      return value;
    }
    // Also match with slashes and ampersands stripped
    const stripped = value
      .toLowerCase()
      .replace(/\//g, ' ')
      .replace(/&/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const normalizedStripped = normalized.replace(/\s+/g, ' ').trim();
    if (stripped === normalizedStripped) {
      return value;
    }
  }

  return undefined;
}

export async function hydrateSector(sectorKey: string): Promise<HydrationPlan | null> {
  // Reconstruct display name from key
  const displayName = sectorKey
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const sectorId = toCanonicalId('sector', sectorKey);
  const now = new Date().toISOString();

  const center: GraphNode = {
    id: sectorId,
    type: 'sector',
    label: formatNodeLabel('sector', { name: displayName }),
    properties: { name: displayName },
    dataAsOf: now,
    sourceLabel: 'CIV.IQ sector analysis',
  };

  const sources: HydrationSource[] = [
    {
      name: 'sector-leaderboard',
      fetch: () => hydrateLeaderboard(sectorId, sectorKey, now),
    },
  ];

  return { center, sources };
}

/**
 * Fetch top-funded representatives for a sector and produce graph nodes + edges.
 */
async function hydrateLeaderboard(
  sectorId: string,
  sectorKey: string,
  fallbackTimestamp: string
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const empty = { nodes: [], edges: [] };

  const industrySector = resolveIndustrySector(sectorKey);
  if (!industrySector) {
    logger.warn('[Graph:Sector] Unknown sector key, cannot resolve to IndustrySector', {
      sectorKey,
    });
    return empty;
  }

  let response;
  try {
    response = await buildSectorLeaderboard(industrySector, {
      limit: LEADERBOARD_LIMIT,
    });
  } catch (err) {
    logger.warn('[Graph:Sector] Sector leaderboard fetch failed', {
      sector: sectorKey,
      error: err instanceof Error ? err.message : String(err),
    });
    return empty;
  }

  if (!response || response.entries.length === 0) {
    logger.info('[Graph:Sector] No leaderboard entries for sector', { sectorKey });
    return empty;
  }

  const dataAsOf = response.dataAsOf ?? fallbackTimestamp;

  // Find the max donation amount for weight normalization
  const maxDonation = Math.max(
    ...response.entries.map(e => e.sectorDonationAmount),
    1 // avoid division by zero
  );

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const entry of response.entries) {
    const repId = toCanonicalId('representative', entry.bioguideId);

    const repNode: GraphNode = {
      id: repId,
      type: 'representative',
      label: formatNodeLabel('representative', {
        name: entry.name,
        party: entry.party,
        state: entry.state,
      }),
      properties: {
        name: entry.name,
        party: entry.party,
        state: entry.state,
        chamber: entry.chamber,
        bioguideId: entry.bioguideId,
      },
      dataAsOf,
      profileUrl: `/representative/${entry.bioguideId}`,
      sourceLabel: 'FEC contribution records',
    };

    const edge: GraphEdge = {
      id: toEdgeId(sectorId, 'donated_to', repId),
      type: 'donated_to',
      sourceId: sectorId,
      targetId: repId,
      label: `$${formatDollarAmount(entry.sectorDonationAmount)} from ${displaySectorName(sectorKey)} donors`,
      properties: {
        amount: entry.sectorDonationAmount,
        alignmentScore: entry.sectorAlignmentScore,
        billsVotedOn: entry.billsVotedOn,
        rank: entry.rank,
      },
      weight: entry.sectorDonationAmount / maxDonation,
      confidence: Math.min(entry.sectorAlignmentScore, 1),
      dataAsOf,
      sourceLabel: 'FEC contribution records',
    };

    nodes.push(repNode);
    edges.push(edge);
  }

  return { nodes, edges };
}

/** Format a dollar amount for display (e.g., 1500000 -> "1.5M", 25000 -> "25K") */
function formatDollarAmount(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K`;
  }
  return amount.toLocaleString();
}

/** Convert a URL key back to a readable sector name */
function displaySectorName(sectorKey: string): string {
  return sectorKey
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
