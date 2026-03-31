'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import logger from '@/lib/logging/simple-logger';
import {
  districtBoundaryService,
  type DistrictBoundary,
} from '@/lib/helpers/district-boundary-utils';
import type { Map } from 'maplibre-gl';

// Default center of US - defined outside component to avoid re-creation
const DEFAULT_CENTER: [number, number] = [-95.7129, 37.0902];
const DEFAULT_ZOOM = 4;

// Census TIGERweb dynamic map export for 119th Congressional Districts (Layer 0)
// Uses {bbox-epsg-3857} template supported by MapLibre for WMS-style tile loading.
// Tiles load on demand per viewport - no need to download all 435 districts at once.
const CENSUS_DISTRICTS_TILE_URL =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/export?' +
  'bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&layers=show:0&f=image';

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
  selectedDistrict: _selectedDistrict,
  onDistrictClick,
  className = '',
  showControls = true,
  enableInteraction = true,
  initialCenter,
  initialZoom,
  height = '600px',
}: RealDistrictMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  // Track if map has been initialized to prevent re-initialization
  const mapInitializedRef = useRef(false);

  // Memoize center and zoom to prevent unnecessary re-renders
  const center = useMemo(
    () => initialCenter ?? DEFAULT_CENTER,
    // Only update if actual values change, not reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialCenter?.[0], initialCenter?.[1]]
  );
  const zoom = initialZoom ?? DEFAULT_ZOOM;

  const [mapState, setMapState] = useState<MapState>({
    loading: true,
    error: null,
    mapLoaded: false,
    districtCount: 0,
  });

  // Initialize district boundary service (for click-to-identify)
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
        // Non-fatal: map still shows boundaries visually via Census tiles
      });
  }, []);

  // Initialize map - only runs once on mount
  useEffect(() => {
    // Prevent multiple initializations
    if (!mapContainer.current || mapRef.current || mapInitializedRef.current) return;
    mapInitializedRef.current = true;

    const initializeMap = async () => {
      try {
        const maplibregl = (await import('maplibre-gl')).default;

        // Create map with OSM base tiles + Census district boundary overlay
        // Census tiles load on demand per viewport, so the map appears immediately
        const map = new maplibregl.Map({
          container: mapContainer.current!,
          style: {
            version: 8,
            sources: {
              'base-tiles': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '&copy; OpenStreetMap contributors',
              },
              'census-districts': {
                type: 'raster',
                tiles: [CENSUS_DISTRICTS_TILE_URL],
                tileSize: 256,
                attribution: 'US Census Bureau TIGERweb',
              },
            },
            layers: [
              {
                id: 'base-map',
                type: 'raster',
                source: 'base-tiles',
              },
              {
                id: 'district-boundaries',
                type: 'raster',
                source: 'census-districts',
                paint: {
                  'raster-opacity': 0.6,
                },
              },
            ],
          },
          center: center,
          zoom: zoom,
          interactive: enableInteraction,
        });

        mapRef.current = map;

        // Add navigation controls if enabled
        if (showControls && enableInteraction) {
          map.addControl(new maplibregl.NavigationControl(), 'top-right');
          map.addControl(new maplibregl.FullscreenControl(), 'top-right');
        }

        // Map is usable as soon as style loads - Census tiles stream in progressively
        map.on('load', () => {
          logger.info('Map loaded with Census TIGERweb district overlay', {
            component: 'RealDistrictMapContainer',
          });
          setMapState(prev => ({ ...prev, loading: false, mapLoaded: true }));
        });

        // Handle clicks using district boundary service for identification
        if (enableInteraction && onDistrictClick) {
          map.on('click', e => {
            districtBoundaryService
              .findDistrictByPoint(e.lngLat.lat, e.lngLat.lng)
              .then(result => {
                if (result.found && result.district) {
                  onDistrictClick(result.district);
                }
              })
              .catch(() => {
                // Click identification unavailable - non-fatal
              });
          });
        }

        map.on('error', (e: { error: Error }) => {
          logger.error('MapLibre GL error', {
            component: 'RealDistrictMapContainer',
            error: e.error,
          });
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
      mapInitializedRef.current = false;
    };
    // Empty dependency array - map should only initialize once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <div className="text-amber-600 text-lg font-medium mb-2">Map Loading Error</div>
          <div className="text-gray-600 text-sm">{mapState.error}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-civiq-blue text-white hover:bg-civiq-blue"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Brief loading overlay while MapLibre initializes */}
      {mapState.loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-civiq-blue border-t-transparent mx-auto mb-2"></div>
            <div className="text-sm text-gray-600">Initializing map...</div>
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={mapContainer} className="w-full overflow-hidden" style={{ height }} />

      {/* Map legend */}
      {showControls && (
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 p-3 border-2 border-black z-10">
          <div className="text-xs font-medium text-gray-700 mb-2">Congressional Districts</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-300 border border-gray-500"></div>
              <span>District Boundary</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-civiq-blue"></div>
              <span>Selected District</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
            Source:{' '}
            <a
              href="https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3ea2d4] hover:underline"
            >
              US Census Bureau
            </a>
            {mapState.districtCount > 0 && ` | ${mapState.districtCount} districts`}
          </div>
        </div>
      )}
    </div>
  );
}
