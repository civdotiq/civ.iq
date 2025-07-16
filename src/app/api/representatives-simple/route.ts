/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';

interface Representative {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  state: string;
  district: string | null;
  party: string;
  chamber: 'House' | 'Senate';
  imageUrl: string;
  contactInfo: {
    phone: string;
    website: string;
    office: string;
  };
  committees: Array<{
    name: string;
    role?: string;
  }>;
  social: {
    twitter?: string;
    facebook?: string;
  };
  // Additional fields expected by the frontend
  title: string;
  phone?: string;
  email?: string;
  website?: string;
  yearsInOffice?: number;
  nextElection?: string;
  dataComplete: number;
}

// Mock data for different ZIP codes
const mockRepresentatives: Record<string, Representative[]> = {
  '48221': [ // Detroit, MI
    {
      bioguideId: 'T000481',
      name: 'Rashida Tlaib',
      firstName: 'Rashida',
      lastName: 'Tlaib',
      state: 'MI',
      district: '12',
      party: 'Democratic',
      chamber: 'House',
      title: 'U.S. Representative for Michigan\'s 12th District',
      imageUrl: '',
      contactInfo: {
        phone: '(202) 225-5126',
        website: 'https://tlaib.house.gov',
        office: '1628 Longworth House Office Building'
      },
      committees: [
        { name: 'Committee on Financial Services' },
        { name: 'Committee on Oversight and Reform' }
      ],
      social: {
        twitter: '@RepRashida'
      },
      phone: '(202) 225-5126',
      website: 'https://tlaib.house.gov',
      yearsInOffice: 6,
      nextElection: '2024',
      dataComplete: 95
    },
    {
      bioguideId: 'S000770',
      name: 'Debbie Stabenow',
      firstName: 'Debbie',
      lastName: 'Stabenow',
      state: 'MI',
      district: null,
      party: 'Democratic',
      chamber: 'Senate',
      title: 'U.S. Senator from Michigan',
      imageUrl: '',
      contactInfo: {
        phone: '(202) 224-4822',
        website: 'https://www.stabenow.senate.gov',
        office: '731 Hart Senate Office Building'
      },
      committees: [
        { name: 'Committee on Agriculture, Nutrition, and Forestry', role: 'Chair' },
        { name: 'Committee on Finance' }
      ],
      social: {
        twitter: '@SenStabenow'
      },
      phone: '(202) 224-4822',
      website: 'https://www.stabenow.senate.gov',
      yearsInOffice: 24,
      nextElection: '2024',
      dataComplete: 98
    },
    {
      bioguideId: 'P000595',
      name: 'Gary Peters',
      firstName: 'Gary',
      lastName: 'Peters',
      state: 'MI',
      district: null,
      party: 'Democratic',
      chamber: 'Senate',
      title: 'U.S. Senator from Michigan',
      imageUrl: '',
      contactInfo: {
        phone: '(202) 224-6221',
        website: 'https://www.peters.senate.gov',
        office: '724 Hart Senate Office Building'
      },
      committees: [
        { name: 'Committee on Homeland Security and Governmental Affairs', role: 'Chair' },
        { name: 'Committee on Commerce, Science, and Transportation' }
      ],
      social: {
        twitter: '@SenGaryPeters'
      },
      phone: '(202) 224-6221',
      website: 'https://www.peters.senate.gov',
      yearsInOffice: 10,
      nextElection: '2026',
      dataComplete: 97
    }
  ],
  '10001': [ // New York, NY
    {
      bioguideId: 'N000002',
      name: 'Jerrold Nadler',
      firstName: 'Jerrold',
      lastName: 'Nadler',
      state: 'NY',
      district: '12',
      party: 'Democratic',
      chamber: 'House',
      title: 'U.S. Representative for New York\'s 12th District',
      imageUrl: '',
      contactInfo: {
        phone: '(202) 225-5635',
        website: 'https://nadler.house.gov',
        office: '2132 Rayburn House Office Building'
      },
      committees: [
        { name: 'Committee on the Judiciary', role: 'Ranking Member' }
      ],
      social: {
        twitter: '@RepJerryNadler'
      },
      phone: '(202) 225-5635',
      website: 'https://nadler.house.gov',
      yearsInOffice: 32,
      nextElection: '2024',
      dataComplete: 96
    },
    {
      bioguideId: 'S000148',
      name: 'Charles E. Schumer',
      firstName: 'Charles',
      lastName: 'Schumer',
      state: 'NY',
      district: null,
      party: 'Democratic',
      chamber: 'Senate',
      title: 'Senate Majority Leader',
      imageUrl: '',
      contactInfo: {
        phone: '(202) 224-6542',
        website: 'https://www.schumer.senate.gov',
        office: '322 Hart Senate Office Building'
      },
      committees: [
        { name: 'Committee on Rules and Administration', role: 'Chair' }
      ],
      social: {
        twitter: '@SenSchumer'
      },
      phone: '(202) 224-6542',
      website: 'https://www.schumer.senate.gov',
      yearsInOffice: 26,
      nextElection: '2028',
      dataComplete: 99
    },
    {
      bioguideId: 'G000555',
      name: 'Kirsten E. Gillibrand',
      firstName: 'Kirsten',
      lastName: 'Gillibrand',
      state: 'NY',
      district: null,
      party: 'Democratic',
      chamber: 'Senate',
      title: 'U.S. Senator from New York',
      imageUrl: '',
      contactInfo: {
        phone: '(202) 224-4451',
        website: 'https://www.gillibrand.senate.gov',
        office: '478 Russell Senate Office Building'
      },
      committees: [
        { name: 'Committee on Armed Services' },
        { name: 'Committee on Environment and Public Works' }
      ],
      social: {
        twitter: '@SenGillibrand'
      },
      phone: '(202) 224-4451',
      website: 'https://www.gillibrand.senate.gov',
      yearsInOffice: 15,
      nextElection: '2024',
      dataComplete: 98
    }
  ],
  '90210': [ // Beverly Hills, CA
    {
      bioguideId: 'S001150',
      name: 'Adam Schiff',
      firstName: 'Adam',
      lastName: 'Schiff',
      state: 'CA',
      district: '30',
      party: 'Democratic',
      chamber: 'House',
      title: 'U.S. Representative for California\'s 30th District',
      imageUrl: '',
      contactInfo: {
        phone: '(202) 225-4176',
        website: 'https://schiff.house.gov',
        office: '2309 Rayburn House Office Building'
      },
      committees: [
        { name: 'Permanent Select Committee on Intelligence', role: 'Ranking Member' }
      ],
      social: {
        twitter: '@RepAdamSchiff'
      },
      phone: '(202) 225-4176',
      website: 'https://schiff.house.gov',
      yearsInOffice: 24,
      nextElection: '2024',
      dataComplete: 97
    },
    {
      bioguideId: 'F000062',
      name: 'Dianne Feinstein',
      firstName: 'Dianne',
      lastName: 'Feinstein',
      state: 'CA',
      district: null,
      party: 'Democratic',
      chamber: 'Senate',
      title: 'U.S. Senator from California',
      imageUrl: '',
      contactInfo: {
        phone: '(202) 224-3841',
        website: 'https://www.feinstein.senate.gov',
        office: '331 Hart Senate Office Building'
      },
      committees: [
        { name: 'Committee on the Judiciary', role: 'Ranking Member' },
        { name: 'Committee on Intelligence' }
      ],
      social: {
        twitter: '@SenFeinstein'
      },
      phone: '(202) 224-3841',
      website: 'https://www.feinstein.senate.gov',
      yearsInOffice: 31,
      nextElection: '2024',
      dataComplete: 95
    },
    {
      bioguideId: 'P000145',
      name: 'Alex Padilla',
      firstName: 'Alex',
      lastName: 'Padilla',
      state: 'CA',
      district: null,
      party: 'Democratic',
      chamber: 'Senate',
      title: 'U.S. Senator from California',
      imageUrl: '',
      contactInfo: {
        phone: '(202) 224-3553',
        website: 'https://www.padilla.senate.gov',
        office: '112 Hart Senate Office Building'
      },
      committees: [
        { name: 'Committee on Environment and Public Works' },
        { name: 'Committee on Homeland Security and Governmental Affairs' }
      ],
      social: {
        twitter: '@SenAlexPadilla'
      },
      phone: '(202) 224-3553',
      website: 'https://www.padilla.senate.gov',
      yearsInOffice: 4,
      nextElection: '2028',
      dataComplete: 94
    }
  ]
};

// Default representatives for unknown ZIP codes
const defaultRepresentatives: Representative[] = [
  {
    bioguideId: 'DEMO001',
    name: 'Jane Smith',
    firstName: 'Jane',
    lastName: 'Smith',
    state: 'XX',
    district: '1',
    party: 'Democratic',
    chamber: 'House',
    title: 'U.S. Representative (Demo)',
    imageUrl: '',
    contactInfo: {
      phone: '(202) 225-0000',
      website: 'https://example.house.gov',
      office: '1000 Longworth House Office Building'
    },
    committees: [
      { name: 'Committee on Example Affairs' }
    ],
    social: {
      twitter: '@DemoRep'
    },
    phone: '(202) 225-0000',
    website: 'https://example.house.gov',
    yearsInOffice: 8,
    nextElection: '2024',
    dataComplete: 75
  }
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get('zip');

  // Validate ZIP code
  if (!zipCode) {
    return NextResponse.json(
      { error: 'ZIP code is required' },
      { status: 400 }
    );
  }

  if (!/^\d{5}$/.test(zipCode)) {
    return NextResponse.json(
      { error: 'Invalid ZIP code format. Please provide a 5-digit ZIP code.' },
      { status: 400 }
    );
  }

  try {
    // Get representatives for this ZIP code or use defaults
    const representatives = mockRepresentatives[zipCode] || defaultRepresentatives;

    // Determine state from representatives
    const state = representatives[0]?.state || 'XX';
    const district = representatives.find(r => r.chamber === 'House')?.district || '1';

    const response = {
      zipCode,
      state,
      district,
      representatives,
      metadata: {
        dataSource: 'demo',
        timestamp: new Date().toISOString(),
        totalFound: representatives.length,
        note: 'Demo data - Add API keys to .env.local for live data'
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
      }
    });

  } catch (error) {
    console.error('Representatives API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Unable to fetch representatives at this time'
      },
      { status: 500 }
    );
  }
}