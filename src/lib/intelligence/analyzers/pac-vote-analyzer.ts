/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * PAC-to-Legislator Vote Tracing Analyzer (Insight 5, Gap E1)
 *
 * Traces PAC contributions to legislators, then checks those legislators'
 * voting records on PAC-relevant issues. Answers: "This PAC gave $X to
 * these legislators. How did they vote on issues the PAC lobbied on?"
 *
 * Flow: check cache → classify PAC → resolve recipients → fetch votes →
 *       compute statistics → peer comparison → AI narrative → cache
 * Pattern: vote-finance-analyzer.ts
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { PLAIN_LANGUAGE_RULES } from '@/lib/ai/plain-language';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { categorizePACByName, IndustrySector } from '@/lib/fec/industry-taxonomy';
import { resolveCommitteeRecipients } from '@/lib/fec/recipient-resolver';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import { getPolicyAreasForSector } from '@/lib/connections/policy-area-map';
import {
  getCurrentElectionCycle,
  freshestDate,
  getBillSectors,
  generateInsightNarrative,
  mapWithConcurrency,
  withTimeout,
  ANALYZER_TIMEOUT_MS,
  trackInsightCacheHit,
  withInsightTracking,
  classifySignal,
  SourceCollector,
} from './shared';
import {
  confidenceScore,
  peerComparison,
  MIN_PAC_RECIPIENTS,
  MIN_RELEVANT_VOTES,
  MIN_PEERS,
} from '../statistics/civic-stats';
import type { PACVoteInsight, PACRecipientVoteRecord, PeerComparison } from '../types';

/** Redis cache TTL: 7 days */
const CACHE_TTL = 7 * 24 * 60 * 60;

/** Max votes to fetch per recipient */
const MAX_VOTES = 200;

/** Max recipients to analyze (sorted by amount desc) */
const MAX_RECIPIENTS = 15;

/**
 * Concurrency caps for the analyzer's three fan-out phases. Recipient
 * enrichment and vote fetching hit rate-limited Congress.gov endpoints, so
 * they stay modest; bill classification can fall back to the CPU-bound
 * zero-shot model, so it matches vote-finance-analyzer's pool size of 8.
 */
const RECIPIENT_ENRICH_CONCURRENCY = 5;
const RECIPIENT_FETCH_CONCURRENCY = 4;
const CLASSIFY_CONCURRENCY = 8;

/** Min total relevant votes across all recipients */
const MIN_TOTAL_RELEVANT_VOTES = 10;

/** Standard disclaimer */
const DISCLAIMER =
  'This analysis shows factual patterns in public data. ' +
  'PAC contributions are legal and do not indicate wrongdoing. ' +
  'Voting alignment with contributor interests is common across all legislators. ' +
  'Correlation does not indicate causation or improper behavior.';

// ── Main Analyzer ────────────────────────────────────────────────────

/**
 * Analyze PAC-to-legislator vote tracing for a committee.
 *
 * Returns cached insight if fresh, otherwise computes from scratch.
 * Returns null if the PAC can't be classified or has insufficient data.
 */
export async function analyzePACVotes(committeeId: string): Promise<PACVoteInsight | null> {
  const cacheKey = `insight:pac_votes:${committeeId}`;

  // 1. Check cache
  try {
    const cached = await getRedisCache().get<PACVoteInsight>(cacheKey);
    if (cached) {
      logger.info('[PACVotes] Cache hit', { committeeId });
      trackInsightCacheHit('pac-votes');
      return cached;
    }
  } catch {
    // Cache miss or error — continue
  }

  // 2-8. Classify, resolve, fetch, compute, narrate, cache — all under timeout
  return withInsightTracking('pac-votes', () =>
    withTimeout(computeAndCache(committeeId, cacheKey), ANALYZER_TIMEOUT_MS, 'PACVotes')
  );
}

async function computeAndCache(
  committeeId: string,
  cacheKey: string
): Promise<PACVoteInsight | null> {
  // 2. Classify PAC sector
  const classification = await classifyPAC(committeeId);
  if (!classification) {
    logger.info('[PACVotes] Cannot classify PAC', { committeeId });
    return null;
  }

  // 3. Resolve recipients
  const recipients = await resolveRecipients(committeeId);
  if (!recipients || recipients.length < MIN_PAC_RECIPIENTS) {
    logger.info('[PACVotes] Insufficient linked recipients', {
      committeeId,
      count: recipients?.length ?? 0,
    });
    return null;
  }

  // 4. Get relevant policy areas for PAC sector
  const relevantPolicyAreas = getPolicyAreasForSector(classification.sector);
  if (relevantPolicyAreas.length === 0) {
    logger.info('[PACVotes] No policy areas for sector', {
      committeeId,
      sector: classification.sector,
    });
    return null;
  }

  // 5. Fetch votes and classify per recipient
  const {
    records: recipientVotes,
    billIdsByRecipient,
    freshestVoteDate,
  } = await fetchAndClassifyRecipientVotes(recipients, classification.sector);

  // Drop recipients below MIN_RELEVANT_VOTES
  const qualifiedRecipients = recipientVotes.filter(r => r.relevantVoteCount >= MIN_RELEVANT_VOTES);

  const totalRelevantVotes = qualifiedRecipients.reduce((sum, r) => sum + r.relevantVoteCount, 0);
  if (
    qualifiedRecipients.length < MIN_PAC_RECIPIENTS ||
    totalRelevantVotes < MIN_TOTAL_RELEVANT_VOTES
  ) {
    logger.info('[PACVotes] Insufficient relevant votes after filtering', {
      committeeId,
      qualifiedRecipients: qualifiedRecipients.length,
      totalRelevantVotes,
    });
    return null;
  }

  // 6. Compute aggregate statistics
  const stats = computeAggregateStats(qualifiedRecipients);

  // Count unique bills across qualified recipients
  const uniqueBillIds = new Set<string>();
  for (const r of qualifiedRecipients) {
    for (const billId of billIdsByRecipient.get(r.bioguideId) ?? []) {
      uniqueBillIds.add(billId);
    }
  }
  const relevantBillCount = uniqueBillIds.size;

  // 7. Peer comparison
  const peer = await computePeerComparison(
    committeeId,
    classification.sector,
    stats.aggregateYeaRate
  );

  // 8. Generate insight
  const totalDisbursed = qualifiedRecipients.reduce((sum, r) => sum + r.amountReceived, 0);

  const { narrative, source } = await generateNarrative(
    classification,
    qualifiedRecipients,
    stats,
    peer
  );

  const confidence = confidenceScore({
    sampleSize: totalRelevantVotes,
    minimumSampleSize: MIN_TOTAL_RELEVANT_VOTES * 3,
    dataCompleteness: qualifiedRecipients.length / recipients.length,
    peerCount: peer?.peerCount ?? 0,
  });

  const sc = new SourceCollector();
  sc.add('FEC disbursements', `${getCurrentElectionCycle()} cycle`);
  sc.add('Congress.gov roll calls', '119th Congress');

  const insight: PACVoteInsight = {
    committeeId,
    committeeName: classification.name,
    sector: classification.sector,
    totalDisbursed,
    recipientCount: qualifiedRecipients.length,
    relevantBillCount,
    recipientVotes: qualifiedRecipients,
    aggregateYeaRate: stats.aggregateYeaRate,
    aggregateBaselineYeaRate: stats.aggregateBaselineYeaRate,
    peerComparison: peer ?? {
      value: stats.aggregateYeaRate,
      peerAverage: stats.aggregateYeaRate,
      peerCount: 0,
      peerGroupLabel: 'Insufficient peer data',
      percentileRank: 50,
    },
    narrative,
    confidence: source === 'statistical-fallback' ? Math.min(confidence, 0.5) : confidence,
    confidenceMethod: 'computed',
    dataAsOf: freshestDate(freshestVoteDate) ?? new Date().toISOString(),
    // ^ freshestVoteDate can be undefined if votes lack date fields.
    // Fallback to analysis time is imprecise but the votes were just fetched.
    methodology:
      'PAC recipients identified via FEC disbursement data. ' +
      'Relevant votes determined by bill industry classification (AI summary or policy-area-map fallback). ' +
      'Yea rates compared to same-party baselines on the same roll calls.',
    disclaimer: DISCLAIMER,
    signal: classifySignal({
      value: stats.aggregateYeaRate,
      peerAverage: peer?.peerAverage ?? stats.aggregateBaselineYeaRate ?? undefined,
      percentileRank: peer?.percentileRank,
      confidence: source === 'statistical-fallback' ? Math.min(confidence, 0.5) : confidence,
    }),
    sources: sc.toSources(),
    lastAnalyzedAt: new Date().toISOString(),
    source,
  };

  await cacheInsight(cacheKey, insight);
  await cacheAggregateYeaRate(committeeId, classification.sector, stats.aggregateYeaRate);

  return insight;
}

// ── PAC Classification ───────────────────────────────────────────────

interface PACClassification {
  name: string;
  sector: IndustrySector;
}

async function classifyPAC(committeeId: string): Promise<PACClassification | null> {
  try {
    const info = await fecApiService.getCommitteeInfo(committeeId);
    if (!info) return null;

    const result = categorizePACByName(info.name);
    if (result.sector === IndustrySector.OTHER) return null;

    return { name: info.name, sector: result.sector };
  } catch {
    return null;
  }
}

// ── Recipient Resolution ─────────────────────────────────────────────

interface LinkedRecipient {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  amountReceived: number;
}

async function resolveRecipients(committeeId: string): Promise<LinkedRecipient[] | null> {
  try {
    const all = await resolveCommitteeRecipients(committeeId, getCurrentElectionCycle());

    // Filter to those with bioguideId and positive disbursements
    const withBioguide = all.filter(r => r.bioguideId && r.chamber && r.totalAmount > 0);

    if (withBioguide.length < MIN_PAC_RECIPIENTS) return null;

    // Enrich with representative details (name, party). The lookups are
    // independent per recipient, so run them in a bounded pool rather than
    // serially. mapWithConcurrency preserves order, so the result stays
    // sorted by disbursement amount; unresolved reps drop out via the filter.
    const top = withBioguide.slice(0, MAX_RECIPIENTS);
    const enrichedMaybe = await mapWithConcurrency(
      top,
      RECIPIENT_ENRICH_CONCURRENCY,
      async (r): Promise<LinkedRecipient | null> => {
        const rep = await getEnhancedRepresentative(r.bioguideId!);
        if (!rep) return null;
        return {
          bioguideId: r.bioguideId!,
          name: rep.name,
          party: rep.party,
          state: rep.state,
          chamber: rep.chamber,
          amountReceived: r.totalAmount,
        };
      }
    );
    const enriched = enrichedMaybe.filter((r): r is LinkedRecipient => r !== null);

    return enriched.length >= MIN_PAC_RECIPIENTS ? enriched : null;
  } catch (error) {
    logger.warn('[PACVotes] Recipient resolution failed', {
      committeeId,
      error: (error as Error).message,
    });
    return null;
  }
}

// ── Vote Fetching & Classification ───────────────────────────────────

type RecipientVotes = Awaited<ReturnType<typeof fetchRecipientRawVotes>>;

async function fetchAndClassifyRecipientVotes(
  recipients: LinkedRecipient[],
  pacSector: IndustrySector
): Promise<{
  records: PACRecipientVoteRecord[];
  billIdsByRecipient: Map<string, Set<string>>;
  freshestVoteDate: string | undefined;
}> {
  // Phase 1: fetch raw votes for every recipient in parallel. Each recipient
  // resolves independently, so a slow lookup no longer blocks the others.
  const fetched = await mapWithConcurrency(
    recipients,
    RECIPIENT_FETCH_CONCURRENCY,
    async recipient => {
      try {
        return { recipient, rawVotes: await fetchRecipientRawVotes(recipient) };
      } catch (error) {
        logger.warn('[PACVotes] Failed to fetch recipient votes', {
          bioguideId: recipient.bioguideId,
          error: (error as Error).message,
        });
        return { recipient, rawVotes: [] as RecipientVotes };
      }
    }
  );

  // Phase 2: classify each *unique* bill exactly once. getBillSectors caches
  // by billId alone, so reusing one classification across every recipient who
  // voted on that bill is identical to the old per-vote calls — minus the
  // heavy duplication (≈recipients × votes) that drove the 55s timeouts.
  const sectorMap = await classifyUniqueBills(fetched);

  // Phase 3: tally each recipient synchronously against the precomputed map.
  const records: PACRecipientVoteRecord[] = [];
  const billIdsByRecipient = new Map<string, Set<string>>();
  let freshestVoteDate: string | undefined;

  for (const { recipient, rawVotes } of fetched) {
    const result = tallyRecipientVotes(recipient, rawVotes, pacSector, sectorMap);
    if (result) {
      records.push(result.record);
      billIdsByRecipient.set(recipient.bioguideId, result.relevantBillIds);
      if (
        result.latestVoteDate &&
        (!freshestVoteDate || result.latestVoteDate > freshestVoteDate)
      ) {
        freshestVoteDate = result.latestVoteDate;
      }
    }
  }

  return { records, billIdsByRecipient, freshestVoteDate };
}

/** Fetch a recipient's votes across both sessions of the 119th Congress. */
async function fetchRecipientRawVotes(recipient: LinkedRecipient) {
  const fetchSession = (session: 1 | 2) =>
    recipient.chamber === 'House'
      ? batchVotingService.getHouseMemberVotes(recipient.bioguideId, 119, session, MAX_VOTES)
      : batchVotingService.getSenateMemberVotes(recipient.bioguideId, 119, session, MAX_VOTES);

  const [session1, session2] = await Promise.all([fetchSession(1), fetchSession(2)]);
  return [...session1, ...session2];
}

/**
 * Build a billId → sectors map by classifying each distinct bill once across
 * all recipients' votes, using a bounded pool. The first occurrence of a bill
 * supplies the classification context; getBillSectors keys its cache on billId
 * alone, so any later occurrence would resolve to the same value regardless.
 */
async function classifyUniqueBills(
  fetched: ReadonlyArray<{ recipient: LinkedRecipient; rawVotes: RecipientVotes }>
): Promise<Map<string, IndustrySector[]>> {
  const billInputs = new Map<string, { title: string; policyArea?: string; subjects?: string[] }>();

  for (const { rawVotes } of fetched) {
    for (const vote of rawVotes) {
      if (!vote.bill || (vote.position !== 'Yea' && vote.position !== 'Nay')) continue;
      const billId = `${vote.bill.type}${vote.bill.number}-${vote.bill.congress}`;
      if (!billInputs.has(billId)) {
        billInputs.set(billId, {
          title: vote.bill.title,
          policyArea: vote.bill.policyArea,
          subjects: vote.bill.subjects,
        });
      }
    }
  }

  const entries = [...billInputs.entries()];
  const classified = await mapWithConcurrency(
    entries,
    CLASSIFY_CONCURRENCY,
    async ([billId, input]): Promise<[string, IndustrySector[]]> => {
      try {
        const sectors = await getBillSectors(billId, input.title, {
          policyArea: input.policyArea,
          subjects: input.subjects,
        });
        return [billId, sectors];
      } catch (error) {
        // Fail soft per-bill: a bill we can't classify simply contributes no
        // relevant votes, rather than dropping the whole recipient.
        logger.warn('[PACVotes] Bill classification failed', {
          billId,
          error: (error as Error).message,
        });
        return [billId, []];
      }
    }
  );

  return new Map(classified);
}

/** Synchronous tally of a recipient's PAC-relevant votes using classified bills. */
function tallyRecipientVotes(
  recipient: LinkedRecipient,
  rawVotes: RecipientVotes,
  pacSector: IndustrySector,
  sectorMap: Map<string, IndustrySector[]>
): {
  record: PACRecipientVoteRecord;
  relevantBillIds: Set<string>;
  latestVoteDate: string | undefined;
} | null {
  if (rawVotes.length === 0) return null;

  let relevantYea = 0;
  let relevantNay = 0;
  let baselineYeaSum = 0;
  let baselineCount = 0;
  const voteDates: string[] = [];
  const relevantBillIds = new Set<string>();

  for (const vote of rawVotes) {
    if (!vote.bill || (vote.position !== 'Yea' && vote.position !== 'Nay')) continue;

    const billId = `${vote.bill.type}${vote.bill.number}-${vote.bill.congress}`;
    const sectors = sectorMap.get(billId);
    if (!sectors || !sectors.includes(pacSector)) continue;

    // This vote is relevant to the PAC sector
    if (vote.position === 'Yea') relevantYea++;
    else relevantNay++;
    if (vote.date) voteDates.push(vote.date);
    relevantBillIds.add(billId);

    // Get party baseline for this vote. Roll-call numbers restart each
    // session, so derive the session from the vote date (119th: 2025 = 1,
    // 2026 = 2) to avoid matching the wrong session's roll call.
    if (vote.rollCallNumber) {
      const voteYear = vote.date ? new Date(vote.date).getUTCFullYear() : undefined;
      const session = voteYear ? (voteYear % 2 === 1 ? 1 : 2) : undefined;
      const baseline = batchVotingService.getPartyYeaRate(
        recipient.chamber,
        119,
        vote.rollCallNumber,
        recipient.party,
        session
      );
      if (baseline) {
        baselineYeaSum += baseline.yeaRate;
        baselineCount++;
      }
    }
  }

  const totalRelevant = relevantYea + relevantNay;
  if (totalRelevant === 0) return null;

  const yeaRate = relevantYea / totalRelevant;
  // Honest null when no party baseline could be computed — never substitute
  // the member's own rate, which fabricates a 0pp difference.
  const partyBaselineYeaRate = baselineCount > 0 ? baselineYeaSum / baselineCount : null;
  return {
    record: {
      bioguideId: recipient.bioguideId,
      name: recipient.name,
      party: recipient.party,
      state: recipient.state,
      chamber: recipient.chamber,
      amountReceived: recipient.amountReceived,
      relevantVoteCount: totalRelevant,
      yeaRate,
      partyBaselineYeaRate,
      differenceFromBaseline: partyBaselineYeaRate === null ? null : yeaRate - partyBaselineYeaRate,
    },
    relevantBillIds,
    latestVoteDate: voteDates.length > 0 ? (freshestDate(...voteDates) ?? undefined) : undefined,
  };
}

// ── Statistics ───────────────────────────────────────────────────────

interface AggregateStats {
  aggregateYeaRate: number;
  /** Null when no recipient had a computable party baseline. */
  aggregateBaselineYeaRate: number | null;
}

function computeAggregateStats(recipients: PACRecipientVoteRecord[]): AggregateStats {
  let totalWeightedYea = 0;
  let totalWeightedBaseline = 0;
  let totalVotes = 0;
  let baselineVotes = 0;

  for (const r of recipients) {
    totalWeightedYea += r.yeaRate * r.relevantVoteCount;
    totalVotes += r.relevantVoteCount;
    // Only recipients with a real baseline contribute to the aggregate baseline
    if (r.partyBaselineYeaRate !== null) {
      totalWeightedBaseline += r.partyBaselineYeaRate * r.relevantVoteCount;
      baselineVotes += r.relevantVoteCount;
    }
  }

  return {
    aggregateYeaRate: totalVotes > 0 ? totalWeightedYea / totalVotes : 0,
    aggregateBaselineYeaRate: baselineVotes > 0 ? totalWeightedBaseline / baselineVotes : null,
  };
}

// ── Peer Comparison ──────────────────────────────────────────────────

async function cacheAggregateYeaRate(
  committeeId: string,
  sector: IndustrySector,
  yeaRate: number
): Promise<void> {
  const key = `pac-alignment:${sector}:${committeeId}`;
  try {
    await getRedisCache().set(key, yeaRate, CACHE_TTL);
  } catch {
    // Non-fatal
  }
}

async function computePeerComparison(
  committeeId: string,
  sector: IndustrySector,
  aggregateYeaRate: number
): Promise<PeerComparison | null> {
  const pattern = `pac-alignment:${sector}:*`;

  try {
    const keys = await getRedisCache().keys(pattern);
    const peerKeys = keys.filter(k => !k.endsWith(`:${committeeId}`));
    if (peerKeys.length < MIN_PEERS) return null;

    const values = await getRedisCache().mget<number>(peerKeys);
    const peerScores = values.filter((v): v is number => v !== null && typeof v === 'number');

    if (peerScores.length < MIN_PEERS) return null;

    return peerComparison(aggregateYeaRate, peerScores, `${sector} PACs`);
  } catch {
    return null;
  }
}

// ── AI Narrative ─────────────────────────────────────────────────────

async function generateNarrative(
  classification: PACClassification,
  recipients: PACRecipientVoteRecord[],
  stats: AggregateStats,
  peer: PeerComparison | null
): Promise<{ narrative: string; source: 'ai-generated' | 'statistical-fallback' }> {
  const systemContext =
    'You analyze civic data for CIV.IQ. You describe factual patterns between ' +
    "PAC contributions and legislators' voting records. ";

  const totalDisbursed = recipients.reduce((sum, r) => sum + r.amountReceived, 0);
  const totalVotes = recipients.reduce((sum, r) => sum + r.relevantVoteCount, 0);

  const recipientLines = recipients
    .slice(0, 5)
    .map(
      r =>
        `- ${r.name} (${r.party}-${r.state}): $${r.amountReceived.toLocaleString()} received, ` +
        `${r.relevantVoteCount} relevant votes, ${(r.yeaRate * 100).toFixed(1)}% yea rate ` +
        (r.partyBaselineYeaRate !== null && r.differenceFromBaseline !== null
          ? `(party baseline: ${(r.partyBaselineYeaRate * 100).toFixed(1)}%, ` +
            `difference: ${r.differenceFromBaseline > 0 ? '+' : ''}${(r.differenceFromBaseline * 100).toFixed(1)}pp)`
          : '(party baseline unavailable)')
    )
    .join('\n');

  const peerLine = peer
    ? `Peer comparison: This PAC's recipients' aggregate yea rate is ` +
      `${(stats.aggregateYeaRate * 100).toFixed(1)}%. ` +
      `The average for ${peer.peerGroupLabel} is ` +
      `${(peer.peerAverage * 100).toFixed(1)}% ` +
      `(${peer.peerCount} peers, percentile rank: ${peer.percentileRank}).`
    : 'No peer comparison available yet (insufficient data from other PACs in this sector).';

  const userPrompt = `PAC: ${classification.name}
SECTOR: ${classification.sector}
TOTAL DISBURSED TO ANALYZED RECIPIENTS: $${totalDisbursed.toLocaleString()}
RECIPIENTS ANALYZED: ${recipients.length}
TOTAL RELEVANT VOTES: ${totalVotes}
AGGREGATE YEA RATE: ${(stats.aggregateYeaRate * 100).toFixed(1)}%
AGGREGATE PARTY BASELINE: ${stats.aggregateBaselineYeaRate !== null ? `${(stats.aggregateBaselineYeaRate * 100).toFixed(1)}%` : 'unavailable'}

TOP RECIPIENTS:
${recipientLines}

${peerLine}

Write a 2-3 sentence plain-language summary. State the overall pattern of how PAC recipients voted on bills related to the PAC's industry sector. Note the difference from party baselines if meaningful. Do not claim causation. Do not judge.

${PLAIN_LANGUAGE_RULES}`;

  const fallback = buildStatisticalSummary(classification, recipients, stats, peer);

  return generateInsightNarrative(systemContext, userPrompt, fallback, '[PACVotes]');
}

function buildStatisticalSummary(
  classification: PACClassification,
  recipients: PACRecipientVoteRecord[],
  stats: AggregateStats,
  peer: PeerComparison | null
): string {
  const totalDisbursed = recipients.reduce((sum, r) => sum + r.amountReceived, 0);
  const totalVotes = recipients.reduce((sum, r) => sum + r.relevantVoteCount, 0);

  let baselineClause = '';
  if (stats.aggregateBaselineYeaRate !== null) {
    const diff = stats.aggregateYeaRate - stats.aggregateBaselineYeaRate;
    baselineClause = ` (${diff > 0 ? '+' : ''}${(diff * 100).toFixed(1)} percentage points vs. party baselines)`;
  }

  let summary =
    `${classification.name} disbursed $${totalDisbursed.toLocaleString()} to ${recipients.length} legislators. ` +
    `Across ${totalVotes} votes on ${classification.sector}-related bills, ` +
    `recipients voted yea ${(stats.aggregateYeaRate * 100).toFixed(1)}% of the time${baselineClause}.`;

  if (peer && peer.peerCount >= MIN_PEERS) {
    summary +=
      ` The average for ${peer.peerGroupLabel} is ` + `${(peer.peerAverage * 100).toFixed(1)}%.`;
  }

  return summary;
}

// ── Cache Helpers ────────────────────────────────────────────────────

async function cacheInsight(key: string, insight: PACVoteInsight): Promise<void> {
  try {
    await getRedisCache().set(key, insight, CACHE_TTL);
    logger.info('[PACVotes] Cached insight', {
      committeeId: insight.committeeId,
      confidence: insight.confidence,
      recipientCount: insight.recipientCount,
    });
  } catch {
    // Non-fatal
  }
}
