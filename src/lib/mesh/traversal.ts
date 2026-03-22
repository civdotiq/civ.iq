/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Civic Mesh N-Hop Traversal
 *
 * Generic BFS traversal that explores the graph from a starting node,
 * collecting all reachable entities within N hops that match a filter.
 *
 * Differs from path-finder.ts:
 * - path-finder: "Find paths from A to B" (goal-directed)
 * - traverseMesh: "Find everything reachable from A matching filter" (exploration)
 *
 * Both use BFS, both respect Redis cache, both bound depth at 4.
 */

import type { GraphNodeType, GraphEdgeType, GraphNode, GraphEdge } from '@/types/graph';
import { hydrateNeighborhood } from '@/lib/graph/hydrator';
import logger from '@/lib/logging/simple-logger';

const DEFAULT_MAX_DEPTH = 2;
const ABSOLUTE_MAX_DEPTH = 4;
const DEFAULT_LIMIT = 50;
const ABSOLUTE_MAX_LIMIT = 200;

export interface TraversalFilter {
  /** Only traverse these edge types (default: all) */
  edgeTypes?: GraphEdgeType[];
  /** Only return nodes of these types (default: all) */
  nodeTypes?: GraphNodeType[];
  /** Minimum edge confidence to traverse (default: 0) */
  minConfidence?: number;
  /** Maximum hops from origin (default: 2, max: 4) */
  maxDepth?: number;
  /** Maximum nodes to return (default: 50, max: 200) */
  limit?: number;
}

export interface TraversalResult {
  /** The starting node */
  origin: GraphNode;
  /** All nodes found within the traversal (excludes origin) */
  nodes: GraphNode[];
  /** All edges traversed */
  edges: GraphEdge[];
  /** Depth at which each node was first found */
  depthMap: Record<string, number>;
  /** Whether traversal was truncated by limit */
  truncated: boolean;
  /** The depth level at which truncation first occurred */
  truncatedAt?: number;
  /** Total nodes discovered before filtering by nodeTypes */
  totalDiscovered: number;
}

interface BFSEntry {
  nodeId: string;
  depth: number;
}

/**
 * BFS traversal from a starting node, collecting all reachable entities
 * within maxDepth hops that match the given filter.
 *
 * Uses existing hydrateNeighborhood() which checks Redis cache first.
 */
export async function traverseMesh(
  startId: string,
  filter?: TraversalFilter
): Promise<TraversalResult | null> {
  const maxDepth = Math.min(filter?.maxDepth ?? DEFAULT_MAX_DEPTH, ABSOLUTE_MAX_DEPTH);
  const limit = Math.min(filter?.limit ?? DEFAULT_LIMIT, ABSOLUTE_MAX_LIMIT);
  const edgeTypeFilter = filter?.edgeTypes ? new Set(filter.edgeTypes) : null;
  const nodeTypeFilter = filter?.nodeTypes ? new Set(filter.nodeTypes) : null;
  const minConfidence = filter?.minConfidence ?? 0;

  logger.info('[Mesh:Traversal] Starting', { startId, maxDepth, limit });

  // Hydrate origin
  const originNbr = await hydrateNeighborhood(startId);
  if (!originNbr) {
    logger.warn('[Mesh:Traversal] Origin node not found', { startId });
    return null;
  }

  const visited = new Set<string>([startId]);
  const depthMap: Record<string, number> = {};
  const collectedNodes = new Map<string, GraphNode>();
  const collectedEdges = new Map<string, GraphEdge>();
  let totalDiscovered = 0;
  let truncated = false;
  let truncatedAt: number | undefined;

  // BFS queue
  const queue: BFSEntry[] = [{ nodeId: startId, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    // Don't go deeper than maxDepth
    if (current.depth >= maxDepth) continue;

    // Hydrate current node's neighborhood
    const nbr = current.depth === 0 ? originNbr : await hydrateNeighborhood(current.nodeId);
    if (!nbr) continue;

    for (const edge of nbr.edges) {
      // Apply edge type filter
      if (edgeTypeFilter && !edgeTypeFilter.has(edge.type)) continue;

      // Apply confidence filter
      if (edge.confidence < minConfidence) continue;

      // Determine the other end of this edge
      const nextNodeId = edge.sourceId === current.nodeId ? edge.targetId : edge.sourceId;

      // Skip already visited
      if (visited.has(nextNodeId)) {
        // Still collect the edge if both endpoints are in our set
        if (collectedNodes.has(nextNodeId) || nextNodeId === startId) {
          if (!collectedEdges.has(edge.id)) {
            collectedEdges.set(edge.id, edge);
          }
        }
        continue;
      }

      visited.add(nextNodeId);

      // Find the connected node
      const nextNode = nbr.connectedNodes.find(n => n.id === nextNodeId);
      if (!nextNode) continue;

      totalDiscovered++;

      // Apply node type filter for collection (still traverse through non-matching types)
      const matchesNodeType = !nodeTypeFilter || nodeTypeFilter.has(nextNode.type);

      if (matchesNodeType) {
        // Check limit
        if (collectedNodes.size >= limit) {
          truncated = true;
          if (truncatedAt === undefined) {
            truncatedAt = current.depth + 1;
          }
          continue;
        }

        collectedNodes.set(nextNodeId, nextNode);
        depthMap[nextNodeId] = current.depth + 1;
      }

      // Collect edge regardless of node type filter (edge connects to discovered node)
      if (!collectedEdges.has(edge.id)) {
        collectedEdges.set(edge.id, edge);
      }

      // Continue BFS from this node (even if node type didn't match — we traverse through)
      if (current.depth + 1 < maxDepth) {
        queue.push({ nodeId: nextNodeId, depth: current.depth + 1 });
      }
    }
  }

  logger.info('[Mesh:Traversal] Complete', {
    startId,
    nodesFound: collectedNodes.size,
    edgesFound: collectedEdges.size,
    totalDiscovered,
    truncated,
  });

  return {
    origin: originNbr.center,
    nodes: Array.from(collectedNodes.values()),
    edges: Array.from(collectedEdges.values()),
    depthMap,
    truncated,
    truncatedAt,
    totalDiscovered,
  };
}
