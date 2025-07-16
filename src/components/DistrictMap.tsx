'use client';


/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useState, useRef } from 'react';

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

interface DistrictMapProps {
  zipCode: string;
  className?: string;
}

interface MapLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

export function DistrictMap({ zipCode, className = '' }: DistrictMapProps) {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string>('congressional');
  const svgRef = useRef<SVGSVGElement>(null);

  const layers: MapLayer[] = [
    { id: 'congressional', name: 'Congressional District', color: '#e11d07', visible: true },
    { id: 'state_senate', name: 'State Senate District', color: '#0b983c', visible: false },
    { id: 'state_house', name: 'State House District', color: '#3ea2d4', visible: false }
  ];

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

  // Convert lat/lng to SVG coordinates
  const projectToSVG = (lat: number, lng: number, bbox: MapData['bbox'], width: number, height: number) => {
    const x = ((lng - bbox.minLng) / (bbox.maxLng - bbox.minLng)) * width;
    const y = height - ((lat - bbox.minLat) / (bbox.maxLat - bbox.minLat)) * height;
    return { x, y };
  };

  // Convert coordinates array to SVG path
  const coordinatesToPath = (coordinates: number[][][], bbox: MapData['bbox'], width: number, height: number) => {
    return coordinates.map(ring => {
      const pathData = ring.map((coord, index) => {
        const [lng, lat] = coord;
        const { x, y } = projectToSVG(lat, lng, bbox, width, height);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ') + ' Z';
      return pathData;
    }).join(' ');
  };

  const getCurrentBoundary = () => {
    if (!mapData) return null;
    return mapData.boundaries[selectedLayer as keyof typeof mapData.boundaries];
  };

  const getCurrentLayerInfo = () => {
    return layers.find(layer => layer.id === selectedLayer);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !mapData) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">District Map</h3>
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">
            {error || 'Unable to load district map'}
          </div>
          <p className="text-sm text-gray-400">
            Interactive district boundaries are not available for this location
          </p>
        </div>
      </div>
    );
  }

  const boundary = getCurrentBoundary();
  const layerInfo = getCurrentLayerInfo();
  const svgWidth = 600;
  const svgHeight = 400;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="p-6 pb-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">District Map</h3>
        
        {/* Layer Controls */}
        <div className="flex flex-wrap gap-2">
          {layers.map((layer) => (
            <button
              key={layer.id}
              onClick={() => setSelectedLayer(layer.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedLayer === layer.id
                  ? 'text-white'
                  : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
              }`}
              style={{
                backgroundColor: selectedLayer === layer.id ? layer.color : undefined
              }}
            >
              {layer.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Map Container */}
        <div className="relative bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
          <svg
            ref={svgRef}
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto"
          >
            {/* Background */}
            <rect width={svgWidth} height={svgHeight} fill="#f8fafc" />
            
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.3"/>
              </pattern>
            </defs>
            <rect width={svgWidth} height={svgHeight} fill="url(#grid)" />
            
            {/* District Boundary */}
            {boundary && layerInfo && (
              <g>
                <path
                  d={coordinatesToPath(boundary.coordinates, mapData.bbox, svgWidth, svgHeight)}
                  fill={layerInfo.color}
                  fillOpacity="0.3"
                  stroke={layerInfo.color}
                  strokeWidth="2"
                  strokeOpacity="0.8"
                />
              </g>
            )}
            
            {/* ZIP Code Location Marker */}
            {mapData.coordinates && (
              <g>
                {(() => {
                  const { x, y } = projectToSVG(
                    mapData.coordinates.lat,
                    mapData.coordinates.lng,
                    mapData.bbox,
                    svgWidth,
                    svgHeight
                  );
                  return (
                    <>
                      {/* Marker outer ring */}
                      <circle
                        cx={x}
                        cy={y}
                        r="12"
                        fill="white"
                        stroke="#1f2937"
                        strokeWidth="2"
                      />
                      {/* Marker inner dot */}
                      <circle
                        cx={x}
                        cy={y}
                        r="6"
                        fill="#1f2937"
                      />
                    </>
                  );
                })()}
              </g>
            )}
          </svg>
          
          {/* Map Legend */}
          <div className="absolute top-4 right-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-gray-200">
            <div className="text-xs font-medium text-gray-700 mb-2">Legend</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-900 rounded-full"></div>
                <span className="text-xs text-gray-600">Your Location</span>
              </div>
              {layerInfo && (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: layerInfo.color }}
                  ></div>
                  <span className="text-xs text-gray-600">{layerInfo.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* District Information */}
        {boundary && (
          <div className="mt-4 bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">
              {boundary.properties.name}
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">District:</span>
                <span className="ml-2 font-medium">{boundary.properties.district}</span>
              </div>
              <div>
                <span className="text-gray-600">State:</span>
                <span className="ml-2 font-medium">{boundary.properties.state}</span>
              </div>
              <div>
                <span className="text-gray-600">Type:</span>
                <span className="ml-2 font-medium capitalize">
                  {boundary.properties.type.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">ZIP Code:</span>
                <span className="ml-2 font-medium">{mapData.zipCode}</span>
              </div>
            </div>
          </div>
        )}

        {/* Map Controls */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <div>
            Interactive map showing district boundaries for ZIP code {mapData.zipCode}
          </div>
          <div className="text-xs">
            Data: U.S. Census Bureau TIGER/Line
          </div>
        </div>
      </div>
    </div>
  );
}