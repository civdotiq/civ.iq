/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging/logger-edge';
import { monitorExternalApi } from '@/lib/monitoring/telemetry-edge';

export const dynamic = 'force-dynamic';

interface DistrictBoundary {
  type: string;
  coordinates: number[][][];
  properties: {
    district: string;
    state: string;
    name: string;
    type: 'congressional' | 'state_senate' | 'state_house';
    source?: string;
  };
}

interface MapData {
  zipCode: string;
  state: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  boundaries: {
    congressional: DistrictBoundary | null;
    state_senate: DistrictBoundary | null;
    state_house: DistrictBoundary | null;
  };
  bbox: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

// Helper function to get state FIPS code
function getStateFips(state: string): string {
  const stateFipsMap: { [key: string]: string } = {
    Alabama: '01',
    AL: '01',
    Alaska: '02',
    AK: '02',
    Arizona: '04',
    AZ: '04',
    Arkansas: '05',
    AR: '05',
    California: '06',
    CA: '06',
    Colorado: '08',
    CO: '08',
    Connecticut: '09',
    CT: '09',
    Delaware: '10',
    DE: '10',
    'District of Columbia': '11',
    DC: '11',
    Florida: '12',
    FL: '12',
    Georgia: '13',
    GA: '13',
    Hawaii: '15',
    HI: '15',
    Idaho: '16',
    ID: '16',
    Illinois: '17',
    IL: '17',
    Indiana: '18',
    IN: '18',
    Iowa: '19',
    IA: '19',
    Kansas: '20',
    KS: '20',
    Kentucky: '21',
    KY: '21',
    Louisiana: '22',
    LA: '22',
    Maine: '23',
    ME: '23',
    Maryland: '24',
    MD: '24',
    Massachusetts: '25',
    MA: '25',
    Michigan: '26',
    MI: '26',
    Minnesota: '27',
    MN: '27',
    Mississippi: '28',
    MS: '28',
    Missouri: '29',
    MO: '29',
    Montana: '30',
    MT: '30',
    Nebraska: '31',
    NE: '31',
    Nevada: '32',
    NV: '32',
    'New Hampshire': '33',
    NH: '33',
    'New Jersey': '34',
    NJ: '34',
    'New Mexico': '35',
    NM: '35',
    'New York': '36',
    NY: '36',
    'North Carolina': '37',
    NC: '37',
    'North Dakota': '38',
    ND: '38',
    Ohio: '39',
    OH: '39',
    Oklahoma: '40',
    OK: '40',
    Oregon: '41',
    OR: '41',
    Pennsylvania: '42',
    PA: '42',
    'Rhode Island': '44',
    RI: '44',
    'South Carolina': '45',
    SC: '45',
    'South Dakota': '46',
    SD: '46',
    Tennessee: '47',
    TN: '47',
    Texas: '48',
    TX: '48',
    Utah: '49',
    UT: '49',
    Vermont: '50',
    VT: '50',
    Virginia: '51',
    VA: '51',
    Washington: '53',
    WA: '53',
    'West Virginia': '54',
    WV: '54',
    Wisconsin: '55',
    WI: '55',
    Wyoming: '56',
    WY: '56',
  };
  return stateFipsMap[state] || '00';
}

// Get approximate coordinates for state center (fallback when geocoding fails)
function getApproximateStateCoordinates(state: string): { lat: number; lng: number } | null {
  const stateCoordinates: { [key: string]: { lat: number; lng: number } } = {
    AL: { lat: 32.806671, lng: -86.79113 },
    AK: { lat: 61.217381, lng: -149.863129 },
    AZ: { lat: 33.729759, lng: -111.431221 },
    AR: { lat: 34.969704, lng: -92.373123 },
    CA: { lat: 36.116203, lng: -119.681564 },
    CO: { lat: 39.059811, lng: -105.311104 },
    CT: { lat: 41.597782, lng: -72.755371 },
    DE: { lat: 39.318523, lng: -75.507141 },
    DC: { lat: 38.897438, lng: -77.026817 },
    FL: { lat: 27.766279, lng: -81.686783 },
    GA: { lat: 33.040619, lng: -83.643074 },
    HI: { lat: 21.094318, lng: -157.498337 },
    ID: { lat: 44.240459, lng: -114.478828 },
    IL: { lat: 40.349457, lng: -88.986137 },
    IN: { lat: 39.849426, lng: -86.258278 },
    IA: { lat: 42.011539, lng: -93.210526 },
    KS: { lat: 38.5266, lng: -96.726486 },
    KY: { lat: 37.66814, lng: -84.670067 },
    LA: { lat: 31.169546, lng: -91.867805 },
    ME: { lat: 44.693947, lng: -69.381927 },
    MD: { lat: 39.063946, lng: -76.802101 },
    MA: { lat: 42.230171, lng: -71.530106 },
    MI: { lat: 43.326618, lng: -84.536095 },
    MN: { lat: 45.694454, lng: -93.900192 },
    MS: { lat: 32.741646, lng: -89.678696 },
    MO: { lat: 38.456085, lng: -92.288368 },
    MT: { lat: 47.052952, lng: -110.454353 },
    NE: { lat: 41.12537, lng: -98.268082 },
    NV: { lat: 37.20704, lng: -116.021178 },
    NH: { lat: 43.452492, lng: -71.563896 },
    NJ: { lat: 40.298904, lng: -74.756138 },
    NM: { lat: 34.840515, lng: -106.248482 },
    NY: { lat: 42.165726, lng: -74.948051 },
    NC: { lat: 35.630066, lng: -79.806419 },
    ND: { lat: 47.528912, lng: -99.784012 },
    OH: { lat: 40.388783, lng: -82.764915 },
    OK: { lat: 35.565342, lng: -96.928917 },
    OR: { lat: 44.931109, lng: -120.767178 },
    PA: { lat: 40.590752, lng: -77.209755 },
    RI: { lat: 41.680893, lng: -71.51178 },
    SC: { lat: 33.856892, lng: -80.945007 },
    SD: { lat: 44.299782, lng: -99.438828 },
    TN: { lat: 35.747845, lng: -86.692345 },
    TX: { lat: 31.054487, lng: -97.563461 },
    UT: { lat: 40.150032, lng: -111.862434 },
    VT: { lat: 44.045876, lng: -72.710686 },
    VA: { lat: 37.769337, lng: -78.169968 },
    WA: { lat: 47.400902, lng: -121.490494 },
    WV: { lat: 38.491226, lng: -80.954453 },
    WI: { lat: 44.268543, lng: -89.616508 },
    WY: { lat: 42.755966, lng: -107.30249 },
  };

  return stateCoordinates[state] || null;
}

// Get ZIP code coordinates using Census geocoding
async function getZipCoordinates(
  zipCode: string
): Promise<{ lat: number; lng: number; state: string } | null> {
  try {
    const response = await fetch(
      `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${zipCode}&benchmark=2020&format=json`
    );

    if (!response.ok) {
      throw new Error(`Census geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.result?.addressMatches?.[0]) {
      const match = data.result.addressMatches[0];
      return {
        lat: parseFloat(match.coordinates.y),
        lng: parseFloat(match.coordinates.x),
        state: match.addressComponents.state,
      };
    }

    return null;
  } catch (error) {
    logger.error('Error getting ZIP coordinates', error as Error, { zipCode });
    return null;
  }
}

// Calculate bounding box from coordinates
function calculateBoundingBox(
  coordinates: number[][][],
  padding = 0.01
): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  let minLat = Infinity,
    maxLat = -Infinity;
  let minLng = Infinity,
    maxLng = -Infinity;

  coordinates.forEach(ring => {
    ring.forEach(coord => {
      const [lng, lat] = coord;
      if (typeof lng === 'number' && typeof lat === 'number') {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }
    });
  });

  return {
    minLat: minLat - padding,
    maxLat: maxLat + padding,
    minLng: minLng - padding,
    maxLng: maxLng + padding,
  };
}

// Fetch real congressional district boundary from Census TIGER (119th Congress)
async function fetchCongressionalDistrict(
  stateFips: string,
  district: string
): Promise<GeoJSON.Feature | null> {
  const monitor = monitorExternalApi('census-tiger', 'congressional-district', '');

  try {
    // Use Census Bureau's TIGERweb REST API for 119th Congressional Districts (Layer 0)
    const paddedDistrict = district.padStart(2, '0');
    const whereClause = `STATE='${stateFips}' AND CD119='${paddedDistrict}'`;
    const url = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?where=${encodeURIComponent(whereClause)}&outFields=*&outSR=4326&f=geojson`;

    const response = await fetch(url);

    if (!response.ok) {
      monitor.end(false, response.status);
      logger.error('Census TIGER API error', new Error(`HTTP ${response.status}`), {
        stateFips,
        district,
        url,
      });
      return null;
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      monitor.end(true, 200);
      logger.info('Successfully fetched congressional district', {
        stateFips,
        district,
        featureCount: data.features.length,
      });
      return data.features[0];
    } else {
      monitor.end(false, 200);
      logger.warn('No congressional district found', { stateFips, district });
      return null;
    }
  } catch (error) {
    monitor.end(false, undefined, error as Error);
    logger.error('Error fetching congressional district', error as Error, {
      stateFips,
      district,
    });
    return null;
  }
}

// Fetch state legislative district boundaries from Census TIGER
async function fetchStateLegislativeDistrict(
  stateFips: string,
  chamber: 'upper' | 'lower',
  _coordinates?: { lat: number; lng: number }
): Promise<GeoJSON.Feature | null> {
  const monitor = monitorExternalApi('census-tiger', `${chamber}-legislative`, '');

  try {
    // Use Census Bureau's TIGERweb REST API for State Legislative Districts
    // Layer 2: State Legislative Districts - Upper Chamber (State Senate)
    // Layer 3: State Legislative Districts - Lower Chamber (State House)
    const layerId = chamber === 'upper' ? '2' : '3';

    const whereClause = `STATE='${stateFips}'`;

    // If coordinates provided, use spatial query to find the specific district
    // For now, just get the first district from the state as a fallback
    const url = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/${layerId}/query?where=${encodeURIComponent(whereClause)}&outFields=*&outSR=4326&f=geojson&resultRecordCount=1`;

    const response = await fetch(url);

    if (!response.ok) {
      monitor.end(false, response.status);
      logger.error('Census TIGER API error', new Error(`HTTP ${response.status}`), {
        stateFips,
        chamber,
        url,
      });
      return null;
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      monitor.end(true, 200);
      logger.info('Successfully fetched legislative district', {
        stateFips,
        chamber,
        featureCount: data.features.length,
      });
      return data.features[0];
    } else {
      monitor.end(false, 200);
      logger.warn('No legislative district found', { stateFips, chamber });
      return null;
    }
  } catch (error) {
    monitor.end(false, undefined, error as Error);
    logger.error('Error fetching legislative district', error as Error, {
      stateFips,
      chamber,
    });
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const zipCode = searchParams.get('zip');

  if (!zipCode) {
    return NextResponse.json({ error: 'ZIP code is required' }, { status: 400 });
  }

  try {
    // Get ZIP code coordinates and state
    let zipInfo = await getZipCoordinates(zipCode);

    // If geocoding fails, try to get state from representatives and use fallback coordinates
    if (!zipInfo) {
      try {
        const repResponse = await fetch(
          `${request.nextUrl.origin}/api/representatives?zip=${encodeURIComponent(zipCode)}`
        );

        if (repResponse.ok) {
          const repData = await repResponse.json();
          if (repData.success && repData.representatives?.[0]) {
            const state = repData.representatives[0].state;
            // Use approximate state center coordinates
            const stateCoordinates = getApproximateStateCoordinates(state);
            if (stateCoordinates) {
              zipInfo = { ...stateCoordinates, state };
              logger.info('Using fallback state center coordinates', { zipCode, state });
            }
          }
        }
      } catch (error) {
        logger.warn('Fallback coordinates failed', {
          zipCode,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (!zipInfo) {
      return NextResponse.json({ error: 'Could not geocode ZIP code' }, { status: 400 });
    }

    // Get congressional district info from our existing API
    let district = '01'; // Default
    try {
      const repResponse = await fetch(
        `${request.nextUrl.origin}/api/representatives?zip=${encodeURIComponent(zipCode)}`
      );

      if (repResponse.ok) {
        const repData = await repResponse.json();

        // Find the House representative to get the district number
        if (repData.success && repData.representatives) {
          const houseRep = repData.representatives.find(
            (rep: { chamber: string; district?: string }) => rep.chamber === 'House' && rep.district
          );

          if (houseRep && houseRep.district) {
            // Ensure district is properly formatted as 2-digit string
            district = houseRep.district.toString().padStart(2, '0');
          }
        }
      }
    } catch (error) {
      // If representatives API fails, continue with default district
      logger.warn('Representatives API failed, using default district', {
        zipCode,
        defaultDistrict: district,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    const stateFips = getStateFips(zipInfo.state);

    // Try to fetch real boundary data from Census TIGER
    logger.info('Fetching district boundaries', {
      zipCode,
      district,
      state: zipInfo.state,
      stateFips,
    });

    const [congressionalBoundary, stateSenateBounder, stateHouseBoundary] = await Promise.all([
      fetchCongressionalDistrict(stateFips, district),
      fetchStateLegislativeDistrict(stateFips, 'upper', { lat: zipInfo.lat, lng: zipInfo.lng }),
      fetchStateLegislativeDistrict(stateFips, 'lower', { lat: zipInfo.lat, lng: zipInfo.lng }),
    ]);

    // Create boundaries (use real data if available, otherwise mock)
    logger.info('Boundary fetch results', {
      zipCode,
      congressional: !!congressionalBoundary,
      stateSenate: !!stateSenateBounder,
      stateHouse: !!stateHouseBoundary,
    });

    const boundaries = {
      congressional: congressionalBoundary
        ? {
            type: congressionalBoundary.geometry.type,
            coordinates: (congressionalBoundary.geometry as GeoJSON.Polygon).coordinates,
            properties: {
              district: district,
              state: zipInfo.state,
              name: congressionalBoundary.properties?.NAME || `Congressional District ${district}`,
              type: 'congressional' as const,
              source: 'census-tiger',
            },
          }
        : null,

      state_senate: stateSenateBounder
        ? {
            type: stateSenateBounder.geometry.type,
            coordinates: (stateSenateBounder.geometry as GeoJSON.Polygon).coordinates,
            properties: {
              district:
                stateSenateBounder.properties?.SLDUST ||
                stateSenateBounder.properties?.DISTRICT ||
                '1',
              state: zipInfo.state,
              name:
                stateSenateBounder.properties?.NAME ||
                `State Senate District ${stateSenateBounder.properties?.SLDUST || '1'}`,
              type: 'state_senate' as const,
              source: 'census-tiger',
            },
          }
        : null,

      state_house: stateHouseBoundary
        ? {
            type: stateHouseBoundary.geometry.type,
            coordinates: (stateHouseBoundary.geometry as GeoJSON.Polygon).coordinates,
            properties: {
              district:
                stateHouseBoundary.properties?.SLDLST ||
                stateHouseBoundary.properties?.DISTRICT ||
                'A',
              state: zipInfo.state,
              name:
                stateHouseBoundary.properties?.NAME ||
                `State House District ${stateHouseBoundary.properties?.SLDLST || 'A'}`,
              type: 'state_house' as const,
              source: 'census-tiger',
            },
          }
        : null,
    };

    // Calculate bounding box from available boundaries
    const allCoordinates: number[][][] = [];
    if (boundaries.congressional?.coordinates) {
      allCoordinates.push(...boundaries.congressional.coordinates);
    }
    if (boundaries.state_senate?.coordinates) {
      allCoordinates.push(...boundaries.state_senate.coordinates);
    }
    if (boundaries.state_house?.coordinates) {
      allCoordinates.push(...boundaries.state_house.coordinates);
    }

    // Use coordinates if available, otherwise create small bounding box around ZIP coordinates
    const bbox =
      allCoordinates.length > 0
        ? calculateBoundingBox(allCoordinates)
        : {
            minLat: zipInfo.lat - 0.01,
            maxLat: zipInfo.lat + 0.01,
            minLng: zipInfo.lng - 0.01,
            maxLng: zipInfo.lng + 0.01,
          };

    const mapData: MapData = {
      zipCode,
      state: zipInfo.state,
      coordinates: {
        lat: zipInfo.lat,
        lng: zipInfo.lng,
      },
      boundaries,
      bbox,
    };

    return NextResponse.json(mapData);
  } catch (error) {
    logger.error('District map API error', error as Error, { zipCode });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
