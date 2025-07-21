'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useRef, useState } from 'react';

interface MapComponentProps {
  center: [number, number];
  zoom: number;
  boundaryData: unknown;
  width: number | string;
  height: number | string;
}

export default function MapComponent({ center, zoom, boundaryData, width, height }: MapComponentProps) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !containerRef.current) return;

    let map: unknown = null;
    let geoJsonLayer: unknown = null;

    const initializeMap = async () => {
      try {
        // Dynamic import of Leaflet to avoid SSR issues
        const L = await import('leaflet');
        
        // Import Leaflet CSS
        await import('leaflet/dist/leaflet.css');
        
        // Fix for default markers
        delete (L as any).Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Ensure container exists and has dimensions
        if (!containerRef.current) return;
        
        const container = containerRef.current;
        
        // Clear any existing map
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        
        // Clear container
        container.innerHTML = '';

        // Create map with proper container check
        map = L.map(container, {
          center: center,
          zoom: zoom,
          scrollWheelZoom: true,
          zoomControl: true,
          attributionControl: true,
          preferCanvas: true, // Better performance for large datasets
        });

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        }).addTo(map);

        // Add GeoJSON layer with enhanced interactivity
        if (boundaryData) {
          geoJsonLayer = L.geoJSON(boundaryData, {
            style: (feature) => {
              // Dynamic styling based on district properties
              const isMainDistrict = feature?.properties?.GEOID === `${boundaryData.features[0].properties.STATEFP}${boundaryData.features[0].properties.CD118FP}`;
              return {
                fillColor: isMainDistrict ? '#3b82f6' : '#6b7280',
                weight: isMainDistrict ? 4 : 2,
                opacity: 1,
                color: isMainDistrict ? '#1e40af' : '#4b5563',
                dashArray: isMainDistrict ? '' : '5,5',
                fillOpacity: isMainDistrict ? 0.3 : 0.1
              };
            },
            onEachFeature: (feature: unknown, layer: unknown) => {
              const isMainDistrict = feature.properties.GEOID === `${boundaryData.features[0].properties.STATEFP}${boundaryData.features[0].properties.CD118FP}`;
              
              // Enhanced popup with more district information
              layer.bindPopup(`
                <div style="min-width: 200px;">
                  <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <h3 style="font-weight: 600; margin: 0; color: #1f2937;">${feature.properties.NAME}</h3>
                    ${isMainDistrict ? '<span style="margin-left: 8px; padding: 2px 6px; background: #3b82f6; color: white; border-radius: 4px; font-size: 12px;">Current</span>' : ''}
                  </div>
                  <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">Congressional District</p>
                  <p style="margin: 0 0 8px 0; font-size: 14px; color: #4b5563;">GEOID: ${feature.properties.GEOID}</p>
                  <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
                    <a href="/districts/${feature.properties.STATEFP}-${feature.properties.CD118FP}" 
                       style="color: #3b82f6; text-decoration: none; font-size: 14px; font-weight: 500;">
                      View District Details →
                    </a>
                  </div>
                </div>
              `);
              
              // Add hover effects
              layer.on('mouseover', function(this: unknown) {
                this.setStyle({
                  weight: isMainDistrict ? 6 : 4,
                  fillOpacity: isMainDistrict ? 0.5 : 0.3
                });
              });
              
              layer.on('mouseout', function(this: unknown) {
                this.setStyle({
                  weight: isMainDistrict ? 4 : 2,
                  fillOpacity: isMainDistrict ? 0.3 : 0.1
                });
              });
              
              // Add click handler for navigation
              layer.on('click', function() {
                const districtId = `${feature.properties.STATEFP}-${feature.properties.CD118FP}`;
                if (typeof window !== 'undefined') {
                  window.location.href = `/districts/${districtId}`;
                }
              });
            }
          }).addTo(map);

          // Fit map to bounds
          try {
            const bounds = geoJsonLayer.getBounds();
            if (bounds.isValid()) {
              map.fitBounds(bounds, { padding: [20, 20] });
            }
          } catch (error) {
            console.warn('Could not fit bounds:', error);
          }
        }

        mapRef.current = map;

        // Force resize after initialization
        setTimeout(() => {
          if (map) {
            map.invalidateSize();
          }
        }, 100);

      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initializeMap();

    // Cleanup function
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
        mapRef.current.invalidateSize();
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
        minHeight: '400px'
      }}
      className="relative z-0"
    />
  );
}