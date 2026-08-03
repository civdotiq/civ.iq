/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Committee Neighborhood Hydrator
 *
 * Builds a graph neighborhood for a congressional committee from:
 * 1. Committee members → serves_on edges from representatives
 * 2. Oversight agencies → oversees edges to agencies
 * 3. Lobbying activity → lobbied edges from organizations
 */

import logger from '@/lib/logging/simple-logger';
import { getCommitteeDataService } from '@/lib/services/committee.service';
import { getAgenciesForCommittee, type AgencyInfo } from '@/lib/connections/committee-agency-map';
import { getCommitteeLobbyingFromCorpus } from '@/lib/data-sources/lda-corpus/committee-lobbying';
import {
  toCanonicalId,
  toEdgeId,
  formatNodeLabel,
  normalizeOrgName,
  toTitleCase,
} from '../normalize';
import type { GraphNode, GraphEdge } from '@/types/graph';
import type { HydrationSource } from '../types';
import type { Committee } from '@/types/committee';

interface HydrationPlan {
  center: GraphNode;
  sources: HydrationSource[];
}

export async function hydrateCommittee(committeeCode: string): Promise<HydrationPlan | null> {
  const committee = await getCommitteeDataService(committeeCode);
  if (!committee) {
    logger.warn('[Graph:Committee] Committee not found', { committeeCode });
    return null;
  }

  const cmteId = toCanonicalId('committee', committeeCode);
  const now = new Date().toISOString();

  const center: GraphNode = {
    id: cmteId,
    type: 'committee',
    label: formatNodeLabel('committee', { name: committee.name }),
    properties: {
      name: committee.name,
      chamber: committee.chamber,
      code: committeeCode,
      jurisdiction: committee.jurisdiction,
    },
    dataAsOf: now,
    profileUrl: `/committee/${committeeCode}`,
    sourceUrl: `https://www.congress.gov/committee/${committeeCode}`,
    sourceLabel: 'Congress.gov',
  };

  const sources: HydrationSource[] = [
    {
      name: 'members',
      fetch: () => hydrateMembers(cmteId, committee, now),
    },
    {
      name: 'agencies',
      fetch: () => hydrateAgencies(cmteId, committeeCode, now),
    },
    {
      name: 'lobbying',
      fetch: () => hydrateLobbyingActivity(cmteId, committeeCode, committee.name, now),
    },
  ];

  return { center, sources };
}

async function hydrateMembers(
  cmteId: string,
  committee: Committee,
  dataAsOf: string
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const members = committee.members ?? [];
  for (const member of members) {
    const rep = member.representative;
    if (!rep?.bioguideId) continue;

    const repId = toCanonicalId('representative', rep.bioguideId);

    nodes.push({
      id: repId,
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
        bioguideId: rep.bioguideId,
      },
      dataAsOf,
      profileUrl: `/representative/${rep.bioguideId}`,
      sourceUrl: `https://bioguide.congress.gov/search/bio/${rep.bioguideId}`,
      sourceLabel: 'Congress.gov',
    });

    const isLeader = member.role === 'Chair' || member.role === 'Ranking Member';
    edges.push({
      id: toEdgeId(repId, 'serves_on', cmteId),
      type: 'serves_on',
      sourceId: repId,
      targetId: cmteId,
      label: `${rep.name} — ${member.role}`,
      properties: { role: member.role },
      weight: isLeader ? 1.0 : 0.5,
      confidence: 1.0,
      dataAsOf,
      sourceLabel: 'Congress.gov committee membership',
    });
  }

  return { nodes, edges };
}

async function hydrateAgencies(
  cmteId: string,
  committeeCode: string,
  dataAsOf: string
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const agencies: AgencyInfo[] = getAgenciesForCommittee(committeeCode);

  for (const agency of agencies) {
    const agencySlug = agency.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const agencyId = toCanonicalId('agency', agencySlug);

    nodes.push({
      id: agencyId,
      type: 'agency',
      label: formatNodeLabel('agency', { name: agency.name }),
      properties: { name: agency.name, abbreviation: agency.abbreviation },
      dataAsOf,
      sourceUrl: `https://www.usaspending.gov/agency/${agency.slug}`,
      sourceLabel: 'USASpending.gov',
    });

    edges.push({
      id: toEdgeId(cmteId, 'oversees', agencyId),
      type: 'oversees',
      sourceId: cmteId,
      targetId: agencyId,
      label: `Oversees ${agency.name}`,
      properties: {},
      weight: 0.8,
      confidence: 1.0,
      dataAsOf,
      sourceLabel: 'Congressional oversight jurisdiction',
    });
  }

  return { nodes, edges };
}

async function hydrateLobbyingActivity(
  cmteId: string,
  committeeCode: string,
  committeeName: string,
  dataAsOf: string
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  try {
    // Corpus only. The API path returns the LDA's first 25 filings, from which
    // the top-20 lobbying organizations of a committee cannot be known — the
    // graph would assert 20 "lobbied" edges drawn from 0.09% of the record.
    // No corpus means no edges.
    const lobbyingData = await getCommitteeLobbyingFromCorpus([committeeCode]);
    if (!lobbyingData || lobbyingData.length === 0) return { nodes, edges };

    // Company rollups already cover every filing, so no re-aggregation here —
    // `filings` is capped and would undercount.
    const sorted = (lobbyingData[0]?.companies ?? []).slice(0, 20);

    const maxSpend = sorted[0]?.totalSpending ?? 1;

    for (const orgData of sorted) {
      const orgName = orgData.name.trim().toUpperCase();
      const spending = orgData.totalSpending;
      const orgId = toCanonicalId('organization', normalizeOrgName(orgName));
      const displayName = toTitleCase(orgName);

      nodes.push({
        id: orgId,
        type: 'organization',
        label: formatNodeLabel('organization', { name: displayName }),
        properties: { name: orgName, lobbyingSpending: spending },
        dataAsOf,
        sourceUrl: `https://lda.gov/filings/public/filing/search/?registrant_name=${encodeURIComponent(orgName)}`,
        sourceLabel: 'Senate LDA filings',
      });

      edges.push({
        id: toEdgeId(orgId, 'lobbied', cmteId),
        type: 'lobbied',
        sourceId: orgId,
        targetId: cmteId,
        label: `$${spending.toLocaleString()} lobbying ${committeeName}`,
        properties: { spending },
        weight: Math.min(spending / maxSpend, 1.0),
        confidence: 0.85,
        temporal: orgData.latestQuarter
          ? {
              date: orgData.latestQuarter,
              firstSeen: orgData.earliestQuarter || orgData.latestQuarter,
              lastSeen: orgData.latestQuarter,
            }
          : undefined,
        dataAsOf,
        sourceUrl: `https://lda.gov/filings/public/filing/search/?registrant_name=${encodeURIComponent(orgName)}`,
        sourceLabel: 'Senate Lobbying Disclosure Act',
      });
    }
  } catch (error) {
    logger.warn('[Graph:Committee] Lobbying data fetch failed', {
      committeeCode,
      error: String(error),
    });
  }

  return { nodes, edges };
}
