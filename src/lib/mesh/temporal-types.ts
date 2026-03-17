/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Temporal Mesh Types
 *
 * Types for time-series data on graph edges. Upgrades edges from
 * optional single timestamps to full quarterly bucket histories
 * with trend detection and anomaly flagging.
 */

import type { GraphEdgeType } from '@/types/graph';

/**
 * A single time bucket aggregating edge activity over a period.
 */
export interface TemporalBucket {
  /** Period identifier: "2024-Q1", "2025-Q2", etc. */
  period: string;
  /** Start of period (ISO date) */
  start: string;
  /** End of period (ISO date) */
  end: string;
  /** Aggregate value for this period (dollars, vote count, filing count, etc.) */
  value: number;
  /** Number of individual events in this period */
  eventCount: number;
}

/**
 * Extended temporal metadata for a graph edge.
 * Replaces the simple { date, period? } with full time-series.
 */
export interface TemporalEdge {
  /** When this relationship first appeared in the data */
  firstSeen: string;
  /** Most recent activity */
  lastSeen: string;
  /** Quarterly aggregates */
  buckets: TemporalBucket[];
  /** Computed trend based on recent vs historical buckets */
  trend: TemporalTrend;
  /** Percent change between most recent complete quarter and same quarter prior year */
  yoyChange: number | null;
}

export type TemporalTrend = 'increasing' | 'decreasing' | 'stable' | 'new' | 'ended';

/**
 * Full temporal profile for a node -- aggregates temporal data
 * across all edges of each type.
 */
export interface TemporalProfile {
  nodeId: string;
  /** Time range covered */
  from: string;
  to: string;
  /** Per-edge-type temporal summaries */
  edgeSummaries: TemporalEdgeSummary[];
  /** Significant temporal events (large changes, new relationships, ended relationships) */
  events: TemporalEvent[];
}

export interface TemporalEdgeSummary {
  edgeType: GraphEdgeType;
  /** Total edges of this type */
  totalEdges: number;
  /** How many are trending up/down/stable */
  trendBreakdown: {
    increasing: number;
    decreasing: number;
    stable: number;
    new: number;
    ended: number;
  };
  /** Aggregate value time-series across all edges of this type */
  aggregateBuckets: TemporalBucket[];
}

export interface TemporalEvent {
  date: string;
  edgeType: GraphEdgeType;
  description: string;
  /** Magnitude of change (e.g., 3.4 = 340% increase) */
  magnitude: number;
  relatedNodeId: string;
}
