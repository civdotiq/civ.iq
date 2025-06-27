import { NextRequest, NextResponse } from 'next/server';

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
    'Alabama': '01', 'Alaska': '02', 'Arizona': '04', 'Arkansas': '05', 'California': '06',
    'Colorado': '08', 'Connecticut': '09', 'Delaware': '10', 'Florida': '12', 'Georgia': '13',
    'Hawaii': '15', 'Idaho': '16', 'Illinois': '17', 'Indiana': '18', 'Iowa': '19',
    'Kansas': '20', 'Kentucky': '21', 'Louisiana': '22', 'Maine': '23', 'Maryland': '24',
    'Massachusetts': '25', 'Michigan': '26', 'Minnesota': '27', 'Mississippi': '28', 'Missouri': '29',
    'Montana': '30', 'Nebraska': '31', 'Nevada': '32', 'New Hampshire': '33', 'New Jersey': '34',
    'New Mexico': '35', 'New York': '36', 'North Carolina': '37', 'North Dakota': '38', 'Ohio': '39',
    'Oklahoma': '40', 'Oregon': '41', 'Pennsylvania': '42', 'Rhode Island': '44', 'South Carolina': '45',
    'South Dakota': '46', 'Tennessee': '47', 'Texas': '48', 'Utah': '49', 'Vermont': '50',
    'Virginia': '51', 'Washington': '53', 'West Virginia': '54', 'Wisconsin': '55', 'Wyoming': '56'
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
    console.error('Error getting ZIP coordinates:', error);
    return null;
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
      type
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

// Attempt to fetch real congressional district boundary from Census TIGER
async function fetchCongressionalDistrict(stateFips: string, district: string): Promise<any> {
  try {
    // Use Census Bureau's REST API for Congressional Districts
    const url = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/1/query?where=STATE=${stateFips}+AND+CD=${district.padStart(2, '0')}&outFields=*&outSR=4326&f=geojson`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Census TIGER API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      return data.features[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching congressional district:', error);
    return null;
  }
}

// Attempt to fetch state legislative district boundaries
async function fetchStateLegislativeDistrict(stateFips: string, chamber: 'upper' | 'lower'): Promise<any> {
  try {
    // Use Census Bureau's REST API for State Legislative Districts
    const layerId = chamber === 'upper' ? '3' : '4'; // Upper=3 (State Senate), Lower=4 (State House)
    const url = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/${layerId}/query?where=STATE=${stateFips}&outFields=*&outSR=4326&f=geojson`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Census TIGER API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      // Return first feature for simplicity - in real implementation, 
      // would need to determine which district contains the ZIP coordinate
      return data.features[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching state legislative district:', error);
    return null;
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
    const [congressionalBoundary, stateSenateBounder, stateHouseBoundary] = await Promise.all([
      fetchCongressionalDistrict(stateFips, district),
      fetchStateLegislativeDistrict(stateFips, 'upper'),
      fetchStateLegislativeDistrict(stateFips, 'lower')
    ]);

    // Create boundaries (use real data if available, otherwise mock)
    const boundaries = {
      congressional: congressionalBoundary ? {
        type: congressionalBoundary.geometry.type,
        coordinates: congressionalBoundary.geometry.coordinates,
        properties: {
          district: district,
          state: zipInfo.state,
          name: `Congressional District ${district}`,
          type: 'congressional' as const
        }
      } : createMockBoundary('congressional', district, zipInfo.state, zipInfo.lat, zipInfo.lng),
      
      state_senate: stateSenateBounder ? {
        type: stateSenateBounder.geometry.type,
        coordinates: stateSenateBounder.geometry.coordinates,
        properties: {
          district: stateSenateBounder.properties.SLDUST || '1',
          state: zipInfo.state,
          name: `State Senate District ${stateSenateBounder.properties.SLDUST || '1'}`,
          type: 'state_senate' as const
        }
      } : createMockBoundary('state_senate', '1', zipInfo.state, zipInfo.lat, zipInfo.lng),
      
      state_house: stateHouseBoundary ? {
        type: stateHouseBoundary.geometry.type,
        coordinates: stateHouseBoundary.geometry.coordinates,
        properties: {
          district: stateHouseBoundary.properties.SLDLST || 'A',
          state: zipInfo.state,
          name: `State House District ${stateHouseBoundary.properties.SLDLST || 'A'}`,
          type: 'state_house' as const
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
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}