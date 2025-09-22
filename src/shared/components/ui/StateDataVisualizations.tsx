'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useRef, useState } from 'react';
// Modular D3 imports for optimal bundle size
import { select } from 'd3-selection';
import { scaleBand, scaleLinear, scaleOrdinal } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { line as d3Line, curveMonotoneX } from 'd3-shape';
import { max } from 'd3-array';

interface StateVisualizationProps {
  data: unknown;
  type:
    | 'chamber-composition'
    | 'bill-flow'
    | 'voting-patterns'
    | 'party-alignment'
    | 'legislative-activity';
  width?: number;
  height?: number;
  className?: string;
}

interface ChamberCompositionData {
  chamber: 'upper' | 'lower';
  name: string;
  democraticSeats: number;
  republicanSeats: number;
  otherSeats: number;
  totalSeats: number;
}

interface BillFlowData {
  status: string;
  count: number;
  chamber?: 'upper' | 'lower';
}

interface VotingPatternsData {
  legislator: string;
  party: string;
  partyLineVotes: number;
  crossoverVotes: number;
  totalVotes: number;
}

interface _PartyAlignmentData {
  bill: string;
  democraticSupport: number;
  republicanSupport: number;
  bipartisan: boolean;
}

interface LegislativeActivityData {
  month: string;
  billsIntroduced: number;
  billsPassed: number;
  committeeMeetings: number;
}

// Chamber Composition Visualization
function ChamberComposition({
  data,
  width = 400,
  height = 300,
}: {
  data: ChamberCompositionData[];
  width?: number;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Create stacked bar chart
    const chambers = data.map(d => d.name);
    const yScale = scaleBand().domain(chambers).range([0, innerHeight]).padding(0.3);

    const xScale = scaleLinear()
      .domain([0, max(data, d => d.totalSeats) || 100])
      .range([0, innerWidth]);

    // Stack data
    const stackedData = data.map(d => ({
      chamber: d.name,
      democratic: d.democraticSeats,
      republican: d.republicanSeats,
      other: d.otherSeats,
      total: d.totalSeats,
    }));

    // Draw Democratic bars
    g.selectAll('.dem-bar')
      .data(stackedData)
      .enter()
      .append('rect')
      .attr('class', 'dem-bar')
      .attr('x', 0)
      .attr('y', d => yScale(d.chamber)!)
      .attr('width', d => xScale(d.democratic))
      .attr('height', yScale.bandwidth())
      .attr('fill', '#3B82F6');

    // Draw Republican bars
    g.selectAll('.rep-bar')
      .data(stackedData)
      .enter()
      .append('rect')
      .attr('class', 'rep-bar')
      .attr('x', d => xScale(d.democratic))
      .attr('y', d => yScale(d.chamber)!)
      .attr('width', d => xScale(d.republican))
      .attr('height', yScale.bandwidth())
      .attr('fill', '#EF4444');

    // Draw Other bars
    g.selectAll('.other-bar')
      .data(stackedData)
      .enter()
      .append('rect')
      .attr('class', 'other-bar')
      .attr('x', d => xScale(d.democratic + d.republican))
      .attr('y', d => yScale(d.chamber)!)
      .attr('width', d => xScale(d.other))
      .attr('height', yScale.bandwidth())
      .attr('fill', '#8B5CF6');

    // Add seat count labels
    g.selectAll('.seat-label')
      .data(stackedData)
      .enter()
      .append('text')
      .attr('class', 'seat-label')
      .attr('x', d => xScale(d.democratic / 2))
      .attr('y', d => yScale(d.chamber)! + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(d => `${d.democratic}D`);

    g.selectAll('.rep-label')
      .data(stackedData)
      .enter()
      .append('text')
      .attr('class', 'rep-label')
      .attr('x', d => xScale(d.democratic + d.republican / 2))
      .attr('y', d => yScale(d.chamber)! + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(d => `${d.republican}R`);

    // Y axis
    g.append('g').call(axisLeft(yScale)).selectAll('text').style('font-size', '12px');

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(axisBottom(xScale))
      .selectAll('text')
      .style('font-size', '12px');

    // Add title
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text('Chamber Composition');
  }, [data, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
}

// Bill Flow Sankey Diagram
function BillFlow({
  data,
  width = 600,
  height = 400,
}: {
  data: BillFlowData[];
  width?: number;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Create a simplified flow diagram
    const statusOrder = [
      'introduced',
      'committee',
      'floor',
      'passed_chamber',
      'other_chamber',
      'passed_both',
      'signed',
    ];
    const sortedData = data.sort(
      (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
    );

    const xScale = scaleBand()
      .domain(sortedData.map(d => d.status))
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = scaleLinear()
      .domain([0, max(sortedData, d => d.count) || 100])
      .range([innerHeight, 0]);

    const colorScale = scaleOrdinal()
      .domain(statusOrder)
      .range(['#FEF3C7', '#FDE68A', '#FCD34D', '#F59E0B', '#D97706', '#92400E', '#059669']);

    // Draw bars
    g.selectAll('.bill-bar')
      .data(sortedData)
      .enter()
      .append('rect')
      .attr('class', 'bill-bar')
      .attr('x', d => xScale(d.status)!)
      .attr('y', d => yScale(d.count))
      .attr('width', xScale.bandwidth())
      .attr('height', d => innerHeight - yScale(d.count))
      .attr('fill', d => colorScale(d.status) as string)
      .attr('rx', 4);

    // Add count labels
    g.selectAll('.count-label')
      .data(sortedData)
      .enter()
      .append('text')
      .attr('class', 'count-label')
      .attr('x', d => xScale(d.status)! + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.count) - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(d => d.count);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(axisBottom(xScale))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '10px');

    // Y axis
    g.append('g').call(axisLeft(yScale)).selectAll('text').style('font-size', '12px');

    // Add title
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text('Bill Progress Flow');
  }, [data, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
}

// Voting Patterns Scatter Plot
function VotingPatterns({
  data,
  width = 500,
  height = 400,
}: {
  data: VotingPatternsData[];
  width?: number;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Calculate party line percentage
    const processedData = data.map(d => ({
      ...d,
      partyLinePercentage: d.totalVotes > 0 ? (d.partyLineVotes / d.totalVotes) * 100 : 0,
      crossoverPercentage: d.totalVotes > 0 ? (d.crossoverVotes / d.totalVotes) * 100 : 0,
    }));

    const xScale = scaleLinear().domain([0, 100]).range([0, innerWidth]);

    const yScale = scaleLinear()
      .domain([0, max(processedData, d => d.totalVotes) || 100])
      .range([innerHeight, 0]);

    const colorScale = scaleOrdinal()
      .domain(['Democratic', 'Republican', 'Independent'])
      .range(['#3B82F6', '#EF4444', '#8B5CF6']);

    // Draw circles
    g.selectAll('.voting-circle')
      .data(processedData)
      .enter()
      .append('circle')
      .attr('class', 'voting-circle')
      .attr('cx', d => xScale(d.partyLinePercentage))
      .attr('cy', d => yScale(d.totalVotes))
      .attr('r', 6)
      .attr('fill', d => colorScale(d.party) as string)
      .attr('opacity', 0.7)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(axisBottom(xScale))
      .selectAll('text')
      .style('font-size', '12px');

    // Y axis
    g.append('g').call(axisLeft(yScale)).selectAll('text').style('font-size', '12px');

    // Axis labels
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 45)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .text('Party Line Voting %');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .text('Total Votes');

    // Legend
    const legend = g.append('g').attr('transform', `translate(${innerWidth - 120}, 20)`);

    ['Democratic', 'Republican', 'Independent'].forEach((party, i) => {
      const legendRow = legend.append('g').attr('transform', `translate(0, ${i * 20})`);

      legendRow
        .append('circle')
        .attr('r', 6)
        .attr('fill', colorScale(party) as string);

      legendRow
        .append('text')
        .attr('x', 15)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .attr('font-size', '12px')
        .text(party);
    });

    // Add title
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text('Voting Patterns by Party');
  }, [data, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
}

// Legislative Activity Timeline
function LegislativeActivity({
  data,
  width = 700,
  height = 300,
}: {
  data: LegislativeActivityData[];
  width?: number;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = scaleBand()
      .domain(data.map(d => d.month))
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = scaleLinear()
      .domain([
        0,
        max(data, d => Math.max(d.billsIntroduced, d.billsPassed, d.committeeMeetings)) || 100,
      ])
      .range([innerHeight, 0]);

    const lineGenerator = d3Line<LegislativeActivityData>()
      .x(d => xScale(d.month)! + xScale.bandwidth() / 2)
      .y(d => yScale(d.billsIntroduced))
      .curve(curveMonotoneX);

    // Draw introduced bills line
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#3B82F6')
      .attr('stroke-width', 3)
      .attr('d', lineGenerator);

    // Draw passed bills line
    const passedLine = d3Line<LegislativeActivityData>()
      .x(d => xScale(d.month)! + xScale.bandwidth() / 2)
      .y(d => yScale(d.billsPassed))
      .curve(curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#059669')
      .attr('stroke-width', 3)
      .attr('d', passedLine);

    // Draw committee meetings bars
    g.selectAll('.committee-bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'committee-bar')
      .attr('x', d => xScale(d.month)!)
      .attr('y', d => yScale(d.committeeMeetings))
      .attr('width', xScale.bandwidth())
      .attr('height', d => innerHeight - yScale(d.committeeMeetings))
      .attr('fill', '#F59E0B')
      .attr('opacity', 0.6);

    // Add dots for line points
    g.selectAll('.intro-dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'intro-dot')
      .attr('cx', d => xScale(d.month)! + xScale.bandwidth() / 2)
      .attr('cy', d => yScale(d.billsIntroduced))
      .attr('r', 4)
      .attr('fill', '#3B82F6');

    g.selectAll('.passed-dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'passed-dot')
      .attr('cx', d => xScale(d.month)! + xScale.bandwidth() / 2)
      .attr('cy', d => yScale(d.billsPassed))
      .attr('r', 4)
      .attr('fill', '#059669');

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(axisBottom(xScale))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '12px');

    // Y axis
    g.append('g').call(axisLeft(yScale)).selectAll('text').style('font-size', '12px');

    // Legend
    const legend = g.append('g').attr('transform', `translate(20, 20)`);

    const legendData = [
      { label: 'Bills Introduced', color: '#3B82F6', type: 'line' },
      { label: 'Bills Passed', color: '#059669', type: 'line' },
      { label: 'Committee Meetings', color: '#F59E0B', type: 'bar' },
    ];

    legendData.forEach((item, i) => {
      const legendRow = legend.append('g').attr('transform', `translate(0, ${i * 20})`);

      if (item.type === 'line') {
        legendRow
          .append('line')
          .attr('x1', 0)
          .attr('x2', 20)
          .attr('y1', 0)
          .attr('y2', 0)
          .attr('stroke', item.color)
          .attr('stroke-width', 3);
      } else {
        legendRow
          .append('rect')
          .attr('width', 20)
          .attr('height', 10)
          .attr('y', -5)
          .attr('fill', item.color)
          .attr('opacity', 0.6);
      }

      legendRow
        .append('text')
        .attr('x', 25)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .attr('font-size', '12px')
        .text(item.label);
    });

    // Add title
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text('Legislative Activity Timeline');
  }, [data, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
}

// Main State Data Visualizations Component
export default function StateDataVisualizations({
  data,
  type,
  width = 500,
  height = 400,
  className = '',
}: StateVisualizationProps) {
  const [error, setError] = useState<string | null>(null);

  if (!data) {
    return (
      <div
        className={`flex items-center justify-center bg-white border-2 border-gray-300 ${className}`}
        style={{ width, height }}
      >
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  try {
    switch (type) {
      case 'chamber-composition':
        return (
          <div className={className}>
            <ChamberComposition
              data={data as ChamberCompositionData[]}
              width={width}
              height={height}
            />
          </div>
        );

      case 'bill-flow':
        return (
          <div className={className}>
            <BillFlow data={data as BillFlowData[]} width={width} height={height} />
          </div>
        );

      case 'voting-patterns':
        return (
          <div className={className}>
            <VotingPatterns data={data as VotingPatternsData[]} width={width} height={height} />
          </div>
        );

      case 'legislative-activity':
        return (
          <div className={className}>
            <LegislativeActivity
              data={data as LegislativeActivityData[]}
              width={width}
              height={height}
            />
          </div>
        );

      default:
        return (
          <div
            className={`flex items-center justify-center bg-white border-2 border-gray-300 ${className}`}
            style={{ width, height }}
          >
            <p className="text-gray-500">Visualization type not supported</p>
          </div>
        );
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Visualization error');
    return (
      <div
        className={`flex items-center justify-center bg-red-100 ${className}`}
        style={{ width, height }}
      >
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }
}

// Export individual visualization components
export { ChamberComposition, BillFlow, VotingPatterns, LegislativeActivity };

// Export types for use in other components
export type {
  ChamberCompositionData,
  BillFlowData,
  VotingPatternsData,
  LegislativeActivityData,
  StateVisualizationProps,
};
