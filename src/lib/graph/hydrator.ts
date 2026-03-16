/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Graph Hydration Dispatcher
 *
 * Given a canonical node ID, dispatches to the appropriate type-specific
 * hydrator and assembles a GraphNeighborhood from multiple data sources.
 *
 * Pattern: influence-chain-analyzer.ts (cache → fetch → merge → cache)
 */

import logger from '@/lib/logging/simple-logger';
import { withTimeout, ANALYZER_TIMEOUT_MS } from '@/lib/intelligence/analyzers/shared';
import { parseCanonicalId } from './normalize';
import { getCachedNeighborhood, setCachedNeighborhood } from './cache';
import { hydrateRepresentative } from './hydrators/representative';
import { hydrateBill } from './hydrators/bill';
import { hydrateCommittee } from './hydrators/committee';
import { hydrateOrganization } from './hydrators/organization';
import { hydrateAgency } from './hydrators/agency';
import { hydrateSector } from './hydrators/sector';
import type {
  GraphNeighborhood,
  GraphNode,
  GraphEdge,
  NeighborhoodCompleteness,
} from '@/types/graph';
import type { HydrationSource, HydrationSourceResult } from './types';

/** Run all hydration sources in parallel with timeout + settled semantics */
async function runSources(sources: HydrationSource[]): Promise<HydrationSourceResult[]> {
  const results = await Promise.allSettled(
    sources.map(async (source): Promise<HydrationSourceResult> => {
      try {
        const { nodes, edges } = await withTimeout(source.fetch(), 30_000, `graph:${source.name}`);
        return { source: source.name, nodes, edges, status: 'ok' };
      } catch (error) {
        const isTimeout = error instanceof Error && error.message.includes('timed out');
        return {
          source: source.name,
          nodes: [],
          edges: [],
          status: isTimeout ? 'timeout' : 'error',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      source: sources[i]?.name ?? 'unknown',
      nodes: [],
      edges: [],
      status: 'error' as const,
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });
}

/** Determine neighborhood completeness from source results */
function computeCompleteness(results: HydrationSourceResult[]): NeighborhoodCompleteness {
  const okCount = results.filter(r => r.status === 'ok').length;
  const total = results.length;

  if (okCount === total) return 'complete';
  if (okCount >= total / 2) return 'partial';
  return 'degraded';
}

/** Merge hydration results into a single neighborhood, deduplicating by ID */
function mergeResults(center: GraphNode, results: HydrationSourceResult[]): GraphNeighborhood {
  const nodeMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphEdge>();
  const failedSources: string[] = [];

  for (const result of results) {
    if (result.status !== 'ok') {
      failedSources.push(result.source);
    }
    for (const node of result.nodes) {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
      }
    }
    for (const edge of result.edges) {
      if (!edgeMap.has(edge.id)) {
        edgeMap.set(edge.id, edge);
      }
    }
  }

  // Remove center from connected nodes (it's already in center field)
  nodeMap.delete(center.id);

  return {
    center,
    edges: Array.from(edgeMap.values()),
    connectedNodes: Array.from(nodeMap.values()),
    completeness: computeCompleteness(results),
    failedSources,
  };
}

/**
 * Hydrate a graph neighborhood for any node type.
 *
 * 1. Check Redis cache
 * 2. Parse canonical ID → dispatch to type-specific hydrator
 * 3. Run all data sources in parallel (Promise.allSettled)
 * 4. Merge, cache, return
 */
export async function hydrateNeighborhood(nodeId: string): Promise<GraphNeighborhood | null> {
  // 1. Check cache
  const cached = await getCachedNeighborhood(nodeId);
  if (cached) {
    logger.info('[Graph] Cache hit', { nodeId });
    return cached;
  }

  // 2. Parse canonical ID
  const parsed = parseCanonicalId(nodeId);
  if (!parsed) {
    logger.warn('[Graph] Invalid canonical ID', { nodeId });
    return null;
  }

  logger.info('[Graph] Hydrating neighborhood', { nodeId, type: parsed.type });

  // 3. Dispatch to type-specific hydrator
  let center: GraphNode;
  let sources: HydrationSource[];

  try {
    switch (parsed.type) {
      case 'representative': {
        const result = await withTimeout(
          hydrateRepresentative(parsed.identifier),
          ANALYZER_TIMEOUT_MS,
          'graph:representative'
        );
        if (!result) return null;
        center = result.center;
        sources = result.sources;
        break;
      }
      case 'bill': {
        const result = await withTimeout(
          hydrateBill(parsed.identifier),
          ANALYZER_TIMEOUT_MS,
          'graph:bill'
        );
        if (!result) return null;
        center = result.center;
        sources = result.sources;
        break;
      }
      case 'committee': {
        const result = await withTimeout(
          hydrateCommittee(parsed.identifier),
          ANALYZER_TIMEOUT_MS,
          'graph:committee'
        );
        if (!result) return null;
        center = result.center;
        sources = result.sources;
        break;
      }
      case 'organization': {
        const result = await withTimeout(
          hydrateOrganization(parsed.identifier),
          ANALYZER_TIMEOUT_MS,
          'graph:organization'
        );
        if (!result) return null;
        center = result.center;
        sources = result.sources;
        break;
      }
      case 'agency': {
        const result = await withTimeout(
          hydrateAgency(parsed.identifier),
          ANALYZER_TIMEOUT_MS,
          'graph:agency'
        );
        if (!result) return null;
        center = result.center;
        sources = result.sources;
        break;
      }
      case 'sector': {
        const result = await withTimeout(
          hydrateSector(parsed.identifier),
          ANALYZER_TIMEOUT_MS,
          'graph:sector'
        );
        if (!result) return null;
        center = result.center;
        sources = result.sources;
        break;
      }
      default:
        logger.warn('[Graph] Unsupported node type for hydration', { type: parsed.type });
        return null;
    }
  } catch (error) {
    logger.error('[Graph] Hydration failed', error as Error, { nodeId });
    return null;
  }

  // 4. Run sources, merge, cache
  const results = await runSources(sources);
  const neighborhood = mergeResults(center, results);

  await setCachedNeighborhood(nodeId, neighborhood);
  logger.info('[Graph] Hydration complete', {
    nodeId,
    edges: neighborhood.edges.length,
    nodes: neighborhood.connectedNodes.length,
    completeness: neighborhood.completeness,
  });

  return neighborhood;
}
