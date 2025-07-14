'use client';

/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
 */

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

// Dynamic import to avoid SSR issues with Leaflet
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

interface DistrictBoundaryMapProps {
  districtId: string;
  state: string;
  district: string;
  width?: number;
  height?: number;
  className?: string;
}

interface DistrictBoundary {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: {
      GEOID: string;
      NAME: string;
      CD118FP: string;
      STATEFP: string;
    };
    geometry: {
      type: "Polygon";
      coordinates: number[][][];
    };
  }>;
}

export default function DistrictBoundaryMap({ 
  districtId, 
  state, 
  district, 
  width = 800, 
  height = 500,
  className = ""
}: DistrictBoundaryMapProps) {
  const [boundaryData, setBoundaryData] = useState<DistrictBoundary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.8283, -98.5795]); // US center
  const [mapZoom, setMapZoom] = useState(4);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const fetchDistrictBoundaries = async () => {
      setLoading(true);
      setError(null);

      try {
        // State centers for realistic district positioning
        const stateCenters: Record<string, [number, number]> = {
          'AL': [32.806671, -86.79113],
          'AK': [64.0685, -152.2782],
          'AZ': [34.168218, -111.930907],
          'AR': [34.736009, -92.331122],
          'CA': [36.17, -119.7462],
          'CO': [39.059, -105.311],
          'CT': [41.767, -72.677],
          'DE': [39.161921, -75.526755],
          'FL': [27.4193, -81.4639],
          'GA': [32.9866, -83.6487],
          'HI': [21.1098, -157.5311],
          'ID': [44.931109, -116.237651],
          'IL': [40.349457, -88.986137],
          'IN': [40.551217, -85.602364],
          'IA': [42.032974, -93.581543],
          'KS': [38.572954, -98.580009],
          'KY': [37.839333, -84.27002],
          'LA': [30.45809, -91.140229],
          'ME': [45.323781, -69.765261],
          'MD': [39.063946, -76.802101],
          'MA': [42.2352, -71.0275],
          'MI': [42.354558, -84.955255],
          'MN': [46.39241, -94.63623],
          'MS': [32.320, -90.207],
          'MO': [38.572954, -92.60376],
          'MT': [47.042418, -109.633835],
          'NE': [41.590939, -99.675285],
          'NV': [39.161921, -117.015289],
          'NH': [43.220093, -71.549896],
          'NJ': [40.221741, -74.756138],
          'NM': [34.307144, -106.018066],
          'NY': [42.659829, -75.615],
          'NC': [35.771, -78.638],
          'ND': [47.411631, -100.779004],
          'OH': [40.367474, -82.996216],
          'OK': [35.482309, -97.534994],
          'OR': [44.931109, -123.029159],
          'PA': [40.269789, -76.875613],
          'RI': [41.82355, -71.422132],
          'SC': [33.836082, -81.163727],
          'SD': [44.367966, -100.336378],
          'TN': [35.771, -86.784],
          'TX': [31.106, -97.6475],
          'UT': [39.161921, -111.313726],
          'VT': [44.26639, -72.580009],
          'VA': [37.54, -78.4588],
          'WA': [47.042418, -120.718],
          'WV': [38.349497, -81.633294],
          'WI': [44.95, -89.5],
          'WY': [42.859859, -107.47]
        };

        const center = stateCenters[state] || [39.8283, -98.5795];
        
        // Adjust position based on district number for variety
        const districtNum = parseInt(district) || 1;
        const offsetLat = (districtNum % 3 - 1) * 0.5;
        const offsetLng = ((districtNum * 2) % 5 - 2) * 0.5;
        
        const adjustedCenter: [number, number] = [
          center[0] + offsetLat,
          center[1] + offsetLng
        ];
        
        setMapCenter(adjustedCenter);
        setMapZoom(state === 'AK' || state === 'TX' || state === 'CA' ? 6 : 8);

        // Create a more realistic district boundary shape
        const createDistrictShape = (center: [number, number], districtNum: number) => {
          const [lat, lng] = center;
          const size = 0.3 + (districtNum % 3) * 0.1; // Vary size
          const rotation = (districtNum * 30) % 360; // Vary shape
          
          // Create an irregular polygon that looks more like a real district
          const points = [];
          for (let i = 0; i < 8; i++) {
            const angle = (i * 45 + rotation) * Math.PI / 180;
            const radius = size * (0.7 + Math.sin(i * 1.7) * 0.3); // Irregular radius
            const pointLat = lat + radius * Math.cos(angle);
            const pointLng = lng + radius * Math.sin(angle);
            points.push([pointLng, pointLat]);
          }
          // Close the polygon
          points.push(points[0]);
          return points;
        };

        const mockBoundary: DistrictBoundary = {
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            properties: {
              GEOID: `${state}${district.padStart(2, '0')}`,
              NAME: `${state} District ${district}`,
              CD118FP: district.padStart(2, '0'),
              STATEFP: state
            },
            geometry: {
              type: "Polygon",
              coordinates: [createDistrictShape(adjustedCenter, districtNum)]
            }
          }]
        };

        setBoundaryData(mockBoundary);
      } catch (err) {
        setError('Failed to load district boundaries');
        console.error('District boundary error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDistrictBoundaries();
  }, [state, district]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (loading) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ width, height }}
      >
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-sm text-gray-600">Loading district boundaries...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 ${className}`}
        style={{ width, height }}
      >
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">{error}</p>
          <p className="text-xs text-gray-500">District: {state}-{district}</p>
          <p className="text-xs text-gray-400 mt-2">In production, this would use Census TIGER/Line data</p>
        </div>
      </div>
    );
  }

  const mapComponent = (
    <div className={`relative rounded-lg overflow-hidden border shadow-sm ${className}`}>
      {/* Map Controls */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <button
          onClick={toggleFullscreen}
          className="bg-white hover:bg-gray-50 border border-gray-300 rounded p-2 shadow-sm transition-colors"
          title="Toggle fullscreen"
        >
          <Maximize2 className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Map Container */}
      <div style={{ width: isFullscreen ? '100vw' : width, height: isFullscreen ? '100vh' : height }}>
        {typeof window !== 'undefined' && (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {boundaryData && (
              <GeoJSON
                data={boundaryData}
                style={{
                  fillColor: '#3b82f6',
                  weight: 3,
                  opacity: 1,
                  color: '#1e40af',
                  dashArray: '',
                  fillOpacity: 0.2
                }}
                onEachFeature={(feature, layer) => {
                  layer.bindPopup(`
                    <div>
                      <h3 class="font-semibold">${feature.properties.NAME}</h3>
                      <p class="text-sm text-gray-600">Congressional District</p>
                      <p class="text-sm">GEOID: ${feature.properties.GEOID}</p>
                    </div>
                  `);
                }}
              />
            )}
          </MapContainer>
        )}
      </div>

      {/* Map Info Footer */}
      <div className="p-3 bg-gray-50 border-t text-xs text-gray-600">
        <div className="flex justify-between items-center">
          <div>
            <strong>{state}-{district}</strong> Congressional District boundaries
          </div>
          <div>
            Data: U.S. Census Bureau TIGER/Line (Simulated)
          </div>
        </div>
        <p className="mt-1 text-gray-500">
          In production, this map would display actual district boundaries from the Census Bureau's TIGER/Line dataset.
        </p>
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
          className="absolute top-4 left-4 z-[1001] bg-white hover:bg-gray-50 border border-gray-300 rounded px-3 py-2 shadow-sm transition-colors"
        >
          Exit Fullscreen
        </button>
      </div>
    );
  }

  return mapComponent;
}