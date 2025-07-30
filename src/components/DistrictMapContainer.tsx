'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface District {
  id: string;
  name: string;
  party: string;
  competitiveness: number;
  population: number;
  state?: string;
  number?: string;
}

interface DistrictMapContainerProps {
  districts: District[];
  selectedDistrict?: string;
  onDistrictClick?: (districtId: string) => void;
  onStateClick?: (stateInfo: unknown) => void;
  width?: number;
  height?: number;
}

interface DistrictBoundary {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {
      GEOID: string;
      NAME: string;
      STATEFP: string;
      CD118FP: string;
      party?: string;
      competitiveness?: number;
      population?: number;
    };
    geometry: {
      type: 'Polygon';
      coordinates: number[][][];
    };
  }>;
}

export default function DistrictMapContainer({
  districts,
  selectedDistrict,
  onDistrictClick,
  onStateClick,
  width = 900,
  height = 500,
}: DistrictMapContainerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [mapData, setMapData] = useState<DistrictBoundary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    generateMapData();
  }, [isClient, districts]);

  const generateMapData = async () => {
    setLoading(true);
    setError(null);

    try {
      // In production, this would fetch real GeoJSON data from Census TIGER/Line
      // For now, we'll generate representative district shapes across the US

      const features = districts.map((district, index) => {
        // Create realistic district shapes across the US
        const statePositions: Record<string, [number, number]> = {
          CA: [-119.7462, 36.17],
          TX: [-97.6475, 31.106],
          NY: [-75.615, 42.659829],
          FL: [-81.4639, 27.4193],
          PA: [-76.875613, 40.269789],
          IL: [-88.986137, 40.349457],
          OH: [-82.996216, 40.367474],
          GA: [-83.6487, 32.9866],
          NC: [-78.638, 35.771],
          MI: [-84.955255, 42.354558],
          VA: [-78.4588, 37.54],
          WA: [-120.718, 47.042418],
          AZ: [-111.930907, 34.168218],
          MA: [-71.0275, 42.2352],
          TN: [-86.784, 35.771],
          IN: [-85.602364, 40.551217],
          MD: [-76.802101, 39.063946],
          MO: [-92.60376, 38.572954],
          WI: [-89.5, 44.95],
          CO: [-105.311, 39.059],
          MN: [-94.63623, 46.39241],
          SC: [-81.163727, 33.836082],
          AL: [-86.79113, 32.806671],
          LA: [-91.140229, 30.45809],
          KY: [-84.27002, 37.839333],
          OR: [-123.029159, 44.931109],
          OK: [-97.534994, 35.482309],
          CT: [-72.677, 41.767],
          AR: [-92.331122, 34.736009],
          IA: [-93.581543, 42.032974],
          MS: [-90.207, 32.32],
          KS: [-98.580009, 38.572954],
          UT: [-111.313726, 39.161921],
          NV: [-117.015289, 39.161921],
          NM: [-106.018066, 34.307144],
          WV: [-81.633294, 38.349497],
          NE: [-99.675285, 41.590939],
          ID: [-116.237651, 44.931109],
          HI: [-157.5311, 21.1098],
          NH: [-71.549896, 43.220093],
          ME: [-69.765261, 45.323781],
          RI: [-71.422132, 41.82355],
          MT: [-109.633835, 47.042418],
          DE: [-75.526755, 39.161921],
          SD: [-100.336378, 44.367966],
          ND: [-100.779004, 47.411631],
          AK: [-152.2782, 64.0685],
          VT: [-72.580009, 44.26639],
          WY: [-107.47, 42.859859],
        };

        // Extract state and district number from district name
        const nameParts = district.name.split('-');
        const state = nameParts[0] || 'CA';
        const districtNum = parseInt(nameParts[1] || '0') || (index % 10) + 1;

        const basePosition = statePositions[state] || [-98.5795, 39.8283];

        // Create variations for multiple districts per state
        const offsetLng = (((districtNum - 1) % 5) - 2) * 1.5;
        const offsetLat = ((Math.floor((districtNum - 1) / 5) % 3) - 1) * 1.0;

        const centerLng = basePosition[0] + offsetLng;
        const centerLat = basePosition[1] + offsetLat;

        // Create realistic district boundary
        const createDistrictBoundary = (
          centerLng: number,
          centerLat: number,
          districtNum: number
        ) => {
          const size = 0.4 + (districtNum % 3) * 0.2;
          const rotation = (districtNum * 45) % 360;

          const points = [];
          for (let i = 0; i < 8; i++) {
            const angle = ((i * 45 + rotation) * Math.PI) / 180;
            const radius = size * (0.6 + Math.sin(i * 2.1) * 0.4);
            const pointLng = centerLng + radius * Math.cos(angle);
            const pointLat = centerLat + radius * Math.sin(angle);
            points.push([pointLng, pointLat]);
          }
          points.push(points[0]); // Close the polygon
          return points;
        };

        return {
          type: 'Feature' as const,
          properties: {
            GEOID: district.id,
            NAME: district.name,
            STATEFP: state,
            CD118FP: String(districtNum).padStart(2, '0'),
            party: district.party,
            competitiveness: district.competitiveness,
            population: district.population,
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [createDistrictBoundary(centerLng, centerLat, districtNum)],
          },
        };
      });

      const geoJsonData: DistrictBoundary = {
        type: 'FeatureCollection',
        features,
      };

      setMapData(geoJsonData);
    } catch {
      setError('Failed to generate district map data');
      // District map error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isClient || !containerRef.current || !mapData) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;

    const initializeMap = async () => {
      try {
        // Dynamic import of Leaflet
        const L = await import('leaflet');
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await import('leaflet/dist/leaflet.css');

        // Fix default markers
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L as any).Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        const container = containerRef.current;
        if (!container) return;

        // Clear any existing map
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        container.innerHTML = '';

        // Create map with US bounds
        const usBounds = L.latLngBounds([24.396308, -125.0], [49.384358, -66.93457]);

        map = L.map(container, {
          center: [39.8283, -98.5795], // Center of US
          zoom: 4,
          scrollWheelZoom: true,
          zoomControl: true,
          preferCanvas: true,
          maxBounds: usBounds,
          maxBoundsViscosity: 1.0, // Prevent panning outside bounds
        });

        // Add tile layer with US focus
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 10,
          minZoom: 3, // Prevent zooming out too far
        }).addTo(map);

        // Fit map to US bounds initially
        map.fitBounds(usBounds, { padding: [10, 10] });

        // Add state boundaries layer
        const generateStateBoundaries = () => {
          const stateInfo = {
            CA: {
              name: 'California',
              center: [-119.7462, 36.17],
              population: 39538223,
              districts: 52,
              senators: ['Alex Padilla (D)', 'Laphonza Butler (D)'],
            },
            TX: {
              name: 'Texas',
              center: [-97.6475, 31.106],
              population: 29145505,
              districts: 38,
              senators: ['John Cornyn (R)', 'Ted Cruz (R)'],
            },
            NY: {
              name: 'New York',
              center: [-75.615, 42.659829],
              population: 20201249,
              districts: 26,
              senators: ['Chuck Schumer (D)', 'Kirsten Gillibrand (D)'],
            },
            FL: {
              name: 'Florida',
              center: [-81.4639, 27.4193],
              population: 21538187,
              districts: 28,
              senators: ['Marco Rubio (R)', 'Rick Scott (R)'],
            },
            PA: {
              name: 'Pennsylvania',
              center: [-76.875613, 40.269789],
              population: 13002700,
              districts: 17,
              senators: ['Bob Casey Jr. (D)', 'John Fetterman (D)'],
            },
            IL: {
              name: 'Illinois',
              center: [-88.986137, 40.349457],
              population: 12812508,
              districts: 17,
              senators: ['Dick Durbin (D)', 'Tammy Duckworth (D)'],
            },
            OH: {
              name: 'Ohio',
              center: [-82.996216, 40.367474],
              population: 11799448,
              districts: 15,
              senators: ['Sherrod Brown (D)', 'J.D. Vance (R)'],
            },
            GA: {
              name: 'Georgia',
              center: [-83.6487, 32.9866],
              population: 10711908,
              districts: 14,
              senators: ['Jon Ossoff (D)', 'Raphael Warnock (D)'],
            },
            NC: {
              name: 'North Carolina',
              center: [-78.638, 35.771],
              population: 10439388,
              districts: 14,
              senators: ['Thom Tillis (R)', 'Ted Budd (R)'],
            },
            MI: {
              name: 'Michigan',
              center: [-84.955255, 42.354558],
              population: 10037261,
              districts: 13,
              senators: ['Debbie Stabenow (D)', 'Gary Peters (D)'],
            },
          };

          const features = Object.entries(stateInfo).map(([code, info]) => {
            // Create simplified state boundary
            const [lng, lat] = info.center;
            const size = Math.sqrt(info.population / 1000000) * 2; // Size based on population

            // Create a rough state shape
            const coords = [];
            for (let i = 0; i < 12; i++) {
              const angle = (i * 30 * Math.PI) / 180;
              const radius = size * (0.8 + Math.sin(i * 2.3) * 0.3);
              coords.push([lng + radius * Math.cos(angle), lat + radius * Math.sin(angle)]);
            }
            coords.push(coords[0]); // Close polygon

            return {
              type: 'Feature' as const,
              properties: {
                code,
                name: info.name,
                population: info.population,
                districts: info.districts,
                senators: info.senators,
              },
              geometry: {
                type: 'Polygon' as const,
                coordinates: [coords],
              },
            };
          });

          return { type: 'FeatureCollection' as const, features };
        };

        const stateBoundaries = generateStateBoundaries();

        // Add state boundaries layer with interaction
        const _stateLayer = L.geoJSON(stateBoundaries, {
          style: {
            fillColor: '#4a5568',
            weight: 2,
            opacity: 1,
            color: '#2d3748',
            fillOpacity: 0.1,
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties;

            // State popup
            layer.bindPopup(`
              <div class="state-popup">
                <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px;">
                  ${props.name}
                </h3>
                <div style="font-size: 14px; line-height: 1.4;">
                  <p style="margin: 4px 0;"><strong>Population:</strong> ${props.population.toLocaleString()}</p>
                  <p style="margin: 4px 0;"><strong>House Districts:</strong> ${props.districts}</p>
                  <p style="margin: 4px 0;"><strong>Senators:</strong></p>
                  <ul style="margin: 4px 0; padding-left: 16px;">
                    ${props.senators.map((senator: string) => `<li style="margin: 2px 0;">${senator}</li>`).join('')}
                  </ul>
                </div>
              </div>
            `);

            // Hover effects
            layer.on('mouseover', function (this: any) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (this as any).setStyle({
                fillOpacity: 0.3,
                weight: 3,
              });
            });

            layer.on('mouseout', function (this: any) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (this as any).setStyle({
                fillOpacity: 0.1,
                weight: 2,
              });
            });

            // Click handler for state info panel
            layer.on('click', () => {
              if (onStateClick) {
                onStateClick({
                  code: props.code,
                  name: props.name,
                  population: props.population,
                  districts: props.districts,
                  senators: props.senators,
                });
              }
            });
          },
        }).addTo(map);

        // Add district boundaries
        const geoJsonLayer = L.geoJSON(mapData, {
          style: feature => {
            const party = feature?.properties.party || 'Unknown';
            const competitiveness = feature?.properties.competitiveness || 0;

            // Color based on party
            const baseColor =
              party === 'Democratic' ? '#3b82f6' : party === 'Republican' ? '#ef4444' : '#9ca3af';

            // Opacity based on competitiveness
            const opacity = 0.3 + (competitiveness / 100) * 0.5;

            return {
              fillColor: baseColor,
              weight: selectedDistrict === feature?.properties.GEOID ? 3 : 1,
              opacity: 1,
              color: selectedDistrict === feature?.properties.GEOID ? '#000' : '#fff',
              fillOpacity: opacity,
            };
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties;

            // Popup content
            layer.bindPopup(`
              <div class="district-popup">
                <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px;">
                  ${props.NAME}
                </h3>
                <div style="font-size: 14px; line-height: 1.4;">
                  <p style="margin: 4px 0;">
                    <strong>Party:</strong> ${props.party}
                  </p>
                  <p style="margin: 4px 0;">
                    <strong>Population:</strong> ${props.population?.toLocaleString() || 'N/A'}
                  </p>
                  <p style="margin: 4px 0;">
                    <strong>Competitiveness:</strong> ${props.competitiveness?.toFixed(1) || 'N/A'}%
                  </p>
                  <p style="margin: 8px 0 0 0;">
                    <a href="/districts/${props.NAME}" style="color: #3b82f6; text-decoration: underline;">
                      View Details →
                    </a>
                  </p>
                </div>
              </div>
            `);

            // Click handler
            layer.on('click', () => {
              if (onDistrictClick) {
                onDistrictClick(props.GEOID);
              }
            });

            // Hover effects
            layer.on('mouseover', function (this: any) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (this as any).setStyle({
                weight: 3,
                color: '#000',
                fillOpacity: 0.7,
              });
            });

            layer.on('mouseout', function (this: any) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (this as any).setStyle({
                weight: selectedDistrict === props.GEOID ? 3 : 1,
                color: selectedDistrict === props.GEOID ? '#000' : '#fff',
                fillOpacity: 0.3 + (props.competitiveness / 100) * 0.5,
              });
            });
          },
        }).addTo(map);

        // Fit map to show all districts
        try {
          const bounds = geoJsonLayer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [20, 20] });
          }
        } catch {
          // Could not fit bounds - non-critical error
        }

        mapRef.current = map;

        // Force resize after initialization
        setTimeout(() => {
          if (map) {
            map.invalidateSize();
          }
        }, 100);
      } catch {
        setError('Failed to initialize map');
      }
    };

    initializeMap();

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isClient, mapData, selectedDistrict, onDistrictClick]);

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
      <div
        className="flex items-center justify-center bg-gray-100 rounded-lg"
        style={{ width, height }}
      >
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded-lg"
        style={{ width, height }}
      >
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-sm text-gray-600">Generating district boundaries...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300"
        style={{ width, height }}
      >
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">{error}</p>
          <p className="text-xs text-gray-400">
            In production, this would use real Census TIGER/Line data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          minHeight: '400px',
        }}
        className="rounded-lg overflow-hidden border shadow-sm relative z-0"
      />

      {/* Map legend */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg p-3 text-xs shadow-lg">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-600 bg-gray-100 rounded"></div>
            <span>State Boundaries</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Democratic Districts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Republican Districts</span>
          </div>
          <div className="text-gray-600 mt-2">
            <div>Click states for info</div>
            <div>Click districts for details</div>
          </div>
        </div>
      </div>
    </div>
  );
}
