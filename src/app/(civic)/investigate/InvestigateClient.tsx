/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { GraphCanvas } from '@/components/graph/GraphCanvas';
import { GraphSidebar } from '@/components/graph/GraphSidebar';
import { GraphControls } from '@/components/graph/GraphControls';
import { GraphSearch } from '@/components/graph/GraphSearch';
import { GraphLegend } from '@/components/graph/GraphLegend';
import { useGraphStore } from '@/components/graph/useGraphStore';
import { useGraphNeighborhood } from '@/components/graph/useGraphData';

export default function InvestigateClient() {
  const searchParams = useSearchParams();
  const initialNode = searchParams.get('node');

  const {
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    expandedNodeIds,
    selectNode,
    selectEdge,
    addNeighborhood,
    reset,
  } = useGraphStore();

  // Fetch initial node neighborhood
  const { data: initialNeighborhood, isLoading } = useGraphNeighborhood(
    initialNode && !expandedNodeIds.has(initialNode) ? initialNode : null
  );

  useEffect(() => {
    if (initialNeighborhood) {
      addNeighborhood(initialNeighborhood);
    }
  }, [initialNeighborhood, addNeighborhood]);

  const handleNodeDoubleClick = useCallback(
    (nodeId: string) => {
      if (!expandedNodeIds.has(nodeId)) {
        // Will trigger fetch via useGraphNeighborhood in ExpandHandler
        selectNode(nodeId);
      }
    },
    [expandedNodeIds, selectNode]
  );

  const handleSearch = useCallback(
    (nodeId: string) => {
      reset();
      // Update URL without navigation
      const url = new URL(window.location.href);
      url.searchParams.set('node', nodeId);
      window.history.pushState({}, '', url.toString());
      // Trigger fetch
      selectNode(nodeId);
    },
    [reset, selectNode]
  );

  const nodesArray = Array.from(nodes.values());
  const edgesArray = Array.from(edges.values());

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="type-xs text-gray-500 mb-4">
          <a href="/" className="hover:text-[#3ea2d4]">
            Home
          </a>
          <span className="mx-2">/</span>
          <span>Investigate</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="aicher-heading text-2xl mb-2">Investigate Connections</h1>
          <p className="type-sm text-gray-600 dark:text-gray-400">
            Explore relationships between legislators, donors, committees, and government contracts.
            Click a node to select, double-click to expand its network.
          </p>
        </div>

        {/* Search */}
        <GraphSearch onSelect={handleSearch} />

        {/* Main grid: canvas + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 mt-8">
          <div>
            {/* Controls */}
            <GraphControls />

            {/* Canvas */}
            <div
              className="border-2 border-gray-200 dark:border-gray-700 relative"
              style={{ minHeight: '500px' }}
            >
              {isLoading && nodesArray.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="type-sm text-gray-500">Loading network data...</p>
                </div>
              ) : nodesArray.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="type-sm text-gray-500 mb-2">
                      Search for a legislator, bill, or committee to begin investigating.
                    </p>
                    <p className="type-xs text-gray-400">
                      Try: &quot;Nancy Pelosi&quot;, &quot;Armed Services Committee&quot;, or a
                      bioguide ID like &quot;P000197&quot;
                    </p>
                  </div>
                </div>
              ) : (
                <GraphCanvas
                  nodes={nodesArray}
                  edges={edgesArray}
                  selectedNodeId={selectedNodeId}
                  selectedEdgeId={selectedEdgeId}
                  onNodeClick={selectNode}
                  onNodeDoubleClick={handleNodeDoubleClick}
                  onEdgeClick={selectEdge}
                />
              )}
            </div>

            {/* Legend */}
            <GraphLegend />
          </div>

          {/* Sidebar */}
          <GraphSidebar
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            nodes={nodes}
            edges={edges}
          />
        </div>

        {/* Expand handler — fetches neighborhoods for selected nodes */}
        <ExpandHandler />
      </main>
    </div>
  );
}

/** Hidden component that fetches neighborhoods when a node is selected but not yet expanded */
function ExpandHandler() {
  const { selectedNodeId, expandedNodeIds, addNeighborhood } = useGraphStore();

  const shouldFetch = selectedNodeId && !expandedNodeIds.has(selectedNodeId);
  const { data } = useGraphNeighborhood(shouldFetch ? selectedNodeId : null);

  useEffect(() => {
    if (data) {
      addNeighborhood(data);
    }
  }, [data, addNeighborhood]);

  return null;
}
