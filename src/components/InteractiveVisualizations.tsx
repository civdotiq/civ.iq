'use client';


/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
 */

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

// Voting Pattern Heatmap
export function VotingPatternHeatmap({ 
  data,
  width = 800,
  height = 400 
}: {
  data: Array<{
    representative: string;
    bill: string;
    vote: 'Yes' | 'No' | 'Not Voting';
    category: string;
  }>;
  width?: number;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: '' });

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 100, right: 50, bottom: 100, left: 150 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const representatives = Array.from(new Set(data.map(d => d.representative)));
    const bills = Array.from(new Set(data.map(d => d.bill)));

    const xScale = d3.scaleBand()
      .domain(bills)
      .range([0, innerWidth])
      .padding(0.05);

    const yScale = d3.scaleBand()
      .domain(representatives)
      .range([0, innerHeight])
      .padding(0.05);

    const colorScale = d3.scaleOrdinal<string>()
      .domain(['Yes', 'No', 'Not Voting'])
      .range(['#10b981', '#ef4444', '#9ca3af']);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add cells
    g.selectAll('.cell')
      .data(data)
      .enter().append('rect')
      .attr('class', 'cell')
      .attr('x', d => xScale(d.bill) || 0)
      .attr('y', d => yScale(d.representative) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.vote))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke', '#000').attr('stroke-width', 2);
        const [x, y] = d3.pointer(event, svg.node());
        setTooltip({
          visible: true,
          x,
          y: y - 10,
          content: `${d.representative} voted ${d.vote} on ${d.bill}`
        });
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1);
        setTooltip({ visible: false, x: 0, y: 0, content: '' });
      });

    // Add x-axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em');

    // Add y-axis
    g.append('g')
      .call(d3.axisLeft(yScale));

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - margin.right - 100}, ${margin.top})`);

    const legendItems = ['Yes', 'No', 'Not Voting'];
    legendItems.forEach((item, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 25})`);

      legendRow.append('rect')
        .attr('width', 20)
        .attr('height', 20)
        .attr('fill', colorScale(item));

      legendRow.append('text')
        .attr('x', 25)
        .attr('y', 15)
        .text(item)
        .style('font-size', '12px');
    });
  }, [data, width, height]);

  return (
    <div className="relative">
      <svg ref={svgRef} width={width} height={height} />
      {tooltip.visible && (
        <div
          className="absolute bg-gray-900 text-white px-2 py-1 rounded text-sm pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}

// Network Graph for Representative Relationships
export function RepresentativeNetwork({
  nodes,
  links,
  width = 800,
  height = 600
}: {
  nodes: Array<{
    id: string;
    name: string;
    party: string;
    group: number;
  }>;
  links: Array<{
    source: string;
    target: string;
    value: number;
  }>;
  width?: number;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(50))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Add links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: any) => Math.sqrt(d.value));

    // Add nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    node.append('circle')
      .attr('r', 20)
      .attr('fill', (d: any) => d.party === 'Democratic' ? '#3b82f6' : '#ef4444')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    node.append('text')
      .text((d: any) => d.name.split(' ').pop())
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('font-size', '10px')
      .style('fill', '#fff');

    // Add tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0,0,0,0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px');

    node.on('mouseover', function(event, d: any) {
      tooltip.transition().duration(200).style('opacity', .9);
      tooltip.html(`${d.name}<br/>Party: ${d.party}`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', function() {
      tooltip.transition().duration(500).style('opacity', 0);
    });

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      tooltip.remove();
    };
  }, [nodes, links, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
}

// Animated Campaign Finance Flow
export function CampaignFinanceFlow({
  data,
  width = 800,
  height = 500
}: {
  data: {
    sources: Array<{ name: string; amount: number; type: string }>;
    spending: Array<{ category: string; amount: number }>;
  };
  width?: number;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create nodes
    const totalRaised = data.sources.reduce((sum, s) => sum + s.amount, 0);
    const totalSpent = data.spending.reduce((sum, s) => sum + s.amount, 0);

    // Source nodes (left)
    let sourceY = 50;
    const sourceNodes = data.sources.map(source => {
      const node = {
        name: source.name,
        amount: source.amount,
        type: 'source',
        x: 100,
        y: sourceY,
        height: (source.amount / totalRaised) * 300
      };
      sourceY += node.height + 10;
      return node;
    });

    // Central node
    const centralNode = {
      name: 'Campaign Fund',
      amount: totalRaised,
      type: 'central',
      x: innerWidth / 2,
      y: innerHeight / 2,
      radius: 60
    };

    // Spending nodes (right)
    let spendingY = 50;
    const spendingNodes = data.spending.map(spending => {
      const node = {
        name: spending.category,
        amount: spending.amount,
        type: 'spending',
        x: innerWidth - 100,
        y: spendingY,
        height: (spending.amount / totalSpent) * 300
      };
      spendingY += node.height + 10;
      return node;
    });

    // Draw source nodes
    const sources = g.selectAll('.source-node')
      .data(sourceNodes)
      .enter().append('g')
      .attr('class', 'source-node');

    sources.append('rect')
      .attr('x', d => d.x - 80)
      .attr('y', d => d.y)
      .attr('width', 160)
      .attr('height', d => d.height)
      .attr('fill', '#3b82f6')
      .attr('opacity', 0.7)
      .attr('rx', 4);

    sources.append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y + d.height / 2)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .text(d => d.name)
      .style('font-size', '12px')
      .style('fill', '#fff');

    sources.append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y + d.height / 2 + 15)
      .attr('text-anchor', 'middle')
      .text(d => `$${(d.amount / 1000000).toFixed(1)}M`)
      .style('font-size', '11px')
      .style('fill', '#fff');

    // Draw central node
    const central = g.append('g');
    
    central.append('circle')
      .attr('cx', centralNode.x)
      .attr('cy', centralNode.y)
      .attr('r', centralNode.radius)
      .attr('fill', '#10b981')
      .attr('stroke', '#fff')
      .attr('stroke-width', 3);

    central.append('text')
      .attr('x', centralNode.x)
      .attr('y', centralNode.y - 10)
      .attr('text-anchor', 'middle')
      .text('Total Raised')
      .style('font-size', '14px')
      .style('font-weight', 'bold');

    central.append('text')
      .attr('x', centralNode.x)
      .attr('y', centralNode.y + 10)
      .attr('text-anchor', 'middle')
      .text(`$${(totalRaised / 1000000).toFixed(1)}M`)
      .style('font-size', '16px')
      .style('font-weight', 'bold');

    // Draw spending nodes
    const spending = g.selectAll('.spending-node')
      .data(spendingNodes)
      .enter().append('g')
      .attr('class', 'spending-node');

    spending.append('rect')
      .attr('x', d => d.x - 80)
      .attr('y', d => d.y)
      .attr('width', 160)
      .attr('height', d => d.height)
      .attr('fill', '#ef4444')
      .attr('opacity', 0.7)
      .attr('rx', 4);

    spending.append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y + d.height / 2)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .text(d => d.name)
      .style('font-size', '12px')
      .style('fill', '#fff');

    spending.append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y + d.height / 2 + 15)
      .attr('text-anchor', 'middle')
      .text(d => `$${(d.amount / 1000000).toFixed(1)}M`)
      .style('font-size', '11px')
      .style('fill', '#fff');

    // Animated flow lines
    function createFlow(source: any, target: any, isSpending = false) {
      const path = g.append('path')
        .attr('d', () => {
          const sx = isSpending ? centralNode.x + centralNode.radius : source.x + 80;
          const sy = isSpending ? centralNode.y : source.y + source.height / 2;
          const tx = isSpending ? target.x - 80 : centralNode.x - centralNode.radius;
          const ty = isSpending ? target.y + target.height / 2 : centralNode.y;
          
          return `M ${sx} ${sy} Q ${(sx + tx) / 2} ${(sy + ty) / 2} ${tx} ${ty}`;
        })
        .attr('stroke', isSpending ? '#ef4444' : '#3b82f6')
        .attr('stroke-width', Math.max(2, (source.amount / totalRaised) * 20))
        .attr('fill', 'none')
        .attr('opacity', 0.3);

      // Animate particles along path
      const particle = g.append('circle')
        .attr('r', 4)
        .attr('fill', isSpending ? '#ef4444' : '#3b82f6');

      function animate() {
        particle
          .attr('opacity', 1)
          .transition()
          .duration(2000)
          .ease(d3.easeLinear)
          .attrTween('transform', () => {
            const interpolate = d3.interpolate(0, 1);
            return (t: number) => {
              const p = path.node()!.getPointAtLength(t * path.node()!.getTotalLength());
              return `translate(${p.x},${p.y})`;
            };
          })
          .on('end', () => {
            particle.attr('opacity', 0);
            setTimeout(animate, Math.random() * 2000);
          });
      }

      animate();
    }

    // Create flows
    sourceNodes.forEach(source => createFlow(source, centralNode));
    spendingNodes.forEach(spending => createFlow(centralNode, spending, true));

  }, [data, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
}

// Legislative Success Funnel
export function LegislativeSuccessFunnel({
  data,
  width = 600,
  height = 400
}: {
  data: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
  width?: number;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const maxCount = Math.max(...data.map(d => d.count));
    const funnelWidth = innerWidth * 0.8;
    const segmentHeight = innerHeight / data.length;

    // Create gradient
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'funnel-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('style', 'stop-color:#3b82f6;stop-opacity:1');

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('style', 'stop-color:#1e40af;stop-opacity:1');

    // Draw funnel segments
    data.forEach((d, i) => {
      const topWidth = i === 0 ? funnelWidth : (data[i - 1].count / maxCount) * funnelWidth;
      const bottomWidth = (d.count / maxCount) * funnelWidth;
      const x = (innerWidth - topWidth) / 2;
      const y = i * segmentHeight;

      const trapezoid = [
        { x: x, y: y },
        { x: x + topWidth, y: y },
        { x: (innerWidth - bottomWidth) / 2 + bottomWidth, y: y + segmentHeight },
        { x: (innerWidth - bottomWidth) / 2, y: y + segmentHeight }
      ];

      g.append('path')
        .datum(trapezoid)
        .attr('d', d3.line<any>()
          .x(d => d.x)
          .y(d => d.y)
          .curve(d3.curveLinearClosed))
        .attr('fill', 'url(#funnel-gradient)')
        .attr('opacity', 0.8 - i * 0.1)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      // Add text
      g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', y + segmentHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('dy', '-.5em')
        .text(d.stage)
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#fff');

      g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', y + segmentHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('dy', '.8em')
        .text(`${d.count} (${d.percentage}%)`)
        .style('font-size', '12px')
        .style('fill', '#fff');
    });

  }, [data, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
}

// Interactive District Map
export function InteractiveDistrictMap({
  districts,
  selectedDistrict,
  onDistrictClick,
  width = 800,
  height = 600
}: {
  districts: Array<{
    id: string;
    name: string;
    party: string;
    competitiveness: number;
    population: number;
  }>;
  selectedDistrict?: string;
  onDistrictClick?: (districtId: string) => void;
  width?: number;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // This is a placeholder - in production, you'd load actual GeoJSON data
    const g = svg.append('g');

    // Create a grid layout for demonstration
    const cols = Math.ceil(Math.sqrt(districts.length));
    const rows = Math.ceil(districts.length / cols);
    const cellWidth = width / cols;
    const cellHeight = height / rows;

    districts.forEach((district, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * cellWidth;
      const y = row * cellHeight;

      const group = g.append('g')
        .attr('class', 'district')
        .style('cursor', 'pointer');

      const rect = group.append('rect')
        .attr('x', x + 5)
        .attr('y', y + 5)
        .attr('width', cellWidth - 10)
        .attr('height', cellHeight - 10)
        .attr('fill', district.party === 'Democratic' ? '#3b82f6' : '#ef4444')
        .attr('opacity', 0.3 + (district.competitiveness / 100) * 0.7)
        .attr('stroke', selectedDistrict === district.id ? '#000' : '#fff')
        .attr('stroke-width', selectedDistrict === district.id ? 3 : 1)
        .attr('rx', 4);

      group.append('text')
        .attr('x', x + cellWidth / 2)
        .attr('y', y + cellHeight / 2 - 10)
        .attr('text-anchor', 'middle')
        .text(district.name)
        .style('font-size', '12px')
        .style('font-weight', 'bold');

      group.append('text')
        .attr('x', x + cellWidth / 2)
        .attr('y', y + cellHeight / 2 + 10)
        .attr('text-anchor', 'middle')
        .text(`Pop: ${(district.population / 1000).toFixed(0)}k`)
        .style('font-size', '10px');

      group.on('click', () => {
        if (onDistrictClick) {
          onDistrictClick(district.id);
        }
      })
      .on('mouseover', function() {
        rect.attr('opacity', 0.8);
      })
      .on('mouseout', function() {
        rect.attr('opacity', 0.3 + (district.competitiveness / 100) * 0.7);
      });
    });

    // Add zoom
    const zoom = d3.zoom()
      .scaleExtent([0.5, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

  }, [districts, selectedDistrict, onDistrictClick, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
}