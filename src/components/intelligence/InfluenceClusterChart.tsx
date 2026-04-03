/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import useSWR from 'swr';
import type {
  InfluenceClusterData,
  LegislatorClusterPoint,
} from '@/lib/intelligence/clusters/types';

interface InfluenceClusterChartProps {
  /** If provided, highlights this legislator in the chart. */
  highlightBioguideId?: string;
  className?: string;
}

const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) return null;
    return res.json();
  });

/** Party colors per design system. */
const PARTY_COLORS = {
  D: '#0a9338', // Green for Democrat
  R: '#e11d07', // Red for Republican
  I: '#6b7280', // Gray for Independent
};

const CHART_PADDING = 40;
const DOT_RADIUS = 4;
const HIGHLIGHT_RADIUS = 8;

export function InfluenceClusterChart({
  highlightBioguideId,
  className = '',
}: InfluenceClusterChartProps) {
  const { data, isLoading } = useSWR<
    InfluenceClusterData & {
      crossPartyHighlights: Array<{
        clusterId: number;
        memberCount: number;
        topSectors: Array<{ sector: string; meanPct: number }>;
        partyComposition: { D: number; R: number; I: number };
      }>;
    }
  >('/api/intelligence/influence-clusters', fetcher, {
    revalidateOnFocus: false,
  });

  const [hoveredLegislator, setHoveredLegislator] = useState<LegislatorClusterPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Chart dimensions
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current?.parentElement) {
        const parent = svgRef.current.parentElement;
        setDimensions({
          width: parent.clientWidth,
          height: Math.min(parent.clientWidth * 0.67, 500),
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Compute coordinate mapping
  const { scaleX, scaleY } = useMemo(() => {
    if (!data?.legislators?.length) return { scaleX: (v: number) => v, scaleY: (v: number) => v };

    const xs = data.legislators.map(l => l.x);
    const ys = data.legislators.map(l => l.y);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;

    return {
      scaleX: (v: number) =>
        CHART_PADDING + ((v - xMin) / xRange) * (dimensions.width - 2 * CHART_PADDING),
      scaleY: (v: number) =>
        CHART_PADDING + ((v - yMin) / yRange) * (dimensions.height - 2 * CHART_PADDING),
    };
  }, [data, dimensions]);

  const findNearest = useCallback(
    (clientX: number, clientY: number) => {
      if (!data || !svgRef.current) return;

      const rect = svgRef.current.getBoundingClientRect();
      const posX = clientX - rect.left;
      const posY = clientY - rect.top;

      // Larger hit area on touch (30px) vs mouse (15px)
      let nearest: LegislatorClusterPoint | null = null;
      let minDist = 30;

      for (const leg of data.legislators) {
        const cx = scaleX(leg.x);
        const cy = scaleY(leg.y);
        const dist = Math.sqrt((posX - cx) ** 2 + (posY - cy) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearest = leg;
        }
      }

      setHoveredLegislator(nearest);
      setTooltipPos({ x: posX, y: posY });
    },
    [data, scaleX, scaleY]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      findNearest(e.clientX, e.clientY);
    },
    [findNearest]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      const touch = e.touches[0];
      if (touch) {
        findNearest(touch.clientX, touch.clientY);
      }
    },
    [findNearest]
  );

  if (isLoading) {
    return (
      <div className={`bg-white border-2 border-gray-900 p-6 ${className}`}>
        <div className="h-6 bg-gray-200 border-2 border-gray-300 w-1/3 mb-4 animate-pulse" />
        <div className="h-64 bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (!data?.legislators?.length) {
    return null;
  }

  const crossPartyHighlights = data.crossPartyHighlights ?? [];

  return (
    <div className={`bg-white border-2 border-gray-900 p-4 sm:p-6 ${className}`}>
      <h3 className="aicher-heading type-lg text-gray-900 mb-2">Funding Influence Clusters</h3>
      <p className="type-xs text-gray-500 mb-4">
        Legislators positioned by donor similarity &mdash; those nearby share similar funding
        sources regardless of party.
      </p>

      {/* Scatter plot */}
      <div className="bg-gray-50 relative">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredLegislator(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={() => setHoveredLegislator(null)}
          className="block touch-none"
          role="img"
          aria-label={`Funding influence cluster visualization. ${data.legislatorCount} legislators analyzed across ${data.clusterCount} clusters.`}
        >
          {data.legislators.map(leg => {
            const cx = scaleX(leg.x);
            const cy = scaleY(leg.y);
            const isHighlighted = leg.bioguideId === highlightBioguideId;
            const isHovered = leg.bioguideId === hoveredLegislator?.bioguideId;

            return (
              <circle
                key={leg.bioguideId}
                cx={cx}
                cy={cy}
                r={isHighlighted ? HIGHLIGHT_RADIUS : isHovered ? DOT_RADIUS + 2 : DOT_RADIUS}
                fill={PARTY_COLORS[leg.party]}
                opacity={isHighlighted || isHovered ? 1 : 0.6}
                stroke={isHighlighted ? '#000' : 'none'}
                strokeWidth={isHighlighted ? 2 : 0}
              />
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredLegislator && (
          <div
            className="absolute pointer-events-none bg-white border-2 border-gray-900 p-2 z-10"
            style={{
              left: Math.min(tooltipPos.x + 10, dimensions.width - 200),
              top: tooltipPos.y - 60,
            }}
          >
            <div className="type-xs font-medium text-gray-900">{hoveredLegislator.bioguideId}</div>
            <div className="type-xs text-gray-500">
              {hoveredLegislator.party}-{hoveredLegislator.state} &middot;{' '}
              {hoveredLegislator.chamber}
            </div>
            {hoveredLegislator.topSectors.length > 0 && (
              <div className="type-xs text-gray-400 mt-1">
                Top: {hoveredLegislator.topSectors.map(s => s.sector).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 type-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 border-2 border-gray-300"
            style={{ backgroundColor: PARTY_COLORS.D }}
          />
          Democrat
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 border-2 border-gray-300"
            style={{ backgroundColor: PARTY_COLORS.R }}
          />
          Republican
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 border-2 border-gray-300"
            style={{ backgroundColor: PARTY_COLORS.I }}
          />
          Independent
        </span>
      </div>

      {/* Cross-party cluster highlights */}
      {crossPartyHighlights.length > 0 && (
        <div className="mt-4">
          <h4 className="aicher-heading type-sm text-gray-900 mb-2">
            Cross-party clusters (shared funding, different parties)
          </h4>
          <div className="bg-gray-50 divide-y divide-gray-200">
            {crossPartyHighlights.slice(0, 5).map(cluster => (
              <div key={cluster.clusterId} className="p-3 type-xs text-gray-600">
                <span className="font-medium">
                  {cluster.partyComposition.D}D, {cluster.partyComposition.R}R
                  {cluster.partyComposition.I > 0 ? `, ${cluster.partyComposition.I}I` : ''}
                </span>{' '}
                &mdash;{' '}
                {cluster.topSectors
                  .slice(0, 2)
                  .map(s => s.sector)
                  .join(', ')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="type-xs text-gray-400 mt-3">
        Clusters found by unsupervised ML on donor profiles. Position does not imply ideology.{' '}
        {data.legislatorCount} legislators analyzed, {data.clusterCount} clusters found.
      </p>
    </div>
  );
}

export default InfluenceClusterChart;
