'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useRef } from 'react';
// Modular D3 imports for optimal bundle size
import { select } from 'd3-selection';
import { scaleBand, scaleOrdinal } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';

interface VotingData {
  representative: string;
  bill: string;
  vote: 'Yes' | 'No' | 'Not Voting';
  category: string;
}

interface VotingPatternHeatmapProps {
  data: VotingData[];
  width?: number;
  height?: number;
}

export function VotingPatternHeatmap({
  data,
  width = 800,
  height = 400,
}: VotingPatternHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 50, right: 50, bottom: 100, left: 150 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const representatives = Array.from(new Set(data.map(d => d.representative)));
    const bills = Array.from(new Set(data.map(d => d.bill)));

    const xScale = scaleBand().domain(bills).range([0, innerWidth]).padding(0.1);

    const yScale = scaleBand().domain(representatives).range([0, innerHeight]).padding(0.1);

    const colorScale = scaleOrdinal<string>()
      .domain(['Yes', 'No', 'Not Voting'])
      .range(['#22c55e', '#ef4444', '#9ca3af']);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Add rectangles for heatmap
    g.selectAll('.cell')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'cell')
      .attr('x', d => xScale(d.bill) || 0)
      .attr('y', d => yScale(d.representative) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.vote))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    // Add x-axis
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(axisBottom(xScale))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');

    // Add y-axis
    g.append('g').attr('class', 'y-axis').call(axisLeft(yScale));

    // Add title
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text('Voting Patterns by Representative');

    // Add legend
    const legend = svg
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 120}, 50)`);

    const legendData = ['Yes', 'No', 'Not Voting'];
    const legendItems = legend
      .selectAll('.legend-item')
      .data(legendData)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (_, i) => `translate(0, ${i * 25})`);

    legendItems
      .append('rect')
      .attr('width', 18)
      .attr('height', 18)
      .attr('fill', d => colorScale(d));

    legendItems
      .append('text')
      .attr('x', 25)
      .attr('y', 9)
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .text(d => d);
  }, [data, width, height]);

  return (
    <div className="voting-heatmap">
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
}
