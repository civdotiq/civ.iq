/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill Neighborhood Hydrator
 *
 * Builds a graph neighborhood for a bill from data sources:
 * 1. Congress.gov bill detail → sponsors, committees (referred_to)
 * 2. Sector classification → affects_sector edges
 *
 * Bill canonical ID format: "bill:{congress}-{type}-{number}" or "bill:119-HR1234"
 */

import logger from '@/lib/logging/simple-logger';
import { getBillSectors } from '@/lib/intelligence/analyzers/shared';
import { toCanonicalId, toEdgeId, formatNodeLabel } from '../normalize';
import type { GraphNode, GraphEdge } from '@/types/graph';
import type { HydrationSource } from '../types';

interface HydrationPlan {
  center: GraphNode;
  sources: HydrationSource[];
}

/** Parse a bill identifier like "119-hr-1234" or "119-HR1234" */
function parseBillIdentifier(identifier: string): {
  congress: number;
  type: string;
  number: string;
} | null {
  // Try pattern: 119-hr-1234
  const match1 = identifier.match(/^(\d+)-([a-z]+)-(\d+)$/i);
  if (match1) {
    return {
      congress: parseInt(match1[1] ?? '0'),
      type: (match1[2] ?? '').toLowerCase(),
      number: match1[3] ?? '',
    };
  }
  // Try pattern: 119-HR1234
  const match2 = identifier.match(/^(\d+)-([a-z]+)(\d+)$/i);
  if (match2) {
    return {
      congress: parseInt(match2[1] ?? '0'),
      type: (match2[2] ?? '').toLowerCase(),
      number: match2[3] ?? '',
    };
  }
  return null;
}

export async function hydrateBill(identifier: string): Promise<HydrationPlan | null> {
  const parsed = parseBillIdentifier(identifier);
  if (!parsed) {
    logger.warn('[Graph:Bill] Invalid bill identifier', { identifier });
    return null;
  }

  const { congress, type, number } = parsed;
  const billId = toCanonicalId('bill', identifier);
  const now = new Date().toISOString();

  // Fetch bill from Congress.gov
  const apiKey = process.env.CONGRESS_GOV_API_KEY;
  if (!apiKey) {
    logger.warn('[Graph:Bill] CONGRESS_GOV_API_KEY not configured');
    return null;
  }

  let billData: Record<string, unknown> | null = null;
  try {
    const url = `https://api.congress.gov/v3/bill/${congress}/${type}/${number}?api_key=${apiKey}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (response.ok) {
      const json = (await response.json()) as { bill?: Record<string, unknown> };
      billData = json.bill ?? null;
    }
  } catch (error) {
    logger.warn('[Graph:Bill] Congress.gov fetch failed', { identifier, error: String(error) });
  }

  if (!billData) return null;

  const title = (billData['title'] as string) ?? 'Unknown Bill';
  const billNumber = `${type.toUpperCase()} ${number}`;

  const center: GraphNode = {
    id: billId,
    type: 'bill',
    label: formatNodeLabel('bill', { title, number: billNumber }),
    properties: {
      title,
      number: billNumber,
      congress,
      type,
      policyArea: (billData['policyArea'] as Record<string, unknown>)?.['name'],
      latestAction: (billData['latestAction'] as Record<string, unknown>)?.['text'],
    },
    dataAsOf: now,
    profileUrl: `/legislation/${congress}/${type}${number}`,
    sourceUrl: `https://api.congress.gov/v3/bill/${congress}/${type}/${number}`,
    sourceLabel: 'Congress.gov',
  };

  const fullBillId = `${congress}/${type}/${number}`;

  const sources: HydrationSource[] = [
    {
      name: 'sponsors',
      fetch: () => hydrateSponsors(billId, billData, now),
    },
    {
      name: 'sectors',
      fetch: () => hydrateSectors(billId, fullBillId, title, now),
    },
    {
      name: 'committees',
      fetch: () => hydrateReferrals(billId, billData, now),
    },
  ];

  return { center, sources };
}

async function hydrateSponsors(
  billId: string,
  billData: Record<string, unknown>,
  dataAsOf: string
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Sponsor
  const sponsors = billData['sponsors'] as Array<Record<string, unknown>> | undefined;
  if (sponsors) {
    for (const sponsor of sponsors) {
      const bioguideId = sponsor['bioguideId'] as string | undefined;
      if (!bioguideId) continue;

      const repId = toCanonicalId('representative', bioguideId);
      const name = `${sponsor['firstName'] ?? ''} ${sponsor['lastName'] ?? ''}`.trim();
      const party = sponsor['party'] as string | undefined;
      const state = sponsor['state'] as string | undefined;

      nodes.push({
        id: repId,
        type: 'representative',
        label: formatNodeLabel('representative', { name, party, state }),
        properties: { name, party, state, bioguideId },
        dataAsOf,
        profileUrl: `/representative/${bioguideId}`,
        sourceLabel: 'Congress.gov',
      });

      edges.push({
        id: toEdgeId(repId, 'sponsored', billId),
        type: 'sponsored',
        sourceId: repId,
        targetId: billId,
        label: `Sponsored by ${name}`,
        properties: { isCosponsor: false },
        weight: 1.0,
        confidence: 1.0,
        dataAsOf,
        sourceLabel: 'Congress.gov bill sponsorship',
      });
    }
  }

  // Cosponsors (from top-level count only — full list requires extra API call)
  const cosponsorCount = billData['cosponsors']
    ? ((billData['cosponsors'] as Record<string, unknown>)['count'] as number | undefined)
    : undefined;
  if (cosponsorCount !== undefined && cosponsorCount > 0) {
    // Store cosponsor count as a property on the center node — we don't expand all cosponsors
    // to avoid creating hundreds of nodes
  }

  return { nodes, edges };
}

async function hydrateSectors(
  billNodeId: string,
  fullBillId: string,
  title: string,
  dataAsOf: string
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const sectors = await getBillSectors(fullBillId, title);

  for (const sector of sectors) {
    const sectorKey = sector.toLowerCase().replace(/[^a-z]+/g, '-');
    const sectorId = toCanonicalId('sector', sectorKey);

    nodes.push({
      id: sectorId,
      type: 'sector',
      label: formatNodeLabel('sector', { name: sector }),
      properties: { name: sector },
      dataAsOf,
      sourceLabel: 'CIV.IQ sector classification',
    });

    edges.push({
      id: toEdgeId(billNodeId, 'affects_sector', sectorId),
      type: 'affects_sector',
      sourceId: billNodeId,
      targetId: sectorId,
      label: `Affects ${sector}`,
      properties: {},
      weight: 0.7,
      confidence: 0.8,
      dataAsOf,
      sourceLabel: 'CIV.IQ sector classification',
    });
  }

  return { nodes, edges };
}

async function hydrateReferrals(
  billId: string,
  billData: Record<string, unknown>,
  dataAsOf: string
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const committees = billData['committees'] as Record<string, unknown> | undefined;
  // Congress.gov returns committees as a nested object with a url to fetch — we check for inline data
  if (!committees) return { nodes, edges };

  // Sometimes committees are inline as an array
  const committeeList = (committees['item'] ?? committees) as
    | Array<Record<string, unknown>>
    | undefined;
  if (!Array.isArray(committeeList)) return { nodes, edges };

  for (const cmte of committeeList) {
    const name = (cmte['name'] as string) ?? 'Unknown Committee';
    const code = (cmte['systemCode'] as string) ?? name;
    const cmteId = toCanonicalId('committee', code);

    nodes.push({
      id: cmteId,
      type: 'committee',
      label: formatNodeLabel('committee', { name }),
      properties: { name, code },
      dataAsOf,
      sourceLabel: 'Congress.gov',
    });

    edges.push({
      id: toEdgeId(billId, 'referred_to', cmteId),
      type: 'referred_to',
      sourceId: billId,
      targetId: cmteId,
      label: `Referred to ${name}`,
      properties: {},
      weight: 0.6,
      confidence: 1.0,
      dataAsOf,
      sourceLabel: 'Congress.gov committee referral',
    });
  }

  return { nodes, edges };
}
