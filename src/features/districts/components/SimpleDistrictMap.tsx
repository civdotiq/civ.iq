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
            {/* Map Container with geographic context */}
            <div
              className="relative w-full border-2 border-black"
              style={{
                height: '500px',
                background: 'linear-gradient(135deg, #e8f4f8 0%, #d4e9f2 100%)',
              }}
            >
              <svg viewBox="0 0 800 600" className="w-full h-full">
                {/* Background with subtle grid */}
                <defs>
                  <pattern id="geo-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <circle cx="0" cy="0" r="1" fill="#b8d4e0" opacity="0.3" />
                  </pattern>
                </defs>
                <rect width="800" height="600" fill="url(#geo-grid)" />

                {/* Reference grid lines */}
                {Array.from({ length: 7 }).map((_, i) => (
                  <line
                    key={`lat-${i}`}
                    x1="40"
                    y1={80 + i * 70}
                    x2="760"
                    y2={80 + i * 70}
                    stroke="#c5dce6"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                  />
                ))}
                {Array.from({ length: 9 }).map((_, i) => (
                  <line
                    key={`lng-${i}`}
                    x1={40 + i * 90}
                    y1="80"
                    x2={40 + i * 90}
                    y2="520"
                    stroke="#c5dce6"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                  />
                ))}

                {/* Border frame */}
                <rect
                  x="40"
                  y="80"
                  width="720"
                  height="440"
                  fill="none"
                  stroke="#7a9fb0"
                  strokeWidth="2"
                />

                {/* District Boundary - scaled and centered */}
                <path
                  d={coordinatesToPath(boundary.coordinates, mapData.bbox)}
                  fill={layerInfo?.color || '#e11d07'}
                  fillOpacity="0.35"
                  stroke={layerInfo?.color || '#e11d07'}
                  strokeWidth="3"
                  strokeOpacity="1"
                />

                {/* ZIP Code Location Marker with label */}
                {(() => {
                  const [x, y] = projectToSVG(
                    mapData.coordinates.lng,
                    mapData.coordinates.lat,
                    mapData.bbox
                  );
                  return (
                    <g>
                      {/* Marker pin */}
                      <circle cx={x} cy={y} r="14" fill="#FFD700" opacity="0.3" />
                      <circle cx={x} cy={y} r="8" fill="#000000" opacity="0.9" />
                      <circle cx={x} cy={y} r="4" fill="#FFD700" />
                      {/* Label */}
                      <text
                        x={x}
                        y={y - 20}
                        fontSize="14"
                        fontWeight="bold"
                        fill="#000000"
                        textAnchor="middle"
                        style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}
                      >
                        ZIP {mapData.zipCode}
                      </text>
                    </g>
                  );
                })()}

                {/* State label */}
                <text
                  x="400"
                  y="40"
                  fontSize="24"
                  fontWeight="bold"
                  fill="#2c5f75"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {mapData.state} - {boundary.properties.name}
                </text>

                {/* Coordinate labels */}
                <text x="45" y="75" fontSize="11" fill="#5a7a8a" fontFamily="monospace">
                  {mapData.bbox.maxLat.toFixed(4)}°N
                </text>
                <text x="45" y="535" fontSize="11" fill="#5a7a8a" fontFamily="monospace">
                  {mapData.bbox.minLat.toFixed(4)}°N
                </text>
                <text x="35" y="300" fontSize="11" fill="#5a7a8a" fontFamily="monospace">
                  {mapData.bbox.minLng.toFixed(4)}°W
                </text>
                <text x="665" y="300" fontSize="11" fill="#5a7a8a" fontFamily="monospace">
                  {mapData.bbox.maxLng.toFixed(4)}°W
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
