'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useRef, useState } from 'react';
import logger from '@/lib/logging/simple-logger';

// GeoJSON types for district boundaries
interface DistrictProperties {
  GEOID: string;
  NAME: string;
  STATEFP: string;
  CD118FP: string;
  [key: string]: unknown;
}

interface DistrictFeature {
  type: 'Feature';
  properties: DistrictProperties;
  geometry: unknown;
}

interface BoundaryData {
  type: 'FeatureCollection';
  features: DistrictFeature[];
}

interface MapComponentProps {
  center: [number, number];
  zoom: number;
  boundaryData: BoundaryData | null;
  width: number | string;
  height: number | string;
}

export default function MapComponent({
  center,
  zoom,
  boundaryData,
  width,
  height,
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !containerRef.current) return;

    // Guard clause: prevent re-initialization if map already exists
    if (mapRef.current) return;

    const initializeMap = async () => {
      try {
        // Dynamic import of Leaflet
        const L = await import('leaflet');
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await import('leaflet/dist/leaflet.css');

        // Fix for default markers
        delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        if (!containerRef.current) return;

        // Create map instance
        const map = L.map(containerRef.current, {
          center: center,
          zoom: zoom,
          scrollWheelZoom: true,
          zoomControl: true,
          attributionControl: true,
          preferCanvas: true,
        });

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        }).addTo(map);

        // Add GeoJSON layer if available
        if (boundaryData) {
          const geoJsonLayer = L.geoJSON(boundaryData as GeoJSON.FeatureCollection, {
            style: feature => {
              const firstFeature = boundaryData.features[0];
              const isMainDistrict =
                feature?.properties?.GEOID ===
                `${firstFeature?.properties?.STATEFP || ''}${
                  firstFeature?.properties?.CD118FP || ''
                }`;
              return {
                fillColor: isMainDistrict ? '#3b82f6' : '#6b7280',
                weight: isMainDistrict ? 4 : 2,
                opacity: 1,
                color: isMainDistrict ? '#1e40af' : '#4b5563',
                dashArray: isMainDistrict ? '' : '5,5',
                fillOpacity: isMainDistrict ? 0.3 : 0.1,
              };
            },
            onEachFeature: (feature, layer) => {
              const firstFeature = boundaryData.features[0];
              const isMainDistrict =
                feature?.properties?.GEOID ===
                `${firstFeature?.properties?.STATEFP || ''}${
                  firstFeature?.properties?.CD118FP || ''
                }`;

              layer.bindPopup(`
                <div style="min-width: 200px;">
                  <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <h3 style="font-weight: 600; margin: 0; color: #1f2937;">${
                      feature.properties?.NAME || ''
                    }</h3>
                    ${
                      isMainDistrict
                        ? '<span style="margin-left: 8px; padding: 2px 6px; background: #3b82f6; color: white; border-radius: 4px; font-size: 12px;">Current</span>'
                        : ''
                    }
                  </div>
                  <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">Congressional District</p>
                  <p style="margin: 0 0 8px 0; font-size: 14px; color: #4b5563;">GEOID: ${
                    feature.properties?.GEOID || ''
                  }</p>
                  <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
                    <a href="/districts/${feature.properties?.STATEFP || ''}-${
                      feature.properties?.CD118FP || ''
                    }"
                       style="color: #3b82f6; text-decoration: none; font-size: 14px; font-weight: 500;">
                      View District Details →
                    </a>
                  </div>
                </div>
              `);

              // Add hover effects
              layer.on('mouseover', function (this: L.Path) {
                this.setStyle({
                  weight: isMainDistrict ? 6 : 4,
                  fillOpacity: isMainDistrict ? 0.5 : 0.3,
                });
              });

              layer.on('mouseout', function (this: L.Path) {
                this.setStyle({
                  weight: isMainDistrict ? 4 : 2,
                  fillOpacity: isMainDistrict ? 0.3 : 0.1,
                });
              });

              layer.on('click', function () {
                const districtId = `${feature.properties?.STATEFP || ''}-${
                  feature.properties?.CD118FP || ''
                }`;
                if (typeof window !== 'undefined') {
                  window.location.href = `/districts/${districtId}`;
                }
              });
            },
          }).addTo(map);

          // Fit map to bounds
          try {
            const bounds = geoJsonLayer.getBounds();
            if (bounds.isValid()) {
              map.fitBounds(bounds, { padding: [20, 20] });
            }
          } catch (error) {
            logger.warn('Could not fit bounds:', error as Error);
          }
        }

        // Store map instance in ref
        mapRef.current = map;

        // Force resize after initialization
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
      } catch (error) {
        logger.error('Error initializing map:', error as Error);
      }
    };

    initializeMap();

    // CRITICAL: Cleanup function using Leaflet's official cleanup method
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isClient, center, zoom, boundaryData]);

  // Handle resize when dimensions change
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }
  }, [width, height]);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: typeof width === 'string' ? width : `${width}px`,
        height: typeof height === 'string' ? height : `${height}px`,
        minHeight: '400px',
      }}
      className="relative z-0"
    />
  );
}
