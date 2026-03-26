/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Regulation Analyzer (Phase 2 — Influence Graph)
 *
 * Links legislation to federal rulemaking via committee-agency mapping.
 * Answers: "Which regulations came from agencies overseen by this committee,
 * and do the same organizations that lobby the committee also comment on those rules?"
 *
 * Flow: cache → validate agency → fetch rules → match to bills → find lobbying overlap →
 *       statistics → peer comparison → AI narrative → cache
 *
 * Pattern: lobbying-pipeline-analyzer.ts
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { PLAIN_LANGUAGE_RULES } from '@/lib/ai/plain-language';
import {
  freshestDate,
  generateInsightNarrative,
  withTimeout,
  ANALYZER_TIMEOUT_MS,
  trackInsightCacheHit,
  withInsightTracking,
} from './shared';
import {
  getCommitteesForAgency,
  ALL_COMMITTEE_MAPPINGS,
} from '@/lib/connections/committee-agency-map';
import { searchAgencyRules } from '@/lib/data-sources/federal-register-service';
import { regulationsGovService } from '@/lib/data-sources/regulations-gov-service';
import { senateLobbyingAPI } from '@/lib/data-sources/senate-lobbying-api';
import {
  resolveFilingEntities,
  getResolvedCommittees,
} from '../entity-resolution/lobbying-committee-resolver';
import { peerComparison, confidenceScore, MIN_PEERS } from '../statistics/civic-stats';
import { LINK_CONFIDENCE } from '../confidence-constants';
import type { RegulationInsight, RegulationNode, PeerComparison } from '../types';

/** Redis cache TTL: 3 days */
const CACHE_TTL = 3 * 24 * 60 * 60;

/** Minimum regulation-bill links to produce an insight */
const MIN_REGULATION_LINKS = 2;

/** Standard disclaimer */
const DISCLAIMER =
  'This analysis shows factual patterns in public regulatory and lobbying disclosure data. ' +
  'The presence of lobbying activity does not indicate improper behavior. ' +
  'Correlation between lobbying and rulemaking does not indicate causation. ' +
  'Regulatory agencies are independent from legislative pressure. ' +
  'Final rules reflect agency expertise and statutory requirements.';

// ── Main Analyzer ────────────────────────────────────────────────────

/**
 * Analyze regulations for a federal agency.
 *
 * Returns cached insight if fresh, otherwise computes from scratch.
 * Returns null if insufficient data (fewer than MIN_REGULATION_LINKS).
 */
export async function analyzeRegulations(agencySlug: string): Promise<RegulationInsight | null> {
  const cacheKey = `insight:regulation:${agencySlug}`;

  // 1. Check cache
  try {
    const cached = await getRedisCache().get<RegulationInsight>(cacheKey);
    if (cached) {
      logger.info('[Regulation] Cache hit', { agencySlug });
      trackInsightCacheHit('regulation');
      return cached;
    }
  } catch {
    // Cache miss or error — continue to computation
  }

  // 2-7. Validate, fetch, compute, narrate, cache — all under timeout
  return withInsightTracking('regulation', () =>
    withTimeout(computeAndCache(agencySlug, cacheKey), ANALYZER_TIMEOUT_MS, 'Regulation')
  );
}

async function computeAndCache(
  agencySlug: string,
  cacheKey: string
): Promise<RegulationInsight | null> {
  // 2. Validate agency — it must be overseen by at least one committee
  const overseeingCommittees = getCommitteesForAgency(agencySlug);
  if (overseeingCommittees.length === 0) {
    logger.warn('[Regulation] No committees oversee this agency', { agencySlug });
    return null;
  }

  const agencyName =
    overseeingCommittees[0]!.agencies.find(a => a.slug === agencySlug)?.name ?? agencySlug;

  // 3. Fetch recent rules from this agency
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const dateFrom = oneYearAgo.toISOString().slice(0, 10);

  const rules = await searchAgencyRules(agencySlug, { dateFrom });
  if (rules.length === 0) {
    logger.info('[Regulation] No recent rules found', { agencySlug });
    return null;
  }

  // 4. Build regulation nodes from rules
  const regulationNodes: RegulationNode[] = [];
  for (const doc of rules) {
    const agency = doc.agencies?.[0];
    if (!agency) continue;

    const docType =
      doc.type === 'Proposed Rule' ? ('proposed_rule' as const) : ('final_rule' as const);

    let status: RegulationNode['status'] = 'proposed';
    if (doc.effective_on) {
      status = new Date(doc.effective_on) <= new Date() ? 'effective' : 'final';
    } else if (doc.type === 'Rule') {
      status = 'final';
    } else if (doc.comments_close_on) {
      status = new Date(doc.comments_close_on) < new Date() ? 'comment_closed' : 'comment_period';
    }

    regulationNodes.push({
      docketId: `${agency.slug}-${doc.regulation_id_number ?? doc.document_number}`,
      agency: agency.name,
      agencySlug: agency.slug,
      title: doc.title,
      type: docType,
      status,
      publicationDate: doc.publication_date,
      rin: doc.regulation_id_number ?? null,
      commentCount: 0,
      linkMethod: 'committee_agency',
      linkConfidence: LINK_CONFIDENCE.regulationLink,
    });
  }

  // 5. Find lobbying organizations that also comment on these regulations
  const lobbyingCommentOverlap = await findLobbyingCommentOverlap(
    agencySlug,
    overseeingCommittees.map(c => c.committeeCode),
    regulationNodes
  );

  // 6. Compute statistics
  const activeRulemakings = regulationNodes.filter(
    r => r.status === 'proposed' || r.status === 'comment_period'
  ).length;
  const finalizedRules = regulationNodes.filter(
    r => r.status === 'final' || r.status === 'effective'
  ).length;
  const withdrawnRules = regulationNodes.filter(r => r.status === 'withdrawn').length;

  // Build regulation-bill links (each regulation linked to the agency via committee)
  const regulationBillLinks = regulationNodes.slice(0, 20).map(reg => ({
    regulation: reg,
    billId: '', // Bills are linked upstream; this shows the regulation side
    billTitle: '',
    confidence: reg.linkConfidence,
  }));

  if (regulationNodes.length < MIN_REGULATION_LINKS) {
    logger.info('[Regulation] Insufficient regulation links', {
      agencySlug,
      count: regulationNodes.length,
      minimum: MIN_REGULATION_LINKS,
    });
    return null;
  }

  // 7. Peer comparison
  const peer = await computePeerComparison(agencySlug, regulationNodes.length);

  // Confidence score
  const confidence = confidenceScore({
    sampleSize: regulationNodes.length,
    minimumSampleSize: MIN_REGULATION_LINKS,
    dataCompleteness: Math.min(regulationNodes.length / 10, 1),
    peerCount: peer?.peerCount ?? 0,
  });

  // 8. Generate narrative
  const { narrative, source } = await generateNarrative(
    agencyName,
    agencySlug,
    regulationNodes,
    lobbyingCommentOverlap,
    activeRulemakings,
    finalizedRules,
    peer
  );

  const insight: RegulationInsight = {
    agencySlug,
    agencyName,
    regulationBillLinks,
    lobbyingCommentOverlap,
    activeRulemakings,
    finalizedRules,
    withdrawnRules,
    peerComparison: peer ?? {
      value: regulationNodes.length,
      peerAverage: regulationNodes.length,
      peerCount: 0,
      peerGroupLabel: 'Insufficient peer data',
      percentileRank: 50,
    },
    narrative,
    confidence: source === 'statistical-fallback' ? Math.min(confidence, 0.5) : confidence,
    dataAsOf: freshestDate(...regulationNodes.map(r => r.publicationDate)),
    methodology:
      'Regulations identified via Federal Register API, filtered by agency. ' +
      'Agency-committee oversight mapped via committee-agency-map. ' +
      'Lobbying-comment overlap detected by matching LDA filing organizations against Regulations.gov commenters. ' +
      'Data from Federal Register API and Senate LDA disclosures.',
    disclaimer: DISCLAIMER,
    lastAnalyzedAt: new Date().toISOString(),
    source,
  };

  // 9. Cache
  await cacheInsight(cacheKey, insight);
  await cacheRegulationScore(agencySlug, regulationNodes.length);

  return insight;
}

// ── Lobbying-Comment Overlap Detection ────────────────────────────────

interface LobbyingCommentOverlapEntry {
  organization: string;
  lobbyingSpending: number;
  commentCount: number;
  isOverlap: boolean;
}

async function findLobbyingCommentOverlap(
  agencySlug: string,
  committeeCodes: string[],
  regulations: RegulationNode[]
): Promise<LobbyingCommentOverlapEntry[]> {
  // Get lobbying filings that mention the overseeing committees
  let allFilings: Awaited<ReturnType<typeof senateLobbyingAPI.fetchRecentFilings>>;
  try {
    allFilings = await senateLobbyingAPI.fetchRecentFilings();
  } catch {
    logger.warn('[Regulation] Failed to fetch LDA filings for overlap check');
    return [];
  }

  // Find organizations lobbying the committees that oversee this agency
  const lobbyingOrgs = new Map<string, number>();

  for (const filing of allFilings) {
    if (!Array.isArray(filing.government_entities) || filing.government_entities.length === 0) {
      continue;
    }

    const resolutions = resolveFilingEntities(filing.government_entities);
    const resolvedCommittees = getResolvedCommittees(resolutions);

    const mentionsTarget = resolvedCommittees.some(c => committeeCodes.includes(c.committeeCode));
    if (mentionsTarget) {
      const orgName = filing.client.name;
      lobbyingOrgs.set(orgName, (lobbyingOrgs.get(orgName) ?? 0) + (filing.income || 0));
    }
  }

  if (lobbyingOrgs.size === 0) return [];

  // Check if any of those orgs commented on recent regulations
  const topOrgs = Array.from(lobbyingOrgs.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const results: LobbyingCommentOverlapEntry[] = [];

  // Check a sample of regulations for org comments (limit API calls)
  const regsToCheck = regulations
    .filter(
      r => r.status === 'comment_period' || r.status === 'comment_closed' || r.status === 'final'
    )
    .slice(0, 5);

  for (const [orgName, spending] of topOrgs) {
    let totalComments = 0;

    for (const reg of regsToCheck) {
      try {
        // Use the docket ID to search for org comments
        // Extract a plausible docket ID from our constructed ID
        const docketParts = reg.docketId.split('-');
        const possibleDocketId =
          docketParts.length > 2 ? docketParts.slice(0, -1).join('-').toUpperCase() : reg.docketId;

        const { total } = await regulationsGovService.getOrganizationComments(
          possibleDocketId,
          orgName
        );
        totalComments += total;
      } catch {
        // Non-fatal — just skip this regulation
      }
    }

    results.push({
      organization: orgName,
      lobbyingSpending: spending,
      commentCount: totalComments,
      isOverlap: totalComments > 0,
    });
  }

  return results;
}

// ── Peer Comparison ──────────────────────────────────────────────────

function regulationScoreCacheKey(agencySlug: string): string {
  return `regulation-score:${agencySlug}`;
}

async function cacheRegulationScore(agencySlug: string, ruleCount: number): Promise<void> {
  try {
    await getRedisCache().set(regulationScoreCacheKey(agencySlug), ruleCount, CACHE_TTL);
  } catch {
    // Non-fatal
  }
}

async function computePeerComparison(
  agencySlug: string,
  ruleCount: number
): Promise<PeerComparison | null> {
  // Get all unique agency slugs from committee mappings
  const allAgencySlugs = new Set<string>();
  for (const mapping of ALL_COMMITTEE_MAPPINGS) {
    for (const agency of mapping.agencies) {
      if (agency.slug !== agencySlug) {
        allAgencySlugs.add(agency.slug);
      }
    }
  }

  try {
    const peerCacheKeys = Array.from(allAgencySlugs).map(regulationScoreCacheKey);
    if (peerCacheKeys.length < MIN_PEERS) return null;

    const values = await getRedisCache().mget<number>(peerCacheKeys);
    const peerScores = values.filter((v): v is number => v !== null && typeof v === 'number');

    if (peerScores.length < MIN_PEERS) return null;

    return peerComparison(ruleCount, peerScores, 'Federal agencies');
  } catch {
    return null;
  }
}

// ── AI Narrative ─────────────────────────────────────────────────────

async function generateNarrative(
  agencyName: string,
  agencySlug: string,
  regulations: RegulationNode[],
  overlap: LobbyingCommentOverlapEntry[],
  activeRulemakings: number,
  finalizedRules: number,
  peer: PeerComparison | null
): Promise<{ narrative: string; source: 'ai-generated' | 'statistical-fallback' }> {
  const systemContext =
    'You analyze civic data for CIV.IQ. You describe factual patterns between ' +
    'federal rulemaking activity and lobbying disclosure data. ';

  const topRules = regulations
    .slice(0, 5)
    .map(r => `- ${r.title} (${r.type}, status: ${r.status}, published: ${r.publicationDate})`)
    .join('\n');

  const overlapOrgs = overlap
    .filter(o => o.isOverlap)
    .map(
      o =>
        `- ${o.organization}: $${o.lobbyingSpending.toLocaleString()} in lobbying, ${o.commentCount} public comments`
    )
    .join('\n');

  const peerLine = peer
    ? `Peer comparison: ${agencyName} had ${regulations.length} rules in the past year. ` +
      `The average for ${peer.peerGroupLabel} is ${peer.peerAverage.toFixed(0)} ` +
      `(${peer.peerCount} peers, percentile rank: ${peer.percentileRank}).`
    : 'No peer comparison available yet.';

  const userPrompt = `AGENCY: ${agencyName} (${agencySlug})

RULEMAKING SUMMARY:
- Total rules/proposed rules (past year): ${regulations.length}
- Active rulemakings: ${activeRulemakings}
- Finalized rules: ${finalizedRules}

RECENT RULES:
${topRules}

LOBBYING-COMMENT OVERLAP:
${overlapOrgs || 'No overlap detected between lobbying organizations and rule commenters.'}

${peerLine}

Write a 2-3 sentence plain-language summary of these factual patterns. State the total number of rules. Note how many are active vs finalized. If any organizations both lobby and comment, note how many. If peer comparison is available, note whether this agency is more or less active than average. Do not claim causation. Do not judge.

${PLAIN_LANGUAGE_RULES}`;

  const fallback = buildStatisticalSummary(
    agencyName,
    regulations,
    overlap,
    activeRulemakings,
    finalizedRules,
    peer
  );

  return generateInsightNarrative(systemContext, userPrompt, fallback, '[Regulation]');
}

// ── Fallback ─────────────────────────────────────────────────────────

function buildStatisticalSummary(
  agencyName: string,
  regulations: RegulationNode[],
  overlap: LobbyingCommentOverlapEntry[],
  activeRulemakings: number,
  finalizedRules: number,
  peer: PeerComparison | null
): string {
  let summary =
    `${agencyName} published ${regulations.length} rules and proposed rules in the past year. ` +
    `${activeRulemakings} are active rulemakings and ${finalizedRules} are finalized.`;

  const overlapCount = overlap.filter(o => o.isOverlap).length;
  if (overlapCount > 0) {
    summary += ` ${overlapCount} of the top lobbying organizations also submitted public comments on these rules.`;
  }

  if (peer && peer.peerCount >= MIN_PEERS) {
    summary += ` The average for ${peer.peerGroupLabel} is ${peer.peerAverage.toFixed(0)} rules.`;
  }

  return summary;
}

// ── Cache Helpers ────────────────────────────────────────────────────

async function cacheInsight(key: string, insight: RegulationInsight): Promise<void> {
  try {
    await getRedisCache().set(key, insight, CACHE_TTL);
    logger.info('[Regulation] Cached insight', {
      agencySlug: insight.agencySlug,
      confidence: insight.confidence,
    });
  } catch {
    // Non-fatal
  }
}
