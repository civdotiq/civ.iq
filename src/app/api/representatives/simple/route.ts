/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const zipCode = url.searchParams.get('zip');

    if (!zipCode) {
      return NextResponse.json(
        { error: 'ZIP code is required' }, 
        { status: 400 }
      );
    }

    // Basic ZIP code validation
    if (!/^\d{5}(-\d{4})?$/.test(zipCode)) {
      return NextResponse.json(
        { error: 'Invalid ZIP code format' }, 
        { status: 400 }
      );
    }

    // Simple mock response for now
    const mockRepresentatives = [
      {
        bioguideId: 'S000148',
        name: 'Charles E. Schumer',
        party: 'Democratic',
        state: 'NY',
        chamber: 'Senate',
        title: 'U.S. Senator',
        phone: '(202) 224-6542',
        website: 'https://www.schumer.senate.gov'
      },
      {
        bioguideId: 'G000555',
        name: 'Kirsten E. Gillibrand',
        party: 'Democratic',
        state: 'NY',
        chamber: 'Senate',
        title: 'U.S. Senator',
        phone: '(202) 224-4451',
        website: 'https://www.gillibrand.senate.gov'
      }
    ];

    return NextResponse.json({
      representatives: mockRepresentatives,
      metadata: {
        dataSource: 'mock',
        timestamp: new Date().toISOString(),
        zipCode,
        totalFound: mockRepresentatives.length,
        note: 'Simplified endpoint - mock data only'
      }
    });

  } catch (error) {
    console.error('Representatives API error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}