'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useRef } from 'react';
// Modular D3 imports for optimal bundle size
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

export default function D3ComparisonChart({ representatives, chartType }: D3ComparisonChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || representatives.length === 0) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const margin = { top: 20, right: 30, bottom: 80, left: 120 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.bottom - margin.top;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Data preparation based on chart type
    let data: Array<{ name: string; value: number; party: string }> = [];

    switch (chartType) {
      case 'voting':
        data = representatives.map(rep => ({
          name: rep.name.split(' ').slice(-1)[0] || rep.name, // Last name only
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

    // Scales
    const xScale = scaleBand()
      .domain(data.map(d => d.name))
      .range([0, width])
      .padding(0.2);

    const yScale = scaleLinear()
      .domain([0, Math.max(...data.map(d => d.value), 1)])
      .nice()
      .range([height, 0]);

    // Party colors
    const getPartyColor = (party: string) => {
      switch (party) {
        case 'Republican':
          return '#ef4444';
        case 'Democrat':
          return '#3b82f6';
        case 'Independent':
          return '#8b5cf6';
        default:
          return '#6b7280';
      }
    };

    // Draw bars
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.name)!)
      .attr('width', xScale.bandwidth())
      .attr('y', d => yScale(d.value))
      .attr('height', d => height - yScale(d.value))
      .attr('fill', d => getPartyColor(d.party))
      .attr('opacity', 0.8)
      .on('mouseover', function (event, d) {
        select(this).attr('opacity', 1);

        // Simple tooltip
        const tooltip = g.append('g').attr('class', 'tooltip');

        tooltip
          .append('text')
          .attr('x', xScale(d.name)! + xScale.bandwidth() / 2)
          .attr('y', yScale(d.value) - 10)
          .attr('text-anchor', 'middle')
          .attr('fill', '#374151')
          .attr('font-size', '14px')
          .attr('font-weight', 'bold')
          .text(format(',')(d.value));
      })
      .on('mouseout', function () {
        select(this).attr('opacity', 0.8);
        g.select('.tooltip').remove();
      });

    // X-axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(axisBottom(xScale))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .attr('font-size', '12px');

    // Y-axis
    g.append('g')
      .call(axisLeft(yScale).tickFormat(format(',')))
      .selectAll('text')
      .attr('font-size', '12px');

    // Chart title
    const getChartTitle = () => {
      switch (chartType) {
        case 'voting':
          return 'Total Votes Cast';
        case 'committees':
          return 'Committee Memberships';
        case 'bills':
          return 'Bills Sponsored/Cosponsored';
        case 'overview':
          return 'Years in Office';
        default:
          return 'Comparison';
      }
    };

    svg
      .append('text')
      .attr('x', width / 2 + margin.left)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text(getChartTitle());
  }, [representatives, chartType]);

  return (
    <div className="w-full overflow-x-auto">
      <svg ref={svgRef} width="800" height="400" className="mx-auto" />
    </div>
  );
}
