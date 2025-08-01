'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useRef, useState } from 'react';
import { structuredLogger } from '@/lib/logging/universal-logger';
import { districtBoundaryService, type DistrictBoundary } from '@/utils/district-boundary-utils';
import type { Map } from 'maplibre-gl';

interface RealDistrictBoundaryMapProps {
  districtId: string;
  className?: string;
  height?: string;
  showControls?: boolean;
  enableInteraction?: boolean;
  onDistrictClick?: (district: DistrictBoundary) => void;
}

interface MapState {
  loading: boolean;
  error: string | null;
  mapLoaded: boolean;
  district: DistrictBoundary | null;
}

export function RealDistrictBoundaryMap({
  districtId,
  className = '',
  height = '400px',
  showControls = true,
  enableInteraction = true,
  onDistrictClick,
}: RealDistrictBoundaryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [mapState, setMapState] = useState<MapState>({
    loading: true,
    error: null,
    mapLoaded: false,
    district: null,
  });

  // Initialize district boundary service and load district data
  useEffect(() => {
    const initializeDistrict = async () => {
      try {
        await districtBoundaryService.initialize();
        const district = districtBoundaryService.getDistrictById(districtId);

        if (!district) {
          setMapState(prev => ({
            ...prev,
            error: 'District not found',
            loading: false,
          }));
          return;
        }

        setMapState(prev => ({
          ...prev,
          district,
        }));
      } catch (error) {
        structuredLogger.error('Failed to initialize district', {
          component: 'RealDistrictBoundaryMap',
          error: error as Error,
          districtId,
        });
        setMapState(prev => ({
          ...prev,
          error: 'Failed to load district data',
          loading: false,
        }));
      }
    };

    initializeDistrict();
  }, [districtId]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !mapState.district) return;

    const initializeMap = async () => {
      try {
        // Dynamic import MapLibre GL
        const maplibregl = (await import('maplibre-gl')).default;

        // Calculate center and bounds for the district
        const district = mapState.district!;
        const [lng, lat] = district.centroid;
        const bounds = districtBoundaryService.getDistrictBounds(districtId);

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
          center: [lng, lat],
          zoom: 8,
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
          setMapState(prev => ({ ...prev, mapLoaded: true }));
          loadDistrictBoundary();

          // Fit map to district bounds if available
          if (bounds) {
            map.fitBounds(bounds, {
              padding: 50,
              maxZoom: 12,
            });
          }
        });

        map.on('error', (e: { error: Error }) => {
          structuredLogger.error('MapLibre GL error', {
            component: 'RealDistrictBoundaryMap',
            error: e.error,
            districtId,
          });
          setMapState(prev => ({
            ...prev,
            error: 'Map rendering error',
          }));
        });
      } catch (error) {
        structuredLogger.error('Failed to initialize MapLibre GL', {
          component: 'RealDistrictBoundaryMap',
          error: error as Error,
          districtId,
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
  }, [mapState.district, enableInteraction, showControls, districtId]);

  // Load district boundary
  const loadDistrictBoundary = async () => {
    if (!mapRef.current || !mapState.district) return;

    try {
      setMapState(prev => ({ ...prev, loading: true }));

      const map = mapRef.current;
      const district = mapState.district;

      // Create GeoJSON feature for the district
      const districtFeature = {
        type: 'Feature' as const,
        properties: {
          district_id: district.id,
          state_fips: district.state_fips,
          state_name: district.state_name,
          state_abbr: district.state_abbr,
          district_num: district.district_num,
          name: district.name,
          full_name: district.full_name,
          area_sqm: district.area_sqm,
          geoid: district.geoid,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            [
              [district.bbox[0], district.bbox[1]], // SW
              [district.bbox[2], district.bbox[1]], // SE
              [district.bbox[2], district.bbox[3]], // NE
              [district.bbox[0], district.bbox[3]], // NW
              [district.bbox[0], district.bbox[1]], // Close polygon
            ],
          ],
        },
      };

      // Add district boundary source
      map.addSource('district-boundary', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [districtFeature],
        },
      });

      // Add district boundary fill
      map.addLayer({
        id: 'district-fill',
        type: 'fill',
        source: 'district-boundary',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.3,
        },
      });

      // Add district boundary stroke
      map.addLayer({
        id: 'district-stroke',
        type: 'line',
        source: 'district-boundary',
        paint: {
          'line-color': '#1d4ed8',
          'line-width': 3,
        },
      });

      // Add district centroid marker
      const _marker = new (await import('maplibre-gl')).default.Marker({
        color: '#dc2626',
      })
        .setLngLat(district.centroid)
        .setPopup(
          new (await import('maplibre-gl')).default.Popup().setHTML(`
            <div class="p-2">
              <h3 class="font-semibold text-sm">${district.full_name}</h3>
              <p class="text-xs text-gray-600 mt-1">
                ${district.state_name} Congressional District ${parseInt(district.district_num)}
              </p>
              <div class="text-xs text-gray-500 mt-2">
                <div>Area: ${(district.area_sqm / 1000000).toFixed(2)} km²</div>
                <div>GEOID: ${district.geoid}</div>
              </div>
            </div>
          `)
        )
        .addTo(map);

      // Add click handler if enabled
      if (enableInteraction && onDistrictClick) {
        map.on('click', 'district-fill', () => {
          onDistrictClick(district);
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
      structuredLogger.error('Failed to load district boundary', {
        component: 'RealDistrictBoundaryMap',
        error: error as Error,
        districtId,
      });
      setMapState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load district boundary',
      }));
    }
  };

  if (mapState.error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center p-6">
          <div className="text-red-600 text-lg font-medium mb-2">District Map Error</div>
          <div className="text-gray-600 text-sm">{mapState.error}</div>
          <div className="text-xs text-gray-500 mt-2">District ID: {districtId}</div>
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
            <div className="text-sm text-gray-600">Loading district boundary...</div>
            {mapState.district && (
              <div className="text-xs text-gray-500 mt-1">{mapState.district.full_name}</div>
            )}
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={mapContainer} className="w-full rounded-lg overflow-hidden" style={{ height }} />

      {/* District info overlay */}
      {mapState.district && showControls && (
        <div className="absolute top-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-10 max-w-xs">
          <div className="text-sm font-semibold text-gray-800 mb-1">{mapState.district.name}</div>
          <div className="text-xs text-gray-600 mb-2">{mapState.district.full_name}</div>
          <div className="space-y-1 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>State:</span>
              <span>{mapState.district.state_name}</span>
            </div>
            <div className="flex justify-between">
              <span>District:</span>
              <span>#{parseInt(mapState.district.district_num)}</span>
            </div>
            <div className="flex justify-between">
              <span>FIPS:</span>
              <span>{mapState.district.state_fips}</span>
            </div>
            {mapState.district.area_sqm > 0 && (
              <div className="flex justify-between">
                <span>Area:</span>
                <span>{(mapState.district.area_sqm / 1000000).toFixed(1)} km²</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map legend */}
      {showControls && (
        <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-10">
          <div className="text-xs font-medium text-gray-700 mb-2">Legend</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 bg-opacity-30 border-2 border-blue-700 rounded"></div>
              <span>District Boundary</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-600 rounded-full"></div>
              <span>District Center</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
