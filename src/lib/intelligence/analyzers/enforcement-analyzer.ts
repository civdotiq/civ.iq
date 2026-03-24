/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Enforcement Analyzer (Phase 3 — Influence Graph)
 *
 * Aggregates enforcement actions across EPA, OSHA, and CFPB.
 * Supports three scopes: sector, state, or organization.
 *
 * Flow: cache → fetch EPA + OSHA + CFPB in parallel → entity resolution →
 *       sector normalization → statistics → peer comparison → AI narrative → cache
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
import { epaEchoService } from '@/lib/data-sources/epa-echo-service';
import { oshaService } from '@/lib/data-sources/osha-service';
import { cfpbComplaintService } from '@/lib/data-sources/cfpb-complaint-service';
import { sicToSector, resolveCompanyName } from '@civiq/entity-resolution';
import type { IndustrySector } from '@/lib/fec/industry-taxonomy';
import { peerComparison, confidenceScore, MIN_PEERS } from '../statistics/civic-stats';
import type { EnforcementAction, EnforcementInsight, PeerComparison } from '../types';

/** Redis cache TTL: 6 hours */
const CACHE_TTL = 6 * 60 * 60;

/** Minimum enforcement actions to produce an insight */
const MIN_ENFORCEMENT_ACTIONS = 3;

/** Standard disclaimer */
const DISCLAIMER =
  'This analysis shows factual patterns in public enforcement data. ' +
  'Enforcement actions may be resolved without finding of wrongdoing. ' +
  'The presence of enforcement activity does not indicate systemic failure. ' +
  'Correlation does not indicate causation.';

// ── Scope Type ───────────────────────────────────────────────────────

export type EnforcementScope =
  | { type: 'sector'; sector: IndustrySector }
  | { type: 'state'; state: string }
  | { type: 'organization'; name: string };

// ── Main Analyzer ────────────────────────────────────────────────────

export async function analyzeEnforcement(
  scope: EnforcementScope
): Promise<EnforcementInsight | null> {
  const scopeKey =
    scope.type === 'sector'
      ? scope.sector
      : scope.type === 'state'
        ? scope.state
        : scope.name.toLowerCase().slice(0, 30);
  const cacheKey = `insight:enforcement:${scope.type}:${scopeKey}`;

  // 1. Check cache
  try {
    const cached = await getRedisCache().get<EnforcementInsight>(cacheKey);
    if (cached) {
      logger.info('[Enforcement] Cache hit', { scope: scope.type, key: scopeKey });
      trackInsightCacheHit('enforcement');
      return cached;
    }
  } catch {
    // Cache miss — continue
  }

  // 2-7. Compute under timeout
  return withInsightTracking('enforcement', () =>
    withTimeout(computeAndCache(scope, cacheKey), ANALYZER_TIMEOUT_MS, 'Enforcement')
  );
}

async function computeAndCache(
  scope: EnforcementScope,
  cacheKey: string
): Promise<EnforcementInsight | null> {
  // 2. Fetch from all three agencies in parallel
  const actions = await fetchEnforcementActions(scope);

  if (actions.length < MIN_ENFORCEMENT_ACTIONS) {
    logger.info('[Enforcement] Insufficient actions', {
      scope,
      count: actions.length,
      minimum: MIN_ENFORCEMENT_ACTIONS,
    });
    return null;
  }

  // 3. Compute statistics
  const stats = computeStats(actions);

  // 4. Peer comparison
  const peer = await computePeerComparison(scope, stats.totalActions);

  // 5. Confidence
  const confidence = confidenceScore({
    sampleSize: actions.length,
    minimumSampleSize: MIN_ENFORCEMENT_ACTIONS,
    dataCompleteness: Math.min(stats.byAgency.length / 2, 1),
    peerCount: peer?.peerCount ?? 0,
  });

  // 6. Generate narrative
  const { narrative, source } = await generateNarrative(scope, stats, peer);

  const insight: EnforcementInsight = {
    scope,
    actions: actions.slice(0, 50), // Cap at 50 for response size
    stats,
    linkedRegulations: [], // Populated by Phase 4 graph assembler
    peerComparison: peer ?? {
      value: stats.totalActions,
      peerAverage: stats.totalActions,
      peerCount: 0,
      peerGroupLabel: 'Insufficient peer data',
      percentileRank: 50,
    },
    narrative,
    confidence: source === 'statistical-fallback' ? Math.min(confidence, 0.5) : confidence,
    dataAsOf: freshestDate(...actions.map(a => a.date)),
    methodology:
      'Enforcement actions aggregated from EPA ECHO, OSHA inspections (DOL API), and CFPB complaints. ' +
      'Organizations matched across agencies via entity resolution. ' +
      'SIC codes normalized to 13-sector industry model.',
    disclaimer: DISCLAIMER,
    lastAnalyzedAt: new Date().toISOString(),
    source,
  };

  // 7. Cache
  await cacheInsight(cacheKey, insight);
  await cacheEnforcementScore(scope, stats.totalActions);

  return insight;
}

// ── Data Fetching ────────────────────────────────────────────────────

async function fetchEnforcementActions(scope: EnforcementScope): Promise<EnforcementAction[]> {
  const actions: EnforcementAction[] = [];

  // Build scope-specific queries
  const stateFilter = scope.type === 'state' ? scope.state : undefined;
  const orgFilter = scope.type === 'organization' ? scope.name : undefined;

  // SIC code filter for sector scope
  // Note: sector-to-SIC is a many-to-many mapping; we search broadly
  const sicCodeFilter = scope.type === 'sector' ? undefined : undefined;

  // Fetch from all three agencies in parallel
  const [epaActions, oshaActions, cfpbActions] = await Promise.all([
    fetchEPAActions(stateFilter, sicCodeFilter, orgFilter),
    fetchOSHAActions(stateFilter, sicCodeFilter, orgFilter),
    fetchCFPBActions(stateFilter, orgFilter),
  ]);

  actions.push(...epaActions, ...oshaActions, ...cfpbActions);

  // If sector scope, filter to matching sector
  if (scope.type === 'sector') {
    return actions.filter(a => a.sector === scope.sector);
  }

  return actions;
}

async function fetchEPAActions(
  state?: string,
  sicCode?: string,
  orgName?: string
): Promise<EnforcementAction[]> {
  try {
    const cases = await epaEchoService.searchEnforcementCases({
      state,
      sicCode,
      facilityName: orgName,
    });

    return cases.map(c => {
      const resolved = c.defendants.length > 0 ? resolveCompanyName(c.defendants[0]!) : null;

      return {
        agency: 'EPA' as const,
        actionType: c.activityTypeDesc,
        organization: c.defendants.join('; ') || c.caseName,
        resolvedCompany: resolved,
        sector: c.facilitySICCode ? sicToSector(c.facilitySICCode) : null,
        penaltyAmount: c.totalPenalties,
        date: c.settlementDate ?? '',
        state: c.facilityState,
        district: null,
      };
    });
  } catch (error) {
    logger.warn('[Enforcement] EPA fetch failed', { error: (error as Error).message });
    return [];
  }
}

async function fetchOSHAActions(
  state?: string,
  sicCode?: string,
  orgName?: string
): Promise<EnforcementAction[]> {
  try {
    const inspections = await oshaService.searchInspections({
      state,
      sicCode,
      establishmentName: orgName,
      limit: 100,
    });

    return inspections
      .filter(i => i.totalCurrentPenalty > 0) // Only include penalized inspections
      .map(i => {
        const resolved = resolveCompanyName(i.establishmentName);
        return {
          agency: 'OSHA' as const,
          actionType: i.inspectionType,
          organization: i.establishmentName,
          resolvedCompany: resolved,
          sector: i.sicCode ? sicToSector(i.sicCode) : null,
          penaltyAmount: i.totalCurrentPenalty,
          date: i.openDate,
          state: i.siteState,
          district: null,
        };
      });
  } catch (error) {
    logger.warn('[Enforcement] OSHA fetch failed', { error: (error as Error).message });
    return [];
  }
}

async function fetchCFPBActions(state?: string, orgName?: string): Promise<EnforcementAction[]> {
  try {
    const { complaints } = await cfpbComplaintService.searchComplaints({
      state,
      company: orgName,
      size: 100,
      sort: 'created_date_desc',
    });

    // Group by company to create one action per company
    const byCompany = new Map<string, { count: number; latestDate: string; state: string }>();

    for (const c of complaints) {
      const existing = byCompany.get(c.company);
      if (!existing) {
        byCompany.set(c.company, {
          count: 1,
          latestDate: c.dateReceived,
          state: c.state ?? '',
        });
      } else {
        existing.count++;
        if (c.dateReceived > existing.latestDate) {
          existing.latestDate = c.dateReceived;
        }
      }
    }

    return Array.from(byCompany.entries()).map(([company, data]) => {
      const resolved = resolveCompanyName(company);
      return {
        agency: 'CFPB' as const,
        actionType: 'consumer_complaint',
        organization: company,
        resolvedCompany: resolved,
        sector: null, // CFPB doesn't use SIC codes
        penaltyAmount: 0, // Complaints don't have penalties
        date: data.latestDate,
        state: data.state,
        district: null,
      };
    });
  } catch (error) {
    logger.warn('[Enforcement] CFPB fetch failed', { error: (error as Error).message });
    return [];
  }
}

// ── Statistics ────────────────────────────────────────────────────────

function computeStats(actions: EnforcementAction[]): EnforcementInsight['stats'] {
  const totalPenalties = actions.reduce((sum, a) => sum + a.penaltyAmount, 0);

  // By agency
  const agencyMap = new Map<string, { count: number; penalties: number }>();
  for (const action of actions) {
    const existing = agencyMap.get(action.agency) ?? { count: 0, penalties: 0 };
    existing.count++;
    existing.penalties += action.penaltyAmount;
    agencyMap.set(action.agency, existing);
  }

  const byAgency = Array.from(agencyMap.entries()).map(([agency, data]) => ({
    agency,
    count: data.count,
    penalties: data.penalties,
  }));

  // Trend: compare first half vs second half by date
  const dated = actions.filter(a => a.date).sort((a, b) => a.date.localeCompare(b.date));
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';

  if (dated.length >= 6) {
    const mid = Math.floor(dated.length / 2);
    const firstHalf = dated.slice(0, mid).length;
    const secondHalf = dated.slice(mid).length;
    const ratio = firstHalf > 0 ? secondHalf / firstHalf : 1;
    if (ratio > 1.3) trend = 'increasing';
    else if (ratio < 0.7) trend = 'decreasing';
  }

  // Period
  const dates = dated.map(a => a.date).filter(Boolean);
  const earliestDate = dates[0] ?? '';
  const latestDate = dates[dates.length - 1] ?? '';
  const periodMonths =
    earliestDate && latestDate
      ? Math.max(
          1,
          Math.round(
            (new Date(latestDate).getTime() - new Date(earliestDate).getTime()) /
              (30 * 24 * 60 * 60 * 1000)
          )
        )
      : 12;

  return {
    totalActions: actions.length,
    totalPenalties,
    byAgency,
    trend,
    periodMonths,
  };
}

// ── Peer Comparison ──────────────────────────────────────────────────

function enforcementScoreCacheKey(scope: EnforcementScope): string {
  const key =
    scope.type === 'sector'
      ? scope.sector
      : scope.type === 'state'
        ? scope.state
        : scope.name.toLowerCase().slice(0, 30);
  return `enforcement-score:${scope.type}:${key}`;
}

async function cacheEnforcementScore(scope: EnforcementScope, count: number): Promise<void> {
  try {
    await getRedisCache().set(enforcementScoreCacheKey(scope), count, CACHE_TTL);
  } catch {
    // Non-fatal
  }
}

async function computePeerComparison(
  scope: EnforcementScope,
  actionCount: number
): Promise<PeerComparison | null> {
  // For now, peer comparison is limited to same-type scopes
  // This will be populated as more analyses are cached
  try {
    const pattern = `enforcement-score:${scope.type}:*`;
    const keys = await getRedisCache().keys(pattern);
    const myKey = enforcementScoreCacheKey(scope);
    const peerKeys = keys.filter(k => k !== myKey);

    if (peerKeys.length < MIN_PEERS) return null;

    const values = await getRedisCache().mget<number>(peerKeys);
    const peerScores = values.filter((v): v is number => v !== null && typeof v === 'number');

    if (peerScores.length < MIN_PEERS) return null;

    const label =
      scope.type === 'sector'
        ? 'Industry sectors'
        : scope.type === 'state'
          ? 'U.S. states'
          : 'Organizations';

    return peerComparison(actionCount, peerScores, label);
  } catch {
    return null;
  }
}

// ── AI Narrative ─────────────────────────────────────────────────────

async function generateNarrative(
  scope: EnforcementScope,
  stats: EnforcementInsight['stats'],
  peer: PeerComparison | null
): Promise<{ narrative: string; source: 'ai-generated' | 'statistical-fallback' }> {
  const systemContext =
    'You analyze civic data for CIV.IQ. You describe factual patterns in ' +
    'federal enforcement activity across regulatory agencies. ';

  const scopeLabel =
    scope.type === 'sector'
      ? `the ${scope.sector} sector`
      : scope.type === 'state'
        ? `${scope.state}`
        : scope.name;

  const agencyLines = stats.byAgency
    .map(a => `- ${a.agency}: ${a.count} actions, $${a.penalties.toLocaleString()} in penalties`)
    .join('\n');

  const peerLine = peer
    ? `Peer comparison: ${scopeLabel} had ${stats.totalActions} enforcement actions. ` +
      `The average for ${peer.peerGroupLabel} is ${peer.peerAverage.toFixed(0)} ` +
      `(${peer.peerCount} peers, percentile rank: ${peer.percentileRank}).`
    : 'No peer comparison available yet.';

  const userPrompt = `SCOPE: ${scopeLabel}

ENFORCEMENT SUMMARY:
- Total actions: ${stats.totalActions}
- Total penalties: $${stats.totalPenalties.toLocaleString()}
- Trend: ${stats.trend}
- Period: ${stats.periodMonths} months

BY AGENCY:
${agencyLines}

${peerLine}

Write a 2-3 sentence plain-language summary of these factual patterns. State the total number of enforcement actions and penalties. Note which agency is most active. State the trend direction. If peer comparison is available, note relative position. Do not claim causation. Do not judge.

${PLAIN_LANGUAGE_RULES}`;

  const fallback = buildStatisticalSummary(scopeLabel, stats, peer);

  return generateInsightNarrative(systemContext, userPrompt, fallback, '[Enforcement]');
}

function buildStatisticalSummary(
  scopeLabel: string,
  stats: EnforcementInsight['stats'],
  peer: PeerComparison | null
): string {
  const topAgency = stats.byAgency.sort((a, b) => b.count - a.count)[0];

  let summary =
    `${stats.totalActions} enforcement actions totaling $${stats.totalPenalties.toLocaleString()} ` +
    `in penalties were recorded for ${scopeLabel} over the past ${stats.periodMonths} months.`;

  if (topAgency) {
    summary += ` ${topAgency.agency} accounted for ${topAgency.count} actions.`;
  }

  if (stats.trend !== 'stable') {
    summary += ` The trend is ${stats.trend}.`;
  }

  if (peer && peer.peerCount >= MIN_PEERS) {
    summary += ` The average for ${peer.peerGroupLabel} is ${peer.peerAverage.toFixed(0)} actions.`;
  }

  return summary;
}

// ── Cache Helpers ────────────────────────────────────────────────────

async function cacheInsight(key: string, insight: EnforcementInsight): Promise<void> {
  try {
    await getRedisCache().set(key, insight, CACHE_TTL);
    logger.info('[Enforcement] Cached insight', {
      scope: insight.scope,
      confidence: insight.confidence,
    });
  } catch {
    // Non-fatal
  }
}
