/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Internal types for the graph hydration engine.
 * These are not exposed to API consumers — see src/types/graph.ts for public types.
 */

import type { GraphNode, GraphEdge } from '@/types/graph';

/** Result from a single hydration data source */
export interface HydrationSourceResult {
  /** Name of the data source for logging/debugging */
  source: string;
  /** Nodes discovered from this source */
  nodes: GraphNode[];
  /** Edges discovered from this source */
  edges: GraphEdge[];
  /** Whether this source completed successfully */
  status: 'ok' | 'error' | 'timeout';
  /** Error message if status is 'error' or 'timeout' */
  error?: string;
}

/** Configuration for a hydration data source */
export interface HydrationSource {
  name: string;
  fetch: () => Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
}
