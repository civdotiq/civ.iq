/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Organization Neighborhood Hydrator
 *
 * Builds a graph neighborhood for an organization from:
 * 1. Senate LDA filings → lobbied edges to committees
 * 2. Sector classification → in_sector edges
 * 3. FEC disbursements → donated_to edges to representatives
 */

import logger from '@/lib/logging/simple-logger';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { senateLobbyingAPI } from '@/lib/data-sources/senate-lobbying-api';
import { getCurrentElectionCycle } from '@/lib/intelligence/analyzers/shared';
import {
  resolveFilingEntities,
  getResolvedCommittees,
  categorizeContribution,
  getBioguideFromFEC,
  IndustrySector,
} from '@civiq/entity-resolution';
import { toCanonicalId, toEdgeId, formatNodeLabel, normalizeOrgName } from '../normalize';
import type { GraphNode, GraphEdge } from '@/types/graph';
import type { HydrationSource } from '../types';

const MAX_DISBURSEMENT_RECIPIENTS = 20;

interface HydrationPlan {
  center: GraphNode;
  sources: HydrationSource[];
}

export async function hydrateOrganization(normalizedName: string): Promise<HydrationPlan | null> {
  // Reconstruct display name from normalized slug
  const displayName = normalizedName
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const orgId = toCanonicalId('organization', normalizedName);
  const now = new Date().toISOString();

  const center: GraphNode = {
    id: orgId,
    type: 'organization',
    label: formatNodeLabel('organization', { name: displayName }),
    properties: { name: displayName },
    dataAsOf: now,
  };

  const sources: HydrationSource[] = [
    {
      name: 'lobbying',
      fetch: () => hydrateLobbyingFilings(orgId, displayName, now),
    },
    {
      name: 'sector',
      fetch: () => hydrateSectorClassification(orgId, displayName, now),
    },
    {
      name: 'donations',
      fetch: () => hydrateDonations(orgId, displayName, now),
    },
  ];

  return { center, sources };
}

// ── Source 1: Lobbying → Committee edges ────────────────────────────

async function hydrateLobbyingFilings(
  orgId: string,
  orgName: string,
  dataAsOf: string
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  try {
    const filings = await senateLobbyingAPI.fetchRecentFilings();
    const orgNameUpper = orgName.toUpperCase();

    // Find filings from this org (matching registrant or client name)
    const matched = filings.filter(f => {
      const registrant = f.registrant?.name?.toUpperCase() ?? '';
      const client = f.client?.name?.toUpperCase() ?? '';
      return registrant.includes(orgNameUpper) || client.includes(orgNameUpper);
    });

    if (matched.length === 0) {
      return { nodes, edges };
    }

    // Aggregate lobbying data per committee across all matched filings
    const committeeAggregates = new Map<
      string,
      {
        committeeName: string;
        totalAmount: number;
        filingCount: number;
        issueCodes: Set<string>;
        bestConfidence: number;
        latestYear: number;
        latestPeriod: string;
      }
    >();

    const totalSpending = matched.reduce((sum, f) => sum + (f.income ?? f.expenses ?? 0), 0);

    for (const filing of matched) {
      if (!filing.government_entities || filing.government_entities.length === 0) {
        continue;
      }

      const resolutions = resolveFilingEntities(filing.government_entities);
      const committees = getResolvedCommittees(resolutions);
      const filingAmount = filing.income ?? filing.expenses ?? 0;

      for (const cmte of committees) {
        const existing = committeeAggregates.get(cmte.committeeCode);
        const issues = (filing.issues ?? []).map(i => i.code).filter(Boolean);

        if (existing) {
          existing.totalAmount += filingAmount;
          existing.filingCount += 1;
          for (const code of issues) existing.issueCodes.add(code);
          existing.bestConfidence = Math.max(existing.bestConfidence, cmte.confidence);
          if (filing.filingYear > existing.latestYear) {
            existing.latestYear = filing.filingYear;
            existing.latestPeriod = filing.filingPeriod ?? '';
          }
        } else {
          committeeAggregates.set(cmte.committeeCode, {
            committeeName: cmte.committeeName,
            totalAmount: filingAmount,
            filingCount: 1,
            issueCodes: new Set(issues),
            bestConfidence: cmte.confidence,
            latestYear: filing.filingYear,
            latestPeriod: filing.filingPeriod ?? '',
          });
        }
      }
    }

    // Create one node + one edge per committee (aggregated)
    for (const [committeeCode, agg] of committeeAggregates) {
      const committeeId = toCanonicalId('committee', committeeCode);

      nodes.push({
        id: committeeId,
        type: 'committee',
        label: formatNodeLabel('committee', { name: agg.committeeName }),
        properties: {
          name: agg.committeeName,
          committeeCode,
        },
        dataAsOf,
        profileUrl: `/committee/${committeeCode}`,
        sourceLabel: 'Congress.gov',
      });

      const weight = Math.min(agg.totalAmount / 10_000_000, 1);

      edges.push({
        id: toEdgeId(orgId, 'lobbied', committeeId),
        type: 'lobbied',
        sourceId: orgId,
        targetId: committeeId,
        label: `Lobbied ${agg.committeeName}`,
        properties: {
          amount: agg.totalAmount,
          totalOrgSpending: totalSpending,
          filingCount: agg.filingCount,
          issueCodes: Array.from(agg.issueCodes),
        },
        weight,
        confidence: agg.bestConfidence,
        temporal: agg.latestPeriod
          ? {
              date: `${agg.latestYear}-01-01`,
              period: `${agg.latestYear} ${agg.latestPeriod}`,
            }
          : undefined,
        dataAsOf,
        sourceUrl: `https://lda.senate.gov/filings/public/filing/search/?registrant_name=${encodeURIComponent(orgName)}`,
        sourceLabel: 'Senate Lobbying Disclosure Act',
      });
    }
  } catch (error) {
    logger.warn('[Graph:Org] Lobbying data fetch failed', {
      orgName,
      error: String(error),
    });
  }

  return { nodes, edges };
}

// ── Source 2: Sector classification ─────────────────────────────────

async function hydrateSectorClassification(
  orgId: string,
  orgName: string,
  dataAsOf: string
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  try {
    const result = categorizeContribution(orgName);

    // Only create edge if we got a meaningful classification
    if (
      result.category === 'Other/Unknown' ||
      result.category === 'Unknown' ||
      result.sector === IndustrySector.OTHER
    ) {
      return { nodes, edges };
    }

    const sectorKey = normalizeOrgName(result.sector);
    const sectorId = toCanonicalId('sector', sectorKey);

    nodes.push({
      id: sectorId,
      type: 'sector',
      label: formatNodeLabel('sector', { name: result.sector }),
      properties: {
        name: result.sector,
        category: result.category,
      },
      dataAsOf,
      profileUrl: `/industry/${sectorKey}`,
      sourceLabel: 'CIV.IQ sector classification',
    });

    const confidenceMap: Record<string, number> = {
      high: 0.95,
      medium: 0.7,
      low: 0.4,
    };

    edges.push({
      id: toEdgeId(orgId, 'in_sector', sectorId),
      type: 'in_sector',
      sourceId: orgId,
      targetId: sectorId,
      label: `In sector: ${result.sector}`,
      properties: {
        category: result.category,
        matchSource: result.matchSource,
        matchedKeyword: result.matchedKeyword,
      },
      weight: 0.5,
      confidence: confidenceMap[result.confidence] ?? 0.5,
      dataAsOf,
      sourceLabel: 'CIV.IQ sector classification',
    });
  } catch (error) {
    logger.warn('[Graph:Org] Sector classification failed', {
      orgName,
      error: String(error),
    });
  }

  return { nodes, edges };
}

// ── Source 3: Donations to representatives ──────────────────────────

async function hydrateDonations(
  orgId: string,
  orgName: string,
  dataAsOf: string
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  try {
    const cycle = getCurrentElectionCycle();

    // Search for the org's PAC / connected committee
    const searchResult = await fecApiService.searchCommittees(orgName, 1, 5);
    if (!searchResult.results || searchResult.results.length === 0) {
      return { nodes, edges };
    }

    // Use the top matching committee
    const orgCommittee = searchResult.results[0];
    if (!orgCommittee) {
      return { nodes, edges };
    }

    // Get disbursements by recipient — shows who this PAC gave money to
    const disbursements = await fecApiService.getCommitteeDisbursementsByRecipient(
      orgCommittee.committee_id,
      cycle,
      1,
      MAX_DISBURSEMENT_RECIPIENTS
    );

    if (!disbursements.results || disbursements.results.length === 0) {
      return { nodes, edges };
    }

    // Find the max disbursement for weight normalization
    const maxTotal = Math.max(...disbursements.results.map(d => d.total));

    for (const disbursement of disbursements.results) {
      // recipient_id is an FEC candidate ID (e.g., H8FL15126) — resolve to bioguideId
      const fecCandidateId = disbursement.recipient_id;
      if (!fecCandidateId) continue;

      const bioguideId = getBioguideFromFEC(fecCandidateId);
      // Use bioguideId for consistent node IDs, fall back to FEC ID if unmapped
      const nodeIdentifier = bioguideId ?? fecCandidateId;
      const recipientNodeId = toCanonicalId('representative', nodeIdentifier);

      nodes.push({
        id: recipientNodeId,
        type: 'representative',
        label: formatNodeLabel('representative', {
          name: disbursement.recipient_name,
        }),
        properties: {
          name: disbursement.recipient_name,
          bioguideId: bioguideId ?? undefined,
          fecCandidateId,
        },
        dataAsOf,
        profileUrl: bioguideId ? `/representative/${bioguideId}` : undefined,
        sourceUrl: bioguideId
          ? `https://bioguide.congress.gov/search/bio/${bioguideId}`
          : undefined,
        sourceLabel: 'FEC disbursement records',
      });

      const weight = maxTotal > 0 ? disbursement.total / maxTotal : 0.5;

      edges.push({
        id: toEdgeId(orgId, 'donated_to', recipientNodeId),
        type: 'donated_to',
        sourceId: orgId,
        targetId: recipientNodeId,
        label: `Donated to ${disbursement.recipient_name}`,
        properties: {
          amount: disbursement.total,
          transactionCount: disbursement.count,
          committeeId: orgCommittee.committee_id,
          committeeName: orgCommittee.name,
          cycle,
        },
        weight,
        confidence: 0.9,
        temporal: {
          date: `${cycle}-01-01`,
          period: `${cycle - 1}-${cycle} cycle`,
        },
        dataAsOf,
        sourceUrl: `https://www.fec.gov/data/disbursements/?committee_id=${orgCommittee.committee_id}`,
        sourceLabel: 'FEC disbursement records',
      });
    }
  } catch (error) {
    logger.warn('[Graph:Org] Donation data fetch failed', {
      orgName,
      error: String(error),
    });
  }

  return { nodes, edges };
}
