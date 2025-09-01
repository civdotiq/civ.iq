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
  MD: [39.0458, -76.6413],
  DEFAULT: [39.8283, -98.5795], // Center of USA
};

export default function DistrictMap({ state, district }: DistrictMapProps) {
  const [geoJsonData, setGeoJsonData] = useState<GeoJSON.Feature | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coordinateCount, setCoordinateCount] = useState(0);
  const [dataSource, setDataSource] = useState<string>('');

  useEffect(() => {
    async function fetchDistrictBoundary() {
      try {
        setLoading(true);
        setError(null);

        const districtId = `${state}-${district.padStart(2, '0')}`;
        const response = await fetch(`/api/district-boundaries/${districtId}`);

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 404) {
            setError('District boundaries not available');
            setGeoJsonData(null);
          } else {
            throw new Error(errorData.message || 'Failed to fetch district boundary');
          }
        } else {
          const data = await response.json();
          setGeoJsonData(data.boundary);
          const coords = data.boundary?.geometry?.coordinates?.[0] || [];
          setCoordinateCount(coords.length);
          setDataSource(data.metadata?.method || 'unknown');
          setError(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load district boundary');
        setGeoJsonData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchDistrictBoundary();
  }, [state, district]);

  // Calculate map center - use district bounds if available, otherwise state center
  let mapCenter = STATE_CENTERS[state] || STATE_CENTERS.DEFAULT;
  let mapZoom = 7;

  if (
    geoJsonData &&
    geoJsonData.geometry.type === 'Polygon' &&
    geoJsonData.geometry.coordinates[0]
  ) {
    // Calculate center from bounding box of the district
    const coords = geoJsonData.geometry.coordinates[0];
    const lats = coords
      .map(coord => coord[1])
      .filter((lat): lat is number => typeof lat === 'number');
    const lngs = coords
      .map(coord => coord[0])
      .filter((lng): lng is number => typeof lng === 'number');

    if (lats.length > 0 && lngs.length > 0) {
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      mapCenter = [(minLat + maxLat) / 2, (minLng + maxLng) / 2];

      // Calculate zoom based on bounding box size
      const latDiff = maxLat - minLat;
      const lngDiff = maxLng - minLng;
      const maxDiff = Math.max(latDiff, lngDiff);

      if (maxDiff < 0.5) mapZoom = 10;
      else if (maxDiff < 1) mapZoom = 9;
      else if (maxDiff < 2) mapZoom = 8;
      else mapZoom = 7;
    }
  }

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

  const isRealPolygon = dataSource === 'real_polygon_extraction';
  const isFallback = dataSource === 'bounding_box_fallback';

  return (
    <div className="w-full">
      <div className="w-full h-[400px] rounded-lg overflow-hidden border border-gray-200">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
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
                fillColor: isRealPolygon ? '#22C55E' : '#3B82F6', // Green for real, blue for approximate
                fillOpacity: 0.2,
                color: isRealPolygon ? '#16A34A' : '#1E40AF',
                weight: 3,
                opacity: 0.8,
              }}
            />
          )}
        </MapContainer>
      </div>
      {coordinateCount > 0 && (
        <div className="mt-2 text-xs text-center">
          {isRealPolygon ? (
            <span className="text-green-600 font-medium">
              ✅ Actual district boundaries ({coordinateCount.toLocaleString()} coordinate points)
            </span>
          ) : isFallback ? (
            <span className="text-orange-600">
              ⚠️ Approximate boundaries (bounding box) - PMTiles parsing in development
            </span>
          ) : (
            <span className="text-gray-500">
              {coordinateCount > 100
                ? `District boundaries (${coordinateCount.toLocaleString()} coordinate points)`
                : 'Approximate district boundaries'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
