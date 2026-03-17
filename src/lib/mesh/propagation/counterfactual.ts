/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Counterfactual Analysis
 *
 * "What would Rep X vote on Bill Y without donations from Sector Z?"
 *
 * Method:
 * 1. Get rep's current sector feature vector (from vote-finance analyzer)
 * 2. Create masked vector: set target sector(s) to 0, renormalize
 * 3. Run both vectors through vote predictor ONNX model
 * 4. Compare P(yea) original vs P(yea) masked
 * 5. Return delta and interpretation
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { analyzeVoteFinance } from '@/lib/intelligence/analyzers/vote-finance-analyzer';
import { predictVote, buildFeatureVector } from '@/lib/intelligence/ml/vote-predictor';
import { withTimeout } from '@/lib/intelligence/analyzers/shared';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import type { IndustrySector } from '@/lib/fec/industry-taxonomy';

const CACHE_TTL = 3600; // 1 hour
const DISCLAIMER =
  'This analysis models statistical sensitivity between campaign funding patterns and voting behavior. ' +
  'It does not establish causation. Representatives may vote based on ideology, constituency preferences, ' +
  'party leadership, or other factors not captured by funding data.';

// ── Types ────────────────────────────────────────────────────────────

export interface CounterfactualQuery {
  bioguideId: string;
  maskSectors: IndustrySector[];
  billId?: string;
}

export interface CounterfactualPrediction {
  sector: IndustrySector;
  sectorLabel: string;
  billsVotedOn: number;
  originalProbability: number;
  maskedProbability: number;
  shift: number;
  flipped: boolean;
}

export interface CounterfactualResult {
  bioguideId: string;
  maskedSectors: IndustrySector[];
  predictions: CounterfactualPrediction[];
  averageShift: number;
  flippedCount: number;
  confidence: number;
  methodology: string;
  disclaimer: string;
}

// ── Public API ───────────────────────────────────────────────────────

export async function runCounterfactual(
  query: CounterfactualQuery
): Promise<CounterfactualResult | null> {
  const { bioguideId, maskSectors } = query;
  const cacheKey = `mesh:counterfactual:${bioguideId}:${maskSectors.sort().join(',')}`;
  const cache = getRedisCache();

  const cached = await cache.get<CounterfactualResult>(cacheKey).catch(() => null);
  if (cached) return cached;

  logger.info('[Counterfactual] Running', { bioguideId, maskSectors });

  // Get vote-finance data for the rep's donor profile
  const vfInsight = await withTimeout(
    analyzeVoteFinance(bioguideId),
    30_000,
    `CF:VF:${bioguideId}`
  );

  if (!vfInsight?.correlations) {
    logger.warn('[Counterfactual] No vote-finance data', { bioguideId });
    return null;
  }

  // Build donor profile from correlations
  const donorProfile: Record<string, number> = {};
  let totalDonations = 0;
  for (const corr of vfInsight.correlations) {
    totalDonations += corr.donationAmount;
  }
  for (const corr of vfInsight.correlations) {
    donorProfile[corr.sector] = totalDonations > 0 ? corr.donationAmount / totalDonations : 0;
  }

  // Build masked donor profile
  const maskedProfile = maskDonorProfile(donorProfile, maskSectors);

  // Get rep info
  const allReps = await getAllEnhancedRepresentatives();
  const rep = allReps.find(r => r.bioguideId === bioguideId);
  if (!rep) return null;

  // Compute per-sector sensitivity by running predictions with/without each masked sector
  const relevantSectors = vfInsight.correlations.filter(
    c => maskSectors.includes(c.sector) && c.billsVotedOn > 0
  );
  if (relevantSectors.length === 0) return null;

  const predictions: CounterfactualPrediction[] = [];
  for (const corr of relevantSectors.slice(0, 10)) {
    const sectorBills = [corr.sector];

    const originalFV = buildFeatureVector(
      donorProfile,
      rep.party as 'D' | 'R' | 'I',
      rep.chamber as 'House' | 'Senate',
      rep.yearsInOffice ?? 0,
      sectorBills,
      0,
      false
    );

    const maskedFV = buildFeatureVector(
      maskedProfile,
      rep.party as 'D' | 'R' | 'I',
      rep.chamber as 'House' | 'Senate',
      rep.yearsInOffice ?? 0,
      sectorBills,
      0,
      false
    );

    const [originalPred, maskedPred] = await Promise.all([
      predictVote(originalFV),
      predictVote(maskedFV),
    ]);

    if (originalPred && maskedPred) {
      const shift = maskedPred.yeaProbability - originalPred.yeaProbability;
      const flipped =
        (originalPred.predictedVote === 'yea' && maskedPred.predictedVote === 'nay') ||
        (originalPred.predictedVote === 'nay' && maskedPred.predictedVote === 'yea');

      predictions.push({
        sector: corr.sector,
        sectorLabel: `${corr.sector} sector (${corr.billsVotedOn} votes analyzed)`,
        billsVotedOn: corr.billsVotedOn,
        originalProbability: originalPred.yeaProbability,
        maskedProbability: maskedPred.yeaProbability,
        shift,
        flipped,
      });
    }
  }

  if (predictions.length === 0) return null;

  const averageShift =
    predictions.reduce((sum, p) => sum + Math.abs(p.shift), 0) / predictions.length;
  const flippedCount = predictions.filter(p => p.flipped).length;

  const result: CounterfactualResult = {
    bioguideId,
    maskedSectors: maskSectors,
    predictions,
    averageShift,
    flippedCount,
    confidence: Math.min(predictions.length / 10, 0.9),
    methodology:
      'Sector-level sensitivity analysis: sets target sector donations to zero in the ' +
      'vote prediction model, renormalizes remaining sectors, and compares P(yea) per sector.',
    disclaimer: DISCLAIMER,
  };

  await cache.set(cacheKey, result, CACHE_TTL).catch(() => {});
  return result;
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Create a masked donor profile: zero out specified sectors, renormalize.
 */
export function maskDonorProfile(
  profile: Record<string, number>,
  maskSectors: IndustrySector[]
): Record<string, number> {
  const masked = { ...profile };
  const maskSet = new Set<string>(maskSectors);

  for (const sector of maskSet) {
    masked[sector] = 0;
  }

  // Renormalize remaining to sum to 1
  const total = Object.values(masked).reduce((sum, v) => sum + v, 0);
  if (total > 0) {
    for (const key of Object.keys(masked)) {
      masked[key] = masked[key]! / total;
    }
  }

  return masked;
}
