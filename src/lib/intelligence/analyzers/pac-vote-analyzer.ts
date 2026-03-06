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
import { generateAIText } from '@/lib/ai/provider';
import { PLAIN_LANGUAGE_SYSTEM_PROMPT, PLAIN_LANGUAGE_RULES } from '@/lib/ai/plain-language';
import { ReadingLevelValidator } from '@/features/legislation/services/ai/reading-level-validator';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { categorizePACByName, IndustrySector } from '@/lib/fec/industry-taxonomy';
import { resolveCommitteeRecipients } from '@/lib/fec/recipient-resolver';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import { BillSummaryCache } from '@/features/legislation/services/ai/bill-summary-cache';
import { getIndustrySectorsForPolicyArea } from '@/lib/connections/policy-area-map';
import { getPolicyAreasForSector } from '@/lib/connections/policy-area-map';
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

/** Max AI narrative regeneration attempts */
const MAX_AI_RETRIES = 3;

/** Max votes to fetch per recipient */
const MAX_VOTES = 200;

/** Max recipients to analyze (sorted by amount desc) */
const MAX_RECIPIENTS = 15;

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
      return cached;
    }
  } catch {
    // Cache miss or error — continue
  }

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
  const recipientVotes = await fetchAndClassifyRecipientVotes(
    recipients,
    classification.sector,
    relevantPolicyAreas
  );

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

  // Count unique bills
  const relevantBillCount = countUniqueBills(qualifiedRecipients);

  // 7. Peer comparison
  const peer = await computePeerComparison(
    committeeId,
    classification.sector,
    stats.aggregateYeaRate
  );

  // 8. Generate insight
  const totalDisbursed = qualifiedRecipients.reduce((sum, r) => sum + r.amountReceived, 0);

  try {
    const narrative = await generateNarrative(classification, qualifiedRecipients, stats, peer);

    const confidence = confidenceScore({
      sampleSize: totalRelevantVotes,
      minimumSampleSize: MIN_TOTAL_RELEVANT_VOTES * 3,
      dataCompleteness: qualifiedRecipients.length / recipients.length,
      peerCount: peer?.peerCount ?? 0,
    });

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
      confidence,
      dataAsOf: new Date().toISOString(),
      methodology:
        'PAC recipients identified via FEC disbursement data. ' +
        'Relevant votes determined by bill industry classification (AI summary or policy-area-map fallback). ' +
        'Yea rates compared to same-party baselines on the same roll calls.',
      disclaimer: DISCLAIMER,
      lastAnalyzedAt: new Date().toISOString(),
      source: 'ai-generated',
    };

    await cacheInsight(cacheKey, insight);
    await cacheAggregateYeaRate(committeeId, classification.sector, stats.aggregateYeaRate);

    return insight;
  } catch (error) {
    logger.error('[PACVotes] AI generation failed, using fallback', error as Error, {
      committeeId,
    });

    return generateFallback(
      committeeId,
      classification,
      qualifiedRecipients,
      stats,
      totalDisbursed,
      relevantBillCount,
      peer,
      recipients.length
    );
  }
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
    const all = await resolveCommitteeRecipients(committeeId, 2024);

    // Filter to those with bioguideId and positive disbursements
    const withBioguide = all.filter(r => r.bioguideId && r.chamber && r.totalAmount > 0);

    if (withBioguide.length < MIN_PAC_RECIPIENTS) return null;

    // Enrich with representative details (name, party)
    const enriched: LinkedRecipient[] = [];

    for (const r of withBioguide.slice(0, MAX_RECIPIENTS)) {
      const rep = await getEnhancedRepresentative(r.bioguideId!);
      if (rep) {
        enriched.push({
          bioguideId: r.bioguideId!,
          name: rep.name,
          party: rep.party,
          state: rep.state,
          chamber: rep.chamber,
          amountReceived: r.totalAmount,
        });
      }
    }

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

async function fetchAndClassifyRecipientVotes(
  recipients: LinkedRecipient[],
  pacSector: IndustrySector,
  _relevantPolicyAreas: string[]
): Promise<PACRecipientVoteRecord[]> {
  const records: PACRecipientVoteRecord[] = [];

  for (const recipient of recipients) {
    try {
      const record = await processRecipientVotes(recipient, pacSector);
      if (record) {
        records.push(record);
      }
    } catch (error) {
      logger.warn('[PACVotes] Failed to process recipient votes', {
        bioguideId: recipient.bioguideId,
        error: (error as Error).message,
      });
    }
  }

  return records;
}

async function processRecipientVotes(
  recipient: LinkedRecipient,
  pacSector: IndustrySector
): Promise<PACRecipientVoteRecord | null> {
  const currentYear = new Date().getFullYear();
  const session = currentYear % 2 === 1 ? 1 : 2;

  // Fetch votes
  const rawVotes =
    recipient.chamber === 'House'
      ? await batchVotingService.getHouseMemberVotes(recipient.bioguideId, 119, session, MAX_VOTES)
      : await batchVotingService.getSenateMemberVotes(
          recipient.bioguideId,
          119,
          session,
          MAX_VOTES
        );

  if (rawVotes.length === 0) return null;

  // Classify each vote and filter to PAC-relevant ones
  let relevantYea = 0;
  let relevantNay = 0;
  let baselineYeaSum = 0;
  let baselineCount = 0;

  for (const vote of rawVotes) {
    if (!vote.bill || (vote.position !== 'Yea' && vote.position !== 'Nay')) continue;

    const billId = `${vote.bill.type}${vote.bill.number}-${vote.bill.congress}`;
    const sectors = await getBillSectors(billId, vote.bill.title);

    if (!sectors.includes(pacSector)) continue;

    // This vote is relevant to the PAC sector
    if (vote.position === 'Yea') relevantYea++;
    else relevantNay++;

    // Get party baseline for this vote
    if (vote.rollCallNumber) {
      const baseline = batchVotingService.getPartyYeaRate(
        recipient.chamber,
        119,
        vote.rollCallNumber,
        recipient.party
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
  const partyBaselineYeaRate = baselineCount > 0 ? baselineYeaSum / baselineCount : yeaRate;

  return {
    bioguideId: recipient.bioguideId,
    name: recipient.name,
    party: recipient.party,
    state: recipient.state,
    chamber: recipient.chamber,
    amountReceived: recipient.amountReceived,
    relevantVoteCount: totalRelevant,
    yeaRate,
    partyBaselineYeaRate,
    differenceFromBaseline: yeaRate - partyBaselineYeaRate,
  };
}

// ── Bill Classification ──────────────────────────────────────────────

async function getBillSectors(billId: string, billTitle: string): Promise<IndustrySector[]> {
  try {
    const summary = await BillSummaryCache.getSummary(billId);
    if (summary?.affectedIndustries?.length) {
      return summary.affectedIndustries;
    }
  } catch {
    // Cache miss — try static fallback
  }

  return inferSectorsFromTitle(billTitle);
}

/**
 * Rough inference of sectors from bill title using policy-area-map.
 * Replicated from vote-finance-analyzer.ts (private function).
 */
function inferSectorsFromTitle(title: string): IndustrySector[] {
  const titleLower = title.toLowerCase();

  const keywordToPolicyArea: Array<[string[], string]> = [
    [['defense', 'military', 'armed forces', 'veteran'], 'Armed Forces and National Security'],
    [['health', 'medicare', 'medicaid', 'drug', 'pharmaceutical'], 'Health'],
    [['tax', 'revenue', 'irs'], 'Taxation'],
    [['energy', 'oil', 'gas', 'renewable', 'nuclear'], 'Energy'],
    [['bank', 'financial', 'securities', 'insurance'], 'Finance and Financial Sector'],
    [['agriculture', 'farm', 'food', 'nutrition'], 'Agriculture and Food'],
    [['transportation', 'highway', 'aviation', 'rail'], 'Transportation and Public Works'],
    [['education', 'school', 'student'], 'Education'],
    [['environment', 'climate', 'pollution', 'epa'], 'Environmental Protection'],
    [['labor', 'worker', 'employment', 'wage'], 'Labor and Employment'],
    [['immigration', 'border', 'visa'], 'Immigration'],
    [['trade', 'tariff', 'commerce'], 'Commerce'],
    [['housing', 'hud', 'mortgage'], 'Housing and Community Development'],
    [['technology', 'cyber', 'broadband', 'telecom'], 'Science, Technology, Communications'],
    [['crime', 'law enforcement', 'criminal'], 'Crime and Law Enforcement'],
    [['construction', 'infrastructure', 'water'], 'Water Resources Development'],
  ];

  const sectors = new Set<IndustrySector>();

  for (const [keywords, policyArea] of keywordToPolicyArea) {
    if (keywords.some(k => titleLower.includes(k))) {
      for (const sector of getIndustrySectorsForPolicyArea(policyArea)) {
        sectors.add(sector);
      }
    }
  }

  return Array.from(sectors);
}

// ── Statistics ───────────────────────────────────────────────────────

interface AggregateStats {
  aggregateYeaRate: number;
  aggregateBaselineYeaRate: number;
}

function computeAggregateStats(recipients: PACRecipientVoteRecord[]): AggregateStats {
  let totalWeightedYea = 0;
  let totalWeightedBaseline = 0;
  let totalVotes = 0;

  for (const r of recipients) {
    totalWeightedYea += r.yeaRate * r.relevantVoteCount;
    totalWeightedBaseline += r.partyBaselineYeaRate * r.relevantVoteCount;
    totalVotes += r.relevantVoteCount;
  }

  return {
    aggregateYeaRate: totalVotes > 0 ? totalWeightedYea / totalVotes : 0,
    aggregateBaselineYeaRate: totalVotes > 0 ? totalWeightedBaseline / totalVotes : 0,
  };
}

function countUniqueBills(_recipients: PACRecipientVoteRecord[]): number {
  // We don't track individual bill IDs in PACRecipientVoteRecord,
  // so return total relevant votes as a proxy for bill count
  return _recipients.reduce((sum, r) => sum + r.relevantVoteCount, 0);
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
    const peerScores: number[] = [];

    for (const key of keys) {
      if (key.endsWith(`:${committeeId}`)) continue;
      const score = await getRedisCache().get<number>(key);
      if (score !== null && typeof score === 'number') {
        peerScores.push(score);
      }
    }

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
): Promise<string> {
  const systemPrompt =
    'You analyze civic data for CIV.IQ. You describe factual patterns between ' +
    "PAC contributions and legislators' voting records. " +
    PLAIN_LANGUAGE_SYSTEM_PROMPT.replace('Output valid JSON only.', 'Output plain text only.');

  const totalDisbursed = recipients.reduce((sum, r) => sum + r.amountReceived, 0);
  const totalVotes = recipients.reduce((sum, r) => sum + r.relevantVoteCount, 0);

  const recipientLines = recipients
    .slice(0, 5)
    .map(
      r =>
        `- ${r.name} (${r.party}-${r.state}): $${r.amountReceived.toLocaleString()} received, ` +
        `${r.relevantVoteCount} relevant votes, ${(r.yeaRate * 100).toFixed(1)}% yea rate ` +
        `(party baseline: ${(r.partyBaselineYeaRate * 100).toFixed(1)}%, ` +
        `difference: ${r.differenceFromBaseline > 0 ? '+' : ''}${(r.differenceFromBaseline * 100).toFixed(1)}pp)`
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
AGGREGATE PARTY BASELINE: ${(stats.aggregateBaselineYeaRate * 100).toFixed(1)}%

TOP RECIPIENTS:
${recipientLines}

${peerLine}

Write a 2-3 sentence plain-language summary. State the overall pattern of how PAC recipients voted on bills related to the PAC's industry sector. Note the difference from party baselines if meaningful. Do not claim causation. Do not judge.

${PLAIN_LANGUAGE_RULES}`;

  for (let attempt = 0; attempt < MAX_AI_RETRIES; attempt++) {
    const text = await generateAIText(systemPrompt, userPrompt, {
      temperature: 0.3,
      maxTokens: 300,
    });

    if (ReadingLevelValidator.meetsTarget(text, 8)) {
      return text;
    }

    logger.info('[PACVotes] Reading level too high, retrying', {
      attempt: attempt + 1,
      committeeId: classification.name,
    });
  }

  return buildStatisticalSummary(classification, recipients, stats, peer);
}

function buildStatisticalSummary(
  classification: PACClassification,
  recipients: PACRecipientVoteRecord[],
  stats: AggregateStats,
  peer: PeerComparison | null
): string {
  const totalDisbursed = recipients.reduce((sum, r) => sum + r.amountReceived, 0);
  const totalVotes = recipients.reduce((sum, r) => sum + r.relevantVoteCount, 0);
  const diff = stats.aggregateYeaRate - stats.aggregateBaselineYeaRate;
  const diffStr = `${diff > 0 ? '+' : ''}${(diff * 100).toFixed(1)}`;

  let summary =
    `${classification.name} disbursed $${totalDisbursed.toLocaleString()} to ${recipients.length} legislators. ` +
    `Across ${totalVotes} votes on ${classification.sector}-related bills, ` +
    `recipients voted yea ${(stats.aggregateYeaRate * 100).toFixed(1)}% of the time ` +
    `(${diffStr} percentage points vs. party baselines).`;

  if (peer && peer.peerCount >= MIN_PEERS) {
    summary +=
      ` The average for ${peer.peerGroupLabel} is ` + `${(peer.peerAverage * 100).toFixed(1)}%.`;
  }

  return summary;
}

// ── Fallback ─────────────────────────────────────────────────────────

async function generateFallback(
  committeeId: string,
  classification: PACClassification,
  recipients: PACRecipientVoteRecord[],
  stats: AggregateStats,
  totalDisbursed: number,
  relevantBillCount: number,
  peer: PeerComparison | null,
  totalRecipientCount: number
): Promise<PACVoteInsight> {
  const narrative = buildStatisticalSummary(classification, recipients, stats, peer);

  const confidence = confidenceScore({
    sampleSize: recipients.reduce((sum, r) => sum + r.relevantVoteCount, 0),
    minimumSampleSize: MIN_TOTAL_RELEVANT_VOTES * 3,
    dataCompleteness: recipients.length / totalRecipientCount,
    peerCount: peer?.peerCount ?? 0,
  });

  const insight: PACVoteInsight = {
    committeeId,
    committeeName: classification.name,
    sector: classification.sector,
    totalDisbursed,
    recipientCount: recipients.length,
    relevantBillCount,
    recipientVotes: recipients,
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
    confidence: Math.min(confidence, 0.5),
    dataAsOf: new Date().toISOString(),
    methodology:
      'PAC recipients identified via FEC disbursement data. ' +
      'Relevant votes determined by bill industry classification (AI summary or policy-area-map fallback). ' +
      'Yea rates compared to same-party baselines on the same roll calls.',
    disclaimer: DISCLAIMER,
    lastAnalyzedAt: new Date().toISOString(),
    source: 'statistical-fallback',
  };

  const cacheKey = `insight:pac_votes:${committeeId}`;
  await cacheInsight(cacheKey, insight);

  return insight;
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
