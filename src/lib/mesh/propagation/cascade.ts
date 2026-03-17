/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Funding Cascade Simulation
 *
 * "If Sector X funding changes by Y%, which representatives'
 * votes are most likely to shift?"
 *
 * Method:
 * 1. Find all reps with significant exposure to target sector
 * 2. Perturb their sector funding vector
 * 3. Run perturbed vectors through vote predictor
 * 4. Compare to original predictions
 * 5. Rank by sensitivity (largest prediction shift)
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { analyzeVoteFinance } from '@/lib/intelligence/analyzers/vote-finance-analyzer';
import { predictVote, buildFeatureVector } from '@/lib/intelligence/ml/vote-predictor';
import { withTimeout } from '@/lib/intelligence/analyzers/shared';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import type { IndustrySector } from '@/lib/fec/industry-taxonomy';
import type { IndustryCorrelation } from '@/lib/intelligence/types';

const CACHE_TTL = 21600; // 6 hours
const MIN_SECTOR_EXPOSURE = 0.05; // 5% of total donations
const DISCLAIMER =
  'This analysis models statistical sensitivity between campaign funding patterns and voting behavior. ' +
  'It does not establish causation. Representatives may vote based on ideology, constituency preferences, ' +
  'party leadership, or other factors not captured by funding data.';

// ── Types ────────────────────────────────────────────────────────────

export interface CascadeQuery {
  sector: IndustrySector;
  changePercent: number;
  committeeFilter?: string[];
  billFilter?: string[];
}

export interface CascadeRepEffect {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  currentFunding: number;
  simulatedFunding: number;
  averageShift: number;
  flippedVotes: number;
  sectorExposure: number;
}

export interface CascadeResult {
  sector: IndustrySector;
  changePercent: number;
  affectedReps: CascadeRepEffect[];
  totalFlips: number;
  repsAnalyzed: number;
  confidence: number;
  methodology: string;
  disclaimer: string;
}

// ── Public API ───────────────────────────────────────────────────────

export async function simulateCascade(query: CascadeQuery): Promise<CascadeResult | null> {
  const { sector, changePercent } = query;
  const cacheKey = `mesh:cascade:${sector}:${changePercent}`;
  const cache = getRedisCache();

  const cached = await cache.get<CascadeResult>(cacheKey).catch(() => null);
  if (cached) return cached;

  logger.info('[Cascade] Simulating', { sector, changePercent });

  const allReps = await getAllEnhancedRepresentatives();
  const affectedReps: CascadeRepEffect[] = [];

  // Process all reps with significant sector exposure
  for (const rep of allReps) {
    const vfInsight = await withTimeout(
      analyzeVoteFinance(rep.bioguideId),
      15_000,
      `Cascade:VF:${rep.bioguideId}`
    ).catch(() => null);

    if (!vfInsight?.correlations) continue;

    const sectorCorr = vfInsight.correlations.find(c => c.sector === sector);
    if (!sectorCorr) continue;

    // Check minimum sector exposure
    const totalDonations = vfInsight.correlations.reduce((s, c) => s + c.donationAmount, 0);
    if (totalDonations === 0) continue;
    const sectorShare = sectorCorr.donationAmount / totalDonations;
    if (sectorShare < MIN_SECTOR_EXPOSURE) continue;

    // Build original and perturbed donor profiles
    const donorProfile = buildDonorProfile(vfInsight.correlations, totalDonations);
    const perturbedProfile = perturbSectorFunding(donorProfile, sector, changePercent);

    // Run predictions on sector-relevant bills
    const effect = await simulateRepEffect(
      rep.bioguideId,
      rep.name,
      rep.party,
      rep.state,
      rep.chamber as 'House' | 'Senate',
      rep.yearsInOffice ?? 0,
      donorProfile,
      perturbedProfile,
      sectorCorr.donationAmount,
      sectorCorr.donationAmount * (1 + changePercent / 100),
      sector
    );

    if (effect) {
      affectedReps.push(effect);
    }
  }

  // Sort by sensitivity
  affectedReps.sort((a, b) => Math.abs(b.averageShift) - Math.abs(a.averageShift));

  const totalFlips = affectedReps.reduce((sum, r) => sum + r.flippedVotes, 0);

  const result: CascadeResult = {
    sector,
    changePercent,
    affectedReps: affectedReps.slice(0, 50),
    totalFlips,
    repsAnalyzed: allReps.length,
    confidence: affectedReps.length > 0 ? Math.min(affectedReps.length / 20, 0.85) : 0,
    methodology:
      'Perturbs sector funding by the specified percentage, renormalizes remaining sectors, ' +
      'and compares vote predictions before/after perturbation for all exposed representatives.',
    disclaimer: DISCLAIMER,
  };

  await cache.set(cacheKey, result, CACHE_TTL).catch(() => {});
  return result;
}

// ── Helpers ──────────────────────────────────────────────────────────

function buildDonorProfile(
  correlations: IndustryCorrelation[],
  totalDonations: number
): Record<string, number> {
  const profile: Record<string, number> = {};
  for (const corr of correlations) {
    profile[corr.sector] = totalDonations > 0 ? corr.donationAmount / totalDonations : 0;
  }
  return profile;
}

/**
 * Perturb a sector's funding and renormalize.
 */
export function perturbSectorFunding(
  profile: Record<string, number>,
  sector: IndustrySector,
  changePercent: number
): Record<string, number> {
  const perturbed = { ...profile };
  const currentValue = perturbed[sector] ?? 0;
  const newValue = Math.max(0, currentValue * (1 + changePercent / 100));
  perturbed[sector] = newValue;

  // Renormalize
  const total = Object.values(perturbed).reduce((sum, v) => sum + v, 0);
  if (total > 0) {
    for (const key of Object.keys(perturbed)) {
      perturbed[key] = perturbed[key]! / total;
    }
  }

  return perturbed;
}

async function simulateRepEffect(
  bioguideId: string,
  name: string,
  party: string,
  state: string,
  chamber: 'House' | 'Senate',
  yearsInOffice: number,
  originalProfile: Record<string, number>,
  perturbedProfile: Record<string, number>,
  currentFunding: number,
  simulatedFunding: number,
  sector: IndustrySector
): Promise<CascadeRepEffect | null> {
  // Use the sector itself as the bill context
  const billSectors = [sector];

  const originalFV = buildFeatureVector(
    originalProfile,
    party as 'D' | 'R' | 'I',
    chamber,
    yearsInOffice,
    billSectors,
    0,
    false
  );

  const perturbedFV = buildFeatureVector(
    perturbedProfile,
    party as 'D' | 'R' | 'I',
    chamber,
    yearsInOffice,
    billSectors,
    0,
    false
  );

  const [originalPred, perturbedPred] = await Promise.all([
    predictVote(originalFV),
    predictVote(perturbedFV),
  ]);

  if (!originalPred || !perturbedPred) return null;

  const shift = perturbedPred.yeaProbability - originalPred.yeaProbability;
  const flipped =
    (originalPred.predictedVote === 'yea' && perturbedPred.predictedVote === 'nay') ||
    (originalPred.predictedVote === 'nay' && perturbedPred.predictedVote === 'yea');

  return {
    bioguideId,
    name,
    party,
    state,
    currentFunding,
    simulatedFunding,
    averageShift: shift,
    flippedVotes: flipped ? 1 : 0,
    sectorExposure: currentFunding,
  };
}
