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
}
