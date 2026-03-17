/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Agency Neighborhood Hydrator
 *
 * Builds a graph neighborhood for a government agency from:
 * 1. Committee-agency map → oversees edges from committees
 * 2. Federal Register → regulates edges to regulations
 */

import logger from '@/lib/logging/simple-logger';
import {
  getCommitteesForAgency,
  ALL_COMMITTEE_MAPPINGS,
} from '@/lib/connections/committee-agency-map';
import { toCanonicalId, toEdgeId, formatNodeLabel } from '../normalize';
import type { GraphNode, GraphEdge } from '@/types/graph';
import type { HydrationSource } from '../types';

interface HydrationPlan {
  center: GraphNode;
  sources: HydrationSource[];
}

export async function hydrateAgency(agencySlug: string): Promise<HydrationPlan | null> {
  // Find agency info from slug — try both USAspending slug and name-derived slug
  const allAgencies = new Map<string, { name: string; usaSpendingSlug: string }>();
  for (const mapping of ALL_COMMITTEE_MAPPINGS) {
    for (const agency of mapping.agencies) {
      const nameSlug = agency.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      allAgencies.set(nameSlug, { name: agency.name, usaSpendingSlug: agency.slug });
      allAgencies.set(agency.slug, { name: agency.name, usaSpendingSlug: agency.slug });
    }
  }

  const agencyInfo = allAgencies.get(agencySlug);
  const agencyName = agencyInfo?.name;
  if (!agencyName) {
    logger.warn('[Graph:Agency] Agency not found', { agencySlug });
    return null;
  }

  const agencyId = toCanonicalId('agency', agencySlug);
  const now = new Date().toISOString();

  const center: GraphNode = {
    id: agencyId,
    type: 'agency',
    label: formatNodeLabel('agency', { name: agencyName }),
    properties: { name: agencyName },
    dataAsOf: now,
    sourceLabel: 'Congressional oversight jurisdiction',
  };

  const usaSpendingSlug = agencyInfo.usaSpendingSlug;
  const sources: HydrationSource[] = [
    {
      name: 'oversight',
      fetch: () => hydrateOversightCommittees(agencyId, usaSpendingSlug, agencyName, now),
    },
  ];

  return { center, sources };
}

async function hydrateOversightCommittees(
  agencyId: string,
  agencySlug: string,
  agencyName: string,
  dataAsOf: string
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const committees = getCommitteesForAgency(agencySlug);
  for (const cmte of committees) {
    const cmteId = toCanonicalId('committee', cmte.committeeCode);

    nodes.push({
      id: cmteId,
      type: 'committee',
      label: formatNodeLabel('committee', { name: cmte.committeeName }),
      properties: { name: cmte.committeeName, chamber: cmte.chamber },
      dataAsOf,
      sourceLabel: 'Congress.gov',
    });

    edges.push({
      id: toEdgeId(cmteId, 'oversees', agencyId),
      type: 'oversees',
      sourceId: cmteId,
      targetId: agencyId,
      label: `${cmte.committeeName} oversees ${agencyName}`,
      properties: {},
      weight: 0.8,
      confidence: 1.0,
      dataAsOf,
      sourceLabel: 'Congressional oversight jurisdiction',
    });
  }

  return { nodes, edges };
}
