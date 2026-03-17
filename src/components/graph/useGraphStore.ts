/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { GraphNode, GraphEdge, GraphEdgeType, GraphNeighborhood } from '@/types/graph';

const MAX_VISIBLE_NODES_DESKTOP = 150;
const MAX_VISIBLE_NODES_MOBILE = 50;

function getMaxVisibleNodes(): number {
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return MAX_VISIBLE_NODES_MOBILE;
  }
  return MAX_VISIBLE_NODES_DESKTOP;
}

interface GraphState {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  expandedNodeIds: Set<string>;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // Filters
  visibleEdgeTypes: Set<GraphEdgeType>;
  timeRange: { since: string | null; until: string | null };
  minConfidence: number;

  // Actions
  addNeighborhood: (data: GraphNeighborhood) => void;
  addQueryResults: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  toggleEdgeType: (type: GraphEdgeType) => void;
  setTimeRange: (since: string | null, until: string | null) => void;
  setMinConfidence: (value: number) => void;
  collapseNode: (id: string) => void;
  reset: () => void;
}

/** Edge types shown by default — Money + Legislative only, to reduce initial noise */
const DEFAULT_EDGE_TYPES = new Set<GraphEdgeType>([
  'donated_to',
  'lobbied',
  'awarded_contract',
  'traded_stock',
  'voted_on',
  'sponsored',
  'referred_to',
]);

function initialState() {
  return {
    nodes: new Map<string, GraphNode>(),
    edges: new Map<string, GraphEdge>(),
    expandedNodeIds: new Set<string>(),
    selectedNodeId: null as string | null,
    selectedEdgeId: null as string | null,
    visibleEdgeTypes: new Set(DEFAULT_EDGE_TYPES),
    timeRange: { since: null as string | null, until: null as string | null },
    minConfidence: 0.5,
  };
}

export const useGraphStore = create<GraphState>()(
  devtools(
    set => ({
      ...initialState(),

      addNeighborhood: (data: GraphNeighborhood) =>
        set(
          state => {
            const nodes = new Map(state.nodes);
            const edges = new Map(state.edges);
            const expandedNodeIds = new Set(state.expandedNodeIds);

            // Add center node
            nodes.set(data.center.id, data.center);
            expandedNodeIds.add(data.center.id);

            // Add connected nodes
            for (const node of data.connectedNodes) {
              nodes.set(node.id, node);
            }

            // Add edges
            for (const edge of data.edges) {
              edges.set(edge.id, edge);
            }

            // Enforce max node count — collapse oldest expansions (lower cap on mobile)
            const maxNodes = getMaxVisibleNodes();
            if (nodes.size > maxNodes) {
              const toRemove = nodes.size - maxNodes;
              const expandedArray = Array.from(expandedNodeIds);
              // Don't collapse the center of the newest expansion
              const removable = expandedArray.filter(id => id !== data.center.id);
              const collapseIds = removable.slice(0, toRemove);

              for (const collapseId of collapseIds) {
                expandedNodeIds.delete(collapseId);

                // Remove edges connected to this collapsed node
                for (const [edgeId, edge] of edges) {
                  if (edge.sourceId === collapseId || edge.targetId === collapseId) {
                    edges.delete(edgeId);
                  }
                }

                // Remove the node itself (unless it's still connected via remaining edges)
                let stillConnected = false;
                for (const edge of edges.values()) {
                  if (edge.sourceId === collapseId || edge.targetId === collapseId) {
                    stillConnected = true;
                    break;
                  }
                }
                if (!stillConnected) {
                  nodes.delete(collapseId);
                }
              }
            }

            return { nodes, edges, expandedNodeIds };
          },
          false,
          'addNeighborhood'
        ),

      addQueryResults: (queryNodes: GraphNode[], queryEdges: GraphEdge[]) =>
        set(
          state => {
            const nodes = new Map(state.nodes);
            const edges = new Map(state.edges);

            for (const node of queryNodes) {
              nodes.set(node.id, node);
            }
            for (const edge of queryEdges) {
              edges.set(edge.id, edge);
            }

            return { nodes, edges };
          },
          false,
          'addQueryResults'
        ),

      selectNode: (id: string | null) =>
        set({ selectedNodeId: id, selectedEdgeId: null }, false, 'selectNode'),

      selectEdge: (id: string | null) =>
        set({ selectedEdgeId: id, selectedNodeId: null }, false, 'selectEdge'),

      toggleEdgeType: (type: GraphEdgeType) =>
        set(
          state => {
            const visibleEdgeTypes = new Set(state.visibleEdgeTypes);
            if (visibleEdgeTypes.has(type)) {
              visibleEdgeTypes.delete(type);
            } else {
              visibleEdgeTypes.add(type);
            }
            return { visibleEdgeTypes };
          },
          false,
          'toggleEdgeType'
        ),

      setTimeRange: (since: string | null, until: string | null) =>
        set({ timeRange: { since, until } }, false, 'setTimeRange'),

      setMinConfidence: (value: number) => set({ minConfidence: value }, false, 'setMinConfidence'),

      collapseNode: (id: string) =>
        set(
          state => {
            const expandedNodeIds = new Set(state.expandedNodeIds);
            expandedNodeIds.delete(id);
            return { expandedNodeIds };
          },
          false,
          'collapseNode'
        ),

      reset: () => set(initialState(), false, 'reset'),
    }),
    { name: 'GraphStore' }
  )
);
