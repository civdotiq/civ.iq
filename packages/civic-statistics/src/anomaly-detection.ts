/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Anomaly Detection via Modified Z-Score (MAD-based)
 *
 * Detects which dimensions (e.g., funding sectors) deviate significantly
 * from peer group norms. Uses Median Absolute Deviation instead of
 * standard deviation for robustness to outliers — critical when
 * committee peer groups can have <10 members.
 *
 * The Modified Z-Score formula: 0.6745 * (x - median) / MAD
 * The constant 0.6745 is the 0.75th quantile of the standard normal
 * distribution, making the score comparable to a standard Z-score
 * when the data is normally distributed.
 */

import { median, mean, sampleStandardDeviation } from 'simple-statistics';

import type { AnomalyFlag, AnomalyResult } from './types.js';

/** Default threshold for flagging anomalies. 3.5 = very conservative. */
export const ANOMALY_THRESHOLD = 3.5;

/** Default minimum peers for meaningful comparison. */
const DEFAULT_MIN_PEERS = 3;

/** Constant for Modified Z-Score normalization. */
const MAD_NORMALIZATION = 0.6745;

/**
 * Detect anomalies across multiple dimensions using Modified Z-Score.
 *
 * @param subject - The individual's values per dimension (e.g., sector → amount).
 * @param peers - Peer values per dimension (e.g., sector → amounts from each peer).
 * @param options - Optional threshold and minimum peer count overrides.
 * @returns AnomalyResult with per-dimension flags sorted by severity.
 */
export function detectAnomalies(
  subject: Map<string, number>,
  peers: Map<string, number[]>,
  options?: {
    threshold?: number;
    minimumPeers?: number;
  }
): AnomalyResult {
  const threshold = options?.threshold ?? ANOMALY_THRESHOLD;
  const minPeers = options?.minimumPeers ?? DEFAULT_MIN_PEERS;

  const flags: AnomalyFlag[] = [];
  let meetsMinimumPeers = false;

  for (const [dimension, subjectValue] of subject) {
    const peerValues = peers.get(dimension);

    // Skip dimensions without peer data or below minimum
    if (!peerValues || peerValues.length < minPeers) {
      continue;
    }

    meetsMinimumPeers = true;
    const scoreResult = computeModifiedZScore(subjectValue, peerValues);

    if (scoreResult === null) {
      continue;
    }

    const isAnomaly = Math.abs(scoreResult.score) > threshold;
    const description = buildDescription(
      dimension,
      subjectValue,
      scoreResult.peerMedian,
      scoreResult.score,
      threshold
    );

    flags.push({
      dimension,
      value: subjectValue,
      peerMedian: scoreResult.peerMedian,
      modifiedZScore: scoreResult.score,
      isAnomaly,
      description,
    });
  }

  // Sort by |modifiedZScore| descending
  flags.sort((a, b) => Math.abs(b.modifiedZScore) - Math.abs(a.modifiedZScore));

  // Since flags are sorted by |z-score| desc, the first anomaly is the max
  const firstAnomaly = flags.find(f => f.isAnomaly);

  return {
    overallScore: firstAnomaly ? Math.abs(firstAnomaly.modifiedZScore) : 0,
    flags,
    hasAnomalies: firstAnomaly !== undefined,
    method: 'modified-z-score',
    threshold,
    meetsMinimumPeers,
  };
}

/** Internal result from computeModifiedZScore to avoid re-computing median. */
interface ScoreResult {
  score: number;
  peerMedian: number;
}

/**
 * Compute Modified Z-Score for a single value against a peer distribution.
 *
 * Uses MAD (Median Absolute Deviation) as the scale estimator.
 * When MAD = 0 (all peers identical or nearly so), falls back to mean/stddev.
 * Returns null if computation is impossible (e.g., zero variance).
 */
function computeModifiedZScore(value: number, peerValues: number[]): ScoreResult | null {
  const med = median(peerValues);
  // Compute MAD manually to avoid re-computing median inside medianAbsoluteDeviation
  const deviations = peerValues.map(v => Math.abs(v - med));
  const mad = median(deviations);

  if (mad > 0) {
    return {
      score: (MAD_NORMALIZATION * (value - med)) / mad,
      peerMedian: med,
    };
  }

  // MAD = 0: most peers cluster at one value. Fall back to mean/stddev.
  if (peerValues.length < 2) {
    return null;
  }

  const std = sampleStandardDeviation(peerValues);
  if (std === 0) {
    // All peers exactly identical. Any non-zero deviation is notable
    // but we can't compute a meaningful z-score.
    if (value === med) {
      return { score: 0, peerMedian: med };
    }
    return null;
  }

  // Standard z-score fallback. Note: threshold of 3.5 is calibrated for
  // modified z-scores; standard z-scores are on a similar scale for
  // approximately normal data, so the threshold remains appropriate.
  return {
    score: (value - mean(peerValues)) / std,
    peerMedian: med,
  };
}

/**
 * Build a human-readable description of an anomaly flag.
 */
function buildDescription(
  dimension: string,
  value: number,
  peerMedian: number,
  modifiedZScore: number,
  threshold: number
): string {
  if (peerMedian === 0) {
    if (value === 0) {
      return `${dimension} funding matches peer median of $0.`;
    }
    return `${dimension} funding is $${formatAmount(value)} with no peer median funding in this sector.`;
  }

  const ratio = value / peerMedian;
  const direction = modifiedZScore > 0 ? 'above' : 'below';

  if (Math.abs(modifiedZScore) <= threshold) {
    return `${dimension} funding ($${formatAmount(value)}) is within normal range of peer median ($${formatAmount(peerMedian)}).`;
  }

  if (ratio >= 2) {
    return `${dimension} funding is ${ratio.toFixed(1)}x the peer median ($${formatAmount(value)} vs $${formatAmount(peerMedian)}).`;
  }

  if (ratio > 0 && ratio <= 0.5) {
    return `${dimension} funding is ${(1 / ratio).toFixed(1)}x below the peer median ($${formatAmount(value)} vs $${formatAmount(peerMedian)}).`;
  }

  const pctDiff = Math.abs((ratio - 1) * 100).toFixed(0);
  return `${dimension} funding is ${pctDiff}% ${direction} the peer median ($${formatAmount(value)} vs $${formatAmount(peerMedian)}).`;
}

/**
 * Format a dollar amount with commas.
 */
function formatAmount(amount: number): string {
  return Math.round(amount).toLocaleString('en-US');
}
