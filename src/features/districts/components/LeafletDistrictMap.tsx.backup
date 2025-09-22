'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import type { Map, MapLayerMouseEvent } from 'maplibre-gl';
import logger from '@/lib/logging/simple-logger';

interface District {
  id: string;
  state: string;
  number: string;
  name: string;
  representative: {
    name: string;
    party: string;
    imageUrl?: string;
  };
  demographics: {
    population: number;
    medianIncome: number;
    medianAge: number;
    diversityIndex: number;
    urbanPercentage: number;
  };
}

interface LeafletDistrictMapProps {
  selectedDistrict?: string;
  onDistrictClick?: (district: District) => void;
  className?: string;
  showControls?: boolean;
  enableInteraction?: boolean;
  height?: string;
  selectedState?: string;
}

interface MapState {
  loading: boolean;
  error: string | null;
  mapLoaded: boolean;
  districtCount: number;
}

export default function LeafletDistrictMap({
  selectedDistrict,
  onDistrictClick,
  className = '',
  showControls = true,
  height = '600px',
  selectedState,
}: LeafletDistrictMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [mapState, setMapState] = useState<MapState>({
    loading: true,
    error: null,
    mapLoaded: false,
    districtCount: 0,
  });

  // Initialize MapLibre map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) {
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
          center: selectedState ? getStateCenterCoords(selectedState) : [-95.7129, 37.0902],
          zoom: selectedState ? 6 : 4,
          interactive: true,
        });

        mapRef.current = map;

        // Add navigation controls
        map.addControl(new maplibregl.NavigationControl(), 'top-right');

        // Wait for map to load
        map.on('load', () => {
          setMapState(prev => ({ ...prev, mapLoaded: true }));
          loadDistricts();
        });

        map.on('error', (e: { error: Error }) => {
          logger.error('MapLibre GL error:', e.error);
          setMapState(prev => ({
            ...prev,
            error: 'Map rendering error',
          }));
        });
      } catch (error) {
        logger.error('Failed to initialize MapLibre GL:', error);
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
          logger.warn('Map cleanup error (non-critical):', error);
          mapRef.current = null;
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState]);

  // Load districts from API
  const loadDistricts = useCallback(async () => {
    if (!mapRef.current || !mapState.mapLoaded) return;

    try {
      setMapState(prev => ({ ...prev, loading: true }));
      logger.info('Loading districts for MapLibre map');

      const response = await fetch('/api/districts/all');
      if (response.ok) {
        const data = await response.json();
        const apiDistricts = data.districts || [];
        setDistricts(apiDistricts);

        // Filter districts by selected state if specified
        const filteredDistricts =
          selectedState && selectedState !== 'all'
            ? apiDistricts.filter((d: District) => d.state === selectedState)
            : apiDistricts.slice(0, 50); // Limit to 50 for performance

        // Add districts to map as points
        if (filteredDistricts.length > 0) {
          const map = mapRef.current!;

          const districtFeatures = filteredDistricts.map((district: District) => {
            const stateCoords = getStateCenter(district.state);
            return {
              type: 'Feature' as const,
              properties: {
                id: district.id,
                name: district.name,
                party: district.representative.party,
                population: district.demographics.population,
                state: district.state,
                number: district.number,
                representativeName: district.representative.name,
              },
              geometry: {
                type: 'Point' as const,
                coordinates: [
                  stateCoords.lng + (Math.random() - 0.5) * 2,
                  stateCoords.lat + (Math.random() - 0.5) * 2,
                ],
              },
            };
          });

          const districtGeoJSON = {
            type: 'FeatureCollection' as const,
            features: districtFeatures,
          };

          // Add district source and layers
          map.addSource('districts', {
            type: 'geojson',
            data: districtGeoJSON,
          });

          // Add circle layer for districts
          map.addLayer({
            id: 'district-circles',
            type: 'circle',
            source: 'districts',
            paint: {
              'circle-color': [
                'case',
                ['==', ['get', 'party'], 'R'],
                '#dc2626',
                ['==', ['get', 'party'], 'D'],
                '#2563eb',
                '#6b7280',
              ],
              'circle-radius': ['case', ['==', ['get', 'id'], selectedDistrict || ''], 10, 6],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1,
              'circle-opacity': 0.8,
            },
          });

          // Add labels
          map.addLayer({
            id: 'district-labels',
            type: 'symbol',
            source: 'districts',
            layout: {
              'text-field': ['get', 'id'],
              'text-font': ['Open Sans Regular'],
              'text-size': 10,
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
                const district = apiDistricts.find((d: District) => d.id === properties.id);
                if (district) {
                  onDistrictClick(district);
                }
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

          // Fit map to filtered districts if state is selected
          if (selectedState && selectedState !== 'all' && districtFeatures.length > 0) {
            const coords = districtFeatures.map(
              (f: { geometry: { coordinates: [number, number] } }) => f.geometry.coordinates
            );
            const maplibregl = await import('maplibre-gl');
            const bounds = coords.reduce(
              (bounds: import('maplibre-gl').LngLatBounds, coord: [number, number]) => {
                return bounds.extend(coord);
              },
              new maplibregl.default.LngLatBounds(coords[0], coords[0])
            );

            map.fitBounds(bounds, { padding: 50 });
          }
        }

        setMapState(prev => ({
          ...prev,
          loading: false,
          districtCount: filteredDistricts.length,
        }));
      }
    } catch (error) {
      logger.error('Failed to load districts', error as Error);
      setMapState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load districts',
      }));
    }
  }, [mapState.mapLoaded, selectedDistrict, onDistrictClick, selectedState]);

  // Update selected district highlighting
  useEffect(() => {
    if (selectedDistrict && mapRef.current && mapState.mapLoaded) {
      const map = mapRef.current;
      try {
        map.setPaintProperty('district-circles', 'circle-radius', [
          'case',
          ['==', ['get', 'id'], selectedDistrict],
          10,
          6,
        ]);
      } catch {
        // Layer might not exist yet
      }
    }
  }, [selectedDistrict, mapState.mapLoaded]);

  if (mapState.error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center p-6">
          <div className="text-red-600 text-lg font-medium mb-2">Map Loading Error</div>
          <div className="text-gray-600 text-sm">{mapState.error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {mapState.loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-sm text-gray-600">Loading map...</div>
          </div>
        </div>
      )}

      <div
        ref={mapContainer}
        className="h-full w-full rounded-lg overflow-hidden"
        style={{ height }}
      />

      {showControls && (
        <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 rounded p-2 shadow-md z-10">
          <div className="text-xs text-gray-600">
            {districts.length} districts • MapLibre + OpenStreetMap
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get state center coordinates
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

  return stateCenters[state] || { lat: 39.8283, lng: -98.5795 };
}

function getStateCenterCoords(state: string): [number, number] {
  const center = getStateCenter(state);
  return [center.lng, center.lat];
}
