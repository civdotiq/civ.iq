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
import {
  forEachFilingForOrganization,
  getFilingCorpusCommittees,
} from '@/lib/data-sources/lda-corpus/load-filings';
import type { CorpusFiling } from '@/lib/data-sources/lda-corpus/filing-corpus';
import { getCurrentElectionCycle } from '@/lib/intelligence/analyzers/shared';
import {
  categorizeContribution,
  getBioguideFromFEC,
  IndustrySector,
} from '@civiq/entity-resolution';
import { toCanonicalId, toEdgeId, formatNodeLabel, normalizeOrgName } from '../normalize';
import type { GraphNode, GraphEdge } from '@/types/graph';
import type { HydrationSource } from '../types';

/**
 * Map LDA general issue codes to the congressional committee codes most likely
 * to have jurisdiction. This is the fallback when government_entities are too
 * generic (e.g., just "SENATE" / "HOUSE OF REPRESENTATIVES").
 *
 * Source: Senate LDA issue code taxonomy + committee jurisdiction mappings.
 */
const LDA_ISSUE_TO_COMMITTEES: Record<string, Array<{ code: string; name: string }>> = {
  DEF: [
    { code: 'SSAS', name: 'Armed Services' },
    { code: 'HSAS', name: 'Armed Services' },
  ],
  BUD: [
    { code: 'SSAP', name: 'Appropriations' },
    { code: 'HSAP', name: 'Appropriations' },
  ],
  TAX: [
    { code: 'SSFI', name: 'Finance' },
    { code: 'HSWM', name: 'Ways and Means' },
  ],
  HCR: [
    { code: 'SSHR', name: 'Health, Education, Labor, and Pensions' },
    { code: 'HSIF', name: 'Energy and Commerce' },
  ],
  ENV: [
    { code: 'SSEV', name: 'Environment and Public Works' },
    { code: 'HSII', name: 'Natural Resources' },
  ],
  TRD: [
    { code: 'SSFI', name: 'Finance' },
    { code: 'HSWM', name: 'Ways and Means' },
  ],
  TEC: [
    { code: 'SSCM', name: 'Commerce, Science, and Transportation' },
    { code: 'HSSY', name: 'Science, Space, and Technology' },
  ],
  AER: [
    { code: 'SSCM', name: 'Commerce, Science, and Transportation' },
    { code: 'HSPW', name: 'Transportation and Infrastructure' },
  ],
  NAT: [
    { code: 'SSFR', name: 'Foreign Relations' },
    { code: 'HSFA', name: 'Foreign Affairs' },
  ],
  LBR: [
    { code: 'SSHR', name: 'Health, Education, Labor, and Pensions' },
    { code: 'HSED', name: 'Education and Workforce' },
  ],
  INT: [
    { code: 'SSFR', name: 'Foreign Relations' },
    { code: 'HSFA', name: 'Foreign Affairs' },
  ],
  FIN: [
    { code: 'SSBK', name: 'Banking, Housing, and Urban Affairs' },
    { code: 'HSBA', name: 'Financial Services' },
  ],
  TRA: [
    { code: 'SSCM', name: 'Commerce, Science, and Transportation' },
    { code: 'HSPW', name: 'Transportation and Infrastructure' },
  ],
  ENE: [
    { code: 'SSEN', name: 'Energy and Natural Resources' },
    { code: 'HSIF', name: 'Energy and Commerce' },
  ],
  AGR: [
    { code: 'SSAF', name: 'Agriculture, Nutrition, and Forestry' },
    { code: 'HSAG', name: 'Agriculture' },
  ],
  IMM: [
    { code: 'SSJU', name: 'Judiciary' },
    { code: 'HSJU', name: 'Judiciary' },
  ],
  HOM: [
    { code: 'SSGA', name: 'Homeland Security and Governmental Affairs' },
    { code: 'HSHM', name: 'Homeland Security' },
  ],
};

const MAX_DISBURSEMENT_RECIPIENTS = 50;

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

/** First day of a corpus quarter key ("2026-Q2" → "2026-04-01"), for edge temporality. */
function quarterStartDate(quarter: string): string {
  const [year, q] = quarter.split('-');
  const starts: Record<string, string> = { Q1: '01-01', Q2: '04-01', Q3: '07-01', Q4: '10-01' };
  return `${year}-${starts[q ?? ''] ?? '01-01'}`;
}

async function hydrateLobbyingFilings(
  orgId: string,
  orgName: string,
  dataAsOf: string
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  try {
    // Read from the committed corpus rather than the live LDA API.
    //
    // Unlike the other lobbying surfaces, the API path here was not a first-page
    // sample — fetchFilingsForOrganization filters server-side by name and
    // paginates. What it was is truncated in the wrong direction: results come
    // back oldest-first and it stops at 10 pages, so any organization with more
    // than 250 filings lost its most recent ones. It also cost up to twenty
    // sequential API calls per hydration.
    //
    // The trade is history for completeness: the corpus covers its own window
    // (currently eight quarters) rather than all time, but covers it fully, and
    // resolves committee attribution the same way every other surface does.
    const committeeNames = await getFilingCorpusCommittees();

    const committeeAggregates = new Map<
      string,
      {
        committeeName: string;
        totalAmount: number;
        filingCount: number;
        issueCodes: Set<string>;
        bestConfidence: number;
        latestQuarter: string;
      }
    >();

    let totalSpending = 0;
    let filingCount = 0;

    const available = await forEachFilingForOrganization(orgName, (filing: CorpusFiling) => {
      totalSpending += filing.amount;
      filingCount += 1;

      const disclosedEntities = filing.governmentEntities.map(e => e.toLowerCase());

      for (const committeeCode of filing.committeeCodes) {
        const committeeName = committeeNames?.get(committeeCode) ?? committeeCode;

        // A filing naming the committee among its disclosed government entities
        // is stronger evidence than one attributed by issue-code jurisdiction.
        // Same distinction the API path drew between its two tiers.
        const named = committeeName.toLowerCase();
        const confidence = disclosedEntities.some(e => e.includes(named) || named.includes(e))
          ? 0.85
          : 0.7;

        const existing = committeeAggregates.get(committeeCode);
        if (existing) {
          existing.totalAmount += filing.amount;
          existing.filingCount += 1;
          for (const code of filing.issueCodes) existing.issueCodes.add(code);
          existing.bestConfidence = Math.max(existing.bestConfidence, confidence);
          if (filing.quarter > existing.latestQuarter) existing.latestQuarter = filing.quarter;
        } else {
          committeeAggregates.set(committeeCode, {
            committeeName,
            totalAmount: filing.amount,
            filingCount: 1,
            issueCodes: new Set(filing.issueCodes),
            bestConfidence: confidence,
            latestQuarter: filing.quarter,
          });
        }
      }
    });

    if (!available || filingCount === 0) {
      // No corpus, or an organization that filed nothing in the window. Fall
      // back to sector-based committee inference so the path tracer still
      // produces edges — it is labelled as an inference at 0.5 confidence.
      return inferCommitteesFromSector(orgId, orgName, dataAsOf);
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
        temporal: agg.latestQuarter
          ? {
              date: quarterStartDate(agg.latestQuarter),
              period: agg.latestQuarter,
            }
          : undefined,
        dataAsOf,
        sourceUrl: `https://lda.gov/filings/public/filing/search/?registrant_name=${encodeURIComponent(orgName)}`,
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

/**
 * Fallback when LDA API returns no filings (rate limited, down, etc.).
 * Uses entity-resolution sector classification to infer the most likely
 * LDA issue code, then maps to committees via LDA_ISSUE_TO_COMMITTEES.
 * Confidence is lower (0.5) since this is a heuristic inference.
 */
function inferCommitteesFromSector(
  orgId: string,
  orgName: string,
  dataAsOf: string
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const SECTOR_TO_ISSUE: Record<string, string> = {
    Defense: 'DEF',
    Healthcare: 'HCR',
    Energy: 'ENE',
    Finance: 'FIN',
    Technology: 'TEC',
    Transportation: 'TRA',
    Agriculture: 'AGR',
    'Real Estate': 'FIN',
    Telecommunications: 'TEC',
    Pharmaceuticals: 'HCR',
  };

  const result = categorizeContribution(orgName);
  const issueCode = SECTOR_TO_ISSUE[result.sector] ?? SECTOR_TO_ISSUE[result.category];
  if (!issueCode) return { nodes, edges };

  const committees = LDA_ISSUE_TO_COMMITTEES[issueCode];
  if (!committees) return { nodes, edges };

  for (const cmte of committees) {
    const committeeId = toCanonicalId('committee', cmte.code);
    nodes.push({
      id: committeeId,
      type: 'committee',
      label: formatNodeLabel('committee', { name: cmte.name }),
      properties: { name: cmte.name, committeeCode: cmte.code },
      dataAsOf,
      profileUrl: `/committee/${cmte.code}`,
      sourceLabel: 'Inferred from sector classification',
    });

    const currentYear = new Date().getFullYear();
    edges.push({
      id: toEdgeId(orgId, 'lobbied', committeeId),
      type: 'lobbied',
      sourceId: orgId,
      targetId: committeeId,
      label: `Lobbied ${cmte.name} (inferred from sector)`,
      properties: {
        inferred: true,
        sector: result.sector,
        issueCode,
      },
      weight: 0.3,
      confidence: 0.5,
      temporal: {
        date: `${currentYear}-01-01`,
        period: `${currentYear} (inferred)`,
      },
      dataAsOf,
      sourceLabel: 'Inferred from sector classification',
    });
  }

  logger.info('[Graph:Org] Used sector-based committee fallback', {
    orgName,
    sector: result.sector,
    issueCode,
    committees: committees.map(c => c.code),
  });

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

    // Batch-resolve committee IDs → candidate IDs in parallel instead of
    // sequential awaits (up to 50 FEC API calls).
    const recipientsWithIds = disbursements.results.filter(d => d.recipient_id);
    const committeeIds = recipientsWithIds
      .map(d => d.recipient_id)
      .filter((id): id is string => typeof id === 'string' && id.startsWith('C'));
    const uniqueCommitteeIds = [...new Set(committeeIds)];

    const candidateIdMap = new Map<string, string | null>();
    const batchResults = await Promise.all(
      uniqueCommitteeIds.map(async cid => {
        const ids = await fecApiService.getCommitteeCandidateIds(cid);
        return [cid, ids[0] ?? null] as const;
      })
    );
    for (const [cid, candidateId] of batchResults) {
      candidateIdMap.set(cid, candidateId);
    }

    // Deduplicate — multiple disbursements can resolve to the same bioguide
    const seenBioguides = new Set<string>();

    for (const disbursement of recipientsWithIds) {
      const recipientId = disbursement.recipient_id;

      // Resolve to FEC candidate ID
      let fecCandidateId: string | null;
      if (recipientId.startsWith('C')) {
        fecCandidateId = candidateIdMap.get(recipientId) ?? null;
      } else {
        fecCandidateId = recipientId;
      }

      const bioguideId = fecCandidateId ? getBioguideFromFEC(fecCandidateId) : null;

      // Skip recipients we cannot resolve to a known legislator —
      // party committees (DCCC, RNC, etc.) and unmapped candidates
      // create dead-end nodes that the BFS cannot traverse.
      if (!bioguideId || seenBioguides.has(bioguideId)) continue;
      seenBioguides.add(bioguideId);

      const recipientNodeId = toCanonicalId('representative', bioguideId);

      nodes.push({
        id: recipientNodeId,
        type: 'representative',
        label: formatNodeLabel('representative', {
          name: disbursement.recipient_name,
        }),
        properties: {
          name: disbursement.recipient_name,
          bioguideId,
          fecCandidateId: fecCandidateId ?? undefined,
        },
        dataAsOf,
        profileUrl: `/representative/${bioguideId}`,
        sourceUrl: `https://bioguide.congress.gov/search/bio/${bioguideId}`,
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
