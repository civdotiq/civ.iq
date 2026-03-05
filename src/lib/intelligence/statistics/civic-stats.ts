/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Civic Statistics Utilities
 *
 * Thin wrapper around simple-statistics with civic data defaults.
 * Exports functions, not classes. Enforces minimum sample sizes
 * and provides confidence scoring for civic data analysis.
 *
 * Key design choices:
 * - Spearman rank correlation by default (civic data is rarely normal)
 * - Percentile rank for peer comparison (more intuitive than z-scores)
 * - Conservative confidence scoring (small samples = low confidence)
 */

import {
  mean,
  sampleStandardDeviation,
  sampleCorrelation,
  sampleRankCorrelation,
  quantileRank,
} from 'simple-statistics';

import type { PeerComparison } from '../types';

// ── Minimum Sample Sizes ─────────────────────────────────────────────

/** Minimum votes per sector before computing vote-finance correlation. */
export const MIN_VOTES_PER_SECTOR = 10;

/** Minimum quarters of data for temporal analysis. */
export const MIN_QUARTERS_TEMPORAL = 4;

/** Minimum trades for stock-committee analysis. */
export const MIN_TRADES_STOCK = 3;

/** Minimum peers for meaningful comparison. */
export const MIN_PEERS = 3;

// ── Correlation ──────────────────────────────────────────────────────

export type CorrelationMethod = 'spearman' | 'pearson';

export interface CorrelationResult {
  coefficient: number;
  method: CorrelationMethod;
  sampleSize: number;
  meetsMinimum: boolean;
}

/**
 * Compute correlation between two numeric arrays.
 *
 * Defaults to Spearman rank correlation (robust to non-normal distributions
 * typical in civic data). Falls back to Pearson if specified.
 *
 * Returns null if arrays differ in length, have fewer than MIN_VOTES_PER_SECTOR
 * elements, or contain insufficient variance.
 */
export function correlation(
  x: number[],
  y: number[],
  options?: {
    method?: CorrelationMethod;
    minimumSampleSize?: number;
  }
): CorrelationResult | null {
  const method = options?.method ?? 'spearman';
  const minSize = options?.minimumSampleSize ?? MIN_VOTES_PER_SECTOR;

  if (x.length !== y.length || x.length < minSize) {
    return null;
  }

  // Check for zero variance (all identical values)
  const xStd = sampleStandardDeviation(x);
  const yStd = sampleStandardDeviation(y);
  if (xStd === 0 || yStd === 0) {
    return null;
  }

  try {
    const coefficient =
      method === 'pearson' ? sampleCorrelation(x, y) : sampleRankCorrelation(x, y);

    if (!isFinite(coefficient)) {
      return null;
    }

    return {
      coefficient,
      method,
      sampleSize: x.length,
      meetsMinimum: x.length >= minSize,
    };
  } catch {
    return null;
  }
}

// ── Peer Comparison ──────────────────────────────────────────────────

/**
 * Compare a value against a peer group.
 *
 * Returns null if the peer group has fewer than MIN_PEERS members.
 * Uses percentile rank for intuitive interpretation.
 */
export function peerComparison(
  value: number,
  peerValues: number[],
  peerGroupLabel: string
): PeerComparison | null {
  if (peerValues.length < MIN_PEERS) {
    return null;
  }

  const peerAverage = mean(peerValues);
  const percentile = quantileRank(peerValues, value) * 100;

  return {
    value,
    peerAverage,
    peerCount: peerValues.length,
    peerGroupLabel,
    percentileRank: Math.round(percentile),
  };
}

// ── Confidence Scoring ───────────────────────────────────────────────

/**
 * Compute a confidence score (0-1) for an insight based on data quality signals.
 *
 * Factors:
 * - Sample size relative to minimum threshold
 * - Data completeness (fraction of expected data points present)
 * - Peer group size (more peers = more meaningful comparison)
 *
 * Returns a number between 0 and 1. Below 0.6 the insight should be hidden.
 */
export function confidenceScore(factors: {
  /** Actual sample size. */
  sampleSize: number;
  /** Minimum sample size for this analysis type. */
  minimumSampleSize: number;
  /** Fraction of expected data points that are present (0-1). */
  dataCompleteness: number;
  /** Number of peers in comparison group. */
  peerCount: number;
}): number {
  const { sampleSize, minimumSampleSize, dataCompleteness, peerCount } = factors;

  // Sample size factor: 0 at minimum, maxes out at 3x minimum
  const sampleFactor = Math.min(sampleSize / (minimumSampleSize * 3), 1);

  // Data completeness factor: direct 0-1
  const completenessFactor = Math.max(0, Math.min(1, dataCompleteness));

  // Peer factor: 0 at 0 peers, maxes out at 20 peers
  const peerFactor = Math.min(peerCount / 20, 1);

  // Weighted average: sample size matters most
  const score = sampleFactor * 0.5 + completenessFactor * 0.3 + peerFactor * 0.2;

  // Clamp to 0-1 and round to 2 decimal places
  return Math.round(Math.max(0, Math.min(1, score)) * 100) / 100;
}

// ── Utility ──────────────────────────────────────────────────────────

/**
 * Check if a sample size meets the minimum threshold for a given analysis type.
 */
export function meetsSampleSize(
  actual: number,
  type: 'votes' | 'quarters' | 'trades' | 'peers'
): boolean {
  const minimums: Record<typeof type, number> = {
    votes: MIN_VOTES_PER_SECTOR,
    quarters: MIN_QUARTERS_TEMPORAL,
    trades: MIN_TRADES_STOCK,
    peers: MIN_PEERS,
  };
  return actual >= minimums[type];
}

/**
 * Compute the mean of a numeric array. Re-exported from simple-statistics
 * for convenience so callers don't need a separate import.
 */
export { mean, sampleStandardDeviation };
