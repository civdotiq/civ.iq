'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { LatLngExpression } from 'leaflet';
import type { GeoJSON } from 'geojson';

// Dynamic import to avoid SSR issues with Leaflet
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), {
  ssr: false,
});
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false });

interface DistrictMapProps {
  state: string;
  district: string;
}

// State center coordinates for initial map view
const STATE_CENTERS: Record<string, LatLngExpression> = {
  MI: [44.3148, -85.6024],
  CA: [36.7783, -119.4179],
  TX: [31.9686, -99.9018],
  FL: [27.6648, -81.5158],
  NY: [43.0, -75.0],
  PA: [41.2033, -77.1945],
  IL: [40.6331, -89.3985],
  OH: [40.4173, -82.9071],
  GA: [32.1656, -82.9001],
  NC: [35.7596, -79.0193],
  // Add more states as needed
  DEFAULT: [39.8283, -98.5795], // Center of USA
};

export default function DistrictMap({ state, district }: DistrictMapProps) {
  const [geoJsonData, setGeoJsonData] = useState<GeoJSON.Feature | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDistrictBoundary() {
      try {
        setLoading(true);
        setError(null);

        // Try to fetch from the unitedstates/districts GitHub repo (public domain)
        // This is a simplified example - in production you'd want to host these files
        const districtNum = district.padStart(2, '0');

        // First try our local API endpoint that has boundary data
        const response = await fetch(`/api/district-boundaries/${state}-${districtNum}`);

        if (response.ok) {
          const data = await response.json();
          if (data.geometry) {
            setGeoJsonData({
              type: 'Feature',
              properties: {
                district: `${state}-${districtNum}`,
                name: `${state} District ${district}`,
              },
              geometry: data.geometry,
            });
          } else {
            // Fallback to a simple bounding box if no detailed geometry
            setError('Detailed boundaries not available');
          }
        } else {
          setError('District boundaries not available');
        }
      } catch {
        setError('Failed to load district map');
      } finally {
        setLoading(false);
      }
    }

    fetchDistrictBoundary();
  }, [state, district]);

  const mapCenter = STATE_CENTERS[state] || STATE_CENTERS.DEFAULT;

  if (loading) {
    return (
      <div className="w-full h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">Loading district map...</div>
      </div>
    );
  }

  if (error && !geoJsonData) {
    return (
      <div className="w-full h-[400px] bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-gray-500 text-center">
          <p className="mb-2">District map unavailable</p>
          <p className="text-sm text-gray-400">
            {state}-{district.padStart(2, '0')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden border border-gray-200">
      <MapContainer
        center={mapCenter}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoJsonData && (
          <GeoJSON
            data={geoJsonData}
            style={{
              fillColor: '#3B82F6',
              fillOpacity: 0.3,
              color: '#1E40AF',
              weight: 2,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
