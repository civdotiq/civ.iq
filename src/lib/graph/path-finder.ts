/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * BFS Path Finder over Cached Graph Neighborhoods
 *
 * Finds all paths between two nodes by traversing cached neighborhoods.
 * Max depth: 4 hops (to bound API calls and response time).
 * Paths sorted by total edge confidence (product of all edge confidences).
 */

import logger from '@/lib/logging/simple-logger';
import { hydrateNeighborhood } from './hydrator';
import type {
  GraphNeighborhood,
  GraphNode,
  GraphEdge,
  GraphPath,
  PathResult,
  GraphEdgeType,
} from '@/types/graph';

const DEFAULT_MAX_DEPTH = 3;
const ABSOLUTE_MAX_DEPTH = 4;
const MAX_PATHS = 10;

interface PathFinderOptions {
  maxDepth?: number;
  edgeTypes?: GraphEdgeType[];
}

interface BFSState {
  nodeId: string;
  path: { node: GraphNode; edge: GraphEdge | null }[];
  visited: Set<string>;
}

export async function findPaths(
  fromId: string,
  toId: string,
  options: PathFinderOptions = {}
): Promise<PathResult> {
  const maxDepth = Math.min(options.maxDepth ?? DEFAULT_MAX_DEPTH, ABSOLUTE_MAX_DEPTH);
  const edgeTypeFilter = options.edgeTypes ? new Set(options.edgeTypes) : null;

  logger.info('[Graph:PathFinder] Starting search', { fromId, toId, maxDepth });

  const paths: GraphPath[] = [];
  let shortestLength = Infinity;

  // In-memory neighborhood cache — avoids re-hydrating nodes within a single
  // search (the source node is hydrated first and reused in the BFS loop).
  const nbrCache = new Map<string, GraphNeighborhood | null>();

  // Fetch source neighborhood
  const sourceNbr = await hydrateNeighborhood(fromId);
  if (!sourceNbr) {
    logger.warn('[Graph:PathFinder] Source node not found', { fromId });
    return { paths: [], shortestLength: 0 };
  }
  nbrCache.set(fromId, sourceNbr);

  // BFS queue
  const queue: BFSState[] = [
    {
      nodeId: fromId,
      path: [{ node: sourceNbr.center, edge: null }],
      visited: new Set([fromId]),
    },
  ];

  while (queue.length > 0 && paths.length < MAX_PATHS) {
    const current = queue.shift();
    if (!current) break;

    const currentDepth = current.path.length - 1;

    // Early termination: once we've found paths at depth D,
    // skip nodes at depth >= D (they can only produce longer paths).
    if (currentDepth >= shortestLength) continue;

    // Don't go deeper than maxDepth
    if (current.path.length > maxDepth + 1) continue;

    // Hydrate current node's neighborhood (from cache or fresh)
    let nbr = nbrCache.get(current.nodeId);
    if (nbr === undefined) {
      nbr = await hydrateNeighborhood(current.nodeId);
      nbrCache.set(current.nodeId, nbr);
    }
    if (!nbr) continue;

    // Check each edge for target or next hop
    for (const edge of nbr.edges) {
      // Apply edge type filter
      if (edgeTypeFilter && !edgeTypeFilter.has(edge.type)) continue;

      // Determine the other end of this edge
      const nextNodeId = edge.sourceId === current.nodeId ? edge.targetId : edge.sourceId;

      // Skip already visited
      if (current.visited.has(nextNodeId)) continue;

      // Find the connected node
      const nextNode = nbr.connectedNodes.find(n => n.id === nextNodeId);
      if (!nextNode) continue;

      const newPath = [...current.path, { node: nextNode, edge }];

      if (nextNodeId === toId) {
        // Found a path!
        const graphPath = buildGraphPath(newPath);
        paths.push(graphPath);
        shortestLength = Math.min(shortestLength, graphPath.edges.length);
        continue;
      }

      // Only enqueue if within depth limit and could produce shorter paths
      const nextDepth = newPath.length - 1;
      if (newPath.length <= maxDepth && nextDepth < shortestLength) {
        const newVisited = new Set(current.visited);
        newVisited.add(nextNodeId);
        queue.push({
          nodeId: nextNodeId,
          path: newPath,
          visited: newVisited,
        });
      }
    }
  }

  // Sort by confidence (highest first)
  paths.sort((a, b) => b.totalConfidence - a.totalConfidence);

  logger.info('[Graph:PathFinder] Search complete', {
    fromId,
    toId,
    pathsFound: paths.length,
    shortestLength: shortestLength === Infinity ? 0 : shortestLength,
  });

  return {
    paths: paths.slice(0, MAX_PATHS),
    shortestLength: shortestLength === Infinity ? 0 : shortestLength,
  };
}

function buildGraphPath(steps: Array<{ node: GraphNode; edge: GraphEdge | null }>): GraphPath {
  const nodes = steps.map(s => s.node);
  const edges = steps.filter(s => s.edge !== null).map(s => s.edge!);
  const totalConfidence = edges.reduce((acc, e) => acc * e.confidence, 1);

  return { nodes, edges, totalConfidence };
}
