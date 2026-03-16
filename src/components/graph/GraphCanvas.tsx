/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import type { GraphNode, GraphEdge, GraphNodeType, GraphEdgeType } from '@/types/graph';
import { useGraphStore } from './useGraphStore';

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onNodeClick: (id: string | null) => void;
  onNodeDoubleClick: (id: string) => void;
  onEdgeClick: (id: string | null) => void;
}

// ── Design System Colors ────────────────────────────────────────────

const PARTY_COLORS: Record<string, string> = {
  D: '#0a9338',
  R: '#e11d07',
  I: '#6b7280',
};

const NODE_COLORS: Record<GraphNodeType, string> = {
  representative: '#6b7280', // overridden by party color
  bill: '#9ca3af',
  committee: '#3ea2d4',
  agency: '#374151',
  organization: '#d97706',
  sector: '#d1d5db',
  contract: '#6b7280',
  regulation: '#4b5563',
};

const EDGE_COLORS: Record<GraphEdgeType, string> = {
  donated_to: '#0a9338',
  lobbied: '#d97706',
  serves_on: '#6b7280',
  voted_on: '#3ea2d4',
  sponsored: '#3ea2d4',
  oversees: '#9ca3af',
  awarded_contract: '#d97706',
  affects_sector: '#9ca3af',
  in_sector: '#9ca3af',
  traded_stock: '#e11d07',
  regulates: '#374151',
  lobbying_matches: '#d97706',
  referred_to: '#9ca3af',
  employs_donor: '#0a9338',
};

const NODE_RADIUS: Record<GraphNodeType, number> = {
  representative: 12,
  bill: 10,
  committee: 14,
  agency: 12,
  organization: 10,
  sector: 14,
  contract: 8,
  regulation: 8,
};

// ── Simulation Node Type ────────────────────────────────────────────

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  graphNode: GraphNode;
}

interface SimLink {
  source: SimNode;
  target: SimNode;
  graphEdge: GraphEdge;
}

export function GraphCanvas({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [isMobile, setIsMobile] = useState(false);
  const [tooltipData, setTooltipData] = useState<{
    node?: GraphNode;
    edge?: GraphEdge;
    x: number;
    y: number;
  } | null>(null);

  const { visibleEdgeTypes, minConfidence } = useGraphStore();

  // Responsive dimensions
  useEffect(() => {
    const updateDimensions = () => {
      setIsMobile(window.innerWidth < 768);
      if (svgRef.current?.parentElement) {
        const parent = svgRef.current.parentElement;
        setDimensions({
          width: parent.clientWidth,
          height: Math.max(parent.clientWidth * 0.6, 500),
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Filter edges by visibility settings
  const filteredEdges = useMemo(
    () => edges.filter(e => visibleEdgeTypes.has(e.type) && e.confidence >= minConfidence),
    [edges, visibleEdgeTypes, minConfidence]
  );

  // Build node set from filtered edges + always include all nodes with edges
  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of filteredEdges) {
      ids.add(e.sourceId);
      ids.add(e.targetId);
    }
    return ids;
  }, [filteredEdges]);

  const filteredNodes = useMemo(
    () => nodes.filter(n => visibleNodeIds.has(n.id)),
    [nodes, visibleNodeIds]
  );

  // D3 simulation
  useEffect(() => {
    if (!svgRef.current || filteredNodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    // Build simulation data
    const simNodes: SimNode[] = filteredNodes.map(n => ({
      id: n.id,
      graphNode: n,
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200,
    }));

    const nodeById = new Map(simNodes.map(n => [n.id, n]));

    const simLinks: SimLink[] = [];
    for (const e of filteredEdges) {
      const source = nodeById.get(e.sourceId);
      const target = nodeById.get(e.targetId);
      if (source && target) {
        simLinks.push({ source, target, graphEdge: e });
      }
    }

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', event => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    const container = svg.append('g');

    // Arrow marker defs
    const defs = svg.append('defs');
    Object.entries(EDGE_COLORS).forEach(([type, color]) => {
      defs
        .append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    });

    // Draw edges
    const linkGroup = container
      .append('g')
      .attr('class', 'edges')
      .selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', d => EDGE_COLORS[d.graphEdge.type] ?? '#9ca3af')
      .attr('stroke-width', d => 1 + d.graphEdge.weight * 3)
      .attr('stroke-opacity', d => (d.graphEdge.id === selectedEdgeId ? 1 : 0.6))
      .attr('stroke-dasharray', d => {
        if (d.graphEdge.type === 'voted_on' && d.graphEdge.properties['position'] === 'nay') {
          return '4,4';
        }
        if (d.graphEdge.type === 'oversees' || d.graphEdge.type === 'regulates') {
          return '2,2';
        }
        return null;
      })
      .attr('marker-end', d => `url(#arrow-${d.graphEdge.type})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onEdgeClick(d.graphEdge.id);
      })
      .on('mouseenter', (event, d) => {
        setTooltipData({ edge: d.graphEdge, x: event.offsetX, y: event.offsetY });
      })
      .on('mouseleave', () => setTooltipData(null));

    // Draw nodes
    const nodeGroup = container
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(simNodes)
      .join('g')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d.id);
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation();
        onNodeDoubleClick(d.id);
      })
      .on('mouseenter', (event, d) => {
        setTooltipData({ node: d.graphNode, x: event.offsetX, y: event.offsetY });
      })
      .on('mouseleave', () => setTooltipData(null))
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }) as any
      );

    // Node shapes
    nodeGroup.each(function (d) {
      const g = d3.select(this);
      const type = d.graphNode.type;
      const baseR = NODE_RADIUS[type] ?? 10;
      const r = isMobile ? Math.max(baseR * 1.5, 22) : baseR;
      const isSelected = d.id === selectedNodeId;
      const party = d.graphNode.properties['party'] as string | undefined;
      const fill =
        type === 'representative' && party
          ? (PARTY_COLORS[party] ?? NODE_COLORS[type])
          : NODE_COLORS[type];

      if (type === 'representative') {
        g.append('circle')
          .attr('r', r)
          .attr('fill', fill)
          .attr('stroke', isSelected ? '#000' : '#fff')
          .attr('stroke-width', isSelected ? 3 : 2);
      } else if (type === 'bill') {
        g.append('rect')
          .attr('x', -r)
          .attr('y', -r * 0.7)
          .attr('width', r * 2)
          .attr('height', r * 1.4)
          .attr('fill', fill)
          .attr('stroke', isSelected ? '#000' : '#fff')
          .attr('stroke-width', isSelected ? 3 : 2);
      } else if (type === 'committee') {
        // Diamond
        const pts = `0,${-r} ${r},0 0,${r} ${-r},0`;
        g.append('polygon')
          .attr('points', pts)
          .attr('fill', fill)
          .attr('stroke', isSelected ? '#000' : '#fff')
          .attr('stroke-width', isSelected ? 3 : 2);
      } else if (type === 'organization') {
        g.append('rect')
          .attr('x', -r)
          .attr('y', -r)
          .attr('width', r * 2)
          .attr('height', r * 2)
          .attr('fill', fill)
          .attr('stroke', isSelected ? '#000' : '#fff')
          .attr('stroke-width', isSelected ? 3 : 2);
      } else {
        // Default circle for agency, sector, contract, regulation
        g.append('circle')
          .attr('r', r)
          .attr('fill', fill)
          .attr('stroke', isSelected ? '#000' : '#fff')
          .attr('stroke-width', isSelected ? 3 : 2);
      }

      // Label
      g.append('text')
        .attr('dy', r + 14)
        .attr('text-anchor', 'middle')
        .attr('class', 'type-xs')
        .attr('fill', 'currentColor')
        .text(
          d.graphNode.label.length > 20 ? d.graphNode.label.slice(0, 18) + '...' : d.graphNode.label
        );
    });

    // Click empty space to deselect
    svg.on('click', () => {
      onNodeClick(null);
      onEdgeClick(null);
    });

    // Force simulation
    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, d3.SimulationLinkDatum<SimNode>>(
            simLinks as unknown as d3.SimulationLinkDatum<SimNode>[]
          )
          .id(d => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(isMobile ? 40 : 30))
      .on('tick', () => {
        linkGroup
          .attr('x1', d => (d.source as SimNode).x ?? 0)
          .attr('y1', d => (d.source as SimNode).y ?? 0)
          .attr('x2', d => (d.target as SimNode).x ?? 0)
          .attr('y2', d => (d.target as SimNode).y ?? 0);

        nodeGroup.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

    return () => {
      simulation.stop();
    };
  }, [
    filteredNodes,
    filteredEdges,
    dimensions,
    selectedNodeId,
    selectedEdgeId,
    onNodeClick,
    onNodeDoubleClick,
    onEdgeClick,
    isMobile,
  ]);

  return (
    <div className="relative w-full" style={{ height: dimensions.height }}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
      />
      {tooltipData && (
        <div
          className="absolute z-10 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 px-3 py-2 pointer-events-none"
          style={{ left: tooltipData.x + 12, top: tooltipData.y - 12, maxWidth: 280 }}
        >
          {tooltipData.node && (
            <>
              <p className="type-sm font-bold">{tooltipData.node.label}</p>
              <p className="type-xs text-gray-500">{tooltipData.node.type}</p>
            </>
          )}
          {tooltipData.edge && (
            <>
              <p className="type-sm font-bold">{tooltipData.edge.label}</p>
              <p className="type-xs text-gray-500">
                Confidence: {(tooltipData.edge.confidence * 100).toFixed(0)}%
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
