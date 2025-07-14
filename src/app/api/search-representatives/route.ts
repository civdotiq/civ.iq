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

import { NextRequest, NextResponse } from 'next/server';

interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  imageUrl?: string;
  yearsInOffice?: number;
}

// Mock representatives database - in production this would be a real database
const mockRepresentatives: Representative[] = [
  // Sample House Representatives
  {
    bioguideId: 'P000197',
    name: 'Nancy Pelosi',
    party: 'Democratic',
    state: 'California',
    district: '5',
    chamber: 'House',
    title: 'Representative for California\'s 5th Congressional District',
    yearsInOffice: 37
  },
  {
    bioguideId: 'M000312',
    name: 'James P. McGovern',
    party: 'Democratic',
    state: 'Massachusetts',
    district: '2',
    chamber: 'House',
    title: 'Representative for Massachusetts\'s 2nd Congressional District',
    yearsInOffice: 27
  },
  {
    bioguideId: 'J000289',
    name: 'Jim Jordan',
    party: 'Republican',
    state: 'Ohio',
    district: '4',
    chamber: 'House',
    title: 'Representative for Ohio\'s 4th Congressional District',
    yearsInOffice: 17
  },
  {
    bioguideId: 'A000371',
    name: 'Pete Aguilar',
    party: 'Democratic',
    state: 'California',
    district: '33',
    chamber: 'House',
    title: 'Representative for California\'s 33rd Congressional District',
    yearsInOffice: 10
  },
  {
    bioguideId: 'S000344',
    name: 'Brad Sherman',
    party: 'Democratic',
    state: 'California',
    district: '32',
    chamber: 'House',
    title: 'Representative for California\'s 32nd Congressional District',
    yearsInOffice: 27
  },
  {
    bioguideId: 'G000551',
    name: 'Raúl M. Grijalva',
    party: 'Democratic',
    state: 'Arizona',
    district: '7',
    chamber: 'House',
    title: 'Representative for Arizona\'s 7th Congressional District',
    yearsInOffice: 21
  },
  {
    bioguideId: 'M001135',
    name: 'Kathy Manning',
    party: 'Democratic',
    state: 'North Carolina',
    district: '6',
    chamber: 'House',
    title: 'Representative for North Carolina\'s 6th Congressional District',
    yearsInOffice: 4
  },
  {
    bioguideId: 'C001084',
    name: 'David N. Cicilline',
    party: 'Democratic',
    state: 'Rhode Island',
    district: '1',
    chamber: 'House',
    title: 'Representative for Rhode Island\'s 1st Congressional District',
    yearsInOffice: 13
  },

  // Sample Senate Representatives
  {
    bioguideId: 'S000148',
    name: 'Charles E. Schumer',
    party: 'Democratic',
    state: 'New York',
    chamber: 'Senate',
    title: 'United States Senator from New York',
    yearsInOffice: 25
  },
  {
    bioguideId: 'M000355',
    name: 'Mitch McConnell',
    party: 'Republican',
    state: 'Kentucky',
    chamber: 'Senate',
    title: 'United States Senator from Kentucky',
    yearsInOffice: 39
  },
  {
    bioguideId: 'W000817',
    name: 'Elizabeth Warren',
    party: 'Democratic',
    state: 'Massachusetts',
    chamber: 'Senate',
    title: 'United States Senator from Massachusetts',
    yearsInOffice: 12
  },
  {
    bioguideId: 'C001098',
    name: 'Ted Cruz',
    party: 'Republican',
    state: 'Texas',
    chamber: 'Senate',
    title: 'United States Senator from Texas',
    yearsInOffice: 12
  },
  {
    bioguideId: 'S001194',
    name: 'Brian Schatz',
    party: 'Democratic',
    state: 'Hawaii',
    chamber: 'Senate',
    title: 'United States Senator from Hawaii',
    yearsInOffice: 12
  },
  {
    bioguideId: 'K000367',
    name: 'Amy Klobuchar',
    party: 'Democratic',
    state: 'Minnesota',
    chamber: 'Senate',
    title: 'United States Senator from Minnesota',
    yearsInOffice: 18
  },
  {
    bioguideId: 'C001113',
    name: 'Catherine Cortez Masto',
    party: 'Democratic',
    state: 'Nevada',
    chamber: 'Senate',
    title: 'United States Senator from Nevada',
    yearsInOffice: 8
  },
  {
    bioguideId: 'B001288',
    name: 'Cory A. Booker',
    party: 'Democratic',
    state: 'New Jersey',
    chamber: 'Senate',
    title: 'United States Senator from New Jersey',
    yearsInOffice: 11
  },
  {
    bioguideId: 'S001197',
    name: 'Ben Sasse',
    party: 'Republican',
    state: 'Nebraska',
    chamber: 'Senate',
    title: 'United States Senator from Nebraska',
    yearsInOffice: 10
  },
  {
    bioguideId: 'H001042',
    name: 'Mazie K. Hirono',
    party: 'Democratic',
    state: 'Hawaii',
    chamber: 'Senate',
    title: 'United States Senator from Hawaii',
    yearsInOffice: 12
  }
];

function searchRepresentatives(query: string): Representative[] {
  const searchTerm = query.toLowerCase().trim();
  
  if (!searchTerm) {
    return [];
  }

  return mockRepresentatives.filter(rep => {
    // Search by name
    if (rep.name.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Search by state
    if (rep.state.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Search by party
    if (rep.party.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Search by district (if applicable)
    if (rep.district && rep.district.includes(searchTerm)) {
      return true;
    }
    
    // Search by chamber
    if (rep.chamber.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    return false;
  }).slice(0, 10); // Limit to 10 results
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json(
      { error: 'Search query is required' },
      { status: 400 }
    );
  }

  try {
    const results = searchRepresentatives(query);
    return NextResponse.json(results);

  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}