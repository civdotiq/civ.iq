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
  useFallback: boolean; // True when PMTiles unavailable, using point markers instead
}

export function RealDistrictMapContainer({
  selectedState,
  selectedDistrict: _selectedDistrict,
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
    useFallback: false,
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
        // Dynamic import MapLibre GL and PMTiles
        const maplibregl = (await import('maplibre-gl')).default;
        const { Protocol } = await import('pmtiles');

        // Register PMTiles protocol with MapLibre GL
        const protocol = new Protocol();
        maplibregl.addProtocol('pmtiles', protocol.tile);
        logger.info('PMTiles protocol registered with MapLibre GL', {
          component: 'RealDistrictMapContainer',
        });

        // Create map instance
        const map = new maplibregl.Map({
          container: mapContainer.current!,
          style: {
            version: 8,
            // Glyphs required for text labels on map
            glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
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
          logger.info('Map load event fired - ready for district data', {
            component: 'RealDistrictMapContainer',
          });
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
      // Remove PMTiles protocol
      import('maplibre-gl').then(({ default: maplibregl }) => {
        maplibregl.removeProtocol('pmtiles');
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCenter, initialZoom, enableInteraction, showControls]);

  // Load districts via API fallback (when PMTiles unavailable)
  const loadDistrictsFallback = useCallback(
    async (map: Map) => {
      logger.info('Loading districts via API fallback', {
        component: 'RealDistrictMapContainer',
      });

      try {
        const response = await fetch('/api/districts/all');
        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json();
        const districts = data.districts || [];

        if (districts.length === 0) {
          throw new Error('No district data available');
        }

        // State center coordinates for positioning district markers
        const stateCenters: Record<string, [number, number]> = {
          AL: [-86.79, 32.81],
          AK: [-152.4, 61.37],
          AZ: [-111.43, 33.73],
          AR: [-92.37, 34.97],
          CA: [-119.68, 36.12],
          CO: [-105.31, 39.06],
          CT: [-72.76, 41.6],
          DE: [-75.51, 39.32],
          FL: [-81.69, 27.77],
          GA: [-83.64, 33.04],
          HI: [-157.5, 21.09],
          ID: [-114.48, 44.24],
          IL: [-88.99, 40.35],
          IN: [-86.26, 39.85],
          IA: [-93.21, 42.01],
          KS: [-96.73, 38.53],
          KY: [-84.67, 37.67],
          LA: [-91.87, 31.17],
          ME: [-69.77, 44.32],
          MD: [-76.8, 39.06],
          MA: [-71.53, 42.23],
          MI: [-84.54, 43.33],
          MN: [-93.9, 45.69],
          MS: [-89.68, 32.74],
          MO: [-92.29, 38.46],
          MT: [-109.63, 47.05],
          NE: [-98.27, 41.13],
          NV: [-116.42, 37.84],
          NH: [-71.56, 43.45],
          NJ: [-74.52, 40.3],
          NM: [-106.25, 34.84],
          NY: [-74.95, 42.17],
          NC: [-79.81, 35.63],
          ND: [-99.78, 47.53],
          OH: [-82.76, 40.39],
          OK: [-96.93, 35.57],
          OR: [-120.77, 44.93],
          PA: [-77.21, 40.59],
          RI: [-71.51, 41.68],
          SC: [-80.95, 33.86],
          SD: [-99.44, 44.3],
          TN: [-86.69, 35.75],
          TX: [-97.56, 31.05],
          UT: [-111.86, 40.15],
          VT: [-72.71, 44.05],
          VA: [-78.17, 37.77],
          WA: [-121.49, 47.4],
          WV: [-80.95, 38.49],
          WI: [-89.62, 44.27],
          WY: [-107.3, 42.76],
        };

        // Convert to GeoJSON points
        const features = districts
          .slice(0, 100)
          .map(
            (d: {
              id: string;
              state: string;
              number: string;
              name: string;
              representative: { party: string; name: string };
            }) => {
              const center = stateCenters[d.state] || [-95.71, 37.09];
              const distNum = parseInt(d.number) || 0;
              // Spread districts within a state
              const offset = distNum * 0.3;
              return {
                type: 'Feature' as const,
                properties: {
                  id: d.id,
                  name: d.name,
                  state: d.state,
                  number: d.number,
                  party: d.representative?.party || 'I',
                  representative: d.representative?.name || 'Unknown',
                },
                geometry: {
                  type: 'Point' as const,
                  coordinates: [
                    center[0] + (Math.sin(offset) * distNum) / 10,
                    center[1] + (Math.cos(offset) * distNum) / 10,
                  ],
                },
              };
            }
          );

        const geoJson = { type: 'FeatureCollection' as const, features };

        map.addSource('districts-fallback', { type: 'geojson', data: geoJson });

        // Circle layer colored by party
        map.addLayer({
          id: 'district-circles',
          type: 'circle',
          source: 'districts-fallback',
          paint: {
            'circle-color': [
              'case',
              ['==', ['get', 'party'], 'R'],
              '#dc2626',
              ['==', ['get', 'party'], 'D'],
              '#2563eb',
              '#6b7280',
            ],
            'circle-radius': 6,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
            'circle-opacity': 0.85,
          },
        });

        // Add click handler for fallback
        if (enableInteraction) {
          map.on('click', 'district-circles', (e: MapLayerMouseEvent) => {
            if (e.features?.[0]?.properties && onDistrictClick) {
              const props = e.features[0].properties;
              const district: DistrictBoundary = {
                id: props.id,
                state_fips: '',
                state_name: props.state,
                state_abbr: props.state,
                district_num: props.number,
                name: props.name,
                full_name: `${props.state}-${props.number}`,
                centroid: [0, 0],
                bbox: [0, 0, 0, 0],
                area_sqm: 0,
                geoid: props.id,
              };
              onDistrictClick(district);
            }
          });

          map.on('mouseenter', 'district-circles', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'district-circles', () => {
            map.getCanvas().style.cursor = '';
          });
        }

        setMapState(prev => ({
          ...prev,
          loading: false,
          useFallback: true,
          districtCount: features.length,
        }));
      } catch (err) {
        logger.error('Fallback district loading failed', {
          component: 'RealDistrictMapContainer',
          error: err as Error,
        });
        setMapState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load district data',
        }));
      }
    },
    [enableInteraction, onDistrictClick]
  );

  // Load district boundaries from PMTiles (with API fallback)
  const loadDistrictBoundaries = useCallback(async () => {
    if (!mapRef.current || !mapState.mapLoaded) return;

    const map = mapRef.current;
    setMapState(prev => ({ ...prev, loading: true }));

    // First, check if PMTiles file exists
    const pmtilesUrl = '/maps/congressional_districts_119_real.pmtiles';

    try {
      const headCheck = await fetch(pmtilesUrl, { method: 'HEAD' });
      if (!headCheck.ok) {
        logger.warn('PMTiles file not available, using API fallback', {
          component: 'RealDistrictMapContainer',
          status: headCheck.status,
        });
        await loadDistrictsFallback(map);
        return;
      }
    } catch {
      logger.warn('PMTiles check failed, using API fallback', {
        component: 'RealDistrictMapContainer',
      });
      await loadDistrictsFallback(map);
      return;
    }

    try {
      logger.info('Loading Congressional District boundaries from PMTiles', {
        component: 'RealDistrictMapContainer',
        pmtilesUrl,
        source: 'Census TIGER/Line 2024 - 119th Congress',
      });

      // Add district boundaries source using PMTiles
      map.addSource('district-boundaries', {
        type: 'vector',
        url: `pmtiles://${pmtilesUrl}`,
      });

      // Add fill layer
      map.addLayer({
        id: 'district-fill',
        type: 'fill',
        source: 'district-boundaries',
        'source-layer': 'districts',
        paint: {
          'fill-color': '#e5e7eb',
          'fill-opacity': 0.6,
        },
      });

      // Add stroke layer
      map.addLayer({
        id: 'district-stroke',
        type: 'line',
        source: 'district-boundaries',
        'source-layer': 'districts',
        paint: {
          'line-color': '#374151',
          'line-width': 1,
        },
      });

      // Add labels layer
      map.addLayer({
        id: 'district-labels',
        type: 'symbol',
        source: 'district-boundaries',
        'source-layer': 'districts',
        layout: {
          'text-field': '{name}',
          'text-font': ['Open Sans Regular'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#1f2937',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1,
        },
      });

      // Verify PMTiles loaded
      map.on('sourcedata', e => {
        if (e.sourceId === 'district-boundaries' && e.isSourceLoaded) {
          logger.info('✅ PMTiles loaded successfully', {
            component: 'RealDistrictMapContainer',
          });
        }
      });

      // Add click handlers for PMTiles
      if (enableInteraction) {
        map.on('click', 'district-fill', (e: MapLayerMouseEvent) => {
          if (e.features?.[0]?.properties && onDistrictClick) {
            const props = e.features[0].properties;
            const district: DistrictBoundary = {
              id: props.district_id,
              state_fips: props.state_fips,
              state_name: props.state_name,
              state_abbr: props.state_abbr,
              district_num: props.district_num,
              name: props.name,
              full_name: props.full_name,
              centroid: [props.centroid_lng, props.centroid_lat],
              bbox: [props.bbox_minlng, props.bbox_minlat, props.bbox_maxlng, props.bbox_maxlat],
              area_sqm: props.area_sqm || 0,
              geoid: props.geoid || '',
            };
            onDistrictClick(district);
          }
        });

        map.on('mouseenter', 'district-fill', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'district-fill', () => {
          map.getCanvas().style.cursor = '';
        });
      }

      setMapState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      logger.error('PMTiles loading failed, trying fallback', {
        component: 'RealDistrictMapContainer',
        error: error as Error,
      });
      await loadDistrictsFallback(map);
    }
  }, [mapState.mapLoaded, enableInteraction, onDistrictClick, loadDistrictsFallback]);

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
        className={`flex items-center justify-center bg-white border-2 border-gray-300 ${className}`}
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
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
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
      <div ref={mapContainer} className="w-full overflow-hidden" style={{ height }} />

      {/* Map legend */}
      {showControls && (
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm p-3 border-2 border-black z-10">
          <div className="text-xs font-medium text-gray-700 mb-2">Congressional Districts</div>
          {mapState.useFallback ? (
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
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span>Independent</span>
              </div>
            </div>
          ) : (
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
          )}
          {mapState.districtCount > 0 && (
            <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
              {mapState.districtCount} districts loaded
              {mapState.useFallback && ' (simplified view)'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
