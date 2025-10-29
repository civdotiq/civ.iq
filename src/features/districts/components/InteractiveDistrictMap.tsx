'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useState, useMemo, useRef } from 'react';
import type { Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

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
  district?: string; // Optional district override (format: "MI-13")
  className?: string;
}

interface MapLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

export function InteractiveDistrictMap({
  zipCode,
  district,
  className = '',
}: InteractiveDistrictMapProps) {
  // eslint-disable-next-line no-console
  console.log('[MapLibre Debug] Component rendering with zipCode:', zipCode, 'district:', district);

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string>('congressional');
  const [isClient, setIsClient] = useState(false);

  const layers: MapLayer[] = [
    { id: 'congressional', name: 'Congressional District', color: '#e11d07', visible: true },
    { id: 'state_senate', name: 'State Senate District', color: '#0b983c', visible: false },
    { id: 'state_house', name: 'State House District', color: '#3ea2d4', visible: false },
  ];

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize MapLibre map
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[MapLibre Debug] Map init useEffect running', {
      hasContainer: !!mapContainer.current,
      hasMapRef: !!mapRef.current,
      isClient,
    });

    // Wait for: client-side, no existing map, container exists
    if (!isClient || mapRef.current || !mapContainer.current) {
      return;
    }

    const initializeMap = async () => {
      try {
        // eslint-disable-next-line no-console
        console.log('[MapLibre Debug] Starting MapLibre initialization...');
        // Dynamic import MapLibre GL
        const maplibregl = (await import('maplibre-gl')).default;
        // eslint-disable-next-line no-console
        console.log('[MapLibre Debug] MapLibre GL imported successfully');

        // Create map instance
        const map = new maplibregl.Map({
          container: mapContainer.current!,
          style: {
            version: 8,
            sources: {
              'base-tiles': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors',
              },
            },
            layers: [
              {
                id: 'base-map',
                type: 'raster',
                source: 'base-tiles',
              },
            ],
          },
          center: [-95.7129, 37.0902], // Center of US
          zoom: 4,
          interactive: true,
        });

        mapRef.current = map;

        // Add navigation controls
        map.addControl(new maplibregl.NavigationControl(), 'top-right');

        // Wait for map to load, then update with data if available
        map.on('load', () => {
          // eslint-disable-next-line no-console
          console.log('[MapLibre Debug] Map loaded, checking for mapData...');
          if (mapData) {
            // eslint-disable-next-line no-console
            console.log('[MapLibre Debug] MapData available, updating map');
            updateMapWithData(mapData);
          }
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to initialize MapLibre GL:', error);
        setError('Failed to initialize map');
      }
    };

    initializeMap();

    // Cleanup
    const containerElement = mapContainer.current;
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
          mapRef.current = null;
          if (containerElement) {
            containerElement.innerHTML = '';
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Map cleanup error (non-critical):', error);
          mapRef.current = null;
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]);

  // Fetch map data
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setLoading(true);
        // eslint-disable-next-line no-console
        console.log('[MapLibre Debug] Fetching map data for ZIP:', zipCode, 'district:', district);

        // Build URL with optional district parameter
        const url = new URL('/api/district-map', window.location.origin);
        url.searchParams.set('zip', zipCode);
        if (district) {
          url.searchParams.set('district', district);
        }

        const response = await fetch(url.toString());

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch map data');
        }

        const data: MapData = await response.json();
        // eslint-disable-next-line no-console
        console.log('[MapLibre Debug] Map data received:', {
          hasBbox: !!data.bbox,
          hasBoundary: !!data.boundaries.congressional,
          bbox: data.bbox,
        });

        setMapData(data);
        setError(null);

        // Update map with new data if map is already loaded
        if (mapRef.current && data) {
          // eslint-disable-next-line no-console
          console.log('[MapLibre Debug] Map exists, updating with data');
          // Check if map is loaded
          if (mapRef.current.loaded()) {
            updateMapWithData(data);
          } else {
            // Wait for map to load
            // eslint-disable-next-line no-console
            console.log('[MapLibre Debug] Map not loaded yet, waiting for load event');
            mapRef.current.once('load', () => {
              updateMapWithData(data);
            });
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setMapData(null);
      } finally {
        setLoading(false);
      }
    };

    if (zipCode && isClient) {
      fetchMapData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zipCode, district, isClient]);

  // Update map with boundary data
  const updateMapWithData = async (data: MapData) => {
    // eslint-disable-next-line no-console
    console.log('[MapLibre Debug] updateMapWithData called');

    if (!mapRef.current) {
      // eslint-disable-next-line no-console
      console.log('[MapLibre Debug] No map reference, aborting update');
      return;
    }

    const map = mapRef.current;
    // eslint-disable-next-line no-console
    console.log('[MapLibre Debug] Map reference exists, map loaded:', map.loaded());

    try {
      // Remove existing sources and layers
      ['district-boundaries', 'zip-marker'].forEach(sourceId => {
        if (map.getSource(sourceId)) {
          ['district-fill', 'district-stroke', 'zip-marker'].forEach(layerId => {
            if (map.getLayer(layerId)) {
              map.removeLayer(layerId);
            }
          });
          map.removeSource(sourceId);
        }
      });

      // Add ZIP code marker
      // eslint-disable-next-line no-console
      console.log('[MapLibre Debug] Adding ZIP marker at:', data.coordinates);
      map.addSource('zip-marker', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [data.coordinates.lng, data.coordinates.lat],
          },
          properties: {
            zipCode: data.zipCode,
          },
        },
      });

      map.addLayer({
        id: 'zip-marker',
        type: 'circle',
        source: 'zip-marker',
        paint: {
          'circle-color': '#000000',
          'circle-radius': 8,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });

      // Add district boundary if available
      const boundary = data.boundaries[selectedLayer as keyof typeof data.boundaries];
      // eslint-disable-next-line no-console
      console.log('[MapLibre Debug] Boundary for layer', selectedLayer, ':', !!boundary);

      if (boundary) {
        const geoJsonData = {
          type: 'Feature' as const,
          geometry: {
            type: boundary.type as 'Polygon',
            coordinates: boundary.coordinates,
          },
          properties: boundary.properties,
        };

        // eslint-disable-next-line no-console
        console.log('[MapLibre Debug] Adding district boundary source');
        map.addSource('district-boundaries', {
          type: 'geojson',
          data: geoJsonData,
        });

        const layerInfo = getCurrentLayerInfo();

        // Add fill layer
        // eslint-disable-next-line no-console
        console.log('[MapLibre Debug] Adding fill layer with color:', layerInfo?.color);
        map.addLayer({
          id: 'district-fill',
          type: 'fill',
          source: 'district-boundaries',
          paint: {
            'fill-color': layerInfo?.color || '#e11d07',
            'fill-opacity': 0.3,
          },
        });

        // Add stroke layer
        // eslint-disable-next-line no-console
        console.log('[MapLibre Debug] Adding stroke layer');
        map.addLayer({
          id: 'district-stroke',
          type: 'line',
          source: 'district-boundaries',
          paint: {
            'line-color': layerInfo?.color || '#e11d07',
            'line-width': 2,
            'line-opacity': 0.8,
          },
        });

        // Fit map to bounds
        if (data.bbox) {
          // eslint-disable-next-line no-console
          console.log('[MapLibre Debug] Fitting map to bounds:', data.bbox);
          map.fitBounds(
            [
              [data.bbox.minLng, data.bbox.minLat],
              [data.bbox.maxLng, data.bbox.maxLat],
            ],
            { padding: 50 }
          );
          // eslint-disable-next-line no-console
          console.log('[MapLibre Debug] fitBounds called successfully');
        } else {
          // eslint-disable-next-line no-console
          console.log('[MapLibre Debug] No bbox data available');
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[MapLibre Debug] Error updating map with data:', error);
    }
  };

  // Update map when selected layer changes
  useEffect(() => {
    if (mapData && mapRef.current) {
      updateMapWithData(mapData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLayer, mapData]);

  // Convert boundary data to GeoJSON format (kept for potential future use)
  const _getCurrentGeoJSON = useMemo(() => {
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

  if (loading) {
    return (
      <div className={`bg-white border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !mapData) {
    return (
      <div className={`bg-white border border-gray-200 p-6 ${className}`}>
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

  if (!isClient) {
    return (
      <div className={`bg-white border border-gray-200 p-6 ${className}`}>
        <div className="h-96 bg-white border-2 border-gray-300 rounded flex items-center justify-center">
          <p className="text-gray-500">Loading interactive map...</p>
        </div>
      </div>
    );
  }

  const boundary = mapData.boundaries[selectedLayer as keyof typeof mapData.boundaries];
  const layerInfo = getCurrentLayerInfo();

  return (
    <div className={`bg-white border border-gray-200 overflow-hidden ${className}`}>
      <div className="p-6 pb-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Interactive District Map</h3>

        {/* Layer Controls */}
        <div className="flex flex-wrap gap-2">
          {layers.map(layer => (
            <button
              key={layer.id}
              onClick={() => setSelectedLayer(layer.id)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                selectedLayer === layer.id
                  ? 'text-white'
                  : 'text-gray-600 bg-white border-2 border-gray-300 hover:bg-gray-200'
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
        {/* Interactive MapLibre Map */}
        <div className="h-96 w-full">
          <div
            ref={mapContainer}
            className="h-full w-full rounded-b-lg"
            style={{ height: '384px' }}
          />
        </div>

        {/* Map Legend - Overlay */}
        <div className="absolute top-4 right-4 bg-white bg-opacity-95 backdrop-blur-sm p-3 border-2 border-black border border-gray-200 z-[1000]">
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
        <div className="p-6 pt-4 bg-white border-t border-gray-100">
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
