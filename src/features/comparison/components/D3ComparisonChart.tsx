'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useRef } from 'react';
import { select } from 'd3-selection';
import { scaleBand, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { format } from 'd3-format';

interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  yearsInOffice: number;
  committees: Array<{ name: string }>;
  votingRecord: {
    totalVotes: number;
    partyLineVotes: number;
    missedVotes: number;
  };
  billsSponsored: number;
  billsCosponsored: number;
}

interface D3ComparisonChartProps {
  representatives: Representative[];
  chartType: 'voting' | 'committees' | 'bills' | 'overview';
}

function getPartyColor(party: string): string {
  if (party === 'Republican') return '#e11d07';
  if (party === 'Democrat' || party === 'Democratic') return '#0a9338';
  if (party === 'Independent') return '#3ea2d4';
  return '#6b7280';
}

export default function D3ComparisonChart({ representatives, chartType }: D3ComparisonChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || representatives.length === 0) return;

    const containerWidth = containerRef.current.clientWidth;
    const svgWidth = Math.min(containerWidth, 900);
    const svgHeight = 360;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', svgWidth).attr('height', svgHeight);

    const margin = { top: 32, right: 24, bottom: 64, left: 48 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    let data: Array<{ name: string; value: number; party: string }> = [];

    switch (chartType) {
      case 'voting':
        data = representatives.map(rep => ({
          name: rep.name.split(' ').slice(-1)[0] || rep.name,
          value: rep.votingRecord.totalVotes || 0,
          party: rep.party,
        }));
        break;
      case 'committees':
        data = representatives.map(rep => ({
          name: rep.name.split(' ').slice(-1)[0] || rep.name,
          value: rep.committees?.length || 0,
          party: rep.party,
        }));
        break;
      case 'bills':
        data = representatives.map(rep => ({
          name: rep.name.split(' ').slice(-1)[0] || rep.name,
          value: (rep.billsSponsored || 0) + (rep.billsCosponsored || 0),
          party: rep.party,
        }));
        break;
      case 'overview':
        data = representatives.map(rep => ({
          name: rep.name.split(' ').slice(-1)[0] || rep.name,
          value: rep.yearsInOffice || 0,
          party: rep.party,
        }));
        break;
    }

    const xScale = scaleBand()
      .domain(data.map(d => d.name))
      .range([0, width])
      .padding(0.3);

    const yScale = scaleLinear()
      .domain([0, Math.max(...data.map(d => d.value), 1)])
      .nice()
      .range([height, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        axisLeft(yScale)
          .tickSize(-width)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-dasharray', '2,2');
    g.select('.grid .domain').remove();

    // Bars
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.name)!)
      .attr('width', xScale.bandwidth())
      .attr('y', d => yScale(d.value))
      .attr('height', d => height - yScale(d.value))
      .attr('fill', d => getPartyColor(d.party));

    // Value labels on bars
    g.selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .attr('x', d => xScale(d.name)! + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.value) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#374151')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .text(d => format(',')(d.value));

    // X-axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(axisBottom(xScale))
      .selectAll('text')
      .attr('font-size', '13px')
      .attr('font-weight', '500');

    // Y-axis
    g.append('g')
      .call(axisLeft(yScale).ticks(5).tickFormat(format(',')))
      .selectAll('text')
      .attr('font-size', '11px');

    // Chart title
    const titles: Record<string, string> = {
      voting: 'Total Votes Cast',
      committees: 'Committee Memberships',
      bills: 'Bills Sponsored + Cosponsored',
      overview: 'Years in Office',
    };

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', 18)
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', '#374151')
      .text(titles[chartType] || 'Comparison');
  }, [representatives, chartType]);

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      <svg ref={svgRef} className="mx-auto" />
    </div>
  );
}
