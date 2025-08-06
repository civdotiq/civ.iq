'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTileProvider } from '@/lib/map-tiles';

// Dynamic imports for leaflet components (SSR compatibility)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

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

interface InteractiveDistrictMapProps {
  zipCode: string;
  className?: string;
}

interface MapLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

export function InteractiveDistrictMap({ zipCode, className = '' }: InteractiveDistrictMapProps) {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string>('congressional');
  const [isClient, setIsClient] = useState(false);

  // Use tile provider with fallback support
  const { currentProvider, handleTileError } = useTileProvider();

  const layers: MapLayer[] = [
    { id: 'congressional', name: 'Congressional District', color: '#e11d07', visible: true },
    { id: 'state_senate', name: 'State Senate District', color: '#0b983c', visible: false },
    { id: 'state_house', name: 'State House District', color: '#3ea2d4', visible: false },
  ];

  // Ensure we're on the client side for leaflet
  useEffect(() => {
    setIsClient(true);
  }, []);

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

  // Convert boundary data to GeoJSON format
  const getCurrentGeoJSON = useMemo(() => {
    if (!mapData) return null;
    const boundary = mapData.boundaries[selectedLayer as keyof typeof mapData.boundaries];
    if (!boundary) return null;

    return {
      type: 'Feature' as const,
      geometry: {
        type: boundary.type as 'Polygon',
        coordinates: boundary.coordinates,
      },
      properties: boundary.properties,
    };
  }, [mapData, selectedLayer]);

  const getCurrentLayerInfo = () => {
    return layers.find(layer => layer.id === selectedLayer);
  };

  // Calculate map bounds from boundary data
  const mapBounds = useMemo(() => {
    if (!mapData || !isClient) return null;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet');
    return new L.LatLngBounds(
      [mapData.bbox.minLat, mapData.bbox.minLng],
      [mapData.bbox.maxLat, mapData.bbox.maxLng]
    );
  }, [mapData, isClient]);

  // Create custom marker icon
  const createCustomIcon = () => {
    if (!isClient) return null;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet');
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background: white;
          border: 3px solid #1f2937;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        ">
          <div style="
            width: 10px;
            height: 10px;
            background: #1f2937;
            border-radius: 50%;
            margin: 4px auto;
          "></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !mapData) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Interactive District Map</h3>
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">{error || 'Unable to load district map'}</div>
          <p className="text-sm text-gray-400">
            Interactive district boundaries are not available for this location
          </p>
        </div>
      </div>
    );
  }

  if (!isClient || !mapBounds) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="h-96 bg-gray-100 rounded flex items-center justify-center">
          <p className="text-gray-500">Loading interactive map...</p>
        </div>
      </div>
    );
  }

  const boundary = mapData.boundaries[selectedLayer as keyof typeof mapData.boundaries];
  const layerInfo = getCurrentLayerInfo();

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="p-6 pb-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Interactive District Map</h3>

        {/* Layer Controls */}
        <div className="flex flex-wrap gap-2">
          {layers.map(layer => (
            <button
              key={layer.id}
              onClick={() => setSelectedLayer(layer.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedLayer === layer.id
                  ? 'text-white'
                  : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
              }`}
              style={{
                backgroundColor: selectedLayer === layer.id ? layer.color : undefined,
              }}
            >
              {layer.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-0 relative">
        {/* Interactive Leaflet Map */}
        <div className="h-96 w-full">
          <MapContainer
            bounds={mapBounds}
            className="h-full w-full rounded-b-lg"
            boundsOptions={{ padding: [20, 20] }}
          >
            <TileLayer
              attribution={currentProvider.attribution}
              url={currentProvider.url}
              maxZoom={currentProvider.maxZoom}
              subdomains={currentProvider.subdomains}
              errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
              eventHandlers={{
                tileerror: handleTileError,
              }}
            />

            {/* District Boundary */}
            {getCurrentGeoJSON && layerInfo && (
              <GeoJSON
                data={getCurrentGeoJSON}
                style={{
                  color: layerInfo.color,
                  weight: 2,
                  opacity: 0.8,
                  fillColor: layerInfo.color,
                  fillOpacity: 0.3,
                }}
              />
            )}

            {/* ZIP Code Location Marker */}
            <Marker
              position={[mapData.coordinates.lat, mapData.coordinates.lng]}
              icon={createCustomIcon()}
            >
              <Popup>
                <div className="text-sm">
                  <strong>Your Location</strong>
                  <br />
                  ZIP Code: {mapData.zipCode}
                  <br />
                  Lat: {mapData.coordinates.lat.toFixed(4)}
                  <br />
                  Lng: {mapData.coordinates.lng.toFixed(4)}
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>

        {/* Map Legend - Overlay */}
        <div className="absolute top-4 right-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200 z-[1000]">
          <div className="text-xs font-medium text-gray-700 mb-2">Legend</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-900 rounded-full"></div>
              <span className="text-xs text-gray-600">Your Location</span>
            </div>
            {layerInfo && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: layerInfo.color }}></div>
                <span className="text-xs text-gray-600">{layerInfo.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* District Information */}
      {boundary && (
        <div className="p-6 pt-4 bg-gray-50 border-t border-gray-100">
          <h4 className="font-medium text-gray-900 mb-3">{boundary.properties.name}</h4>
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

          <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
            <div>Interactive map with zoom, pan, and district boundaries</div>
            <div className="text-xs">Data: U.S. Census Bureau TIGER/Line</div>
          </div>
        </div>
      )}
    </div>
  );
}
