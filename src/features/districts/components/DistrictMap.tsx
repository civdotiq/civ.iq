'use client';

import { useEffect, useState, useRef } from 'react';
import type { Map } from 'maplibre-gl';
import type { GeoJSON } from 'geojson';
import logger from '@/lib/logging/simple-logger';

interface DistrictMapProps {
  state: string;
  district: string;
}

// State center coordinates for initial map view (lng, lat format for MapLibre)
const STATE_CENTERS: Record<string, [number, number]> = {
  MI: [-85.6024, 44.3148],
  CA: [-119.4179, 36.7783],
  TX: [-99.9018, 31.9686],
  FL: [-81.5158, 27.6648],
  NY: [-75.0, 43.0],
  PA: [-77.1945, 41.2033],
  IL: [-89.3985, 40.6331],
  OH: [-82.9071, 40.4173],
  GA: [-82.9001, 32.1656],
  NC: [-79.0193, 35.7596],
  MD: [-76.6413, 39.0458],
  VA: [-78.6569, 37.4316], // Add Virginia center
  DEFAULT: [-98.5795, 39.8283], // Center of USA
};

export default function DistrictMap({ state, district }: DistrictMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [geoJsonData, setGeoJsonData] = useState<GeoJSON.Feature | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coordinateCount, setCoordinateCount] = useState(0);
  const [dataSource, setDataSource] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side and load MapLibre CSS
  useEffect(() => {
    setIsClient(true);

    // Dynamically load MapLibre CSS only when map component mounts
    if (typeof document !== 'undefined' && !document.getElementById('maplibre-css')) {
      const link = document.createElement('link');
      link.id = 'maplibre-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css';
      document.head.appendChild(link);
    }
  }, []);

  // Initialize MapLibre map
  useEffect(() => {
    if (!isClient) return; // Exit early if not client-side

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!mapContainer.current) return; // Exit if no container
      if (mapRef.current) return; // Exit if map already exists
      logger.info('🔍 Map useEffect triggered - checking conditions:', {
        hasContainer: !!mapContainer.current,
        hasExistingMap: !!mapRef.current,
        isClient: isClient,
        state: state,
        district: district,
      });

      if (!mapContainer.current || mapRef.current) {
        logger.warn('⚠️ Map initialization skipped - conditions not met:', {
          noContainer: !mapContainer.current,
          mapExists: !!mapRef.current,
          notClient: !isClient,
        });
        return;
      }

      const initializeMap = async () => {
        try {
          // Step 2: Add diagnostic logging
          logger.info('🗺️ Map container element:', mapContainer.current);
          logger.info('⏳ Attempting to initialize MapLibre map...');

          // Dynamic import MapLibre GL
          const maplibregl = (await import('maplibre-gl')).default;

          const mapCenter = STATE_CENTERS[state] || STATE_CENTERS.DEFAULT;

          // Create map instance with comprehensive base map configuration
          const map = new maplibregl.Map({
            container: mapContainer.current!,
            style: {
              version: 8,
              glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
              sources: {
                'base-tiles': {
                  type: 'raster',
                  tiles: [
                    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  ],
                  tileSize: 256,
                  attribution: '© OpenStreetMap contributors',
                  maxzoom: 19,
                },
                'fallback-background': {
                  type: 'geojson',
                  data: {
                    type: 'FeatureCollection',
                    features: [],
                  },
                },
              },
              layers: [
                {
                  id: 'background',
                  type: 'background',
                  paint: {
                    'background-color': '#e3f2fd',
                  },
                },
                {
                  id: 'base-map',
                  type: 'raster',
                  source: 'base-tiles',
                  paint: {
                    'raster-opacity': 1,
                  },
                },
              ],
            },
            center: mapCenter,
            zoom: 7,
            interactive: true,
            attributionControl: false,
          });

          mapRef.current = map;
          logger.info('✅ MapLibre map successfully initialized:', map);

          // Add navigation controls
          map.addControl(new maplibregl.NavigationControl(), 'top-right');

          // Set a flag to indicate map is ready for district data
          map.on('load', () => {
            // Map is now ready for layers
            logger.info('MapLibre map loaded and ready for district data');
            logger.info('Map center:', map.getCenter());
            logger.info('Map zoom:', map.getZoom());

            // Force a resize to ensure proper rendering
            setTimeout(() => {
              map.resize();
              logger.info('Map resized');
            }, 100);
          });

          // Add source data event for debugging
          map.on('sourcedata', e => {
            if (e.sourceId === 'base-tiles') {
              logger.info('Base tiles source data loaded:', e.isSourceLoaded);
            }
          });

          // Add error event handling
          map.on('error', e => {
            logger.error('MapLibre map error:', e.error);
          });

          // Add style data event for debugging
          map.on('styledata', () => {
            logger.info('MapLibre style loaded');
          });
        } catch (error) {
          logger.error('Failed to initialize MapLibre GL:', error as Error);
          setError('Failed to initialize map');
        }
      };

      initializeMap();
    }, 100); // 100ms delay to ensure DOM is ready

    // Cleanup
    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isClient, state, district]);

  // Update map with district data
  useEffect(() => {
    logger.info('🔄 District data useEffect triggered:', {
      hasMap: !!mapRef.current,
      hasGeoJson: !!geoJsonData,
      isClient,
    });

    if (!mapRef.current || !geoJsonData || !isClient) {
      logger.warn('⚠️ Skipping district layer update - missing requirements');
      return;
    }

    const map = mapRef.current;

    logger.info('✅ Updating map with district data:', {
      hasMap: !!mapRef.current,
      hasGeoJson: !!geoJsonData,
      geoJsonType: geoJsonData?.type,
      geometryType: geoJsonData?.geometry?.type,
      mapLoaded: map.loaded(),
    });

    const addDistrictLayers = () => {
      try {
        logger.info('▶️ Attempting to load district boundaries...');

        // Remove existing district layer if present
        if (map.getSource('district-boundary')) {
          if (map.getLayer('district-fill')) {
            map.removeLayer('district-fill');
          }
          if (map.getLayer('district-stroke')) {
            map.removeLayer('district-stroke');
          }
          map.removeSource('district-boundary');
        }

        // Add new district boundary
        const sourceConfig = {
          type: 'geojson' as const,
          data: geoJsonData,
        };
        logger.info(' Adding source with config:', sourceConfig);

        map.addSource('district-boundary', sourceConfig);
        logger.info(' ✅ Source added successfully.');

        const isRealPolygon = dataSource === 'real_polygon_extraction';
        const fillColor = isRealPolygon ? '#22C55E' : '#3B82F6';
        const strokeColor = isRealPolygon ? '#16A34A' : '#1E40AF';

        // Add fill layer
        const fillLayerConfig = {
          id: 'district-fill',
          type: 'fill' as const,
          source: 'district-boundary',
          paint: {
            'fill-color': fillColor,
            'fill-opacity': 0.3,
          },
        };
        logger.info(' Adding fill layer with config:', fillLayerConfig);

        map.addLayer(fillLayerConfig);
        logger.info(' ✅ Fill layer added successfully.');

        // Add stroke layer
        const strokeLayerConfig = {
          id: 'district-stroke',
          type: 'line' as const,
          source: 'district-boundary',
          paint: {
            'line-color': strokeColor,
            'line-width': 3,
            'line-opacity': 0.9,
          },
        };
        logger.info(' Adding stroke layer with config:', strokeLayerConfig);

        map.addLayer(strokeLayerConfig);
        logger.info(' ✅ Stroke layer added successfully.');

        logger.info('✅ District layers added successfully');

        // Fit map to district bounds - handle both Polygon and MultiPolygon
        const geometry = geoJsonData.geometry;
        let allCoords: number[][] = [];

        if (geometry.type === 'Polygon' && geometry.coordinates[0]) {
          allCoords = geometry.coordinates[0] as number[][];
        } else if (geometry.type === 'MultiPolygon' && geometry.coordinates.length > 0) {
          // For MultiPolygon, collect coordinates from all polygons
          for (const polygon of geometry.coordinates) {
            if (polygon[0]) {
              allCoords = allCoords.concat(polygon[0] as number[][]);
            }
          }
        }

        if (allCoords.length > 0) {
          const lngs = allCoords
            .map(coord => coord[0])
            .filter((lng): lng is number => typeof lng === 'number');
          const lats = allCoords
            .map(coord => coord[1])
            .filter((lat): lat is number => typeof lat === 'number');

          if (lngs.length > 0 && lats.length > 0) {
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);

            map.fitBounds(
              [
                [minLng, minLat],
                [maxLng, maxLat],
              ],
              { padding: 50 }
            );
            logger.info('✅ Map fitted to district bounds');
          }
        }
      } catch (error) {
        logger.error('❌ Error updating map with district data:', error as Error);
      }
    };

    // Check if map is already loaded, if not wait for load event
    if (map.loaded()) {
      addDistrictLayers();
    } else {
      logger.info('⏳ Map not yet loaded, waiting for load event...');
      map.once('load', addDistrictLayers);
    }
  }, [geoJsonData, dataSource, isClient]);

  useEffect(() => {
    logger.info('🎯 Boundary fetch useEffect triggered:', {
      state,
      district,
      isClient,
    });

    async function fetchDistrictBoundary() {
      try {
        setError(null);

        const paddedDistrict = district.padStart(2, '0');
        const isAtLarge = paddedDistrict === '00';
        const isSenate = paddedDistrict.startsWith('S');

        // For at-large districts or Senate, show state boundary instead
        if (isAtLarge || isSenate) {
          logger.info('🗺️ Fetching state boundary (at-large/Senate):', { state, district });

          const response = await fetch(`/data/states/standard/${state}.json`);

          if (!response.ok) {
            logger.error('State boundary file not found:', { state, status: response.status });
            setError('State boundaries not available');
            setGeoJsonData(null);
            return;
          }

          const boundary = await response.json();
          logger.info('✅ State boundary loaded:', {
            state,
            hasGeometry: !!boundary?.geometry,
            geometryType: boundary?.geometry?.type,
          });

          setGeoJsonData(boundary);

          // Count coordinates
          let totalCoords = 0;
          const geometry = boundary?.geometry;
          if (geometry?.type === 'Polygon' && geometry.coordinates[0]) {
            totalCoords = geometry.coordinates[0].length;
          } else if (geometry?.type === 'MultiPolygon' && geometry.coordinates) {
            for (const polygon of geometry.coordinates) {
              if (polygon[0]) {
                totalCoords += polygon[0].length;
              }
            }
          }

          setCoordinateCount(totalCoords);
          setDataSource('state-boundary');
          setError(null);
          return;
        }

        // For regular House districts, fetch from Census TIGER API
        const stateFipsMap: Record<string, string> = {
          AL: '01',
          AK: '02',
          AZ: '04',
          AR: '05',
          CA: '06',
          CO: '08',
          CT: '09',
          DE: '10',
          FL: '12',
          GA: '13',
          HI: '15',
          ID: '16',
          IL: '17',
          IN: '18',
          IA: '19',
          KS: '20',
          KY: '21',
          LA: '22',
          ME: '23',
          MD: '24',
          MA: '25',
          MI: '26',
          MN: '27',
          MS: '28',
          MO: '29',
          MT: '30',
          NE: '31',
          NV: '32',
          NH: '33',
          NJ: '34',
          NM: '35',
          NY: '36',
          NC: '37',
          ND: '38',
          OH: '39',
          OK: '40',
          OR: '41',
          PA: '42',
          RI: '44',
          SC: '45',
          SD: '46',
          TN: '47',
          TX: '48',
          UT: '49',
          VT: '50',
          VA: '51',
          WA: '53',
          WV: '54',
          WI: '55',
          WY: '56',
        };

        const stateFips = stateFipsMap[state];
        if (!stateFips) {
          throw new Error(`Unknown state: ${state}`);
        }

        logger.info('🌐 Fetching district boundary from Census TIGER:', {
          state,
          stateFips,
          district: paddedDistrict,
        });

        // Fetch directly from Census TIGER API (119th Congress districts)
        const whereClause = `STATE='${stateFips}' AND CD119='${paddedDistrict}'`;
        const tigerUrl = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?where=${encodeURIComponent(whereClause)}&outFields=*&outSR=4326&f=geojson`;

        const response = await fetch(tigerUrl);

        if (!response.ok) {
          logger.error('Census TIGER API error:', {
            status: response.status,
            stateFips,
            district: paddedDistrict,
          });
          setError('District boundaries not available');
          setGeoJsonData(null);
          return;
        }

        const data = await response.json();

        if (!data.features || data.features.length === 0) {
          logger.warn('No district found in Census TIGER:', {
            stateFips,
            district: paddedDistrict,
          });
          setError('District boundaries not available');
          setGeoJsonData(null);
          return;
        }

        // Extract the first feature (should be the only one)
        const boundary = data.features[0];
        logger.info('✅ District boundary received from Census TIGER:', {
          hasData: !!boundary,
          type: boundary?.type,
          hasGeometry: !!boundary?.geometry,
          geometryType: boundary?.geometry?.type,
        });

        setGeoJsonData(boundary);

        // Count coordinates properly for both Polygon and MultiPolygon
        let totalCoords = 0;
        const geometry = boundary?.geometry;
        if (geometry?.type === 'Polygon' && geometry.coordinates[0]) {
          totalCoords = geometry.coordinates[0].length;
        } else if (geometry?.type === 'MultiPolygon' && geometry.coordinates) {
          for (const polygon of geometry.coordinates) {
            if (polygon[0]) {
              totalCoords += polygon[0].length;
            }
          }
        }

        setCoordinateCount(totalCoords);
        setDataSource('census-tiger-live');
        setError(null);
      } catch (err) {
        logger.error('Failed to load district boundary:', err);
        setError(err instanceof Error ? err.message : 'Failed to load district boundary');
        setGeoJsonData(null);
      }
    }

    fetchDistrictBoundary();
  }, [state, district, isClient]);

  if (error && !geoJsonData) {
    return (
      <div className="w-full h-[400px] bg-white flex items-center justify-center">
        <div className="text-gray-500 text-center">
          <p className="mb-2">
            {error === 'District boundaries not available'
              ? `State Overview - District boundaries not available`
              : 'District map unavailable'}
          </p>
          <p className="text-sm text-gray-400">
            {state}-{district.padStart(2, '0')}
          </p>
        </div>
      </div>
    );
  }

  if (!isClient) {
    return (
      <div className="w-full h-[400px] bg-white border-2 border-gray-300 flex items-center justify-center">
        <div className="text-gray-500">Loading interactive map...</div>
      </div>
    );
  }

  const isLiveCensusTiger = dataSource === 'census-tiger-live';
  const isStateBoundary = dataSource === 'state-boundary';

  return (
    <div className="w-full">
      <div className="w-full h-[400px] overflow-hidden border border-gray-200">
        <div
          ref={mapContainer}
          className="h-full w-full district-map-container"
          style={{
            height: '400px',
            width: '100%',
            minHeight: '400px',
            position: 'relative',
          }}
        />
      </div>
      {coordinateCount > 0 && (
        <div className="mt-2 text-xs text-center">
          {isLiveCensusTiger ? (
            <span className="text-green-600 font-medium">
              ✅ Live from Census TIGER API • 119th Congress ({coordinateCount.toLocaleString()}{' '}
              coordinate points)
            </span>
          ) : isStateBoundary ? (
            <span className="text-blue-600 font-medium">
              ✅ State boundaries ({coordinateCount.toLocaleString()} coordinate points)
            </span>
          ) : (
            <span className="text-gray-500">
              District boundaries ({coordinateCount.toLocaleString()} coordinate points)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
