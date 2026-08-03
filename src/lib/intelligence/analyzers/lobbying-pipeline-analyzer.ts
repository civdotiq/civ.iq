/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Lobbying-Committee-Legislation Pipeline Analyzer (Insight 4)
 *
 * Traces: lobbying expenditures → committee activity → legislative output.
 * Answers: "Who is lobbying this committee, on what issues, and what bills
 * align with those lobbied issues?"
 *
 * Flow: check cache → fetch filings → resolve entities → filter to committee →
 *       group by issue → fetch bills → match bills to issues → peer comparison →
 *       AI narrative → cache → fallback
 *
 * Pattern: finance-jurisdiction-analyzer.ts
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { cachedFetch } from '@/lib/cache';
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
import {
  ALL_COMMITTEE_MAPPINGS,
  type CommitteeMapping,
} from '@/lib/connections/committee-agency-map';
import { forEachFilingForCommittees } from '@/lib/data-sources/lda-corpus/load-filings';
import type { CorpusFiling } from '@/lib/data-sources/lda-corpus/filing-corpus';
import {
  getCommitteeCorpusTotals,
  getAllCommitteeWindowTotals,
} from '@/lib/data-sources/lda-corpus/load';
import {
  getLDAIssueLabel,
  getPolicyAreasForLDAIssue,
} from '../entity-resolution/lda-issue-policy-map';
import {
  peerComparison,
  confidenceScore,
  MIN_FILINGS_LOBBYING,
  MIN_PEERS,
} from '../statistics/civic-stats';
import type {
  LobbyingPipelineInsight,
  LobbyingOrganizationActivity,
  MatchedBill,
  TimelineAlignment,
  PeerComparison,
} from '../types';

/** Redis cache TTL: 7 days */
const CACHE_TTL = 7 * 24 * 60 * 60;

/** Standard disclaimer */
const DISCLAIMER =
  'This analysis shows factual patterns in public lobbying disclosure data. ' +
  'Lobbying is legal and protected by the First Amendment. ' +
  'The presence of lobbying activity does not indicate improper behavior. ' +
  'Bill introduction may be unrelated to lobbying activity. ' +
  'Correlation does not indicate causation.';

// ── Main Analyzer ────────────────────────────────────────────────────

/**
 * Analyze the lobbying pipeline for a congressional committee.
 *
 * Returns cached insight if fresh, otherwise computes from scratch.
 * Returns null if insufficient data (fewer than MIN_FILINGS_LOBBYING filings).
 */
export async function analyzeLobbyingPipeline(
  committeeCode: string
): Promise<LobbyingPipelineInsight | null> {
  const cacheKey = `insight:lobbying_pipeline:${committeeCode}`;

  // 1. Check cache
  try {
    const cached = await getRedisCache().get<LobbyingPipelineInsight>(cacheKey);
    if (cached) {
      logger.info('[LobbyingPipeline] Cache hit', { committeeCode });
      trackInsightCacheHit('lobbying-pipeline');
      return cached;
    }
  } catch {
    // Cache miss or error — continue to computation
  }

  // 2-8. Validate, fetch, compute, narrate, cache — all under timeout
  return withInsightTracking('lobbying-pipeline', () =>
    withTimeout(computeAndCache(committeeCode, cacheKey), ANALYZER_TIMEOUT_MS, 'LobbyingPipeline')
  );
}

async function computeAndCache(
  committeeCode: string,
  cacheKey: string
): Promise<LobbyingPipelineInsight | null> {
  // 2. Validate committee
  const committeeMapping = ALL_COMMITTEE_MAPPINGS.find(m => m.committeeCode === committeeCode);
  if (!committeeMapping) {
    logger.warn('[LobbyingPipeline] Unknown committee code', { committeeCode });
    return null;
  }

  // 3. Fetch and process data
  const data = await fetchAndResolve(committeeCode, committeeMapping);
  if (!data) {
    return null;
  }

  // 4. Compute statistics
  const stats = computeStatistics(data);

  // 4b. Prefer the complete corpus total over the ~0.1% sample for the dollar
  // figure that drives peer ranking, the signal, and caching. The sample still
  // supplies top organizations, issue alignments, and bill matches.
  const corpusTotal = (await getCommitteeCorpusTotals(committeeCode))?.windowTotal ?? null;
  if (corpusTotal !== null) stats.totalSpending = corpusTotal;

  // 5. Peer comparison
  const peer = await computePeerComparison(committeeCode, stats.totalSpending, committeeMapping);

  // 5b. Recompute confidence with actual peer count
  if (peer) {
    stats.confidence = confidenceScore({
      sampleSize: stats.topOrganizations.reduce((sum, o) => sum + o.filingCount, 0),
      minimumSampleSize: MIN_FILINGS_LOBBYING,
      dataCompleteness: Math.min(stats.issueAlignments.length / 3, 1),
      peerCount: peer.peerCount,
    });
  }

  // 6. Fetch and match bills to enrich issue alignments
  const { alignments, totalMatchedBills } = await fetchAndMatchBills(stats.issueAlignments);
  stats.issueAlignments = alignments;
  stats.matchedBillCount = totalMatchedBills;

  // 7. Generate insight
  const { narrative, source } = await generateNarrative(committeeMapping, stats, peer);

  const sc = new SourceCollector();
  sc.add('Senate LDA filings', 'complete corpus', data.filingCount);
  sc.add('Congress.gov bills', '119th Congress', stats.matchedBillCount);

  const insight: LobbyingPipelineInsight = {
    committeeCode,
    committeeName: committeeMapping.committeeName,
    chamber: committeeMapping.chamber,
    totalSpending: stats.totalSpending,
    organizationCount: stats.organizationCount,
    matchedBillCount: stats.matchedBillCount,
    topOrganizations: stats.topOrganizations,
    issueAlignments: stats.issueAlignments,
    peerComparison: peer,
    ...(peer
      ? {}
      : {
          peerComparisonUnavailableReason: peerComparisonUnavailable(
            `other ${committeeMapping.chamber} committees`
          ),
        }),
    narrative,
    confidence:
      source === 'statistical-fallback' ? Math.min(stats.confidence, 0.5) : stats.confidence,
    confidenceMethod: 'computed',
    dataAsOf: freshestDate(
      ...stats.issueAlignments.flatMap(a => a.matchedBills.map(b => b.introducedDate)),
      ...data.quarters.map(quarterEndDate)
    )!,
    methodology:
      'Complete Senate LDA quarterly reports for the corpus window, matched to committees via entity resolution of the LDA government_entities field and issue-code jurisdiction. ' +
      'Bills matched via LDA issue code to Congress.gov policyArea mapping. ' +
      'Data from Senate LDA disclosures and Congress.gov.',
    disclaimer: DISCLAIMER,
    signal: classifySignal({
      value: stats.totalSpending,
      peerAverage: peer?.peerAverage,
      percentileRank: peer?.percentileRank,
      confidence:
        source === 'statistical-fallback' ? Math.min(stats.confidence, 0.5) : stats.confidence,
    }),
    sources: sc.toSources(),
    lastAnalyzedAt: new Date().toISOString(),
    source,
  };

  // 8. Cache
  await cacheInsight(cacheKey, insight);
  await cacheLobbyingScore(committeeCode, stats.totalSpending);

  return insight;
}

// ── Data Fetching & Resolution ───────────────────────────────────────

/** Last day of a corpus quarter key ("2026-Q1" → "2026-03-31"), for dataAsOf. */
function quarterEndDate(quarter: string): string {
  const [year, q] = quarter.split('-');
  const ends: Record<string, string> = { Q1: '03-31', Q2: '06-30', Q3: '09-30', Q4: '12-31' };
  return `${year}-${ends[q ?? ''] ?? '12-31'}`;
}

interface ResolvedData {
  /** Per-organization rollups over every filing touching the committee. */
  organizations: Array<{
    name: string;
    registrantId?: string;
    spending: number;
    filingCount: number;
    issueCodes: string[];
  }>;
  /** Per-issue rollups over the same filings. */
  issues: Array<{ code: string; spending: number; organizationCount: number }>;
  totalSpending: number;
  /** Distinct filings behind the rollups. */
  filingCount: number;
  /** Quarter keys covered, oldest first. */
  quarters: string[];
}

/**
 * Read the committee's filings from the corpus.
 *
 * This used to call `fetchRecentFilings()` and keep the rows whose disclosed
 * government entities resolved to the committee — 25 filings a quarter, of which
 * a handful matched, from which the analyzer then ranked "top organizations".
 * The dollar total was already corrected from the aggregate corpus; everything
 * else on the card still came from the sample.
 *
 * Returns null when the corpus is unavailable. The analyzer is a
 * complete-record claim about who lobbies a committee — there is no honest
 * degraded version of it.
 */
async function fetchAndResolve(
  committeeCode: string,
  _mapping: CommitteeMapping
): Promise<ResolvedData | null> {
  const orgMap = new Map<
    string,
    { spending: number; filingCount: number; issueCodes: Set<string>; registrantId?: string }
  >();
  const issueMap = new Map<string, { spending: number; orgs: Set<string> }>();
  const quarters = new Set<string>();
  let totalSpending = 0;
  let filingCount = 0;

  const available = await forEachFilingForCommittees([committeeCode], (filing: CorpusFiling) => {
    totalSpending += filing.amount;
    filingCount += 1;
    quarters.add(filing.quarter);

    let org = orgMap.get(filing.clientName);
    if (!org) {
      org = { spending: 0, filingCount: 0, issueCodes: new Set() };
      orgMap.set(filing.clientName, org);
    }
    org.spending += filing.amount;
    org.filingCount += 1;
    // Only an organization filing on its own behalf has a lobby profile to link.
    if (
      !org.registrantId &&
      filing.registrantName.toLowerCase() === filing.clientName.toLowerCase()
    ) {
      org.registrantId = filing.registrantId;
    }

    for (const code of filing.issueCodes) {
      org.issueCodes.add(code);
      let issue = issueMap.get(code);
      if (!issue) {
        issue = { spending: 0, orgs: new Set() };
        issueMap.set(code, issue);
      }
      issue.spending += filing.amount;
      issue.orgs.add(filing.clientName);
    }
  });

  if (!available) {
    logger.info('[LobbyingPipeline] Corpus unavailable', { committeeCode });
    return null;
  }

  if (filingCount < MIN_FILINGS_LOBBYING) {
    logger.info('[LobbyingPipeline] Insufficient filings for committee', {
      committeeCode,
      matchedCount: filingCount,
      minimum: MIN_FILINGS_LOBBYING,
    });
    return null;
  }

  logger.info('[LobbyingPipeline] Resolved committee filings from corpus', {
    committeeCode,
    filingCount,
    organizations: orgMap.size,
  });

  return {
    organizations: Array.from(orgMap.entries()).map(([name, o]) => ({
      name,
      ...(o.registrantId ? { registrantId: o.registrantId } : {}),
      spending: o.spending,
      filingCount: o.filingCount,
      issueCodes: Array.from(o.issueCodes),
    })),
    issues: Array.from(issueMap.entries()).map(([code, i]) => ({
      code,
      spending: i.spending,
      organizationCount: i.orgs.size,
    })),
    totalSpending,
    filingCount,
    quarters: Array.from(quarters).sort(),
  };
}

interface ComputedStats {
  totalSpending: number;
  organizationCount: number;
  matchedBillCount: number;
  topOrganizations: LobbyingOrganizationActivity[];
  issueAlignments: TimelineAlignment[];
  confidence: number;
}

function computeStatistics(data: ResolvedData): ComputedStats {
  const topOrganizations: LobbyingOrganizationActivity[] = data.organizations
    .map(o => ({
      name: o.name,
      registrantId: o.registrantId,
      totalSpending: o.spending,
      filingCount: o.filingCount,
      issueCodes: o.issueCodes,
    }))
    .sort((a, b) => b.totalSpending - a.totalSpending)
    .slice(0, 15);

  // Organization stance is not set on this path. Classifying it needs the
  // filings' free-text specific_issues, which the corpus does not carry —
  // 155k descriptions would dwarf the artifact. Rather than classify a stance
  // from whichever unrelated 25 filings the API sample happens to return,
  // organizations go out without one.

  const issueAlignments: TimelineAlignment[] = data.issues
    .map(i => ({
      issueCode: i.code,
      issueLabel: getLDAIssueLabel(i.code),
      lobbyingSpending: i.spending,
      organizationCount: i.organizationCount,
      matchedBills: [], // Populated in fetchAndMatchBills
    }))
    .sort((a, b) => b.lobbyingSpending - a.lobbyingSpending);

  const confidence = confidenceScore({
    sampleSize: data.filingCount,
    minimumSampleSize: MIN_FILINGS_LOBBYING,
    dataCompleteness: Math.min(issueAlignments.length / 3, 1),
    peerCount: 0, // Updated after peer comparison
  });

  return {
    totalSpending: data.totalSpending,
    organizationCount: data.organizations.length,
    matchedBillCount: 0, // Updated after bill fetch
    topOrganizations,
    issueAlignments,
    confidence,
  };
}

// ── Bill Fetching & Matching ─────────────────────────────────────────

interface CongressBillListItem {
  congress: number;
  type: string;
  number: number;
  title: string;
  introducedDate: string;
  policyArea?: { name: string };
  latestAction?: { actionDate: string; text: string };
  url: string;
}

/**
 * Fetch recent bills and match to lobbied issues via policyArea.
 * Uses the overfetch-and-filter pattern from spending/agency/[agencySlug]/bills/route.ts.
 */
async function fetchAndMatchBills(
  issueAlignments: TimelineAlignment[]
): Promise<{ alignments: TimelineAlignment[]; totalMatchedBills: number }> {
  // Collect all policyAreas needed from issue codes
  const neededPolicyAreas = new Set<string>();
  const issueToPolicy = new Map<string, Set<string>>();

  for (const alignment of issueAlignments) {
    const policyAreas = getPolicyAreasForLDAIssue(alignment.issueCode);
    const normalized = new Set(policyAreas.map(pa => pa.toLowerCase()));
    issueToPolicy.set(alignment.issueCode, normalized);
    for (const pa of policyAreas) {
      neededPolicyAreas.add(pa.toLowerCase());
    }
  }

  if (neededPolicyAreas.size === 0) {
    return { alignments: issueAlignments, totalMatchedBills: 0 };
  }

  // Fetch bills from Congress.gov
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    logger.warn('[LobbyingPipeline] No Congress.gov API key, skipping bill matching');
    return { alignments: issueAlignments, totalMatchedBills: 0 };
  }

  let allBills: CongressBillListItem[] = [];
  try {
    allBills = await cachedFetch(
      'lobbying-pipeline-bills-recent',
      async () => {
        const url = new URL('https://api.congress.gov/v3/bill');
        url.searchParams.set('format', 'json');
        url.searchParams.set('limit', '250');
        url.searchParams.set('sort', 'updateDate+desc');

        const response = await fetch(url.toString(), {
          headers: {
            'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
            Accept: 'application/json',
            'X-API-Key': apiKey,
          },
          // Bound the request: without a timeout a hung/slow Congress.gov
          // connection can consume the full function budget. 15s is generous
          // for a single 250-bill list call; on timeout the outer catch
          // degrades gracefully to "no matched bills".
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          throw new Error(`Congress.gov API returned ${response.status}`);
        }

        const data = await response.json();
        return (data.bills ?? []) as CongressBillListItem[];
      },
      2 * 60 * 60 // 2 hour cache
    );
  } catch (error) {
    logger.warn('[LobbyingPipeline] Congress.gov bill fetch failed', {
      error: (error as Error).message,
    });
    return { alignments: issueAlignments, totalMatchedBills: 0 };
  }

  // Filter bills by policyArea and assign to issue alignments
  const billsByPolicyArea = new Map<string, CongressBillListItem[]>();
  for (const bill of allBills) {
    const pa = bill.policyArea?.name?.toLowerCase();
    if (pa && neededPolicyAreas.has(pa)) {
      const existing = billsByPolicyArea.get(pa) ?? [];
      existing.push(bill);
      billsByPolicyArea.set(pa, existing);
    }
  }

  let totalMatchedBills = 0;
  const seenBillIds = new Set<string>();

  const updatedAlignments = issueAlignments.map(alignment => {
    const policyAreas = issueToPolicy.get(alignment.issueCode);
    if (!policyAreas) return alignment;

    const matchedBills: MatchedBill[] = [];

    for (const pa of policyAreas) {
      const bills = billsByPolicyArea.get(pa) ?? [];
      for (const bill of bills) {
        const billId = `${bill.congress}-${bill.type.toLowerCase()}-${bill.number}`;
        if (!seenBillIds.has(billId)) {
          seenBillIds.add(billId);
          matchedBills.push({
            id: billId,
            title: bill.title,
            type: bill.type,
            number: bill.number.toString(),
            congress: bill.congress,
            policyArea: bill.policyArea?.name ?? '',
            introducedDate: bill.introducedDate,
            matchedIssueCodes: [alignment.issueCode],
          });
        }
      }
    }

    totalMatchedBills += matchedBills.length;

    return {
      ...alignment,
      matchedBills: matchedBills.slice(0, 10), // Top 10 per issue
    };
  });

  return { alignments: updatedAlignments, totalMatchedBills };
}

// ── Peer Comparison ──────────────────────────────────────────────────

function lobbyingScoreCacheKey(committeeCode: string): string {
  return `lobbying-score:${committeeCode}`;
}

async function cacheLobbyingScore(committeeCode: string, totalSpending: number): Promise<void> {
  try {
    await getRedisCache().set(lobbyingScoreCacheKey(committeeCode), totalSpending, CACHE_TTL);
  } catch {
    // Non-fatal
  }
}

async function computePeerComparison(
  committeeCode: string,
  totalSpending: number,
  mapping: CommitteeMapping
): Promise<PeerComparison | null> {
  const chamber = mapping.chamber;
  const sameChamber = ALL_COMMITTEE_MAPPINGS.filter(
    m => m.chamber === chamber && m.committeeCode !== committeeCode
  );
  if (sameChamber.length < MIN_PEERS) return null;

  // Prefer the complete corpus: every committee has an accurate window total, so
  // the ranking is stable and available, unlike the cached ~0.1% sample scores.
  const corpusTotals = await getAllCommitteeWindowTotals();
  if (corpusTotals) {
    const peerScores = sameChamber
      .map(p => corpusTotals.get(p.committeeCode))
      .filter((v): v is number => typeof v === 'number');
    if (peerScores.length >= MIN_PEERS) {
      return peerComparison(totalSpending, peerScores, `${chamber} committees`);
    }
  }

  // Fallback: cached sample scores from prior analyzer runs.
  try {
    const peerCacheKeys = sameChamber.map(p => lobbyingScoreCacheKey(p.committeeCode));
    const values = await getRedisCache().mget<number>(peerCacheKeys);
    const peerScores = values.filter((v): v is number => v !== null && typeof v === 'number');
    if (peerScores.length < MIN_PEERS) return null;
    return peerComparison(totalSpending, peerScores, `${chamber} committees`);
  } catch {
    return null;
  }
}

// ── AI Narrative ─────────────────────────────────────────────────────

async function generateNarrative(
  mapping: CommitteeMapping,
  stats: ComputedStats,
  peer: PeerComparison | null
): Promise<{ narrative: string; source: 'ai-generated' | 'statistical-fallback' }> {
  const systemContext =
    'You analyze civic data for CIV.IQ. You describe factual patterns between ' +
    'lobbying activity and legislative output. ';

  const topIssueLines = stats.issueAlignments
    .slice(0, 5)
    .map(
      a =>
        `- ${a.issueLabel} (${a.issueCode}): $${a.lobbyingSpending.toLocaleString()} from ${a.organizationCount} organizations, ${a.matchedBills.length} related bills`
    )
    .join('\n');

  const topOrgLines = stats.topOrganizations
    .slice(0, 5)
    .map(o => `- ${o.name}: $${o.totalSpending.toLocaleString()} across ${o.filingCount} filings`)
    .join('\n');

  const peerLine = peer
    ? `Peer comparison: Total lobbying spending mentioning the ${mapping.committeeName} committee is $${stats.totalSpending.toLocaleString()}. ` +
      `The average for ${peer.peerGroupLabel} is $${peer.peerAverage.toLocaleString()} ` +
      `(${peer.peerCount} peers, percentile rank: ${peer.percentileRank}).`
    : 'No peer comparison available yet (insufficient data from other committees).';

  const userPrompt = `COMMITTEE: ${mapping.chamber} ${mapping.committeeName} Committee (${mapping.committeeCode})

LOBBYING SUMMARY:
- Total spending mentioning this committee: $${stats.totalSpending.toLocaleString()}
- Unique organizations: ${stats.organizationCount}
- Matched bills: ${stats.matchedBillCount}

TOP LOBBYING ISSUES:
${topIssueLines}

TOP ORGANIZATIONS:
${topOrgLines}

${peerLine}

Write a 2-3 sentence plain-language summary of these factual patterns. State the total lobbying spending and number of organizations. Note which issues receive the most lobbying activity. If bills match lobbied issues, note how many. If peer comparison is available, note whether this committee receives more or less lobbying than the average. Do not claim causation. Do not judge.

${PLAIN_LANGUAGE_RULES}`;

  const fallback = buildStatisticalSummary(mapping, stats, peer);

  return generateInsightNarrative(systemContext, userPrompt, fallback, '[LobbyingPipeline]');
}

// ── Fallback ─────────────────────────────────────────────────────────

function buildStatisticalSummary(
  mapping: CommitteeMapping,
  stats: ComputedStats,
  peer: PeerComparison | null
): string {
  const topIssue = stats.issueAlignments[0];

  let summary =
    `${stats.organizationCount} organizations spent a total of $${stats.totalSpending.toLocaleString()} ` +
    `on lobbying that mentions the ${mapping.chamber} ${mapping.committeeName} Committee.`;

  if (topIssue) {
    summary +=
      ` The most lobbied issue is ${topIssue.issueLabel}, with $${topIssue.lobbyingSpending.toLocaleString()} ` +
      `from ${topIssue.organizationCount} organizations.`;
  }

  if (stats.matchedBillCount > 0) {
    summary += ` ${stats.matchedBillCount} recent bills align with lobbied issue areas.`;
  }

  if (peer && peer.peerCount >= MIN_PEERS) {
    summary += ` The average lobbying spending for ${peer.peerGroupLabel} is $${peer.peerAverage.toLocaleString()}.`;
  }

  return summary;
}

// ── Cache Helpers ────────────────────────────────────────────────────

async function cacheInsight(key: string, insight: LobbyingPipelineInsight): Promise<void> {
  try {
    await getRedisCache().set(key, insight, CACHE_TTL);
    logger.info('[LobbyingPipeline] Cached insight', {
      committeeCode: insight.committeeCode,
      confidence: insight.confidence,
    });
  } catch {
    // Non-fatal
  }
}
