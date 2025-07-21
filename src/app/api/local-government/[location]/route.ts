/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { structuredLogger } from '@/lib/logging/logger';

interface LocalOfficial {
  id: string;
  name: string;
  position: string;
  jurisdiction: 'city' | 'county' | 'township' | 'school_district' | 'special_district';
  jurisdictionName: string;
  party?: 'Democratic' | 'Republican' | 'Independent' | 'Nonpartisan';
  email?: string;
  phone?: string;
  office?: string;
  photoUrl?: string;
  termStart: string;
  termEnd: string;
  isElected: boolean;
  salary?: number;
  website?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  responsibilities: string[];
  committees?: Array<{
    name: string;
    role: 'chair' | 'member';
  }>;
  contactHours?: {
    days: string[];
    hours: string;
  };
}

interface LocalGovernmentData {
  location: string;
  locationName: string;
  state: string;
  lastUpdated: string;
  officials: LocalOfficial[];
  totalCount: number;
  jurisdictions: {
    city: LocalOfficial[];
    county: LocalOfficial[];
    township: LocalOfficial[];
    school_district: LocalOfficial[];
    special_district: LocalOfficial[];
  };
  nextElections: Array<{
    date: string;
    offices: string[];
    jurisdiction: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ location: string }> }
) {
  const { location } = await params;
  const { searchParams } = new URL(request.url);
  const jurisdiction = searchParams.get('jurisdiction'); // 'city', 'county', etc.
  const zipCode = searchParams.get('zip');

  if (!location) {
    return NextResponse.json(
      { error: 'Location identifier is required' },
      { status: 400 }
    );
  }

  try {
    const cacheKey = `local-government-${location}-${jurisdiction || 'all'}`;
    const TTL_12_HOURS = 12 * 60 * 60 * 1000;

    const localData = await cachedFetch(
      cacheKey,
      async (): Promise<LocalGovernmentData> => {
        structuredLogger.info('Fetching local government data', {
          location,
          jurisdiction: jurisdiction || 'all',
          operation: 'local_government_fetch'
        }, request);

        // In production, this would integrate with various local government APIs
        const locationInfo = parseLocation(location);
        const officials = generateMockLocalOfficials(locationInfo);

        // Group by jurisdiction
        const jurisdictions = {
          city: officials.filter(o => o.jurisdiction === 'city'),
          county: officials.filter(o => o.jurisdiction === 'county'),
          township: officials.filter(o => o.jurisdiction === 'township'),
          school_district: officials.filter(o => o.jurisdiction === 'school_district'),
          special_district: officials.filter(o => o.jurisdiction === 'special_district')
        };

        const nextElections = generateNextElections(locationInfo);

        return {
          location,
          locationName: locationInfo.displayName,
          state: locationInfo.state,
          lastUpdated: new Date().toISOString(),
          officials,
          totalCount: officials.length,
          jurisdictions,
          nextElections
        };
      },
      TTL_12_HOURS
    );

    // Apply jurisdiction filter
    let filteredOfficials = localData.officials;
    if (jurisdiction) {
      filteredOfficials = filteredOfficials.filter(official => official.jurisdiction === jurisdiction);
    }

    const response = {
      ...localData,
      officials: filteredOfficials,
      totalCount: filteredOfficials.length,
      filters: {
        jurisdiction: jurisdiction || 'all'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    structuredLogger.error('Local Government API Error', error as Error, {
      location,
      jurisdiction: jurisdiction || 'all',
      operation: 'local_government_api_error'
    }, request);
    
    const errorResponse = {
      location,
      locationName: 'Unknown Location',
      state: 'Unknown',
      lastUpdated: new Date().toISOString(),
      officials: [],
      totalCount: 0,
      jurisdictions: {
        city: [],
        county: [],
        township: [],
        school_district: [],
        special_district: []
      },
      nextElections: [],
      error: 'Local government data temporarily unavailable'
    };

    return NextResponse.json(errorResponse, { status: 200 });
  }
}

function parseLocation(location: string) {
  // Parse location format: "city-state" or "county-state" or zip code
  const parts = location.split('-');
  
  if (parts.length >= 2) {
    const cityName = parts.slice(0, -1).join(' ').replace(/_/g, ' ');
    const state = parts[parts.length - 1].toUpperCase();
    
    return {
      city: cityName,
      state,
      displayName: `${cityName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}, ${state}`,
      county: generateCountyName(cityName, state)
    };
  }
  
  // Handle ZIP code format
  if (/^\\d{5}$/.test(location)) {
    const mockCityData = getMockCityFromZip(location);
    return mockCityData;
  }
  
  return {
    city: 'Generic City',
    state: 'ST',
    displayName: 'Generic City, ST',
    county: 'Generic County'
  };
}

function getMockCityFromZip(zip: string) {
  const mockData: Record<string, any> = {
    '90210': { city: 'Beverly Hills', state: 'CA', county: 'Los Angeles County' },
    '10001': { city: 'New York', state: 'NY', county: 'New York County' },
    '60601': { city: 'Chicago', state: 'IL', county: 'Cook County' },
    '30301': { city: 'Atlanta', state: 'GA', county: 'Fulton County' },
    '48201': { city: 'Detroit', state: 'MI', county: 'Wayne County' }
  };
  
  const data = mockData[zip] || { city: 'Sample City', state: 'TX', county: 'Sample County' };
  return {
    ...data,
    displayName: `${data.city}, ${data.state}`
  };
}

function generateCountyName(city: string, state: string): string {
  const countyMappings: Record<string, Record<string, string>> = {
    'CA': {
      'los angeles': 'Los Angeles County',
      'san francisco': 'San Francisco County',
      'san diego': 'San Diego County'
    },
    'NY': {
      'new york': 'New York County',
      'brooklyn': 'Kings County',
      'queens': 'Queens County'
    },
    'TX': {
      'houston': 'Harris County',
      'dallas': 'Dallas County',
      'austin': 'Travis County'
    }
  };

  const stateMapping = countyMappings[state];
  if (stateMapping) {
    const countyName = stateMapping[city.toLowerCase()];
    if (countyName) return countyName;
  }

  return `${city} County`;
}

function generateMockLocalOfficials(locationInfo: unknown): LocalOfficial[] {
  const officials: LocalOfficial[] = [];
  
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Maria', 'James', 'Jennifer'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

  // City officials
  const cityPositions = [
    { position: 'Mayor', responsibilities: ['Executive leadership', 'Budget oversight', 'Community relations'] },
    { position: 'City Council Member - District 1', responsibilities: ['Legislative duties', 'Constituent services', 'Committee work'] },
    { position: 'City Council Member - District 2', responsibilities: ['Legislative duties', 'Constituent services', 'Committee work'] },
    { position: 'City Council Member - District 3', responsibilities: ['Legislative duties', 'Constituent services', 'Committee work'] },
    { position: 'City Manager', responsibilities: ['Daily operations', 'Staff management', 'Policy implementation'], isElected: false },
    { position: 'City Clerk', responsibilities: ['Record keeping', 'Election administration', 'Public records'] }
  ];

  cityPositions.forEach((pos, index) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;

    officials.push({
      id: `${locationInfo.city.replace(' ', '-').toLowerCase()}-city-${index}`,
      name,
      position: pos.position,
      jurisdiction: 'city',
      jurisdictionName: `City of ${locationInfo.city}`,
      party: pos.position === 'Mayor' || pos.position.includes('Council') ? 
        (Math.random() > 0.5 ? 'Democratic' : 'Republican') : 'Nonpartisan',
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${locationInfo.city.replace(' ', '').toLowerCase()}.gov`,
      phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      office: `City Hall, ${locationInfo.city}`,
      termStart: '2022-01-01',
      termEnd: '2026-01-01',
      isElected: pos.isElected !== false,
      salary: pos.position === 'Mayor' ? 85000 : pos.position.includes('Council') ? 45000 : pos.position === 'City Manager' ? 120000 : 65000,
      website: `https://www.${locationInfo.city.replace(' ', '').toLowerCase()}.gov`,
      address: {
        street: '100 Main Street',
        city: locationInfo.city,
        state: locationInfo.state,
        zipCode: '12345'
      },
      responsibilities: pos.responsibilities,
      contactHours: {
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        hours: '9:00 AM - 5:00 PM'
      }
    });
  });

  // County officials
  const countyPositions = [
    { position: 'County Executive', responsibilities: ['County administration', 'Budget management', 'Inter-municipal coordination'] },
    { position: 'County Commissioner - District A', responsibilities: ['Policy making', 'Budget approval', 'Public services oversight'] },
    { position: 'County Commissioner - District B', responsibilities: ['Policy making', 'Budget approval', 'Public services oversight'] },
    { position: 'Sheriff', responsibilities: ['Law enforcement', 'Jail administration', 'Court security'] },
    { position: 'County Clerk', responsibilities: ['Elections', 'Vital records', 'Property records'] }
  ];

  countyPositions.forEach((pos, index) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;

    officials.push({
      id: `${locationInfo.county.replace(' ', '-').toLowerCase()}-${index}`,
      name,
      position: pos.position,
      jurisdiction: 'county',
      jurisdictionName: locationInfo.county,
      party: Math.random() > 0.3 ? (Math.random() > 0.5 ? 'Democratic' : 'Republican') : 'Nonpartisan',
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${locationInfo.county.replace(' ', '').toLowerCase()}.gov`,
      phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      office: `${locationInfo.county} Administration Building`,
      termStart: '2022-01-01',
      termEnd: '2026-01-01',
      isElected: true,
      salary: pos.position === 'County Executive' ? 95000 : pos.position === 'Sheriff' ? 85000 : 75000,
      responsibilities: pos.responsibilities,
      contactHours: {
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        hours: '8:00 AM - 4:30 PM'
      }
    });
  });

  // School district officials
  const schoolPositions = [
    { position: 'School Board President', responsibilities: ['Educational policy', 'Budget oversight', 'Superintendent hiring'] },
    { position: 'School Board Member - District 1', responsibilities: ['Educational policy', 'Community representation', 'Budget approval'] },
    { position: 'School Board Member - District 2', responsibilities: ['Educational policy', 'Community representation', 'Budget approval'] },
    { position: 'Superintendent', responsibilities: ['District leadership', 'Educational programs', 'Staff management'], isElected: false }
  ];

  schoolPositions.forEach((pos, index) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;

    officials.push({
      id: `${locationInfo.city.replace(' ', '-').toLowerCase()}-school-${index}`,
      name,
      position: pos.position,
      jurisdiction: 'school_district',
      jurisdictionName: `${locationInfo.city} School District`,
      party: 'Nonpartisan',
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${locationInfo.city.replace(' ', '').toLowerCase()}schools.org`,
      phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      office: `${locationInfo.city} School District Office`,
      termStart: '2022-07-01',
      termEnd: '2026-07-01',
      isElected: pos.isElected !== false,
      salary: pos.position === 'Superintendent' ? 130000 : 15000,
      responsibilities: pos.responsibilities,
      contactHours: {
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        hours: '9:00 AM - 3:00 PM'
      }
    });
  });

  return officials;
}

function generateNextElections(locationInfo: unknown) {
  const currentYear = new Date().getFullYear();
  const nextElectionYear = currentYear % 2 === 0 ? currentYear + 1 : currentYear;
  
  return [
    {
      date: `${nextElectionYear}-11-07`,
      offices: ['Mayor', 'City Council'],
      jurisdiction: `City of ${locationInfo.city}`
    },
    {
      date: `${nextElectionYear + 1}-11-07`,
      offices: ['County Executive', 'County Commissioner'],
      jurisdiction: locationInfo.county
    },
    {
      date: `${nextElectionYear}-05-15`,
      offices: ['School Board'],
      jurisdiction: `${locationInfo.city} School District`
    }
  ];
}