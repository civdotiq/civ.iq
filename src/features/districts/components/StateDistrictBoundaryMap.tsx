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
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { Loader2, Maximize2, Minimize2 } from 'lucide-react';
import logger from '@/lib/logging/simple-logger';
import 'maplibre-gl/dist/maplibre-gl.css';

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [metadata, setMetadata] = useState<DistrictMetadata | null>(null);

  const loadDistrictMetadata = useCallback(async (districtId: string) => {
    try {
      const response = await fetch('/data/state-districts/state-districts-manifest.json');
      if (!response.ok) {
        throw new Error('Manifest not found');
      }

      const manifest = await response.json();
      const districtData = manifest.districts[districtId];

      if (!districtData) {
        throw new Error(`District ${districtId} not found in manifest`);
      }

      setMetadata(districtData);
    } catch (err) {
      logger.error('Failed to load district metadata', err as Error);
      setError('District boundaries not yet available');
    }
  }, []);

  const initializeMap = useCallback(
    async (districtId: string, districtMetadata: DistrictMetadata | null) => {
      if (!mapContainer.current) return;

      try {
        // Register PMTiles protocol
        const protocol = new Protocol();
        maplibregl.addProtocol('pmtiles', protocol.tile);

        // Determine which layer to use (sldl or sldu)
        const layerName = chamber === 'lower' ? 'sldl' : 'sldu';

        // Initialize map with PMTiles source
        map.current = new maplibregl.Map({
          container: mapContainer.current,
          style: {
            version: 8,
            sources: {
              'state-districts': {
                type: 'vector',
                url: 'pmtiles:///data/state_legislative_districts.pmtiles',
              },
              osm: {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution:
                  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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

        map.current.on('load', () => {
          if (!map.current) return;

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

          // Add current district layer (highlighted fill)
          map.current!.addLayer({
            id: 'district-fill',
            type: 'fill',
            source: 'state-districts',
            'source-layer': layerName,
            filter: ['==', ['get', 'id'], districtId],
            paint: {
              'fill-color': '#3b82f6',
              'fill-opacity': 0.3,
            },
          });

          // Add current district outline (bold blue line)
          map.current!.addLayer({
            id: 'district-outline',
            type: 'line',
            source: 'state-districts',
            'source-layer': layerName,
            filter: ['==', ['get', 'id'], districtId],
            paint: {
              'line-color': '#1e40af',
              'line-width': 3,
            },
          });

          // Fly to district if metadata is available
          if (districtMetadata && districtMetadata.centroid) {
            map.current!.flyTo({
              center: districtMetadata.centroid,
              zoom: 9,
              duration: 1000,
            });
          }

          // Add click handler for neighboring districts
          map.current!.on('click', 'neighboring-districts', e => {
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
          map.current!.on('mouseenter', 'neighboring-districts', () => {
            if (map.current) {
              map.current.getCanvas().style.cursor = 'pointer';
            }
          });

          map.current!.on('mouseleave', 'neighboring-districts', () => {
            if (map.current) {
              map.current.getCanvas().style.cursor = '';
            }
          });

          setLoading(false);
        });

        map.current.on('error', e => {
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
    [chamber, stateCode]
  );

  useEffect(() => {
    if (!mapContainer.current) return;

    // Build district ID
    const districtId = `${stateCode}-${chamber}-${district}`;

    // Load district metadata
    loadDistrictMetadata(districtId).then(() => {
      // Initialize map after metadata is loaded
      initializeMap(districtId, metadata);
    });

    return () => {
      // Cleanup
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [stateCode, chamber, district, loadDistrictMetadata, initializeMap, metadata]);

  function toggleFullscreen() {
    setIsFullscreen(!isFullscreen);
  }

  // Loading state
  if (loading && !map.current) {
    return (
      <div
        className={`flex items-center justify-center bg-white border-2 border-gray-300 ${className}`}
        style={{ width, height }}
      >
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-sm text-gray-600">Loading district boundaries...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-white border-2 border-dashed border-gray-300 ${className}`}
        style={{ width, height }}
      >
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
    );
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
        ref={mapContainer}
        style={{
          width: '100%',
          height: '100%',
        }}
      />

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
