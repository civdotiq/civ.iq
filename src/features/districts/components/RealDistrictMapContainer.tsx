'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import logger from '@/lib/logging/simple-logger';
import {
  districtBoundaryService,
  type DistrictBoundary,
} from '@/lib/helpers/district-boundary-utils';
import type { Map, MapLayerMouseEvent } from 'maplibre-gl';

interface RealDistrictMapProps {
  selectedState?: string;
  selectedDistrict?: string;
  onDistrictClick?: (district: DistrictBoundary) => void;
  className?: string;
  showControls?: boolean;
  enableInteraction?: boolean;
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
  height?: string;
}

interface MapState {
  loading: boolean;
  error: string | null;
  mapLoaded: boolean;
  districtCount: number;
}

export function RealDistrictMapContainer({
  selectedState,
  selectedDistrict,
  onDistrictClick,
  className = '',
  showControls = true,
  enableInteraction = true,
  initialCenter = [-95.7129, 37.0902], // Center of US
  initialZoom = 4,
  height = '600px',
}: RealDistrictMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [mapState, setMapState] = useState<MapState>({
    loading: true,
    error: null,
    mapLoaded: false,
    districtCount: 0,
  });

  // Initialize district boundary service
  useEffect(() => {
    districtBoundaryService
      .initialize()
      .then(() => {
        const summary = districtBoundaryService.getSummary();
        setMapState(prev => ({
          ...prev,
          districtCount: summary?.total_districts || 0,
        }));
      })
      .catch(error => {
        logger.error('Failed to initialize district boundary service', {
          component: 'RealDistrictMapContainer',
          error: error as Error,
        });
        setMapState(prev => ({
          ...prev,
          error: 'Failed to load district data',
        }));
      });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

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
          center: initialCenter,
          zoom: initialZoom,
          interactive: enableInteraction,
        });

        mapRef.current = map;

        // Add navigation controls if enabled
        if (showControls && enableInteraction) {
          map.addControl(new maplibregl.NavigationControl(), 'top-right');
          map.addControl(new maplibregl.FullscreenControl(), 'top-right');
        }

        // Wait for map to load
        map.on('load', () => {
          console.log('🗺️ Map load event fired - ready for district data');
          setMapState(prev => ({ ...prev, mapLoaded: true }));
          loadDistrictBoundaries();
        });

        map.on('error', (e: { error: Error }) => {
          logger.error('MapLibre GL error', {
            component: 'RealDistrictMapContainer',
            error: e.error,
          });
          setMapState(prev => ({
            ...prev,
            error: 'Map rendering error',
          }));
        });
      } catch (error) {
        logger.error('Failed to initialize MapLibre GL', {
          component: 'RealDistrictMapContainer',
          error: error as Error,
        });
        setMapState(prev => ({
          ...prev,
          error: 'Failed to initialize map',
        }));
      }
    };

    initializeMap();

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCenter, initialZoom, enableInteraction, showControls]);

  // Load district boundaries from PMTiles
  const loadDistrictBoundaries = useCallback(async () => {
    if (!mapRef.current || !mapState.mapLoaded) return;

    try {
      console.log('▶️ Attempting to load district boundaries...');
      setMapState(prev => ({ ...prev, loading: true }));

      const map = mapRef.current;

      // Load REAL Census PMTiles data
      const pmtilesUrl = '/maps/congressional_districts_119_real.pmtiles';

      logger.info('Loading REAL Congressional District boundaries from PMTiles', {
        component: 'RealDistrictMapContainer',
        pmtilesUrl,
        source: 'Census TIGER/Line 2024 - 119th Congress',
      });

      // Add district boundaries source using REAL PMTiles
      const sourceConfig = {
        type: 'vector' as const,
        url: `pmtiles://${pmtilesUrl}`,
      };
      console.log('  Adding source with config:', sourceConfig);

      map.addSource('district-boundaries', sourceConfig);
      console.log('  ✅ Source added successfully.');

      // Add district boundary layers using REAL Census data
      const fillLayerConfig = {
        id: 'district-fill',
        type: 'fill' as const,
        source: 'district-boundaries',
        'source-layer': 'districts', // PMTiles layer name from Tippecanoe
        paint: {
          'fill-color': '#e5e7eb', // Light gray default
          'fill-opacity': 0.6,
        },
      };
      console.log('  Adding fill layer with config:', fillLayerConfig);

      map.addLayer(fillLayerConfig);
      console.log('  ✅ Fill layer added successfully.');

      const strokeLayerConfig = {
        id: 'district-stroke',
        type: 'line' as const,
        source: 'district-boundaries',
        'source-layer': 'districts', // PMTiles layer name from Tippecanoe
        paint: {
          'line-color': '#374151',
          'line-width': 1,
        },
      };
      console.log('  Adding stroke layer with config:', strokeLayerConfig);

      map.addLayer(strokeLayerConfig);
      console.log('  ✅ Stroke layer added successfully.');

      // Add district labels showing real district names
      const labelsLayerConfig = {
        id: 'district-labels',
        type: 'symbol' as const,
        source: 'district-boundaries',
        'source-layer': 'districts', // PMTiles layer name from Tippecanoe
        layout: {
          'text-field': '{name}', // Real district name from Census data
          'text-font': ['Open Sans Regular'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#1f2937',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1,
        },
      };
      console.log('  Adding labels layer with config:', labelsLayerConfig);

      map.addLayer(labelsLayerConfig);
      console.log('  ✅ Labels layer added successfully.');

      // Add click handlers
      if (enableInteraction) {
        map.on('click', 'district-fill', (e: MapLayerMouseEvent) => {
          if (e.features && e.features[0]) {
            const feature = e.features[0];
            const properties = feature.properties;

            if (properties && onDistrictClick) {
              // Convert feature properties to DistrictBoundary
              const district: DistrictBoundary = {
                id: properties.district_id,
                state_fips: properties.state_fips,
                state_name: properties.state_name,
                state_abbr: properties.state_abbr,
                district_num: properties.district_num,
                name: properties.name,
                full_name: properties.full_name,
                centroid: [properties.centroid_lng, properties.centroid_lat],
                bbox: [
                  properties.bbox_minlng,
                  properties.bbox_minlat,
                  properties.bbox_maxlng,
                  properties.bbox_maxlat,
                ],
                area_sqm: properties.area_sqm || 0,
                geoid: properties.geoid || '',
              };

              onDistrictClick(district);
            }
          }
        });

        // Change cursor on hover
        map.on('mouseenter', 'district-fill', () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', 'district-fill', () => {
          map.getCanvas().style.cursor = '';
        });
      }

      // Load actual district data
      await loadDistrictData();

      setMapState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      logger.error('Failed to load district boundaries', {
        component: 'RealDistrictMapContainer',
        error: error as Error,
      });
      setMapState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load district boundaries',
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapState.mapLoaded, enableInteraction, onDistrictClick]);

  // Load district data from existing Census TIGER integration
  const loadDistrictData = useCallback(async () => {
    if (!mapRef.current) return;

    try {
      // Use our existing district API that has real Census TIGER data
      const response = await fetch('/api/districts/all');
      if (!response.ok) throw new Error('Failed to fetch districts');

      const districtsData = await response.json();
      const map = mapRef.current;

      // Convert districts to GeoJSON features
      const features =
        districtsData.districts?.map(
          (district: {
            id: string;
            stateFips: string;
            stateName: string;
            stateAbbr: string;
            districtNumber: number;
            latitude: number;
            longitude: number;
          }) => {
            // Get boundaries from our district boundary service or fallback to the API
            const boundaryData = districtBoundaryService.getDistrictById(district.id);

            return {
              type: 'Feature',
              properties: {
                district_id: district.id,
                state_fips: district.stateFips,
                state_name: district.stateName,
                state_abbr: district.stateAbbr,
                district_num: district.districtNumber.toString().padStart(2, '0'),
                name: `${district.stateAbbr}-${district.districtNumber.toString().padStart(2, '0')}`,
                full_name: `${district.stateName} Congressional District ${district.districtNumber}`,
                centroid_lng: boundaryData?.centroid[0] || district.longitude || -95.7129,
                centroid_lat: boundaryData?.centroid[1] || district.latitude || 37.0902,
                bbox_minlng: boundaryData?.bbox[0] || district.longitude - 1,
                bbox_minlat: boundaryData?.bbox[1] || district.latitude - 1,
                bbox_maxlng: boundaryData?.bbox[2] || district.longitude + 1,
                bbox_maxlat: boundaryData?.bbox[3] || district.latitude + 1,
                area_sqm: boundaryData?.area_sqm || 0,
                geoid: district.id,
                selected: selectedDistrict === district.id,
              },
              geometry: boundaryData
                ? {
                    type: 'Polygon',
                    coordinates: [
                      [
                        [boundaryData.bbox[0], boundaryData.bbox[1]],
                        [boundaryData.bbox[2], boundaryData.bbox[1]],
                        [boundaryData.bbox[2], boundaryData.bbox[3]],
                        [boundaryData.bbox[0], boundaryData.bbox[3]],
                        [boundaryData.bbox[0], boundaryData.bbox[1]],
                      ],
                    ],
                  }
                : {
                    // Fallback: create a small polygon around the center point
                    type: 'Polygon',
                    coordinates: [
                      [
                        [district.longitude - 0.5, district.latitude - 0.5],
                        [district.longitude + 0.5, district.latitude - 0.5],
                        [district.longitude + 0.5, district.latitude + 0.5],
                        [district.longitude - 0.5, district.latitude + 0.5],
                        [district.longitude - 0.5, district.latitude - 0.5],
                      ],
                    ],
                  },
            };
          }
        ) || [];

      // Update the map source with real data
      const source = map.getSource('district-boundaries') as unknown;
      if (source && typeof source === 'object' && 'setData' in source) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (source as { setData: (data: any) => void }).setData({
          type: 'FeatureCollection',
          features,
        });
      }

      setMapState(prev => ({
        ...prev,
        districtCount: features.length,
      }));
    } catch (error) {
      logger.error('Failed to load district data', {
        component: 'RealDistrictMapContainer',
        error: error as Error,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrict]);

  // Update selected district when props change
  useEffect(() => {
    if (selectedDistrict && mapRef.current) {
      loadDistrictData();
    }
  }, [selectedDistrict, loadDistrictData]);

  // Fit map to selected state
  useEffect(() => {
    if (selectedState && mapRef.current && mapState.mapLoaded) {
      const states = districtBoundaryService.getAllStates();
      const state = states.find(s => s.abbr === selectedState);

      if (state) {
        const stateDistricts = districtBoundaryService.getDistrictsByState(state.fips);
        if (stateDistricts.length > 0) {
          // Calculate bounds for all districts in the state
          let minLng = Infinity,
            minLat = Infinity;
          let maxLng = -Infinity,
            maxLat = -Infinity;

          stateDistricts.forEach(district => {
            const [dMinLng, dMinLat, dMaxLng, dMaxLat] = district.bbox;
            minLng = Math.min(minLng, dMinLng);
            minLat = Math.min(minLat, dMinLat);
            maxLng = Math.max(maxLng, dMaxLng);
            maxLat = Math.max(maxLat, dMaxLat);
          });

          // Fit map to state bounds
          mapRef.current.fitBounds(
            [
              [minLng, minLat],
              [maxLng, maxLat],
            ],
            {
              padding: 50,
              maxZoom: 8,
            }
          );
        }
      }
    }
  }, [selectedState, mapState.mapLoaded]);

  if (mapState.error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
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
    <div className={`relative ${className}`}>
      {/* Loading overlay */}
      {mapState.loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <div className="text-sm text-gray-600">Loading district boundaries...</div>
            {mapState.districtCount > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {mapState.districtCount} districts available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={mapContainer} className="w-full rounded-lg overflow-hidden" style={{ height }} />

      {/* Map legend */}
      {showControls && (
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-10">
          <div className="text-xs font-medium text-gray-700 mb-2">Congressional Districts</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-300 rounded"></div>
              <span>District Boundary</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Selected District</span>
            </div>
          </div>
          {mapState.districtCount > 0 && (
            <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
              {mapState.districtCount} districts loaded
            </div>
          )}
        </div>
      )}
    </div>
  );
}
