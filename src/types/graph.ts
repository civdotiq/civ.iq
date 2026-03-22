/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Knowledge Graph Type Definitions
 *
 * Defines the graph data model for CIV.IQ's civic knowledge graph.
 * 8 node types and 14 edge types mapping to existing entities and
 * computed relationships across government data sources.
 */

// ── Node Types ──────────────────────────────────────────────────────

export const GRAPH_NODE_TYPES = [
  'representative',
  'bill',
  'committee',
  'agency',
  'organization',
  'sector',
  'contract',
  'regulation',
  'facility',
  'disaster',
  'institution',
  'complaint',
] as const;

export type GraphNodeType = (typeof GRAPH_NODE_TYPES)[number];

// ── Edge Types ──────────────────────────────────────────────────────

export const GRAPH_EDGE_TYPES = [
  'donated_to',
  'lobbied',
  'serves_on',
  'voted_on',
  'sponsored',
  'oversees',
  'awarded_contract',
  'affects_sector',
  'in_sector',
  'traded_stock',
  'regulates',
  'lobbying_matches',
  'referred_to',
  'employs_donor',
  'located_in_district',
  'violates_regulation',
  'receives_grant',
  'complained_against',
  'declared_in',
] as const;

export type GraphEdgeType = (typeof GRAPH_EDGE_TYPES)[number];

// ── Graph Node ──────────────────────────────────────────────────────

export interface GraphNode {
  /** Canonical ID: "{type}:{identifier}" (e.g., "rep:A000360") */
  id: string;
  type: GraphNodeType;
  /** Human-readable display name */
  label: string;
  /** Type-specific data (party, amount, status, etc.) */
  properties: Record<string, unknown>;
  /** ISO timestamp of freshest source data */
  dataAsOf: string;
  /** Link to existing CIV.IQ page, if applicable */
  profileUrl?: string;
  /** URL to the authoritative external data source for verification */
  sourceUrl?: string;
  /** Human-readable label for the external data source (e.g., "Congress.gov") */
  sourceLabel?: string;
}

export interface GraphEdge {
  /** Deterministic ID: "{sourceId}->{type}->{targetId}" */
  id: string;
  type: GraphEdgeType;
  sourceId: string;
  targetId: string;
  /** Human-readable edge description */
  label: string;
  /** Type-specific data (dollar amount, vote position, etc.) */
  properties: Record<string, unknown>;
  /** Normalized weight for visualization stroke width (0-1) */
  weight: number;
  /** Data quality confidence (0-1) */
  confidence: number;
  /** Temporal context for timeline display */
  temporal?: {
    date: string;
    period?: string;
    /** When this relationship first appeared in the data */
    firstSeen?: string;
    /** Most recent activity */
    lastSeen?: string;
    /** Pre-computed quarterly buckets (populated by hydrators when available) */
    buckets?: Array<{
      period: string;
      start: string;
      end: string;
      value: number;
      eventCount: number;
    }>;
    /** Computed trend */
    trend?: 'increasing' | 'decreasing' | 'stable' | 'new' | 'ended';
    /** Year-over-year change */
    yoyChange?: number | null;
  };
  /** ISO timestamp of freshest source data */
  dataAsOf: string;
  /** URL to the authoritative external data source for verification */
  sourceUrl?: string;
  /** Human-readable label for the external data source (e.g., "FEC.gov") */
  sourceLabel?: string;
}

// ── Graph Neighborhood ──────────────────────────────────────────────

export type NeighborhoodCompleteness = 'complete' | 'partial' | 'degraded';

export interface GraphNeighborhood {
  /** The node whose neighborhood was fetched */
  center: GraphNode;
  /** All edges connecting to/from the center node */
  edges: GraphEdge[];
  /** All nodes reachable via one hop from center */
  connectedNodes: GraphNode[];
  /** Whether all data sources responded successfully */
  completeness: NeighborhoodCompleteness;
  /** Names of data sources that failed during hydration */
  failedSources: string[];
}

// ── Path Finding ────────────────────────────────────────────────────

export interface GraphPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Sum of edge confidence scores along the path */
  totalConfidence: number;
}

export interface PathResult {
  paths: GraphPath[];
  shortestLength: number;
}

// ── API Query Parameters ────────────────────────────────────────────

export interface NeighborQueryParams {
  edgeTypes?: GraphEdgeType[];
  minConfidence?: number;
  since?: string;
  until?: string;
  limit?: number;
}

export interface PathQueryParams {
  from: string;
  to: string;
  maxDepth?: number;
  edgeTypes?: GraphEdgeType[];
}
