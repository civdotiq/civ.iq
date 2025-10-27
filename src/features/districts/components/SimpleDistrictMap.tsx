/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useEffect, useState } from 'react';

interface DistrictBoundary {
  type: string;
  coordinates: number[][][];
  properties: {
    district: string;
    state: string;
    name: string;
    type: 'congressional' | 'state_senate' | 'state_house';
  };
}

interface MapData {
  zipCode: string;
  state: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  boundaries: {
    congressional: DistrictBoundary | null;
    state_senate: DistrictBoundary | null;
    state_house: DistrictBoundary | null;
  };
  bbox: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

interface SimpleDistrictMapProps {
  zipCode: string;
  className?: string;
}

interface MapLayer {
  id: string;
  name: string;
  color: string;
}

export function SimpleDistrictMap({ zipCode, className = '' }: SimpleDistrictMapProps) {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string>('congressional');

  const layers: MapLayer[] = [
    { id: 'congressional', name: 'Congressional District', color: '#e11d07' },
    { id: 'state_senate', name: 'State Senate District', color: '#0a9338' },
    { id: 'state_house', name: 'State House District', color: '#3ea2d4' },
  ];

  // Fetch map data
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/district-map?zip=${encodeURIComponent(zipCode)}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch map data');
        }

        const data: MapData = await response.json();
        setMapData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setMapData(null);
      } finally {
        setLoading(false);
      }
    };

    if (zipCode) {
      fetchMapData();
    }
  }, [zipCode]);

  // Convert geographic coordinates to SVG coordinates
  const projectToSVG = (lng: number, lat: number, bbox: MapData['bbox']): [number, number] => {
    const width = 800;
    const height = 600;
    const padding = 40;

    const x = ((lng - bbox.minLng) / (bbox.maxLng - bbox.minLng)) * (width - 2 * padding) + padding;
    const y =
      ((bbox.maxLat - lat) / (bbox.maxLat - bbox.minLat)) * (height - 2 * padding) + padding;

    return [x, y];
  };

  // Convert coordinates array to SVG path
  const coordinatesToPath = (coordinates: number[][][], bbox: MapData['bbox']): string => {
    return coordinates
      .map(ring => {
        return ring
          .map((coord, index) => {
            const lng = coord[0];
            const lat = coord[1];
            if (typeof lng !== 'number' || typeof lat !== 'number') {
              return '';
            }
            const [x, y] = projectToSVG(lng, lat, bbox);
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
          })
          .filter(Boolean)
          .join(' ');
      })
      .join(' Z ');
  };

  if (loading) {
    return (
      <div className={`bg-white border-2 border-black p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !mapData) {
    return (
      <div className={`bg-white border-2 border-black p-6 ${className}`}>
        <h3 className="aicher-heading type-lg text-gray-900 mb-4">District Boundaries</h3>
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">{error || 'Unable to load district map'}</div>
          <p className="text-sm text-gray-400">
            District boundaries are not available for this location
          </p>
        </div>
      </div>
    );
  }

  const boundary = mapData.boundaries[selectedLayer as keyof typeof mapData.boundaries];
  const layerInfo = layers.find(layer => layer.id === selectedLayer);

  return (
    <div className={`bg-white border-2 border-black overflow-hidden ${className}`}>
      <div className="p-6 pb-4 border-b-2 border-black">
        <h3 className="aicher-heading type-lg text-gray-900 mb-4">District Boundaries</h3>

        {/* Layer Controls */}
        <div className="flex flex-wrap gap-2">
          {layers.map(layer => (
            <button
              key={layer.id}
              onClick={() => setSelectedLayer(layer.id)}
              className={`px-3 py-2 text-sm aicher-heading transition-colors border-2 border-black ${
                selectedLayer === layer.id
                  ? 'text-white'
                  : 'text-gray-900 bg-white hover:bg-gray-100'
              }`}
              style={{
                backgroundColor: selectedLayer === layer.id ? layer.color : undefined,
                borderColor: selectedLayer === layer.id ? layer.color : '#000000',
              }}
            >
              {layer.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 bg-gray-50">
        {boundary ? (
          <div className="space-y-4">
            {/* Map Container with SVG visualization */}
            <div
              className="relative w-full border-2 border-black bg-gray-100"
              style={{ height: '500px' }}
            >
              <svg
                viewBox="0 0 800 600"
                className="w-full h-full"
                style={{ backgroundColor: '#f5f5f5' }}
              >
                {/* Background grid for geographic reference */}
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0e0e0" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="800" height="600" fill="url(#grid)" />

                {/* Major grid lines */}
                {Array.from({ length: 5 }).map((_, i) => (
                  <line
                    key={`h-${i}`}
                    x1="0"
                    y1={i * 150}
                    x2="800"
                    y2={i * 150}
                    stroke="#d0d0d0"
                    strokeWidth="1"
                  />
                ))}
                {Array.from({ length: 6 }).map((_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={i * 160}
                    y1="0"
                    x2={i * 160}
                    y2="600"
                    stroke="#d0d0d0"
                    strokeWidth="1"
                  />
                ))}

                {/* District Boundary */}
                <path
                  d={coordinatesToPath(boundary.coordinates, mapData.bbox)}
                  fill={layerInfo?.color || '#e11d07'}
                  fillOpacity="0.25"
                  stroke={layerInfo?.color || '#e11d07'}
                  strokeWidth="3"
                  strokeOpacity="1"
                />

                {/* ZIP Code Location Marker */}
                {(() => {
                  const [x, y] = projectToSVG(
                    mapData.coordinates.lng,
                    mapData.coordinates.lat,
                    mapData.bbox
                  );
                  return (
                    <>
                      <circle cx={x} cy={y} r="10" fill="#000000" opacity="0.9" />
                      <circle cx={x} cy={y} r="5" fill="#ffffff" />
                    </>
                  );
                })()}

                {/* Geographic coordinates labels */}
                <text x="10" y="590" fontSize="12" fill="#666" fontFamily="monospace">
                  {mapData.bbox.minLat.toFixed(4)}°, {mapData.bbox.minLng.toFixed(4)}°
                </text>
                <text
                  x="600"
                  y="20"
                  fontSize="12"
                  fill="#666"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {mapData.bbox.maxLat.toFixed(4)}°, {mapData.bbox.maxLng.toFixed(4)}°
                </text>
              </svg>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-black rounded-full border-2 border-white shadow"></div>
                <span className="text-gray-700 aicher-heading-wide">
                  Your Location (ZIP {mapData.zipCode})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 border-2 border-black"
                  style={{ backgroundColor: layerInfo?.color }}
                ></div>
                <span className="text-gray-700 aicher-heading-wide">{layerInfo?.name}</span>
              </div>
            </div>

            {/* District Information */}
            <div className="bg-white border-2 border-black p-4">
              <h4 className="aicher-heading type-base text-gray-900 mb-3">
                {boundary.properties.name}
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 aicher-heading-wide type-xs">District:</span>
                  <span className="ml-2 font-semibold">{boundary.properties.district}</span>
                </div>
                <div>
                  <span className="text-gray-600 aicher-heading-wide type-xs">State:</span>
                  <span className="ml-2 font-semibold">{boundary.properties.state}</span>
                </div>
                <div>
                  <span className="text-gray-600 aicher-heading-wide type-xs">Type:</span>
                  <span className="ml-2 font-semibold capitalize">
                    {boundary.properties.type.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 aicher-heading-wide type-xs">ZIP Code:</span>
                  <span className="ml-2 font-semibold">{mapData.zipCode}</span>
                </div>
              </div>
            </div>

            {/* Data Attribution */}
            <div className="text-xs text-gray-500 text-center">
              Data: U.S. Census Bureau TIGER/Line
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No {layerInfo?.name.toLowerCase()} boundary data available for this location
          </div>
        )}
      </div>
    </div>
  );
}
