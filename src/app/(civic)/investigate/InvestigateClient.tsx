/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { GraphCanvas } from '@/components/graph/GraphCanvas';
import { GraphSidebar } from '@/components/graph/GraphSidebar';
import { GraphControls } from '@/components/graph/GraphControls';
import { GraphSearch } from '@/components/graph/GraphSearch';
import { GraphQueryBar } from '@/components/graph/GraphQueryBar';
import { GraphLegend } from '@/components/graph/GraphLegend';
import { useGraphStore } from '@/components/graph/useGraphStore';
import { useGraphNeighborhood } from '@/components/graph/useGraphData';
import type { GraphNode, GraphEdge } from '@/types/graph';

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
    addQueryResults,
    reset,
  } = useGraphStore();

  // Separate expansion state from selection to avoid double-click race
  const [expandNodeId, setExpandNodeId] = useState<string | null>(initialNode);

  // Fetch neighborhood for the node to expand
  const shouldFetch = expandNodeId && !expandedNodeIds.has(expandNodeId);
  const { data: expandData, isLoading } = useGraphNeighborhood(shouldFetch ? expandNodeId : null);

  useEffect(() => {
    if (expandData) {
      addNeighborhood(expandData);
    }
  }, [expandData, addNeighborhood]);

  // Single-click: select only (show sidebar details, no expansion)
  const handleNodeClick = useCallback(
    (id: string | null) => {
      selectNode(id);
    },
    [selectNode]
  );

  // Double-click or sidebar "Expand": expand the node's network
  const handleExpandNode = useCallback(
    (nodeId: string) => {
      if (!expandedNodeIds.has(nodeId)) {
        setExpandNodeId(nodeId);
      }
    },
    [expandedNodeIds]
  );

  // Search: reset graph and load a new root node
  const handleSearch = useCallback(
    (nodeId: string) => {
      reset();
      const url = new URL(window.location.href);
      url.searchParams.set('node', nodeId);
      window.history.pushState({}, '', url.toString());
      selectNode(nodeId);
      setExpandNodeId(nodeId);
    },
    [reset, selectNode]
  );

  // Natural-language query: reset and populate with query results
  const handleQueryResults = useCallback(
    (queryNodes: GraphNode[], queryEdges: GraphEdge[]) => {
      reset();
      addQueryResults(queryNodes, queryEdges);
    },
    [reset, addQueryResults]
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
          <p className="type-sm text-gray-600 dark:text-gray-400 mb-2">
            See who funds, lobbies, and works with your elected officials. All data comes from
            official government sources including FEC.gov, Senate lobbying disclosures, and
            Congress.gov.
          </p>
        </div>

        {/* Search */}
        <div className="space-y-4">
          <GraphSearch onSelect={handleSearch} />
          <GraphQueryBar onResults={handleQueryResults} />
        </div>

        {/* Main grid: canvas + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 mt-8">
          <div>
            {/* Controls — only show when graph has data */}
            {nodesArray.length > 0 && <GraphControls />}

            {/* Canvas */}
            <div
              className="border-2 border-gray-200 dark:border-gray-700 relative"
              style={{ minHeight: '500px' }}
            >
              {isLoading && nodesArray.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="type-sm text-gray-500">Loading connections...</p>
                </div>
              ) : nodesArray.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <p className="type-sm text-gray-500 mb-2">
                      Search for a name above to see their connections.
                    </p>
                    <p className="type-xs text-gray-400">
                      Try &quot;Nancy Pelosi&quot; or &quot;Armed Services Committee&quot;
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="absolute top-2 left-2 z-10 bg-white/90 dark:bg-gray-900/90 border-2 border-gray-200 dark:border-gray-700 px-3 py-2 pointer-events-none">
                    <p className="type-xs text-gray-500">
                      Click any shape to see details. Double-click to expand its connections.
                    </p>
                  </div>
                  <GraphCanvas
                    nodes={nodesArray}
                    edges={edgesArray}
                    selectedNodeId={selectedNodeId}
                    selectedEdgeId={selectedEdgeId}
                    onNodeClick={handleNodeClick}
                    onNodeDoubleClick={handleExpandNode}
                    onEdgeClick={selectEdge}
                  />
                </>
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
            onSelectNode={selectNode}
            onExpandNode={handleExpandNode}
          />
        </div>
      </main>
    </div>
  );
}
