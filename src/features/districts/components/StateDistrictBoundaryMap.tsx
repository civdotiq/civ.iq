'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State District Boundary Map Component
 *
 * Displays interactive map of state legislative district boundaries using:
 * - MapLibre GL JS for rendering
 * - PMTiles for efficient vector tile streaming
 * - Census TIGER/Line data for accurate geometries
 *
 * Features:
 * - Highlights current district
 * - Shows neighboring districts
 * - Flies to district centroid
 * - Supports both upper and lower chambers
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, Maximize2, Minimize2 } from 'lucide-react';
import logger from '@/lib/logging/simple-logger';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { isSlowConnection } from '@/lib/utils/mobile-detection';

// Module-level flag to track if PMTiles protocol is registered (shared across all map instances)
let pmtilesProtocolRegistered = false;

interface StateDistrictBoundaryMapProps {
  stateCode: string; // e.g., "CA"
  chamber: 'upper' | 'lower';
  district: string; // e.g., "12" or "AL"
  width?: number | string;
  height?: number | string;
  className?: string;
}

interface DistrictMetadata {
  centroid: [number, number]; // [lon, lat]
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  name: string;
  full_name: string;
}

export default function StateDistrictBoundaryMap({
  stateCode,
  chamber,
  district,
  width = '100%',
  height = 500,
  className = '',
}: StateDistrictBoundaryMapProps) {
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = useRef<any>(null); // Using any because maplibre-gl is dynamically imported
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [metadata, setMetadata] = useState<DistrictMetadata | null>(null);

  // Detect device type and connection quality for optimal PMTiles selection
  const isMobile = useIsMobile();
  const slowConnection = isSlowConnection();

  // Select appropriate PMTiles file based on device capabilities
  // Currently using the same file for all devices (24MB, max zoom 10)
  // Mobile-optimized version (~6MB, max zoom 8) can be generated for slower connections
  const pmtilesFile = '/data/state_legislative_districts.pmtiles';

  // Log device detection for debugging (can be removed later)
  if (isMobile || slowConnection) {
    logger.info('[StateDistrictBoundaryMap] Mobile/slow connection detected', {
      isMobile,
      slowConnection,
    });
  }

  // Callback ref to track when DOM element is actually mounted
  const setMapContainerRef = useCallback((node: HTMLDivElement | null) => {
    logger.info('[StateDistrictBoundaryMap] Callback ref invoked', { hasNode: !!node });
    if (node) {
      logger.info('[StateDistrictBoundaryMap] Container DOM element attached, setting state');
      setMapContainer(node);
    } else {
      logger.info('[StateDistrictBoundaryMap] Callback ref invoked with null (cleanup)');
    }
  }, []);

  const initializeMap = useCallback(
    async (districtId: string, districtMetadata: DistrictMetadata | null) => {
      if (!mapContainer) {
        logger.info('[StateDistrictBoundaryMap] initializeMap called but container not ready', {
          hasContainer: !!mapContainer,
        });
        return;
      }

      logger.info('[StateDistrictBoundaryMap] Starting map initialization', { districtId });

      try {
        // Dynamically import MapLibre GL and PMTiles
        logger.info('[StateDistrictBoundaryMap] Loading MapLibre and PMTiles libraries...');
        const [maplibregl, pmtiles] = await Promise.all([import('maplibre-gl'), import('pmtiles')]);
        logger.info('[StateDistrictBoundaryMap] Libraries loaded successfully');

        // Dynamically load CSS
        if (typeof document !== 'undefined' && !document.getElementById('maplibre-css')) {
          const link = document.createElement('link');
          link.id = 'maplibre-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css';
          document.head.appendChild(link);
        }

        // Register PMTiles protocol only once (shared across all map instances)
        // This prevents conflicts when multiple maps are on the same page
        if (!pmtilesProtocolRegistered) {
          const protocol = new pmtiles.Protocol();
          maplibregl.default.addProtocol('pmtiles', protocol.tile);
          pmtilesProtocolRegistered = true;
        }

        // Determine which layer to use (sldl or sldu)
        const layerName = chamber === 'lower' ? 'sldl' : 'sldu';

        // Initialize map with only OSM base tiles (PMTiles added after map loads)
        logger.info('[StateDistrictBoundaryMap] Creating MapLibre map instance...');
        map.current = new maplibregl.default.Map({
          container: mapContainer,
          style: {
            version: 8,
            sources: {
              osm: {
                type: 'raster',
                tiles: [
                  'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
                ],
                tileSize: 256,
                attribution:
                  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxzoom: 19,
              },
            },
            layers: [
              // Base map (OpenStreetMap)
              {
                id: 'osm-background',
                type: 'raster',
                source: 'osm',
                minzoom: 0,
                maxzoom: 22,
              },
            ],
          },
          center: [-98.5795, 39.8283], // US center default
          zoom: 4,
        });
        logger.info('[StateDistrictBoundaryMap] Map instance created, waiting for load event...');

        map.current.on('load', () => {
          logger.info('[StateDistrictBoundaryMap] Map load event fired!');
          if (!map.current) {
            logger.warn('[StateDistrictBoundaryMap] map.current is null in load handler');
            return;
          }

          try {
            // Add PMTiles source after map is loaded
            // Uses mobile-optimized tiles (~6MB) for mobile devices or slow connections
            // Uses full-quality tiles (~24MB) for desktop with good connection
            logger.info('[StateDistrictBoundaryMap] Adding PMTiles source...', {
              file: pmtilesFile,
              isMobile,
              slowConnection,
            });
            map.current.addSource('state-districts', {
              type: 'vector',
              url: `pmtiles://${pmtilesFile}`,
            });
            logger.info('[StateDistrictBoundaryMap] PMTiles source added successfully');

            // Add layers immediately after source registration
            // MapLibre GL handles lazy loading of tiles automatically - no need to wait
            // for sourcedata event which is unreliable with PMTiles sources

            logger.info('[StateDistrictBoundaryMap] Adding layers with filters', {
              layerName,
              districtId,
              stateCode,
              chamber,
            });

            // Add neighboring districts layer (light gray outlines)
            map.current.addLayer({
              id: 'neighboring-districts',
              type: 'line',
              source: 'state-districts',
              'source-layer': layerName,
              filter: [
                'all',
                ['==', ['get', 'state_code'], stateCode],
                ['!=', ['get', 'id'], districtId],
              ],
              paint: {
                'line-color': '#9ca3af',
                'line-width': 1,
                'line-dasharray': [2, 2],
              },
            });

            // Build filter for current district
            // Use composite filter matching state_code, chamber, and district_num
            // This is more robust than relying solely on the 'id' property
            const currentDistrictFilter = [
              'all',
              ['==', ['get', 'state_code'], stateCode],
              ['==', ['get', 'chamber'], chamber],
              ['==', ['get', 'district_num'], district],
            ];

            // Add current district layer (highlighted fill)
            map.current.addLayer({
              id: 'district-fill',
              type: 'fill',
              source: 'state-districts',
              'source-layer': layerName,
              filter: currentDistrictFilter,
              paint: {
                'fill-color': '#3b82f6',
                'fill-opacity': 0.3,
              },
            });

            // Add current district outline (bold blue line)
            map.current.addLayer({
              id: 'district-outline',
              type: 'line',
              source: 'state-districts',
              'source-layer': layerName,
              filter: currentDistrictFilter,
              paint: {
                'line-color': '#1e40af',
                'line-width': 3,
              },
            });

            // Fly to district if metadata is available
            if (districtMetadata && districtMetadata.centroid) {
              map.current.flyTo({
                center: districtMetadata.centroid,
                zoom: 9,
                duration: 1000,
              });
            }

            // Add click handler for neighboring districts
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            map.current.on('click', 'neighboring-districts', (e: any) => {
              if (!e.features || e.features.length === 0) return;

              const feature = e.features[0];
              if (!feature) return;

              const neighborId = feature.properties?.id;

              if (neighborId) {
                // Navigate to neighboring district
                const [neighborState, neighborChamber, neighborDistrict] = neighborId.split('-');
                window.location.href = `/state-districts/${neighborState}/${neighborDistrict}?chamber=${neighborChamber}`;
              }
            });

            // Change cursor on hover
            map.current.on('mouseenter', 'neighboring-districts', () => {
              if (map.current) {
                map.current.getCanvas().style.cursor = 'pointer';
              }
            });

            map.current.on('mouseleave', 'neighboring-districts', () => {
              if (map.current) {
                map.current.getCanvas().style.cursor = '';
              }
            });

            // Debug: Log all features from the layer when map is idle
            map.current.once('idle', () => {
              if (!map.current) return;

              // Query ALL features in the source layer (no filter) to see what's there
              const allFeatures = map.current.querySourceFeatures('state-districts', {
                sourceLayer: layerName,
              });

              // Query features for this state
              const stateFeatures = map.current.querySourceFeatures('state-districts', {
                sourceLayer: layerName,
                filter: ['==', ['get', 'state_code'], stateCode],
              });

              // Get unique IDs from state features
              const stateIdSet = new Set<string>();
              stateFeatures.forEach((f: { properties?: { id?: string } }) => {
                const id = f.properties?.id;
                if (typeof id === 'string') {
                  stateIdSet.add(id);
                }
              });
              const stateDistrictIds: string[] = Array.from(stateIdSet);

              // Check if our target district exists
              const targetExists = stateDistrictIds.includes(districtId);

              // Find matches containing the district number
              const districtNumMatches = stateDistrictIds.filter((id: string) =>
                id.includes(`-${districtId.split('-').pop()}`)
              );

              logger.info('[StateDistrictBoundaryMap] Debug - Features analysis', {
                layerName,
                stateCode,
                districtId,
                allFeaturesCount: allFeatures.length,
                stateFeaturesCount: stateFeatures.length,
                targetDistrictExists: targetExists,
                sampleStateIds: stateDistrictIds.slice(0, 10),
                districtNumMatches,
              });

              // If target doesn't exist, log what's in the viewport
              if (!targetExists && allFeatures.length > 0) {
                const allIdSet = new Set<string>();
                allFeatures.forEach((f: { properties?: { id?: string } }) => {
                  const id = f.properties?.id;
                  if (typeof id === 'string') {
                    allIdSet.add(id);
                  }
                });
                const allIds: string[] = Array.from(allIdSet);
                logger.warn(
                  '[StateDistrictBoundaryMap] Target district NOT FOUND in loaded tiles',
                  {
                    districtId,
                    availableInViewport: allIds.slice(0, 20),
                  }
                );
              }
            });

            logger.info('[StateDistrictBoundaryMap] Layers added successfully!');
            setLoading(false);
          } catch (error) {
            logger.error('Failed to add PMTiles source or layers', error as Error);
            setError('Failed to load district boundaries');
            setLoading(false);
            return;
          }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.current.on('error', (e: any) => {
          logger.error('Map error', e.error);
          setError('Failed to load map');
          setLoading(false);
        });
      } catch (err) {
        logger.error('Map initialization error', err as Error);
        setError('Failed to initialize map');
        setLoading(false);
      }
    },
    [chamber, stateCode, district, mapContainer, isMobile, pmtilesFile, slowConnection]
  );

  useEffect(() => {
    if (!mapContainer) {
      logger.info('[StateDistrictBoundaryMap] useEffect - container not ready', {
        hasContainer: !!mapContainer,
      });
      return;
    }

    // Build district ID
    const districtId = `${stateCode}-${chamber}-${district}`;
    logger.info('[StateDistrictBoundaryMap] useEffect executing', { districtId });

    // Load district metadata and initialize map
    const initMap = async () => {
      try {
        // Load metadata first
        logger.info('[StateDistrictBoundaryMap] Fetching metadata...');
        const response = await fetch('/data/state-districts/state-districts-manifest.json');
        if (response.ok) {
          const manifest = await response.json();
          const districtData = manifest.districts[districtId];
          if (districtData) {
            logger.info('[StateDistrictBoundaryMap] Metadata found', districtData);
            setMetadata(districtData);
            // Initialize map with the loaded metadata
            await initializeMap(districtId, districtData);
          } else {
            logger.info(
              '[StateDistrictBoundaryMap] No metadata found for district, initializing without it'
            );
            // No metadata found, initialize map anyway
            await initializeMap(districtId, null);
          }
        } else {
          logger.warn(
            '[StateDistrictBoundaryMap] Manifest not found, initializing map without metadata'
          );
          // Manifest not found, initialize map anyway
          await initializeMap(districtId, null);
        }
      } catch (err) {
        logger.error('Failed to load map', err as Error);
        setError('Failed to load map');
        setLoading(false);
      }
    };

    initMap();

    return () => {
      // Cleanup
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [stateCode, chamber, district, mapContainer, initializeMap]);

  function toggleFullscreen() {
    setIsFullscreen(!isFullscreen);
  }

  const chamberName = chamber === 'upper' ? 'State Senate' : 'State House';

  const mapComponent = (
    <div
      className={`relative overflow-hidden border-2 border-black ${className}`}
      style={{
        width: isFullscreen ? '100vw' : width,
        height: isFullscreen ? '100vh' : height,
      }}
    >
      {/* Map Controls */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <button
          onClick={toggleFullscreen}
          className="bg-white hover:bg-gray-100 border-2 border-black rounded p-2 transition-colors shadow-lg"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4 text-gray-700" />
          ) : (
            <Maximize2 className="h-4 w-4 text-gray-700" />
          )}
        </button>
      </div>

      {/* Map Container */}
      <div
        ref={setMapContainerRef}
        style={{
          width: '100%',
          height: '100%',
        }}
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-[999]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-sm text-gray-600">Loading district boundaries...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-95 z-[999]">
          <div className="text-center p-8">
            <p className="text-sm text-gray-600 mb-2">{error}</p>
            <p className="text-xs text-gray-500">
              District: {stateCode}-{chamber}-{district}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Run <code>npm run process:state-districts</code> to generate boundaries
            </p>
          </div>
        </div>
      )}

      {/* Map Info Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-white border-t-2 border-black text-xs text-gray-600">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-4">
            <div>
              <strong>
                {stateCode} {chamberName} District {district}
              </strong>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 border border-blue-800 mr-1"></div>
                <span>Current District</span>
              </div>
              <div className="flex items-center">
                <div
                  className="w-3 h-3 border border-gray-400 mr-1"
                  style={{ borderStyle: 'dashed' }}
                ></div>
                <span>Neighboring Districts</span>
              </div>
            </div>
          </div>
          <div>Data: U.S. Census Bureau TIGER/Line 2025</div>
        </div>

        {metadata && (
          <div className="text-xs text-gray-500">
            <strong>{metadata.full_name}</strong>
            {metadata.centroid && (
              <span className="ml-2">
                Center: {metadata.centroid[1].toFixed(4)}, {metadata.centroid[0].toFixed(4)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Fullscreen overlay
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        {mapComponent}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 left-4 z-[1001] bg-white hover:bg-gray-100 border-2 border-black rounded px-4 py-2 transition-colors shadow-lg"
        >
          Exit Fullscreen
        </button>
      </div>
    );
  }

  return mapComponent;
}
