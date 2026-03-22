/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Comparison of a value against a peer group.
 * Used to contextualize individual metrics (e.g., a legislator's overlap score
 * relative to peers on the same committee).
 */
export interface PeerComparison {
  /** The individual's value for this metric. */
  value: number;
  /** The peer group average for this metric. */
  peerAverage: number;
  /** How many peers were included in the comparison. */
  peerCount: number;
  /** Description of the peer group (e.g., "Senate Finance Committee members"). */
  peerGroupLabel: string;
  /** Percentile rank within the peer group (0-100). */
  percentileRank: number;
  /** True when peer count is >= 2 but < MIN_PEERS — percentile rank is unreliable. */
  lowPeerCount?: boolean;
  /** Anomaly detection results, present when sector-level data available. */
  anomalies?: AnomalyResult;
}

/**
 * A single dimension flagged as anomalous by Modified Z-Score analysis.
 */
export interface AnomalyFlag {
  /** The dimension being measured (e.g., "Defense", "Health"). */
  dimension: string;
  /** The representative's value for this dimension. */
  value: number;
  /** Peer median for this dimension. */
  peerMedian: number;
  /** Modified Z-score (MAD-based). */
  modifiedZScore: number;
  /** Whether this exceeds the anomaly threshold. */
  isAnomaly: boolean;
  /** Human-readable description. */
  description: string;
}

/**
 * Result of anomaly detection across multiple dimensions.
 * Uses Modified Z-Score (MAD-based) for robustness to outliers.
 */
export interface AnomalyResult {
  /** Overall anomaly score: max |modifiedZScore| across flagged dimensions. */
  overallScore: number;
  /** Per-dimension anomaly flags, sorted by |modifiedZScore| descending. */
  flags: AnomalyFlag[];
  /** Whether any dimension exceeds the anomaly threshold. */
  hasAnomalies: boolean;
  /** Method used. */
  method: 'modified-z-score';
  /** Threshold used for flagging. */
  threshold: number;
  /** Whether minimum peer count was met. */
  meetsMinimumPeers: boolean;
}
