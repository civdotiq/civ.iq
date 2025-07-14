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