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
    const congressApiKey = process.env.CONGRESS_API_KEY;
    
    if (!congressApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Congress API key not configured',
        apiKeyProvided: false
      }, { status: 500 });
    }

    // Test a simple Congress.gov API call
    const testUrl = `https://api.congress.gov/v3/member?api_key=${congressApiKey}&limit=3`;
    
    console.log('Testing Congress API at:', testUrl.replace(congressApiKey, 'HIDDEN'));
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CivicIntelHub/1.0'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    console.log('Congress API Response Status:', response.status);
    console.log('Congress API Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        error: `Congress API returned ${response.status}: ${response.statusText}`,
        details: errorText,
        apiKeyProvided: true,
        responseStatus: response.status
      }, { status: 500 });
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Congress API is working',
      apiKeyProvided: true,
      responseStatus: response.status,
      dataReceived: {
        membersCount: data.members?.length || 0,
        paginationInfo: data.pagination || null,
        firstMember: data.members?.[0] ? {
          bioguideId: data.members[0].bioguideId,
          name: data.members[0].name,
          party: data.members[0].partyName,
          state: data.members[0].state
        } : null
      },
      rawDataSample: data
    });

  } catch (error) {
    console.error('Congress API test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : 'UnknownError',
      apiKeyProvided: !!process.env.CONGRESS_API_KEY
    }, { status: 500 });
  }
}