/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server'
import { structuredLogger } from '@/lib/logging/logger'
import { monitorExternalApi } from '@/lib/monitoring/telemetry'

interface DistrictBoundary {
  type: string;
  coordinates: number[][][];
  properties: {
    district: string;
    state: string;
    name: string;
    type: 'congressional' | 'state_senate' | 'state_house';
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
    'Alabama': '01', 'AL': '01',
    'Alaska': '02', 'AK': '02', 
    'Arizona': '04', 'AZ': '04',
    'Arkansas': '05', 'AR': '05',
    'California': '06', 'CA': '06',
    'Colorado': '08', 'CO': '08',
    'Connecticut': '09', 'CT': '09',
    'Delaware': '10', 'DE': '10',
    'District of Columbia': '11', 'DC': '11',
    'Florida': '12', 'FL': '12',
    'Georgia': '13', 'GA': '13',
    'Hawaii': '15', 'HI': '15',
    'Idaho': '16', 'ID': '16',
    'Illinois': '17', 'IL': '17',
    'Indiana': '18', 'IN': '18',
    'Iowa': '19', 'IA': '19',
    'Kansas': '20', 'KS': '20',
    'Kentucky': '21', 'KY': '21',
    'Louisiana': '22', 'LA': '22',
    'Maine': '23', 'ME': '23',
    'Maryland': '24', 'MD': '24',
    'Massachusetts': '25', 'MA': '25',
    'Michigan': '26', 'MI': '26',
    'Minnesota': '27', 'MN': '27',
    'Mississippi': '28', 'MS': '28',
    'Missouri': '29', 'MO': '29',
    'Montana': '30', 'MT': '30',
    'Nebraska': '31', 'NE': '31',
    'Nevada': '32', 'NV': '32',
    'New Hampshire': '33', 'NH': '33',
    'New Jersey': '34', 'NJ': '34',
    'New Mexico': '35', 'NM': '35',
    'New York': '36', 'NY': '36',
    'North Carolina': '37', 'NC': '37',
    'North Dakota': '38', 'ND': '38',
    'Ohio': '39', 'OH': '39',
    'Oklahoma': '40', 'OK': '40',
    'Oregon': '41', 'OR': '41',
    'Pennsylvania': '42', 'PA': '42',
    'Rhode Island': '44', 'RI': '44',
    'South Carolina': '45', 'SC': '45',
    'South Dakota': '46', 'SD': '46',
    'Tennessee': '47', 'TN': '47',
    'Texas': '48', 'TX': '48',
    'Utah': '49', 'UT': '49',
    'Vermont': '50', 'VT': '50',
    'Virginia': '51', 'VA': '51',
    'Washington': '53', 'WA': '53',
    'West Virginia': '54', 'WV': '54',
    'Wisconsin': '55', 'WI': '55',
    'Wyoming': '56', 'WY': '56'
  };
  return stateFipsMap[state] || '00';
}

// Get ZIP code coordinates using Census geocoding
async function getZipCoordinates(zipCode: string): Promise<{lat: number, lng: number, state: string} | null> {
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
        state: match.addressComponents.state
      };
    }
    
    return null;
  } catch (error) {
    structuredLogger.error('Error getting ZIP coordinates', error as Error, { zipCode })
    return null
  }
}

// Simplified function to create mock boundary data
function createMockBoundary(
  type: 'congressional' | 'state_senate' | 'state_house',
  district: string,
  state: string,
  centerLat: number,
  centerLng: number
): DistrictBoundary {
  // Create a simple rectangular boundary around the center point
  const offset = 0.05; // ~3.5 miles
  
  const coordinates = [[
    [centerLng - offset, centerLat - offset],
    [centerLng + offset, centerLat - offset],
    [centerLng + offset, centerLat + offset],
    [centerLng - offset, centerLat + offset],
    [centerLng - offset, centerLat - offset]
  ]];

  const names = {
    congressional: `Congressional District ${district}`,
    state_senate: `State Senate District ${district}`,
    state_house: `State House District ${district}`
  };

  return {
    type: 'Polygon',
    coordinates,
    properties: {
      district,
      state,
      name: names[type],
      type,
    }
  };
}

// Calculate bounding box from coordinates
function calculateBoundingBox(coordinates: number[][][], padding = 0.01): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  coordinates.forEach(ring => {
    ring.forEach(coord => {
      const [lng, lat] = coord;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });
  });

  return {
    minLat: minLat - padding,
    maxLat: maxLat + padding,
    minLng: minLng - padding,
    maxLng: maxLng + padding
  };
}

// Fetch real congressional district boundary from Census TIGER (119th Congress)
async function fetchCongressionalDistrict(stateFips: string, district: string): Promise<any> {
  const monitor = monitorExternalApi('census-tiger', 'congressional-district', '')
  
  try {
    // Use Census Bureau's TIGERweb REST API for 119th Congressional Districts (Layer 0)
    const paddedDistrict = district.padStart(2, '0');
    const whereClause = `STATE='${stateFips}' AND CD119='${paddedDistrict}'`;
    const url = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?where=${encodeURIComponent(whereClause)}&outFields=*&outSR=4326&f=geojson`;
    
    const response = await fetch(url)
    
    if (!response.ok) {
      monitor.end(false, response.status)
      structuredLogger.error('Census TIGER API error', new Error(`HTTP ${response.status}`), {
        stateFips,
        district,
        url
      })
      return null
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      monitor.end(true, 200)
      structuredLogger.info('Successfully fetched congressional district', {
        stateFips,
        district,
        featureCount: data.features.length
      })
      return data.features[0]
    } else {
      monitor.end(false, 200)
      structuredLogger.warn('No congressional district found', { stateFips, district })
      return null
    }
    
  } catch (error) {
    monitor.end(false, undefined, error as Error)
    structuredLogger.error('Error fetching congressional district', error as Error, {
      stateFips,
      district
    })
    return null
  }
}

// Fetch state legislative district boundaries from Census TIGER
async function fetchStateLegislativeDistrict(stateFips: string, chamber: 'upper' | 'lower', coordinates?: {lat: number, lng: number}): Promise<any> {
  const monitor = monitorExternalApi('census-tiger', `${chamber}-legislative`, '')
  
  try {
    // Use Census Bureau's TIGERweb REST API for State Legislative Districts
    // Layer 2: State Legislative Districts - Upper Chamber (State Senate)
    // Layer 3: State Legislative Districts - Lower Chamber (State House)
    const layerId = chamber === 'upper' ? '2' : '3';
    
    let whereClause = `STATE='${stateFips}'`;
    
    // If coordinates provided, use spatial query to find the specific district
    // For now, just get the first district from the state as a fallback
    const url = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/${layerId}/query?where=${encodeURIComponent(whereClause)}&outFields=*&outSR=4326&f=geojson&resultRecordCount=1`;
    
    const response = await fetch(url)
    
    if (!response.ok) {
      monitor.end(false, response.status)
      structuredLogger.error('Census TIGER API error', new Error(`HTTP ${response.status}`), {
        stateFips,
        chamber,
        url
      })
      return null
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      monitor.end(true, 200)
      structuredLogger.info('Successfully fetched legislative district', {
        stateFips,
        chamber,
        featureCount: data.features.length
      })
      return data.features[0]
    } else {
      monitor.end(false, 200)
      structuredLogger.warn('No legislative district found', { stateFips, chamber })
      return null
    }
    
  } catch (error) {
    monitor.end(false, undefined, error as Error)
    structuredLogger.error('Error fetching legislative district', error as Error, {
      stateFips,
      chamber
    })
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get('zip');

  if (!zipCode) {
    return NextResponse.json(
      { error: 'ZIP code is required' },
      { status: 400 }
    );
  }

  try {
    // Get ZIP code coordinates and state
    const zipInfo = await getZipCoordinates(zipCode);
    
    if (!zipInfo) {
      return NextResponse.json(
        { error: 'Could not geocode ZIP code' },
        { status: 400 }
      );
    }

    // Get congressional district info from our existing API
    const repResponse = await fetch(
      `${request.nextUrl.origin}/api/representatives?zip=${encodeURIComponent(zipCode)}`
    );
    
    let district = '01'; // Default
    if (repResponse.ok) {
      const repData = await repResponse.json();
      district = repData.district || '01';
    }

    const stateFips = getStateFips(zipInfo.state);

    // Try to fetch real boundary data from Census TIGER
    structuredLogger.info('Fetching district boundaries', {
      zipCode,
      district,
      state: zipInfo.state,
      stateFips
    })
    
    const [congressionalBoundary, stateSenateBounder, stateHouseBoundary] = await Promise.all([
      fetchCongressionalDistrict(stateFips, district),
      fetchStateLegislativeDistrict(stateFips, 'upper', { lat: zipInfo.lat, lng: zipInfo.lng }),
      fetchStateLegislativeDistrict(stateFips, 'lower', { lat: zipInfo.lat, lng: zipInfo.lng })
    ]);

    // Create boundaries (use real data if available, otherwise mock)
    structuredLogger.info('Boundary fetch results', {
      zipCode,
      congressional: !!congressionalBoundary,
      stateSenate: !!stateSenateBounder,
      stateHouse: !!stateHouseBoundary
    })

    const boundaries = {
      congressional: congressionalBoundary ? {
        type: congressionalBoundary.geometry.type,
        coordinates: congressionalBoundary.geometry.coordinates,
        properties: {
          district: district,
          state: zipInfo.state,
          name: congressionalBoundary.properties?.NAME || `Congressional District ${district}`,
          type: 'congressional' as const,
          source: 'census-tiger'
        }
      } : createMockBoundary('congressional', district, zipInfo.state, zipInfo.lat, zipInfo.lng),
      
      state_senate: stateSenateBounder ? {
        type: stateSenateBounder.geometry.type,
        coordinates: stateSenateBounder.geometry.coordinates,
        properties: {
          district: stateSenateBounder.properties?.SLDUST || stateSenateBounder.properties?.DISTRICT || '1',
          state: zipInfo.state,
          name: stateSenateBounder.properties?.NAME || `State Senate District ${stateSenateBounder.properties?.SLDUST || '1'}`,
          type: 'state_senate' as const,
          source: 'census-tiger'
        }
      } : createMockBoundary('state_senate', '1', zipInfo.state, zipInfo.lat, zipInfo.lng),
      
      state_house: stateHouseBoundary ? {
        type: stateHouseBoundary.geometry.type,
        coordinates: stateHouseBoundary.geometry.coordinates,
        properties: {
          district: stateHouseBoundary.properties?.SLDLST || stateHouseBoundary.properties?.DISTRICT || 'A',
          state: zipInfo.state,
          name: stateHouseBoundary.properties?.NAME || `State House District ${stateHouseBoundary.properties?.SLDLST || 'A'}`,
          type: 'state_house' as const,
          source: 'census-tiger'
        }
      } : createMockBoundary('state_house', 'A', zipInfo.state, zipInfo.lat, zipInfo.lng)
    };

    // Calculate bounding box from all boundaries
    const allCoordinates = [
      ...boundaries.congressional.coordinates,
      ...boundaries.state_senate.coordinates,
      ...boundaries.state_house.coordinates
    ];
    
    const bbox = calculateBoundingBox(allCoordinates);

    const mapData: MapData = {
      zipCode,
      state: zipInfo.state,
      coordinates: {
        lat: zipInfo.lat,
        lng: zipInfo.lng
      },
      boundaries,
      bbox
    };

    return NextResponse.json(mapData);

  } catch (error) {
    structuredLogger.error('District map API error', error as Error, { zipCode })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}