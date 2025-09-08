'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import logger from '@/lib/logging/simple-logger';

// Fix Leaflet default marker icon issue in Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface District {
  id: string;
  state: string;
  number: string;
  name?: string;
  representative?: {
    name: string;
    party: string;
    imageUrl?: string;
  };
  latitude?: number;
  longitude?: number;
}

interface LeafletDistrictMapProps {
  selectedDistrict?: string;
  onDistrictClick?: (district: District) => void;
  className?: string;
  showControls?: boolean;
  enableInteraction?: boolean;
  height?: string;
  selectedState?: string;
}

// Component to handle map state changes
function MapController({
  selectedState,
  districts,
}: {
  selectedState?: string;
  districts: District[];
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedState && selectedState !== 'all') {
      // Filter districts by selected state
      const stateDistricts = districts.filter(d => d.state === selectedState);

      if (stateDistricts.length > 0) {
        // Create bounds from all districts in the state
        const group = new L.FeatureGroup();

        stateDistricts.forEach(district => {
          if (district.latitude && district.longitude) {
            const marker = L.marker([district.latitude, district.longitude]);
            group.addLayer(marker);
          }
        });

        if (group.getLayers().length > 0) {
          map.fitBounds(group.getBounds(), { padding: [20, 20] });
        }
      }
    } else {
      // Default US view
      map.setView([39.8, -98.6], 4);
    }
  }, [selectedState, districts, map]);

  return null;
}

export default function LeafletDistrictMap({
  selectedDistrict: _selectedDistrict,
  onDistrictClick,
  className = '',
  showControls = true,
  height = '600px',
  selectedState,
}: LeafletDistrictMapProps) {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

  // Load districts from API
  useEffect(() => {
    const loadDistricts = async () => {
      try {
        setLoading(true);
        logger.info('Loading districts for Leaflet map');

        const response = await fetch('/api/districts/all');
        if (response.ok) {
          const data = await response.json();
          setDistricts(data.districts || []);
        }
      } catch (error) {
        logger.error('Failed to load districts', error as Error);
      } finally {
        setLoading(false);
      }
    };

    loadDistricts();
  }, []);

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <div className="text-sm text-gray-600">Loading map...</div>
          </div>
        </div>
      )}

      <MapContainer center={[39.8, -98.6]} zoom={4} className="h-full w-full" ref={mapRef}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController selectedState={selectedState} districts={districts} />

        {districts.map(district =>
          district.latitude && district.longitude ? (
            <Marker
              key={district.id}
              position={[district.latitude, district.longitude]}
              eventHandlers={{
                click: () => onDistrictClick?.(district),
              }}
            >
              <Popup>
                <div className="p-2">
                  <strong>
                    {district.state}-{district.number}
                  </strong>
                  {district.representative && (
                    <div className="mt-1 text-sm">
                      {district.representative.name}
                      <br />
                      {district.representative.party}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ) : null
        )}
      </MapContainer>

      {showControls && (
        <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 rounded p-2 shadow-md z-10">
          <div className="text-xs text-gray-600">
            {districts.length} districts • Leaflet + OpenStreetMap
          </div>
        </div>
      )}
    </div>
  );
}
