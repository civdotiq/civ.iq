/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Info, Loader2 } from 'lucide-react';
import type { StateBoundaryFeature } from '@/types/state';

interface StateMapProps {
  stateCode: string;
  stateName: string;
  detail?: 'simple' | 'standard' | 'full';
  showStats?: boolean;
  className?: string;
}

interface StateStats {
  population: number;
  medianIncome: number;
  povertyRate: number;
  diversityIndex: number;
}

export function StateMap({
  stateCode,
  stateName,
  detail = 'simple',
  showStats = true,
  className = '',
}: StateMapProps) {
  const [boundary, setBoundary] = useState<StateBoundaryFeature | null>(null);
  const [stats, setStats] = useState<StateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Load boundary data
        const boundaryResponse = await fetch(`/api/state-boundaries/${stateCode}?detail=${detail}`);

        if (!boundaryResponse.ok) {
          throw new Error(`Failed to load state boundary: ${boundaryResponse.statusText}`);
        }

        const boundaryData = await boundaryResponse.json();

        if (showStats) {
          // Load demographics
          const statsResponse = await fetch(`/api/state-demographics/${stateCode}`);

          if (statsResponse.ok) {
            const demographicsData = await statsResponse.json();
            if (mounted) {
              setStats({
                population: demographicsData.population,
                medianIncome: demographicsData.median_household_income,
                povertyRate: demographicsData.poverty_rate,
                diversityIndex: demographicsData.diversity_index,
              });
            }
          }
        }

        if (mounted) {
          setBoundary(boundaryData);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load state data');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [stateCode, detail, showStats]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatPercent = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className={`bg-white border-2 border-black p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
          <p className="text-gray-600">Loading {stateName} map...</p>
        </div>
      </div>
    );
  }

  if (error || !boundary) {
    return (
      <div className={`bg-white border-2 border-black p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center h-64">
          <MapPin className="w-8 h-8 text-gray-400 mb-2" />
          <p className="text-gray-600">{error || 'Failed to load state boundary'}</p>
        </div>
      </div>
    );
  }

  // Calculate viewport bounds for the SVG
  const bbox =
    boundary.properties.INTPTLAT && boundary.properties.INTPTLON
      ? calculateBounds(boundary.geometry)
      : null;

  return (
    <div className={`bg-white border-2 border-black ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">{stateName}</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Info className="w-4 h-4" />
            <span>Census TIGER/Line 2025</span>
          </div>
        </div>
      </div>

      {/* SVG Map Visualization */}
      <div className="p-4 bg-gray-50">
        <div className="relative w-full" style={{ paddingBottom: '60%' }}>
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={
              bbox ? `${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}` : '0 0 800 600'
            }
            preserveAspectRatio="xMidYMid meet"
          >
            {/* State boundary path */}
            <path
              d={convertGeometryToSVGPath(boundary.geometry)}
              fill="#3B82F6"
              fillOpacity="0.2"
              stroke="#1E40AF"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />

            {/* Internal point marker (state center) */}
            {boundary.properties.INTPTLAT && boundary.properties.INTPTLON && (
              <circle
                cx={parseFloat(boundary.properties.INTPTLON)}
                cy={-parseFloat(boundary.properties.INTPTLAT)}
                r="0.3"
                fill="#DC2626"
                opacity="0.8"
              />
            )}
          </svg>
        </div>
      </div>

      {/* State Statistics */}
      {showStats && stats && (
        <div className="p-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-600 mb-1">Population</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatNumber(stats.population)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Median Income</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatCurrency(stats.medianIncome)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Poverty Rate</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatPercent(stats.povertyRate)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Diversity Index</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatPercent(stats.diversityIndex)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* State Info */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-600">Land Area:</span>{' '}
            <span className="font-medium text-gray-900">
              {formatNumber(Math.round((boundary.properties.ALAND || 0) / 2589988.11))} mi²
            </span>
          </div>
          <div>
            <span className="text-gray-600">Water Area:</span>{' '}
            <span className="font-medium text-gray-900">
              {formatNumber(Math.round((boundary.properties.AWATER || 0) / 2589988.11))} mi²
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions for SVG rendering

function calculateBounds(geometry: StateBoundaryFeature['geometry']) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const processCoords = (coords: number[] | number[][] | number[][][] | number[][][][]) => {
    if (typeof coords[0] === 'number') {
      const [lng, lat] = coords as number[];
      if (lng !== undefined && lat !== undefined) {
        minX = Math.min(minX, lng);
        maxX = Math.max(maxX, lng);
        minY = Math.min(minY, -lat); // Flip Y for SVG
        maxY = Math.max(maxY, -lat);
      }
    } else {
      (coords as number[][]).forEach(processCoords);
    }
  };

  processCoords(geometry.coordinates);

  // Add padding (5%)
  const padding = Math.max(maxX - minX, maxY - minY) * 0.05;

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

function convertGeometryToSVGPath(geometry: StateBoundaryFeature['geometry']): string {
  const paths: string[] = [];

  if (geometry.type === 'Polygon') {
    paths.push(coordsToPath(geometry.coordinates as number[][][]));
  } else if (geometry.type === 'MultiPolygon') {
    (geometry.coordinates as number[][][][]).forEach(polygon => {
      paths.push(coordsToPath(polygon));
    });
  }

  return paths.join(' ');
}

function coordsToPath(rings: number[][][]): string {
  return rings
    .map((ring, i) => {
      const commands = ring
        .map((coord, j) => {
          const [lng, lat] = coord;
          if (lng === undefined || lat === undefined) return '';
          const command = j === 0 ? 'M' : 'L';
          return `${command}${lng},${-lat}`; // Flip Y for SVG
        })
        .filter(cmd => cmd !== '')
        .join(' ');
      return i === 0 ? commands + ' Z' : commands + ' Z';
    })
    .join(' ');
}
