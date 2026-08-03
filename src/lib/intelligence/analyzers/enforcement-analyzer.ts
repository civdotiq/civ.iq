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
  classifySignal,
  SourceCollector,
  peerComparisonUnavailable,
} from './shared';
import { epaEchoService } from '@/lib/data-sources/epa-echo-service';
import { oshaService } from '@/lib/data-sources/osha-service';
import { cfpbComplaintService } from '@/lib/data-sources/cfpb-complaint-service';
import { sicToSector, sectorToSicRanges, resolveCompanyName } from '@civiq/entity-resolution';
import type { IndustrySector } from '@/lib/fec/industry-taxonomy';
import { peerComparison, confidenceScore, MIN_PEERS } from '../statistics/civic-stats';
import type { EnforcementAction, EnforcementInsight, PeerComparison } from '../types';

/**
 * Redis cache TTL: 7 days. Enforcement records (EPA ECHO / OSHA / CFPB) are
 * historical and only accumulate on monthly+ cadences, so a 6h TTL recomputed
 * identical results dozens of times a day. dataAsOf still reflects the true
 * source dates, so a stale cache never misrepresents freshness.
 */
const CACHE_TTL = 7 * 24 * 60 * 60;

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
  const { actions, saturated } = await fetchEnforcementActions(scope);

  if (actions.length < MIN_ENFORCEMENT_ACTIONS) {
    logger.info('[Enforcement] Insufficient actions', {
      scope,
      count: actions.length,
      minimum: MIN_ENFORCEMENT_ACTIONS,
    });
    return null;
  }

  // 3. Compute statistics
  const stats = computeStats(actions, saturated);

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

  // Only cite an agency as a source when it actually contributed actions — a
  // dark agency (e.g. OSHA with DOL_API_KEY unset) must not be listed as a
  // source or claimed in the methodology when it returned nothing.
  const agencyCount = (agency: string) => stats.byAgency.find(a => a.agency === agency)?.count ?? 0;

  const sc = new SourceCollector();
  if (agencyCount('EPA') > 0) sc.add('EPA ECHO', 'Recent enforcement actions', agencyCount('EPA'));
  if (agencyCount('OSHA') > 0)
    sc.add('OSHA inspections', 'Recent inspections', agencyCount('OSHA'));
  if (agencyCount('CFPB') > 0) sc.add('CFPB complaints', 'Recent complaints', agencyCount('CFPB'));

  const contributingAgencies = [
    agencyCount('EPA') > 0 ? 'EPA ECHO' : null,
    agencyCount('OSHA') > 0 ? 'OSHA inspections (DOL API)' : null,
    agencyCount('CFPB') > 0 ? 'CFPB complaints' : null,
  ].filter((a): a is string => a !== null);

  const insight: EnforcementInsight = {
    scope,
    actions: actions.slice(0, 50), // Cap at 50 for response size
    stats,
    linkedRegulations: [], // Populated by Phase 4 graph assembler
    peerComparison: peer,
    ...(peer
      ? {}
      : {
          peerComparisonUnavailableReason: peerComparisonUnavailable(
            scope.type === 'sector'
              ? 'other industry sectors'
              : scope.type === 'state'
                ? 'other U.S. states'
                : 'other organizations'
          ),
        }),
    narrative,
    confidence: source === 'statistical-fallback' ? Math.min(confidence, 0.5) : confidence,
    confidenceMethod: 'computed',
    dataAsOf: freshestDate(...actions.map(a => a.date))!,
    methodology:
      `Enforcement actions aggregated from ${contributingAgencies.join(', ')}. ` +
      'Organizations matched across agencies via entity resolution. ' +
      'SIC codes normalized to 13-sector industry model.',
    disclaimer: DISCLAIMER,
    signal: classifySignal({
      confidence: source === 'statistical-fallback' ? Math.min(confidence, 0.5) : confidence,
      trend: stats.trend,
    }),
    sources: sc.toSources(),
    lastAnalyzedAt: new Date().toISOString(),
    source,
  };

  // 7. Cache
  await cacheInsight(cacheKey, insight);
  await cacheEnforcementScore(scope, stats.totalActions);

  return insight;
}

// ── Data Fetching ────────────────────────────────────────────────────

/**
 * Actions from one source, plus whether that source was read to its cap.
 *
 * Every agency here paginates and none is walked to the end — walking OSHA to
 * the end for a large employer is thousands of requests. So a fetch that comes
 * back full means "there is more", and the caller has to say so rather than
 * publish the cap as a count.
 */
interface AgencyFetch {
  actions: EnforcementAction[];
  saturated: boolean;
}

async function fetchEnforcementActions(
  scope: EnforcementScope
): Promise<{ actions: EnforcementAction[]; saturated: boolean }> {
  const actions: EnforcementAction[] = [];

  // Build scope-specific queries
  const stateFilter = scope.type === 'state' ? scope.state : undefined;
  const orgFilter = scope.type === 'organization' ? scope.name : undefined;

  // SIC code filter for sector scope — collect ALL unique 2-digit prefixes from all ranges.
  // Sectors like Energy span multiple SIC ranges (mining 10-14, petroleum 29-30, pipelines 46,
  // utilities 49), so we query each prefix in parallel for better API coverage.
  const sicPrefixes =
    scope.type === 'sector'
      ? [...new Set(sectorToSicRanges(scope.sector).map(r => String(r.start).slice(0, 2)))]
      : [];

  // Fetch from all agencies in parallel, querying each SIC prefix separately
  const fetchPromises: Promise<AgencyFetch>[] = [];

  // The OSHA walk costs pages x prefixes, and the DOL client spaces every
  // request by a fixed interval, so a sector fanning out to 8 prefixes would
  // spend the analyzer's whole 55s budget paging. Depth is therefore divided
  // across the fan-out: one query pages deep, eight stay shallow and say so.
  const oshaPages = Math.max(1, Math.floor(OSHA_MAX_PAGES / Math.max(1, sicPrefixes.length)));

  if (sicPrefixes.length > 1) {
    // Multiple SIC prefixes: parallel calls per prefix, then deduplicate
    for (const prefix of sicPrefixes) {
      fetchPromises.push(fetchEPAActions(stateFilter, prefix, orgFilter));
      fetchPromises.push(fetchOSHAActions(stateFilter, prefix, orgFilter, oshaPages));
    }
    fetchPromises.push(fetchCFPBActions(stateFilter, orgFilter));
  } else {
    // Single or no SIC prefix: original behavior
    const sicCodeFilter = sicPrefixes[0];
    fetchPromises.push(fetchEPAActions(stateFilter, sicCodeFilter, orgFilter));
    fetchPromises.push(fetchOSHAActions(stateFilter, sicCodeFilter, orgFilter, OSHA_MAX_PAGES));
    fetchPromises.push(fetchCFPBActions(stateFilter, orgFilter));
  }

  const results = await Promise.all(fetchPromises);
  const saturated = results.some(r => r.saturated);

  // Deduplicate by agency + organization + date (parallel prefix queries may overlap)
  const seen = new Set<string>();
  for (const batch of results) {
    for (const action of batch.actions) {
      const key = `${action.agency}|${action.organization}|${action.date}|${action.penaltyAmount}`;
      if (!seen.has(key)) {
        seen.add(key);
        actions.push(action);
      }
    }
  }

  // If sector scope, filter to matching sector
  if (scope.type === 'sector') {
    return { actions: actions.filter(a => a.sector === scope.sector), saturated };
  }

  return { actions, saturated };
}

/** ECHO's get_cases serves one responseset per call; a full one means more exist. */
const EPA_RESPONSESET = 100;

async function fetchEPAActions(
  state?: string,
  sicCode?: string,
  orgName?: string
): Promise<AgencyFetch> {
  try {
    const cases = await epaEchoService.searchEnforcementCases({
      state,
      sicCode,
      facilityName: orgName,
    });

    const actions = cases.map(c => {
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

    return { actions, saturated: cases.length >= EPA_RESPONSESET };
  } catch (error) {
    logger.warn('[Enforcement] EPA fetch failed', { error: (error as Error).message });
    return { actions: [], saturated: false };
  }
}

/**
 * OSHA is the one source that pages cheaply (the DOL API takes an offset), so it
 * is walked several pages deep instead of stopping at the first. The walk is
 * still bounded — a large employer has thousands of inspections and this runs
 * inside an analyzer timeout — so a full final page still means "more exist".
 *
 * `maxPages` is set by the caller, not fixed here: the sector scope issues one
 * OSHA query per SIC prefix and they share the same 55s budget and the same
 * request-spacing floor in the DOL client.
 */
const OSHA_PAGE_SIZE = 200;
const OSHA_MAX_PAGES = 5;

async function fetchOSHAActions(
  state: string | undefined,
  sicCode: string | undefined,
  orgName: string | undefined,
  maxPages: number
): Promise<AgencyFetch> {
  try {
    const inspections: Awaited<ReturnType<typeof oshaService.searchInspections>> = [];
    let saturated = false;

    for (let page = 0; page < maxPages; page++) {
      const batch = await oshaService.searchInspections({
        state,
        sicCode,
        establishmentName: orgName,
        limit: OSHA_PAGE_SIZE,
        offset: page * OSHA_PAGE_SIZE,
      });
      inspections.push(...batch);
      if (batch.length < OSHA_PAGE_SIZE) break;
      // Last page came back full: either continue, or record that we stopped short.
      if (page === maxPages - 1) saturated = true;
    }

    const actions = inspections
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

    return { actions, saturated };
  } catch (error) {
    logger.warn('[Enforcement] OSHA fetch failed', { error: (error as Error).message });
    return { actions: [], saturated: false };
  }
}

/** CFPB is read one page deep; a full page means the company has more complaints. */
const CFPB_PAGE_SIZE = 100;

async function fetchCFPBActions(state?: string, orgName?: string): Promise<AgencyFetch> {
  try {
    const { complaints } = await cfpbComplaintService.searchComplaints({
      state,
      company: orgName,
      size: CFPB_PAGE_SIZE,
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

    const actions = Array.from(byCompany.entries()).map(([company, data]) => {
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

    return { actions, saturated: complaints.length >= CFPB_PAGE_SIZE };
  } catch (error) {
    logger.warn('[Enforcement] CFPB fetch failed', { error: (error as Error).message });
    return { actions: [], saturated: false };
  }
}

// ── Statistics ────────────────────────────────────────────────────────

function computeStats(
  actions: EnforcementAction[],
  totalIsLowerBound: boolean
): EnforcementInsight['stats'] {
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

  // Trend: compare actions in first vs second half of TIME PERIOD
  const dated = actions.filter(a => a.date).sort((a, b) => a.date.localeCompare(b.date));
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';

  if (dated.length >= 6) {
    const timestamps = dated.map(a => new Date(a.date).getTime());
    const midDate = (timestamps[0]! + timestamps[timestamps.length - 1]!) / 2;
    const firstHalf = dated.filter(a => new Date(a.date).getTime() <= midDate).length;
    const secondHalf = dated.filter(a => new Date(a.date).getTime() > midDate).length;
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
    totalIsLowerBound,
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

  const countLabel = stats.totalIsLowerBound
    ? `${stats.totalActions} (AT LEAST — one or more agency feeds returned a full page, so the real figure is higher)`
    : String(stats.totalActions);

  const userPrompt = `SCOPE: ${scopeLabel}

ENFORCEMENT SUMMARY:
- Actions retrieved: ${countLabel}
- Penalties across those actions: $${stats.totalPenalties.toLocaleString()}
- Trend: ${stats.trend}
- Period: ${stats.periodMonths} months

BY AGENCY:
${agencyLines}

${peerLine}

Write a 2-3 sentence plain-language summary of these factual patterns. ${
    stats.totalIsLowerBound
      ? 'The counts above are a floor, not a census — write "at least N" and never present N as the total.'
      : 'State the total number of enforcement actions and penalties.'
  } Note which agency is most active. State the trend direction. If peer comparison is available, note relative position. Do not claim causation. Do not judge.

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

  let summary = stats.totalIsLowerBound
    ? `At least ${stats.totalActions} enforcement actions totaling $${stats.totalPenalties.toLocaleString()} ` +
      `in penalties were found for ${scopeLabel} over the past ${stats.periodMonths} months. ` +
      `An agency feed returned a full page, so the real count is higher.`
    : `${stats.totalActions} enforcement actions totaling $${stats.totalPenalties.toLocaleString()} ` +
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
