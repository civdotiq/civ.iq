'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useRef, memo } from 'react';
// Modular D3 imports for optimal bundle size
import { select } from 'd3-selection';
import { scaleOrdinal } from 'd3-scale';
import { forceSimulation, forceManyBody, forceCenter, forceLink, forceCollide } from 'd3-force';
import { drag } from 'd3-drag';
import type { SimulationNodeDatum, SimulationLinkDatum, D3DragEvent } from 'd3';

interface NetworkNode extends SimulationNodeDatum {
  id: string;
  name: string;
  party: string;
  group: number;
}

interface NetworkLink extends SimulationLinkDatum<NetworkNode> {
  source: string | NetworkNode;
  target: string | NetworkNode;
  value: number;
}

interface RepresentativeNetworkProps {
  nodes: NetworkNode[];
  links: NetworkLink[];
  width?: number;
  height?: number;
}

export const RepresentativeNetwork = memo(function RepresentativeNetwork({
  nodes,
  links,
  width = 800,
  height = 600,
}: RepresentativeNetworkProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    const colorScale = scaleOrdinal<string>()
      .domain(['Democratic', 'Republican', 'Independent'])
      .range(['#3b82f6', '#ef4444', '#8b5cf6']);

    // Create force simulation
    const simulation = forceSimulation<NetworkNode>(nodes)
      .force(
        'link',
        forceLink<NetworkNode, NetworkLink>(links).id(d => d.id)
      )
      .force('charge', forceManyBody().strength(-300))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collision', forceCollide().radius(30));

    // Add links
    const link = svg
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.value));

    // Add nodes
    const node = svg
      .append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', 8)
      .attr('fill', d => colorScale(d.party))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .call(
        drag<SVGCircleElement, NetworkNode>()
          .on('start', (event: D3DragEvent<SVGCircleElement, NetworkNode, unknown>, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event: D3DragEvent<SVGCircleElement, NetworkNode, unknown>, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event: D3DragEvent<SVGCircleElement, NetworkNode, unknown>, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Add labels
    const label = svg
      .append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text(d => d.name.split(' ').pop() || d.name) // Show last name only
      .style('font-size', '10px')
      .style('text-anchor', 'middle')
      .style('pointer-events', 'none');

    // Add tooltips
    node
      .append('title')
      .text(
        d =>
          `${d.name}\n${d.party}\nConnections: ${links.filter(l => l.source === d || l.target === d).length}`
      );

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as NetworkNode).x || 0)
        .attr('y1', d => (d.source as NetworkNode).y || 0)
        .attr('x2', d => (d.target as NetworkNode).x || 0)
        .attr('y2', d => (d.target as NetworkNode).y || 0);

      node.attr('cx', d => d.x || 0).attr('cy', d => d.y || 0);

      label.attr('x', d => d.x || 0).attr('y', d => (d.y || 0) - 12);
    });

    // Add legend
    const legend = svg.append('g').attr('class', 'legend').attr('transform', 'translate(20, 20)');

    const legendData = ['Democratic', 'Republican', 'Independent'];
    const legendItems = legend
      .selectAll('.legend-item')
      .data(legendData)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (_, i) => `translate(0, ${i * 25})`);

    legendItems
      .append('circle')
      .attr('cx', 8)
      .attr('cy', 8)
      .attr('r', 8)
      .attr('fill', d => colorScale(d));

    legendItems
      .append('text')
      .attr('x', 25)
      .attr('y', 8)
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .text(d => d);

    // Cleanup function
    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height]);

  return (
    <div className="representative-network">
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
});
