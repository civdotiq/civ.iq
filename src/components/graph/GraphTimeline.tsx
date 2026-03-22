/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import type { GraphEdge, GraphEdgeType } from '@/types/graph';

export interface TemporalPatternDisplay {
  event1EdgeId: string;
  event2EdgeId: string;
  daysBetween: number;
  significance: 'low' | 'medium' | 'high';
  description: string;
  amountInvolved?: number;
}

interface GraphTimelineProps {
  edges: GraphEdge[];
  selectedEdgeId: string | null;
  onEdgeClick: (id: string) => void;
  temporalPatterns?: TemporalPatternDisplay[];
}

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
  located_in_district: '#6b7280',
  violates_regulation: '#ef4444',
  receives_grant: '#8b5cf6',
  complained_against: '#f59e0b',
  declared_in: '#ef4444',
};

const SIGNIFICANCE_COLORS: Record<string, string> = {
  high: '#e11d07',
  medium: '#d97706',
  low: '#9ca3af',
};

const SIGNIFICANCE_ARC_HEIGHT: Record<string, number> = {
  high: 30,
  medium: 20,
  low: 12,
};

const PADDING = 40;
const DOT_RADIUS = 5;
const TIMELINE_HEIGHT = 80;

export function GraphTimeline({
  edges,
  selectedEdgeId,
  onEdgeClick,
  temporalPatterns,
}: GraphTimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(800);
  const [hoveredArc, setHoveredArc] = useState<{
    pattern: TemporalPatternDisplay;
    x: number;
    y: number;
  } | null>(null);

  // Filter to edges with temporal data
  const temporalEdges = useMemo(
    () =>
      edges
        .filter(e => e.temporal?.date)
        .sort((a, b) => (a.temporal!.date > b.temporal!.date ? 1 : -1)),
    [edges]
  );

  // Build a lookup map for edge positions
  const edgeMap = useMemo(() => {
    const map = new Map<string, GraphEdge>();
    for (const edge of temporalEdges) {
      map.set(edge.id, edge);
    }
    return map;
  }, [temporalEdges]);

  // Responsive width
  useEffect(() => {
    const updateWidth = () => {
      if (svgRef.current?.parentElement) {
        setWidth(svgRef.current.parentElement.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  if (temporalEdges.length === 0) return null;

  const dates = temporalEdges.map(e => new Date(e.temporal!.date).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const range = maxDate - minDate || 1;

  const scaleX = (date: string) => {
    const t = new Date(date).getTime();
    return PADDING + ((t - minDate) / range) * (width - 2 * PADDING);
  };

  const cy = TIMELINE_HEIGHT / 2;

  return (
    <div className="border-2 border-gray-200 dark:border-gray-700 mt-4">
      <div className="px-3 py-1 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <span className="type-xs font-bold text-gray-500">Timeline</span>
        <span className="type-xs text-gray-400 ml-2">{temporalEdges.length} events with dates</span>
      </div>
      <div className="relative">
        <svg ref={svgRef} width={width} height={TIMELINE_HEIGHT}>
          {/* Axis line */}
          <line
            x1={PADDING}
            y1={cy}
            x2={width - PADDING}
            y2={cy}
            stroke="#d1d5db"
            strokeWidth={1}
          />

          {/* Date labels */}
          <text
            x={PADDING}
            y={TIMELINE_HEIGHT - 8}
            className="type-xs"
            fill="#9ca3af"
            textAnchor="start"
          >
            {new Date(minDate).toLocaleDateString()}
          </text>
          <text
            x={width - PADDING}
            y={TIMELINE_HEIGHT - 8}
            className="type-xs"
            fill="#9ca3af"
            textAnchor="end"
          >
            {new Date(maxDate).toLocaleDateString()}
          </text>

          {/* Correlation arcs */}
          {temporalPatterns?.map((pattern, i) => {
            const edge1 = edgeMap.get(pattern.event1EdgeId);
            const edge2 = edgeMap.get(pattern.event2EdgeId);
            if (!edge1?.temporal?.date || !edge2?.temporal?.date) return null;

            const x1 = scaleX(edge1.temporal.date);
            const x2 = scaleX(edge2.temporal.date);
            const midX = (x1 + x2) / 2;
            const arcHeight = SIGNIFICANCE_ARC_HEIGHT[pattern.significance] ?? 12;
            const color = SIGNIFICANCE_COLORS[pattern.significance] ?? '#9ca3af';

            return (
              <path
                key={`arc-${i}`}
                d={`M ${x1},${cy} Q ${midX},${cy - arcHeight} ${x2},${cy}`}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                opacity={0.7}
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => {
                  const svg = svgRef.current;
                  if (!svg) return;
                  const rect = svg.getBoundingClientRect();
                  setHoveredArc({
                    pattern,
                    x: e.clientX - rect.left,
                    y: cy - arcHeight,
                  });
                }}
                onMouseLeave={() => setHoveredArc(null)}
                onTouchStart={e => {
                  const svg = svgRef.current;
                  if (!svg) return;
                  const rect = svg.getBoundingClientRect();
                  const touch = e.touches[0];
                  if (!touch) return;
                  setHoveredArc({
                    pattern,
                    x: touch.clientX - rect.left,
                    y: cy - arcHeight,
                  });
                }}
                onTouchEnd={() => setHoveredArc(null)}
              />
            );
          })}

          {/* Event dots */}
          {temporalEdges.map(edge => {
            const cx = scaleX(edge.temporal!.date);
            const isSelected = edge.id === selectedEdgeId;
            const color = EDGE_COLORS[edge.type] ?? '#6b7280';

            return (
              <circle
                key={edge.id}
                cx={cx}
                cy={TIMELINE_HEIGHT / 2}
                r={isSelected ? DOT_RADIUS * 1.5 : DOT_RADIUS}
                fill={color}
                stroke={isSelected ? '#000' : '#fff'}
                strokeWidth={isSelected ? 2 : 1}
                style={{ cursor: 'pointer' }}
                onClick={() => onEdgeClick(edge.id)}
              >
                <title>{`${edge.label} (${edge.temporal!.date})`}</title>
              </circle>
            );
          })}
        </svg>

        {/* Arc tooltip */}
        {hoveredArc && (
          <div
            className="absolute z-10 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 px-3 py-2 pointer-events-none"
            style={{ left: hoveredArc.x, top: hoveredArc.y - 40, maxWidth: 280 }}
          >
            <p className="type-xs">{hoveredArc.pattern.description}</p>
            <p className="type-xs text-gray-500">
              {hoveredArc.pattern.daysBetween} days apart
              {hoveredArc.pattern.amountInvolved != null &&
                ` — $${hoveredArc.pattern.amountInvolved.toLocaleString()}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
