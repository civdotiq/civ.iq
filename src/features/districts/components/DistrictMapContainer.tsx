'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import type { Map, MapLayerMouseEvent } from 'maplibre-gl';

interface District {
  id: string;
  name: string;
  party: string;
  competitiveness: number;
  population: number;
  state?: string;
  number?: string;
}

interface DistrictMapContainerProps {
  selectedDistrict?: string;
  onDistrictClick?: (district: District) => void;
  _onStateClick?: (state: string) => void;
  width?: number;
  height?: number;
  className?: string;
}

interface MapState {
  loading: boolean;
  error: string | null;
  mapLoaded: boolean;
  districtCount: number;
}

export function DistrictMapContainer({
  selectedDistrict,
  onDistrictClick,
  _onStateClick,
  width = 800,
  height = 600,
  className = '',
}: DistrictMapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [mapState, setMapState] = useState<MapState>({
    loading: true,
    error: null,
    mapLoaded: false,
    districtCount: 0,
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('Map already initialized, skipping...', { component: 'DistrictMapContainer' });
      }
      return;
    }

    const initializeMap = async () => {
      try {
        // Dynamic import MapLibre GL
        const maplibregl = (await import('maplibre-gl')).default;

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
        map.addControl(new maplibregl.FullscreenControl(), 'top-right');

        // Wait for map to load
        map.on('load', () => {
          setMapState(prev => ({ ...prev, mapLoaded: true }));
          loadDistricts();
        });

        map.on('error', (e: { error: Error }) => {
          // eslint-disable-next-line no-console
          console.error('MapLibre GL error:', e.error);
          setMapState(prev => ({
            ...prev,
            error: 'Map rendering error',
          }));
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to initialize MapLibre GL:', error);
        setMapState(prev => ({
          ...prev,
          error: 'Failed to initialize map',
        }));
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
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.warn('Map cleanup error (non-critical):', error);
          }
          mapRef.current = null;
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load district data
  const loadDistricts = useCallback(async () => {
    if (!mapRef.current || !mapState.mapLoaded) return;

    try {
      setMapState(prev => ({ ...prev, loading: true }));

      const map = mapRef.current;

      // Fetch real district data from API
      const response = await fetch('/api/districts/all');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const districts = data.districts || [];

      if (districts.length === 0) {
        throw new Error('No district data available');
      }

      // Convert district data to GeoJSON format for MapLibre
      // Note: For now we'll show district centers as points until we have boundary data
      const districtFeatures = districts
        .slice(0, 20)
        .map(
          (district: {
            id: string;
            name: string;
            representative: { party: string; name: string };
            demographics: { population: number };
            state: string;
            number: string;
          }) => {
            // Generate approximate coordinates based on state (simplified for demo)
            const stateCoords = getStateCenter(district.state);

            return {
              type: 'Feature' as const,
              properties: {
                id: district.id,
                name: district.name,
                party: district.representative.party,
                competitiveness: 0.5, // Would need electoral data for real competitiveness
                population: district.demographics.population,
                state: district.state,
                number: district.number,
                representativeName: district.representative.name,
              },
              geometry: {
                type: 'Point' as const,
                coordinates: [
                  stateCoords.lng + (Math.random() - 0.5) * 2, // Add some spread for visibility
                  stateCoords.lat + (Math.random() - 0.5) * 2,
                ],
              },
            };
          }
        );

      const realDistrictsGeoJSON = {
        type: 'FeatureCollection' as const,
        features: districtFeatures,
      };

      // Add district source
      map.addSource('districts', {
        type: 'geojson',
        data: realDistrictsGeoJSON,
      });

      // Add district circle layer (since we're using points)
      map.addLayer({
        id: 'district-circles',
        type: 'circle',
        source: 'districts',
        paint: {
          'circle-color': [
            'case',
            ['==', ['get', 'party'], 'R'],
            '#dc2626', // Republican red
            ['==', ['get', 'party'], 'D'],
            '#2563eb', // Democratic blue
            '#6b7280', // Independent/other gray
          ],
          'circle-radius': [
            'case',
            ['==', ['get', 'id'], selectedDistrict || ''],
            12, // Selected district
            8, // Default
          ],
          'circle-stroke-color': [
            'case',
            ['==', ['get', 'id'], selectedDistrict || ''],
            '#ffffff', // Selected district
            '#374151', // Default
          ],
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'id'], selectedDistrict || ''],
            3, // Selected district
            1, // Default
          ],
          'circle-opacity': 0.8,
        },
      });

      // Add district labels
      map.addLayer({
        id: 'district-labels',
        type: 'symbol',
        source: 'districts',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Regular'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#1f2937',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1,
        },
      });

      // Add click handlers
      map.on('click', 'district-circles', (e: MapLayerMouseEvent) => {
        if (e.features && e.features[0] && onDistrictClick) {
          const feature = e.features[0];
          const properties = feature.properties;

          if (properties) {
            const district: District = {
              id: properties.id,
              name: properties.name,
              party: properties.party,
              competitiveness: properties.competitiveness,
              population: properties.population,
              state: properties.state,
              number: properties.number,
            };

            onDistrictClick(district);
          }
        }
      });

      // Change cursor on hover
      map.on('mouseenter', 'district-circles', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'district-circles', () => {
        map.getCanvas().style.cursor = '';
      });

      setMapState(prev => ({
        ...prev,
        loading: false,
        districtCount: realDistrictsGeoJSON.features.length,
      }));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load districts:', error);
      setMapState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load districts',
      }));
    }
  }, [mapState.mapLoaded, selectedDistrict, onDistrictClick]);

  // Update selected district when props change
  useEffect(() => {
    if (selectedDistrict && mapRef.current && mapState.mapLoaded) {
      const map = mapRef.current;

      // Update the paint properties to highlight the selected district
      map.setPaintProperty('district-circles', 'circle-radius', [
        'case',
        ['==', ['get', 'id'], selectedDistrict],
        12, // Selected district
        8, // Default
      ]);

      map.setPaintProperty('district-circles', 'circle-stroke-width', [
        'case',
        ['==', ['get', 'id'], selectedDistrict],
        3, // Selected district
        1, // Default
      ]);
    }
  }, [selectedDistrict, mapState.mapLoaded]);

  if (mapState.error) {
    return (
      <div
        className={`flex items-center justify-center bg-white border-2 border-gray-300 ${className}`}
        style={{ width, height }}
      >
        <div className="text-center p-6">
          <div className="text-red-600 text-lg font-medium mb-2">Map Loading Error</div>
          <div className="text-gray-600 text-sm">{mapState.error}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Loading overlay */}
      {mapState.loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-sm text-gray-600">Loading district map...</div>
            {mapState.districtCount > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {mapState.districtCount} districts loaded
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full overflow-hidden" style={{ width, height }} />

      {/* Map legend */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm p-3 border-2 border-black z-10">
        <div className="text-xs font-medium text-gray-700 mb-2">Congressional Districts</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span>Republican</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span>Democratic</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white0 rounded-full"></div>
            <span>Independent/Other</span>
          </div>
        </div>
        {mapState.districtCount > 0 && (
          <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
            {mapState.districtCount} districts loaded
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to get approximate state center coordinates
function getStateCenter(state: string): { lat: number; lng: number } {
  const stateCenters: { [key: string]: { lat: number; lng: number } } = {
    AL: { lat: 32.806671, lng: -86.79113 },
    AK: { lat: 61.370716, lng: -152.404419 },
    AZ: { lat: 33.729759, lng: -111.431221 },
    AR: { lat: 34.969704, lng: -92.373123 },
    CA: { lat: 36.116203, lng: -119.681564 },
    CO: { lat: 39.059811, lng: -105.311104 },
    CT: { lat: 41.597782, lng: -72.755371 },
    DE: { lat: 39.318523, lng: -75.507141 },
    FL: { lat: 27.766279, lng: -81.686783 },
    GA: { lat: 33.040619, lng: -83.643074 },
    HI: { lat: 21.094318, lng: -157.498337 },
    ID: { lat: 44.240459, lng: -114.478828 },
    IL: { lat: 40.349457, lng: -88.986137 },
    IN: { lat: 39.849426, lng: -86.258278 },
    IA: { lat: 42.011539, lng: -93.210526 },
    KS: { lat: 38.5266, lng: -96.726486 },
    KY: { lat: 37.66814, lng: -84.670067 },
    LA: { lat: 31.169546, lng: -91.867805 },
    ME: { lat: 44.323535, lng: -69.765261 },
    MD: { lat: 39.063946, lng: -76.802101 },
    MA: { lat: 42.230171, lng: -71.530106 },
    MI: { lat: 43.326618, lng: -84.536095 },
    MN: { lat: 45.694454, lng: -93.900192 },
    MS: { lat: 32.741646, lng: -89.678696 },
    MO: { lat: 38.456085, lng: -92.288368 },
    MT: { lat: 47.052952, lng: -109.63304 },
    NE: { lat: 41.12537, lng: -98.268082 },
    NV: { lat: 37.839333, lng: -116.419389 },
    NH: { lat: 43.452492, lng: -71.563896 },
    NJ: { lat: 40.298904, lng: -74.521011 },
    NM: { lat: 34.840515, lng: -106.248482 },
    NY: { lat: 42.165726, lng: -74.948051 },
    NC: { lat: 35.630066, lng: -79.806419 },
    ND: { lat: 47.528912, lng: -99.784012 },
    OH: { lat: 40.388783, lng: -82.764915 },
    OK: { lat: 35.565342, lng: -96.928917 },
    OR: { lat: 44.931109, lng: -120.767178 },
    PA: { lat: 40.590752, lng: -77.209755 },
    RI: { lat: 41.680893, lng: -71.51178 },
    SC: { lat: 33.856892, lng: -80.945007 },
    SD: { lat: 44.299782, lng: -99.438828 },
    TN: { lat: 35.747845, lng: -86.692345 },
    TX: { lat: 31.054487, lng: -97.563461 },
    UT: { lat: 40.150032, lng: -111.862434 },
    VT: { lat: 44.045876, lng: -72.710686 },
    VA: { lat: 37.769337, lng: -78.169968 },
    WA: { lat: 47.400902, lng: -121.490494 },
    WV: { lat: 38.491226, lng: -80.954456 },
    WI: { lat: 44.268543, lng: -89.616508 },
    WY: { lat: 42.755966, lng: -107.30249 },
  };

  return stateCenters[state] || { lat: 39.8283, lng: -98.5795 }; // Default to US center
}
