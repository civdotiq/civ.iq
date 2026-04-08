/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Temporal Proximity Analyzer
 *
 * Given a graph neighborhood, detects temporal patterns:
 * - Contribution → Vote (90 day window)
 * - Lobbying → Bill (180 day window)
 * - Committee → Contract (365 day window)
 *
 * Each pattern scored by: time proximity, dollar amount, independent instance count.
 * Output: TemporalProximityInsight with confidence, methodology, disclaimer.
 * NEVER claims causation — uses "pattern", "correlation", "association".
 */

import logger from '@/lib/logging/simple-logger';
import { confidenceScore } from '@/lib/intelligence/statistics/civic-stats';
import {
  freshestDate,
  generateInsightNarrative,
  classifySignal,
  SourceCollector,
} from '@/lib/intelligence/analyzers/shared';
import { trackInsightRun } from '@/lib/analytics/insight-tracker';
import type { InsightBase } from '@/lib/intelligence/types';
import type { GraphNeighborhood, GraphEdge } from '@/types/graph';

// ── Types ───────────────────────────────────────────────────────────

export interface TemporalPattern {
  type: 'contribution_vote' | 'lobbying_bill' | 'committee_contract';
  description: string;
  edgePairs: Array<{
    cause: { edgeId: string; label: string; date: string };
    effect: { edgeId: string; label: string; date: string };
    daysBetween: number;
    amountInvolved?: number;
  }>;
  instanceCount: number;
  avgDaysBetween: number;
  proximityScore: number;
  significance: 'low' | 'medium' | 'high';
}

export interface TemporalProximityInsight extends InsightBase {
  bioguideId: string;
  patterns: TemporalPattern[];
  totalPatternsDetected: number;
  narrative: string;
}

// ── Config ──────────────────────────────────────────────────────────

const CONTRIBUTION_VOTE_WINDOW_DAYS = 90;
const LOBBYING_BILL_WINDOW_DAYS = 180;
const MIN_INSTANCES = 2;

const DISCLAIMER =
  'Temporal proximity does not imply causation. These patterns reflect timing correlations ' +
  'in publicly available data. Lobbying and campaign contributions are legal activities. ' +
  'These patterns do not indicate wrongdoing or improper behavior.';

// ── Analyzer ────────────────────────────────────────────────────────

export async function analyzeTemporalProximity(
  neighborhood: GraphNeighborhood,
  bioguideId: string
): Promise<TemporalProximityInsight | null> {
  const _trackStart = Date.now();
  const now = new Date().toISOString();
  const edgeDates = neighborhood.edges.map(e => e.temporal?.date).filter((d): d is string => !!d);

  // No temporal data at all — cannot produce an honest dataAsOf timestamp
  if (edgeDates.length === 0) {
    logger.info('[TemporalProximity] No edges with dates, skipping', { bioguideId });
    return null;
  }

  const patterns: TemporalPattern[] = [];

  // Pattern 1: Contribution → Vote
  const donationEdges = neighborhood.edges.filter(e => e.type === 'donated_to' && e.temporal?.date);
  const voteEdges = neighborhood.edges.filter(e => e.type === 'voted_on' && e.temporal?.date);

  const contribVotePattern = detectProximity(
    donationEdges,
    voteEdges,
    CONTRIBUTION_VOTE_WINDOW_DAYS,
    'contribution_vote',
    'Contribution preceded vote'
  );
  if (contribVotePattern) patterns.push(contribVotePattern);

  // Pattern 2: Lobbying → Vote (using lobbied edges if temporal)
  const lobbyingEdges = neighborhood.edges.filter(
    e => (e.type === 'lobbied' || e.type === 'lobbying_matches') && e.temporal?.date
  );

  const lobbyingBillPattern = detectProximity(
    lobbyingEdges,
    voteEdges,
    LOBBYING_BILL_WINDOW_DAYS,
    'lobbying_bill',
    'Lobbying activity preceded related vote'
  );
  if (lobbyingBillPattern) patterns.push(lobbyingBillPattern);

  const totalPatternsDetected = patterns.reduce((sum, p) => sum + p.instanceCount, 0);

  const confidence = confidenceScore({
    sampleSize: totalPatternsDetected,
    minimumSampleSize: MIN_INSTANCES,
    dataCompleteness: donationEdges.length > 0 && voteEdges.length > 0 ? 0.8 : 0.3,
    peerCount: 0,
  });

  const { narrative, source } = await generateNarrative(patterns);

  trackInsightRun({
    analyzer: 'temporal-proximity',
    outcome: 'success',
    confidence,
    narrativeSource: source,
    latencyMs: Date.now() - _trackStart,
    cacheHit: false,
  });

  const sc = new SourceCollector();
  if (donationEdges.length > 0) sc.add('FEC contributions', 'Recent', donationEdges.length);
  if (voteEdges.length > 0) sc.add('Congress.gov roll calls', '119th Congress', voteEdges.length);
  if (lobbyingEdges.length > 0)
    sc.add('Senate LDA filings', '119th Congress', lobbyingEdges.length);

  return {
    bioguideId,
    patterns,
    totalPatternsDetected,
    narrative,
    confidence,
    confidenceMethod: 'computed',
    dataAsOf: freshestDate(...edgeDates)!,
    methodology:
      'Temporal proximity analysis: edges with dates are compared within configurable windows. ' +
      'Proximity score = 1 - (daysBetween / windowDays). Significance based on instance count and proximity.',
    disclaimer: DISCLAIMER,
    signal: classifySignal({
      confidence,
      hasAnomaly: patterns.some(p => p.significance === 'high'),
    }),
    sources: sc.toSources(),
    lastAnalyzedAt: now,
    source,
  };
}

function detectProximity(
  causeEdges: GraphEdge[],
  effectEdges: GraphEdge[],
  windowDays: number,
  patternType: TemporalPattern['type'],
  description: string
): TemporalPattern | null {
  const pairs: TemporalPattern['edgePairs'] = [];

  for (const cause of causeEdges) {
    const causeDateStr = cause.temporal?.date ?? '';
    if (!causeDateStr) continue;
    const causeDate = new Date(causeDateStr);

    for (const effect of effectEdges) {
      const effectDateStr = effect.temporal?.date ?? '';
      if (!effectDateStr) continue;
      const effectDate = new Date(effectDateStr);
      const diffMs = effectDate.getTime() - causeDate.getTime();
      const daysBetween = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Effect must come after cause, within window
      if (daysBetween > 0 && daysBetween <= windowDays) {
        const amount =
          (cause.properties['amount'] as number | undefined) ??
          (cause.properties['spending'] as number | undefined);

        pairs.push({
          cause: {
            edgeId: cause.id,
            label: cause.label,
            date: causeDateStr,
          },
          effect: {
            edgeId: effect.id,
            label: effect.label,
            date: effectDateStr,
          },
          daysBetween,
          amountInvolved: amount,
        });
      }
    }
  }

  if (pairs.length < MIN_INSTANCES) return null;

  const avgDays = pairs.reduce((sum, p) => sum + p.daysBetween, 0) / pairs.length;
  const proximityScore = 1 - avgDays / windowDays;

  const significance: TemporalPattern['significance'] =
    pairs.length >= 5 && proximityScore > 0.6
      ? 'high'
      : pairs.length >= 3 || proximityScore > 0.4
        ? 'medium'
        : 'low';

  return {
    type: patternType,
    description,
    edgePairs: pairs,
    instanceCount: pairs.length,
    avgDaysBetween: Math.round(avgDays),
    proximityScore,
    significance,
  };
}

function buildStatisticalFallback(patterns: TemporalPattern[]): string {
  if (patterns.length === 0) {
    return "No notable timing patterns were found in this legislator's public records.";
  }

  const sentences: string[] = [];

  for (const pattern of patterns) {
    const typeLabel =
      pattern.type === 'contribution_vote'
        ? 'contributions were made within the same period as votes on related bills'
        : pattern.type === 'lobbying_bill'
          ? 'lobbying filings appeared within the same period as votes on related bills'
          : 'committee activity appeared within the same period as related contracts';

    sentences.push(
      `Public records show ${pattern.instanceCount} cases where ${typeLabel}, ` +
        `with an average gap of ${pattern.avgDaysBetween} days.`
    );

    // Find the largest dollar amount across edge pairs
    const amounts = pattern.edgePairs
      .map(p => p.amountInvolved)
      .filter((a): a is number => a !== undefined && a > 0);

    if (amounts.length > 0) {
      const largest = Math.max(...amounts);
      const pairWithLargest = pattern.edgePairs.find(p => p.amountInvolved === largest);
      if (pairWithLargest) {
        const formatted = largest.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        });
        sentences.push(
          `The largest amount was ${formatted}, recorded ${pairWithLargest.daysBetween} days before a related vote.`
        );
      }
    }
  }

  sentences.push(
    'These timing patterns are correlations in public data and do not indicate causation or wrongdoing.'
  );

  return sentences.join(' ');
}

async function generateNarrative(
  patterns: TemporalPattern[]
): Promise<{ narrative: string; source: 'ai-generated' | 'statistical-fallback' }> {
  const statisticalFallback = buildStatisticalFallback(patterns);

  if (patterns.length === 0) {
    return { narrative: statisticalFallback, source: 'statistical-fallback' };
  }

  // Build AI prompt from pattern data
  const patternDescriptions = patterns
    .map(p => {
      const typeLabel =
        p.type === 'contribution_vote'
          ? 'campaign contributions and legislative votes'
          : p.type === 'lobbying_bill'
            ? 'lobbying filings and legislative votes'
            : 'committee activity and government contracts';

      const amounts = p.edgePairs
        .map(pair => pair.amountInvolved)
        .filter((a): a is number => a !== undefined && a > 0);

      const amountInfo =
        amounts.length > 0
          ? ` Dollar amounts involved range from $${Math.min(...amounts).toLocaleString()} to $${Math.max(...amounts).toLocaleString()}.`
          : '';

      return `- ${p.instanceCount} timing patterns between ${typeLabel}, average gap ${p.avgDaysBetween} days, significance: ${p.significance}.${amountInfo}`;
    })
    .join('\n');

  const systemContext =
    'You are a civic data analyst writing about timing patterns in public records. ';

  const userPrompt =
    'Write 2-3 sentences in plain language at a grade 8 reading level describing these timing patterns.\n' +
    'Use words like "pattern", "correlation", or "association". ' +
    'NEVER use "caused", "influenced", or "resulted in".\n\n' +
    `Patterns found:\n${patternDescriptions}`;

  try {
    return await generateInsightNarrative(
      systemContext,
      userPrompt,
      statisticalFallback,
      '[TemporalProximity]'
    );
  } catch (error) {
    logger.warn('[TemporalProximity] Narrative generation failed, using fallback', {
      error: (error as Error).message,
    });
    return { narrative: statisticalFallback, source: 'statistical-fallback' };
  }
}
