/**
 * StateMapCard Component
 * Displays state boundary map and demographics for Senator profiles
 */

'use client';

import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { ComparisonIndicator, US_AVERAGES } from '@/components/demographics/ComparisonIndicator';

interface StateDemographics {
  state_code: string;
  state_name: string;
  population: number;
  median_age: number;
  median_household_income: number;
  poverty_rate: number;
  diversity_index: number;
}

interface StateMapCardProps {
  stateCode: string;
  stateName?: string;
}

export function StateMapCard({ stateCode, stateName }: StateMapCardProps) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [isMapLoading, setIsMapLoading] = useState(true);

  // Fetch state demographics
  const { data: demographics, isLoading: isDemographicsLoading } = useSWR<StateDemographics>(
    `/api/state-demographics/${stateCode}`,
    async url => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch demographics: ${response.statusText}`);
      }
      return response.json();
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 1800000, // Cache for 30 minutes
    }
  );

  // Fetch and convert state boundary GeoJSON to inline SVG
  useEffect(() => {
    let mounted = true;

    async function loadStateMap() {
      try {
        const response = await fetch(`/api/state-boundaries/${stateCode}?detail=simple`);
        if (!response.ok) {
          throw new Error(`Failed to fetch state boundary: ${response.statusText}`);
        }

        const geoJSON = await response.json();

        if (!mounted) return;

        // Convert GeoJSON to SVG path
        // This is a simple conversion - for production, consider using a library like d3-geo
        const svg = convertGeoJSONToSVG(geoJSON);
        setSvgContent(svg);
        setIsMapLoading(false);
      } catch {
        // Silently fail - map will show "Map unavailable"
        if (mounted) {
          setIsMapLoading(false);
        }
      }
    }

    loadStateMap();

    return () => {
      mounted = false;
    };
  }, [stateCode]);

  return (
    <div className="bg-white aicher-border">
      <div className="p-4 sm:p-6">
        <h3 className="aicher-heading type-lg text-gray-900 mb-4">
          {stateName || stateCode} Overview
        </h3>

        {/* State Map */}
        <div className="mb-6">
          {isMapLoading ? (
            <div className="w-full h-48 bg-gray-100 aicher-border flex items-center justify-center">
              <div className="text-gray-500 type-sm">Loading map...</div>
            </div>
          ) : svgContent ? (
            <div
              className="w-full aicher-border bg-gray-50"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : (
            <div className="w-full h-48 bg-gray-100 aicher-border flex items-center justify-center">
              <div className="text-gray-500 type-sm">Map unavailable</div>
            </div>
          )}
        </div>

        {/* Demographics */}
        {isDemographicsLoading ? (
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </div>
        ) : demographics ? (
          <div className="space-y-4">
            <div>
              <div className="type-sm text-gray-600 mb-1">Population</div>
              <div className="aicher-heading type-base text-gray-900">
                {demographics.population.toLocaleString()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="type-sm text-gray-600 mb-1">Median Age</div>
                <div className="aicher-heading type-base text-gray-900">
                  {demographics.median_age.toFixed(1)} years
                </div>
                <ComparisonIndicator
                  value={demographics.median_age}
                  average={US_AVERAGES.medianAge}
                  higherIsBetter={false}
                  suffix=" yrs"
                />
              </div>
              <div>
                <div className="type-sm text-gray-600 mb-1">Median Income</div>
                <div className="aicher-heading type-base text-gray-900">
                  ${(demographics.median_household_income / 1000).toFixed(0)}k
                </div>
                <ComparisonIndicator
                  value={demographics.median_household_income}
                  average={US_AVERAGES.medianIncome}
                  higherIsBetter={true}
                  suffix=""
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="type-sm text-gray-600 mb-1">Poverty Rate</div>
                <div className="aicher-heading type-base text-gray-900">
                  {demographics.poverty_rate.toFixed(1)}%
                </div>
                <ComparisonIndicator
                  value={demographics.poverty_rate}
                  average={US_AVERAGES.povertyRate}
                  higherIsBetter={false}
                  suffix="%"
                />
              </div>
              <div>
                <div className="type-sm text-gray-600 mb-1">Diversity Index</div>
                <div className="aicher-heading type-base text-gray-900">
                  {demographics.diversity_index.toFixed(0)}
                </div>
                <ComparisonIndicator
                  value={demographics.diversity_index}
                  average={US_AVERAGES.diversityIndex}
                  higherIsBetter={true}
                  suffix=""
                />
              </div>
            </div>

            <div className="type-xs text-gray-500 pt-2 border-t border-gray-200">
              Data from Census Bureau ACS 2021
            </div>
          </div>
        ) : (
          <div className="text-gray-500 type-sm">Demographics unavailable</div>
        )}
      </div>
    </div>
  );
}

/**
 * Convert GeoJSON to SVG path
 * Simple projection for display - not cartographically accurate
 */
function convertGeoJSONToSVG(geoJSON: {
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
}): string {
  const { geometry } = geoJSON;

  if (!geometry || !geometry.coordinates) {
    return '';
  }

  // Find bounds
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const allCoords: number[][] = [];

  // Flatten coordinates
  const coords =
    geometry.type === 'Polygon'
      ? [geometry.coordinates as number[][][]]
      : (geometry.coordinates as number[][][][]);

  coords.forEach(polygon => {
    polygon.forEach(ring => {
      ring.forEach(coord => {
        if (!Array.isArray(coord) || coord.length < 2) return;
        const [lon, lat] = coord;
        if (typeof lon !== 'number' || typeof lat !== 'number') return;

        allCoords.push([lon, lat]);
        minX = Math.min(minX, lon);
        maxX = Math.max(maxX, lon);
        minY = Math.min(minY, lat);
        maxY = Math.max(maxY, lat);
      });
    });
  });

  // Add padding
  const padding = 0.05;
  const width = maxX - minX;
  const height = maxY - minY;
  minX -= width * padding;
  maxX += width * padding;
  minY -= height * padding;
  maxY += height * padding;

  // Calculate SVG dimensions (maintain aspect ratio)
  const svgWidth = 400;
  const svgHeight = ((maxY - minY) / (maxX - minX)) * svgWidth;

  // Convert to SVG path
  const paths: string[] = [];
  coords.forEach(polygon => {
    polygon.forEach(ring => {
      const pathData = ring
        .map((coord, i) => {
          if (!Array.isArray(coord) || coord.length < 2) return '';
          const [lon, lat] = coord;
          if (typeof lon !== 'number' || typeof lat !== 'number') return '';

          const x = ((lon - minX) / (maxX - minX)) * svgWidth;
          const y = svgHeight - ((lat - minY) / (maxY - minY)) * svgHeight;
          return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .filter(Boolean)
        .join(' ');
      paths.push(`<path d="${pathData} Z" fill="#e8f4f8" stroke="#3ea2d4" stroke-width="2"/>`);
    });
  });

  return `
    <svg
      viewBox="0 0 ${svgWidth} ${svgHeight}"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      style="max-height: 300px;"
    >
      ${paths.join('\n')}
    </svg>
  `;
}
