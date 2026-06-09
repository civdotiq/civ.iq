/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Vote Prediction Analyzer
 *
 * Uses a trained ML model to predict how a legislator would vote based on
 * their donor profile, then computes an "independence score" based on how
 * often they deviate from the prediction.
 *
 * Flow: check cache → fetch data → run predictions → compute independence → AI narrative → cache
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { getFECIdFromBioguide } from '@/lib/data/bioguide-fec-mapping';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { aggregateByIndustrySector, IndustrySector } from '@/lib/fec/industry-taxonomy';
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import { confidenceScore, peerComparison, MIN_PEERS } from '../statistics/civic-stats';
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
  createPhaseTimer,
  SENATE_UPSTREAM_BLOCKED_REASON,
} from './shared';
import {
  predictVote,
  buildFeatureVector,
  getModelMetadata,
  FEATURE_HUMAN_LABELS,
  type ShapFactor,
} from '../ml/vote-predictor';
import type { VotePredictionInsight, PeerComparison as PeerComparisonType } from '../types';

/**
 * Outcome shape that carries a human-readable `unavailableReason` when the
 * analyzer returns null. Used by the money-report orchestrator (MR5) to
 * surface honest per-metric states in the UI.
 */
export interface VotePredictionOutcome {
  insight: VotePredictionInsight | null;
  unavailableReason?: string;
}

/** Redis cache TTL: 7 days */
const CACHE_TTL = 7 * 24 * 60 * 60;

/** Max votes to fetch for analysis */
const MAX_VOTES = 200;

/**
 * Concurrency cap for bill-sector classification. Matches the pool size used
 * by vote-finance-analyzer; the zero-shot fallback classifier is CPU-bound on
 * the serverless runtime, so unbounded parallelism would thrash it.
 */
const CLASSIFY_CONCURRENCY = 8;

/** Minimum confident predictions needed for meaningful independence score */
const MIN_CONFIDENT_PREDICTIONS = 20;

/** Standard disclaimer */
const DISCLAIMER =
  'This analysis uses a machine learning model to predict votes based on ' +
  'publicly available campaign finance data. The model accuracy is disclosed. ' +
  'Deviation from predicted votes does not imply any judgment — legislators ' +
  'may have many valid reasons for their voting patterns. Correlation with ' +
  'donor patterns does not indicate causation or improper behavior.';

// ── Main Analyzer ────────────────────────────────────────────────────

/**
 * Analyze vote prediction independence for a legislator.
 * Returns null if model is not available or insufficient data.
 */
export async function analyzeVotePrediction(
  bioguideId: string
): Promise<VotePredictionInsight | null> {
  const { insight } = await analyzeVotePredictionWithReason(bioguideId);
  return insight;
}

/**
 * Richer entry point that surfaces an `unavailableReason` when the analyzer
 * returns null. Used by the money-report orchestrator so the UI can render
 * "insufficient-data" with a specific explanation instead of a silent dash.
 */
export async function analyzeVotePredictionWithReason(
  bioguideId: string
): Promise<VotePredictionOutcome> {
  // Check if model is available
  const metadata = getModelMetadata();
  if (!metadata) {
    const unavailableReason = 'ONNX model unavailable in this deployment';
    logger.info('[VotePrediction] Model not available — skipping', { unavailableReason });
    return { insight: null, unavailableReason };
  }

  const cacheKey = `insight:vote_prediction:${bioguideId}`;

  // 1. Check cache
  try {
    const cached = await getRedisCache().get<VotePredictionInsight>(cacheKey);
    if (cached) {
      logger.info('[VotePrediction] Cache hit', { bioguideId });
      trackInsightCacheHit('vote-prediction');
      return { insight: cached };
    }
  } catch {
    // Cache miss — continue
  }

  // 2-6. Compute under timeout. Swallow throws (timeout, upstream API failure,
  // ONNX runtime crash) into an unavailable outcome so the route returns
  // "unavailable" rather than 500. withInsightTracking records the outcome
  // either way. `reason` is captured via closure so the wrapper can surface
  // the analyzer's per-reason detail without leaking it through tracking.
  let reason: string | undefined;
  try {
    const insight = await withInsightTracking('vote-prediction', () =>
      withTimeout(
        (async () => {
          const outcome = await computeAndCache(bioguideId, cacheKey, metadata);
          reason = outcome.unavailableReason;
          return outcome.insight;
        })(),
        ANALYZER_TIMEOUT_MS,
        'VotePrediction'
      )
    );
    return insight ? { insight } : { insight: null, unavailableReason: reason };
  } catch (error) {
    logger.warn('[VotePrediction] Analyzer failed — returning null', {
      bioguideId,
      error: (error as Error).message,
    });
    return { insight: null, unavailableReason: 'Vote prediction analyzer error' };
  }
}

async function computeAndCache(
  bioguideId: string,
  cacheKey: string,
  metadata: NonNullable<ReturnType<typeof getModelMetadata>>
): Promise<VotePredictionOutcome> {
  const timer = createPhaseTimer(`[VotePrediction] ${bioguideId}`);

  // 2. Fetch data
  const fetched = await fetchData(bioguideId, timer);
  if ('unavailableReason' in fetched) {
    return { insight: null, unavailableReason: fetched.unavailableReason };
  }
  const data = fetched;

  // 3. Run predictions for each vote
  const predictions = await computePredictions(data, metadata);
  timer.mark('computePredictions', {
    confidentPredictions: predictions.confidentPredictions,
    deviations: predictions.deviations,
    totalVotes: data.totalVotes,
  });
  if (predictions.confidentPredictions < MIN_CONFIDENT_PREDICTIONS) {
    const unavailableReason = `Model requires ${MIN_CONFIDENT_PREDICTIONS} confident predictions; only ${predictions.confidentPredictions} available`;
    logger.info('[VotePrediction] Insufficient confident predictions', {
      bioguideId,
      confidentPredictions: predictions.confidentPredictions,
      minimum: MIN_CONFIDENT_PREDICTIONS,
      unavailableReason,
    });
    return { insight: null, unavailableReason };
  }

  // 4. Peer comparison
  const peer = await computePeerComparison(bioguideId, predictions.independenceScore, data.chamber);
  timer.mark('computePeerComparison', { peerCount: peer?.peerCount ?? 0 });

  // 5. Compute confidence
  const conf = confidenceScore({
    sampleSize: predictions.confidentPredictions,
    minimumSampleSize: MIN_CONFIDENT_PREDICTIONS,
    dataCompleteness: data.votesWithSectors / Math.max(data.totalVotes, 1),
    peerCount: peer?.peerCount ?? 0,
  });

  // 6. Generate narrative
  const { narrative, source } = await generateNarrative(data, predictions, peer, metadata);
  timer.mark('generateNarrative', { narrativeSource: source });

  const sc = new SourceCollector();
  sc.add('Congress.gov roll calls', '119th Congress', data.votes.length);
  sc.add('FEC individual filings', `${getCurrentElectionCycle()} cycle`);
  sc.add('XGBoost vote model', `Accuracy: ${(metadata.testAccuracy * 100).toFixed(0)}%`);

  const insight: VotePredictionInsight = {
    bioguideId,
    independenceScore: {
      score: predictions.independenceScore,
      confidentPredictions: predictions.confidentPredictions,
      deviations: predictions.deviations,
      peerPercentile: peer?.percentileRank ?? 50,
    },
    modelAccuracy: metadata.testAccuracy,
    peerComparison: peer ?? {
      value: predictions.independenceScore,
      peerAverage: predictions.independenceScore,
      peerCount: 0,
      peerGroupLabel: 'Insufficient peer data',
      percentileRank: 50,
    },
    notableDeviations: predictions.notableDeviations.slice(0, 5),
    topPredictiveFactors: metadata.topFeatures.slice(0, 3).map(f => ({
      feature: f.feature,
      humanLabel: getFeatureLabel(f.feature),
      importance: f.importance,
    })),
    shapFactors:
      predictions.aggregatedShapFactors.length > 0 ? predictions.aggregatedShapFactors : undefined,
    narrative,
    confidence: source === 'statistical-fallback' ? Math.min(conf, 0.5) : conf,
    confidenceMethod: 'computed',
    dataAsOf: freshestDate(...data.votes.map(v => v.date))!,
    methodology:
      'XGBoost model trained on real vote records and campaign finance data. ' +
      'Independence score = fraction of confident predictions where the legislator ' +
      "voted against the model's donor-predicted position. " +
      `Model test accuracy: ${(metadata.testAccuracy * 100).toFixed(0)}%.`,
    disclaimer: DISCLAIMER,
    signal: classifySignal({
      value: predictions.independenceScore,
      peerAverage: peer?.peerAverage,
      percentileRank: peer?.percentileRank,
      confidence: source === 'statistical-fallback' ? Math.min(conf, 0.5) : conf,
    }),
    sources: sc.toSources(),
    lastAnalyzedAt: new Date().toISOString(),
    source,
  };

  // Cache
  try {
    await getRedisCache().set(cacheKey, insight, CACHE_TTL);
    // Also cache independence score for peer comparison
    await getRedisCache().set(
      `independence-score:${bioguideId}`,
      predictions.independenceScore,
      CACHE_TTL
    );
  } catch {
    // Non-fatal
  }
  timer.mark('cacheInsight');

  return { insight };
}

// ── Data Fetching ────────────────────────────────────────────────────

interface FetchedData {
  name: string;
  party: 'D' | 'R' | 'I';
  state: string;
  chamber: 'House' | 'Senate';
  yearsInOffice: number;
  donorProfile: Record<string, number>;
  totalDonations: number;
  votes: Array<{
    voteId: string;
    billId: string;
    billTitle: string;
    position: 'yea' | 'nay';
    date: string;
    billSectors: IndustrySector[];
    cosponsorCount: number;
    sponsorSameParty: boolean;
  }>;
  totalVotes: number;
  votesWithSectors: number;
}

type FetchResult = FetchedData | { unavailableReason: string };

type PhaseTimer = ReturnType<typeof createPhaseTimer>;

async function fetchData(bioguideId: string, timer?: PhaseTimer): Promise<FetchResult> {
  const rep = await getEnhancedRepresentative(bioguideId);
  if (!rep) {
    const unavailableReason = 'Representative not found in current dataset';
    logger.info('[VotePrediction] Representative not found', { bioguideId, unavailableReason });
    return { unavailableReason };
  }
  timer?.mark('fetchRep');

  // Senate roll-call XML is blocked by Akamai for Vercel cloud IPs (MR10).
  // Bail out before predictions so Senate reps return `unavailable` cleanly
  // instead of timing out after attempting hundreds of XML fetches.
  if (rep.chamber === 'Senate') {
    logger.info('[VotePrediction] Senate blocked by upstream CDN', { bioguideId });
    return { unavailableReason: SENATE_UPSTREAM_BLOCKED_REASON };
  }

  const fecId = getFECIdFromBioguide(bioguideId);
  if (!fecId) {
    const unavailableReason = 'No FEC candidate mapping for this representative';
    logger.info('[VotePrediction] No FEC mapping', { bioguideId, unavailableReason });
    return { unavailableReason };
  }

  const cycle = getCurrentElectionCycle();

  const votesStart = performance.now();
  const contribStart = performance.now();
  const [rawVotes, contributions] = await Promise.all([
    fetchVotes(bioguideId, rep.chamber).then(v => {
      timer?.record('fetchVotes', performance.now() - votesStart, { voteCount: v.length });
      return v;
    }),
    fecApiService
      .getSampleContributions(fecId, cycle, 250)
      .catch(() => [])
      .then(c => {
        timer?.record('fetchContributions', performance.now() - contribStart, {
          contributionCount: c.length,
        });
        return c;
      }),
  ]);
  timer?.mark('fetchUpstream', { votes: rawVotes.length, contributions: contributions.length });

  if (!rawVotes.length || !contributions.length) {
    const unavailableReason = !rawVotes.length
      ? 'No voting record available for the 119th Congress'
      : 'No FEC contribution data for this cycle';
    logger.info('[VotePrediction] Insufficient data', {
      bioguideId,
      votes: rawVotes.length,
      contributions: contributions.length,
      unavailableReason,
    });
    return { unavailableReason };
  }

  // Build donor profile
  const sectorAggregation = aggregateByIndustrySector(contributions);
  let totalDonations = 0;
  const donorProfile: Record<string, number> = {};
  for (const sector of Object.values(IndustrySector)) {
    donorProfile[sector] = 0;
  }
  for (const entry of sectorAggregation) {
    totalDonations += entry.totalAmount;
  }
  for (const entry of sectorAggregation) {
    donorProfile[entry.sector] = totalDonations > 0 ? entry.totalAmount / totalDonations : 0;
  }

  // Classify votes. Bill-sector classification dominates this phase and was
  // previously awaited one vote at a time (up to ~400 serial calls). Since
  // getBillSectors caches by billId alone, we classify each *unique* bill once
  // in a bounded pool, then build the per-vote records from the resulting map —
  // identical output, minus the redundant serial round-trips that drove the
  // 55s timeouts.
  const party = normalizeParty(rep.party);
  const classifyStart = performance.now();

  // First pass (sync): keep only Yea/Nay votes, in order, and collect the
  // distinct bills that need classification.
  const normalizedVotes: Array<{
    voteId: string;
    billId: string;
    billTitle: string;
    position: 'yea' | 'nay';
    date: string;
  }> = [];
  const billInputs = new Map<string, { title: string; policyArea?: string; subjects?: string[] }>();

  for (const v of rawVotes) {
    const position = v.position.toLowerCase();
    if (position !== 'yea' && position !== 'yes' && position !== 'nay' && position !== 'no') {
      continue;
    }

    const normalizedVote: 'yea' | 'nay' = position === 'yea' || position === 'yes' ? 'yea' : 'nay';
    const billId = v.bill ? `${v.bill.type}${v.bill.number}-${v.bill.congress}` : v.voteId;
    const billTitle = v.bill?.title ?? v.question;

    normalizedVotes.push({
      voteId: v.voteId,
      billId,
      billTitle,
      position: normalizedVote,
      date: v.date,
    });
    if (!billInputs.has(billId)) {
      billInputs.set(billId, {
        title: billTitle,
        policyArea: v.bill?.policyArea,
        subjects: v.bill?.subjects,
      });
    }
  }

  // Classify each distinct bill once, in parallel (fail-soft per bill).
  const classified = await mapWithConcurrency(
    [...billInputs.entries()],
    CLASSIFY_CONCURRENCY,
    async ([billId, input]): Promise<[string, IndustrySector[]]> => {
      try {
        const sectors = await getBillSectors(billId, input.title, {
          policyArea: input.policyArea,
          subjects: input.subjects,
        });
        return [billId, sectors];
      } catch {
        return [billId, []];
      }
    }
  );
  const sectorMap = new Map<string, IndustrySector[]>(classified);

  // Second pass (sync): build per-vote records in original order.
  const votes: FetchedData['votes'] = [];
  let votesWithSectors = 0;
  for (const nv of normalizedVotes) {
    const billSectors = sectorMap.get(nv.billId) ?? [];
    if (billSectors.length > 0) votesWithSectors++;
    votes.push({
      voteId: nv.voteId,
      billId: nv.billId,
      billTitle: nv.billTitle,
      position: nv.position,
      date: nv.date,
      billSectors,
      // Sponsor metadata isn't fetched at inference (one Congress.gov call
      // per bill). Mirror the training pipeline's missing-data defaults
      // (collect-training-data.ts: sponsorParty falls back to the member's
      // own party => sponsor_same_party = 1, cosponsorCount = 0) so the
      // model sees the feature distribution it was trained on.
      cosponsorCount: 0,
      sponsorSameParty: true,
    });
  }

  timer?.mark('classifyVotesParallel', {
    classifiedCount: votes.length,
    votesWithSectors,
    rawCount: rawVotes.length,
    uniqueBills: billInputs.size,
    avgMsPerVote:
      votes.length > 0 ? Math.round((performance.now() - classifyStart) / votes.length) : 0,
  });

  return {
    name: rep.name,
    party,
    state: rep.state,
    chamber: rep.chamber,
    yearsInOffice: rep.yearsInOffice ?? 0,
    donorProfile,
    totalDonations,
    votes,
    totalVotes: votes.length,
    votesWithSectors,
  };
}

async function fetchVotes(bioguideId: string, chamber: 'House' | 'Senate') {
  try {
    const fetchSession = async (session: 1 | 2) => {
      return chamber === 'House'
        ? batchVotingService.getHouseMemberVotes(bioguideId, 119, session, MAX_VOTES)
        : batchVotingService.getSenateMemberVotes(bioguideId, 119, session, MAX_VOTES);
    };
    const [s1, s2] = await Promise.all([fetchSession(1), fetchSession(2)]);
    return [...s1, ...s2].filter(v => v.bill && v.position);
  } catch {
    return [];
  }
}

// ── Predictions ──────────────────────────────────────────────────────

interface PredictionResults {
  independenceScore: number;
  confidentPredictions: number;
  deviations: number;
  notableDeviations: VotePredictionInsight['notableDeviations'];
  /** Aggregated SHAP factors across all confident predictions. */
  aggregatedShapFactors: ShapFactor[];
}

async function computePredictions(
  data: FetchedData,
  metadata: NonNullable<ReturnType<typeof getModelMetadata>>
): Promise<PredictionResults> {
  let confidentPredictions = 0;
  let deviations = 0;
  const notableDeviations: VotePredictionInsight['notableDeviations'] = [];
  // Accumulate SHAP importance per feature across predictions
  const shapAccum = new Map<
    string,
    {
      total: number;
      featureValueTotal: number;
      count: number;
      humanLabel: string;
      feature: string;
      yeaVotes: number;
    }
  >();

  for (const vote of data.votes) {
    if (vote.billSectors.length === 0) continue;

    const fv = buildFeatureVector(
      data.donorProfile,
      data.party,
      data.chamber,
      data.yearsInOffice,
      vote.billSectors,
      vote.cosponsorCount,
      vote.sponsorSameParty
    );

    const prediction = await predictVote(fv);
    if (!prediction || prediction.predictedVote === 'uncertain') continue;

    confidentPredictions++;

    // Accumulate SHAP factors
    if (prediction.shapFactors) {
      for (const sf of prediction.shapFactors) {
        if (!Number.isFinite(sf.importance) || sf.importance < 0) continue;
        const existing = shapAccum.get(sf.feature);
        if (existing) {
          existing.total += sf.importance;
          existing.featureValueTotal += sf.featureValue;
          existing.count++;
          existing.humanLabel = sf.humanLabel;
          existing.feature = sf.feature;
          existing.yeaVotes += sf.direction === 'toward_yea' ? 1 : 0;
        } else {
          shapAccum.set(sf.feature, {
            total: sf.importance,
            featureValueTotal: sf.featureValue,
            count: 1,
            humanLabel: sf.humanLabel,
            feature: sf.feature,
            yeaVotes: sf.direction === 'toward_yea' ? 1 : 0,
          });
        }
      }
    }

    if (prediction.predictedVote !== vote.position) {
      deviations++;
      notableDeviations.push({
        billId: vote.billId,
        billTitle: vote.billTitle,
        predictedVote: prediction.predictedVote,
        actualVote: vote.position,
        yeaProbability: prediction.yeaProbability,
        billSectors: vote.billSectors,
      });
    }
  }

  // Sort notable deviations by confidence gap (most surprising first)
  notableDeviations.sort(
    (a, b) => Math.abs(b.yeaProbability - 0.5) - Math.abs(a.yeaProbability - 0.5)
  );

  const independenceScore = confidentPredictions > 0 ? deviations / confidentPredictions : 0;

  // Build aggregated SHAP factors sorted by average importance
  const aggregatedShapFactors: ShapFactor[] = Array.from(shapAccum.values())
    .map(entry => {
      const { total, featureValueTotal, count, humanLabel, feature, yeaVotes } = entry;
      const avgImportance = count > 0 ? total / count : 0;
      const avgFeatureValue = count > 0 ? featureValueTotal / count : 0;
      return {
        feature,
        humanLabel,
        importance: avgImportance,
        featureValue: avgFeatureValue,
        direction: (yeaVotes > count / 2 ? 'toward_yea' : 'toward_nay') as ShapFactor['direction'],
      };
    })
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5);

  return {
    independenceScore,
    confidentPredictions,
    deviations,
    notableDeviations,
    aggregatedShapFactors,
  };
}

// ── Peer Comparison ──────────────────────────────────────────────────

async function computePeerComparison(
  bioguideId: string,
  independenceScore: number,
  chamber: 'House' | 'Senate'
): Promise<PeerComparisonType | null> {
  try {
    const redis = getRedisCache();
    // Collect peer independence scores from cache
    const peerKeys = await redis.keys(`independence-score:*`);
    const peerScores: number[] = [];

    for (const key of peerKeys) {
      const id = key.replace('independence-score:', '');
      if (id === bioguideId) continue;
      const score = await redis.get<number>(key);
      if (score !== null && score !== undefined) {
        peerScores.push(score);
      }
    }

    if (peerScores.length < MIN_PEERS) return null;

    return peerComparison(
      independenceScore,
      peerScores,
      `${chamber} peers with vote prediction data`
    );
  } catch {
    return null;
  }
}

// ── Narrative Generation ─────────────────────────────────────────────

async function generateNarrative(
  data: FetchedData,
  predictions: PredictionResults,
  peer: PeerComparisonType | null,
  metadata: NonNullable<ReturnType<typeof getModelMetadata>>
): Promise<{ narrative: string; source: 'ai-generated' | 'statistical-fallback' }> {
  const pctIndependent = (predictions.independenceScore * 100).toFixed(0);
  const peerContext = peer
    ? `This places them at the ${peer.percentileRank.toFixed(0)}th percentile among ${peer.peerGroupLabel}.`
    : '';

  const deviationContext = predictions.notableDeviations
    .slice(0, 3)
    .map(
      d =>
        `- ${d.billTitle}: model predicted ${d.predictedVote} (${(d.yeaProbability * 100).toFixed(0)}% confidence), voted ${d.actualVote}`
    )
    .join('\n');

  const statisticalFallback =
    `${data.name} voted against their donor-predicted position on ` +
    `${predictions.deviations} of ${predictions.confidentPredictions} bills ` +
    `where the model was confident (${pctIndependent}% independence score). ` +
    `${peerContext} Model accuracy: ${(metadata.testAccuracy * 100).toFixed(0)}%.`;

  const systemContext =
    'You analyze how independently a legislator votes relative to their campaign funding patterns. ' +
    'A trained ML model predicts votes based on donor profiles. The independence score measures ' +
    'how often the legislator votes against these predictions. Higher scores suggest greater ' +
    'independence from donor patterns. Never claim causation. ';

  const userPrompt =
    `Legislator: ${data.name} (${data.party}-${data.state}, ${data.chamber})\n` +
    `Independence Score: ${pctIndependent}%\n` +
    `Confident Predictions: ${predictions.confidentPredictions}\n` +
    `Deviations: ${predictions.deviations}\n` +
    `${peerContext}\n\n` +
    `Notable deviations from donor-predicted position:\n${deviationContext}\n\n` +
    `Model accuracy: ${(metadata.testAccuracy * 100).toFixed(0)}%. ` +
    `Write 2-3 sentences summarizing these patterns. Use plain language. Do not claim causation.`;

  return generateInsightNarrative(
    systemContext,
    userPrompt,
    statisticalFallback,
    '[VotePrediction]'
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function normalizeParty(party: string): 'D' | 'R' | 'I' {
  if (party.startsWith('D')) return 'D';
  if (party.startsWith('R')) return 'R';
  return 'I';
}

function getFeatureLabel(feature: string): string {
  // Single source of truth in vote-predictor — keys match the model's
  // featureNames exactly (coverage is unit-tested there).
  return FEATURE_HUMAN_LABELS[feature] ?? feature;
}
