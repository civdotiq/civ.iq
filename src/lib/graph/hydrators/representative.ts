/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Representative Neighborhood Hydrator
 *
 * Builds a graph neighborhood for a legislator from 5 parallel data sources:
 * 1. Enhanced rep data → serves_on edges to committees
 * 2. FEC contributions → donated_to edges from organizations
 * 3. Voting records → voted_on edges to bills
 * 4. Sponsored bills → sponsored edges to bills
 * 5. Influence chains (cached) → enriches lobbying_matches edges
 *
 * Pattern: influence-chain-analyzer.ts
 */

import logger from '@/lib/logging/simple-logger';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { getFECIdFromBioguide } from '@/lib/data/bioguide-fec-mapping';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import { getCurrentElectionCycle } from '@/lib/intelligence/analyzers/shared';
import { toCanonicalId, toEdgeId, normalizeOrgName, formatNodeLabel } from '../normalize';
import type { GraphNode, GraphEdge } from '@/types/graph';
import type { HydrationSource } from '../types';

const MAX_CONTRIBUTIONS = 200;
const MAX_VOTES = 50;

interface HydrationPlan {
  center: GraphNode;
  sources: HydrationSource[];
}

export async function hydrateRepresentative(bioguideId: string): Promise<HydrationPlan | null> {
  const upperId = bioguideId.toUpperCase();
  const rep = await getEnhancedRepresentative(upperId);
  if (!rep) {
    logger.warn('[Graph:Rep] Representative not found', { bioguideId: upperId });
    return null;
  }

  const centerId = toCanonicalId('representative', upperId);
  const now = new Date().toISOString();

  const center: GraphNode = {
    id: centerId,
    type: 'representative',
    label: formatNodeLabel('representative', {
      name: rep.name,
      party: rep.party,
      state: rep.state,
    }),
    properties: {
      name: rep.name,
      party: rep.party,
      state: rep.state,
      district: rep.district,
      chamber: rep.chamber,
      title: rep.title,
      imageUrl: rep.imageUrl,
    },
    dataAsOf: now,
    profileUrl: `/representative/${upperId}`,
  };

  const sources: HydrationSource[] = [
    {
      name: 'committees',
      fetch: () => hydrateCommittees(centerId, rep.committees ?? [], now),
    },
    {
      name: 'contributions',
      fetch: () => hydrateContributions(centerId, upperId, now),
    },
    {
      name: 'votes',
      fetch: () => hydrateVotes(centerId, upperId, rep.chamber, now),
    },
  ];

  return { center, sources };
}

async function hydrateCommittees(
  repId: string,
  committees: Array<{
    name: string;
    role?: string;
    title?: string;
    thomas_id?: string;
    id?: string;
  }>,
  dataAsOf: string
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const committee of committees) {
    const cmteCode = committee.id ?? committee.thomas_id ?? committee.name;
    const cmteId = toCanonicalId('committee', cmteCode);

    nodes.push({
      id: cmteId,
      type: 'committee',
      label: formatNodeLabel('committee', { name: committee.name }),
      properties: { name: committee.name, code: cmteCode },
      dataAsOf,
    });

    edges.push({
      id: toEdgeId(repId, 'serves_on', cmteId),
      type: 'serves_on',
      sourceId: repId,
      targetId: cmteId,
      label: `Serves on ${committee.name}`,
      properties: { role: committee.role ?? committee.title ?? 'Member' },
      weight:
        (committee.role ?? committee.title) === 'Chair' ||
        (committee.role ?? committee.title) === 'Ranking Member'
          ? 1.0
          : 0.5,
      confidence: 1.0,
      dataAsOf,
    });
  }

  return { nodes, edges };
}

async function hydrateContributions(
  repId: string,
  bioguideId: string,
  dataAsOf: string
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const fecId = getFECIdFromBioguide(bioguideId);
  if (!fecId) return { nodes, edges };

  const cycle = getCurrentElectionCycle();
  const contributions = await fecApiService.getSampleContributions(fecId, cycle, MAX_CONTRIBUTIONS);

  // Aggregate by employer (organization)
  const orgTotals = new Map<string, { total: number; count: number; latestDate: string }>();
  for (const contrib of contributions) {
    const employer = contrib.contributor_employer?.trim();
    if (
      !employer ||
      employer === 'SELF-EMPLOYED' ||
      employer === 'RETIRED' ||
      employer === 'N/A' ||
      employer === 'NONE'
    ) {
      continue;
    }
    const key = employer.toUpperCase();
    const existing = orgTotals.get(key) ?? { total: 0, count: 0, latestDate: '' };
    existing.total += contrib.contribution_receipt_amount;
    existing.count += 1;
    if (contrib.contribution_receipt_date > existing.latestDate) {
      existing.latestDate = contrib.contribution_receipt_date;
    }
    orgTotals.set(key, existing);
  }

  // Sort by total amount, take top 30
  const sorted = Array.from(orgTotals.entries())
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 30);

  const maxAmount = sorted[0]?.[1]?.total ?? 1;

  for (const [orgName, data] of sorted) {
    const orgId = toCanonicalId('organization', normalizeOrgName(orgName));

    nodes.push({
      id: orgId,
      type: 'organization',
      label: formatNodeLabel('organization', { name: orgName }),
      properties: { name: orgName },
      dataAsOf,
    });

    edges.push({
      id: toEdgeId(orgId, 'donated_to', repId),
      type: 'donated_to',
      sourceId: orgId,
      targetId: repId,
      label: `$${data.total.toLocaleString()} from ${orgName} employees`,
      properties: {
        amount: data.total,
        contributionCount: data.count,
        cycle,
      },
      weight: Math.min(data.total / maxAmount, 1.0),
      confidence: 0.9,
      temporal: data.latestDate ? { date: data.latestDate, period: `${cycle} cycle` } : undefined,
      dataAsOf,
    });
  }

  return { nodes, edges };
}

async function hydrateVotes(
  repId: string,
  bioguideId: string,
  chamber: 'House' | 'Senate',
  dataAsOf: string
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const votes =
    chamber === 'House'
      ? await batchVotingService.getHouseMemberVotes(bioguideId, 119, undefined, MAX_VOTES)
      : await batchVotingService.getSenateMemberVotes(bioguideId, 119, undefined, MAX_VOTES);

  for (const vote of votes) {
    if (!vote.bill) continue;

    const billNumber = vote.bill.number ?? vote.bill.title ?? vote.voteId;
    const billId = toCanonicalId('bill', `119-${billNumber}`);

    // Only add bill node if not already added (dedup)
    if (!nodes.some(n => n.id === billId)) {
      nodes.push({
        id: billId,
        type: 'bill',
        label: formatNodeLabel('bill', {
          title: vote.bill.title ?? vote.question,
          number: billNumber,
        }),
        properties: {
          title: vote.bill.title ?? vote.question,
          number: billNumber,
          congress: 119,
        },
        dataAsOf,
      });
    }

    const position = vote.position?.toLowerCase() ?? 'unknown';
    edges.push({
      id: toEdgeId(repId, 'voted_on', billId),
      type: 'voted_on',
      sourceId: repId,
      targetId: billId,
      label: `Voted ${position} on ${billNumber}`,
      properties: {
        position,
        result: vote.result,
        rollCallNumber: vote.rollCallNumber,
      },
      weight: 0.5,
      confidence: 1.0,
      temporal: vote.date ? { date: vote.date } : undefined,
      dataAsOf,
    });
  }

  return { nodes, edges };
}
