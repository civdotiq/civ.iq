import { NextRequest, NextResponse } from 'next/server';
import { getCongressionalDistrictFromZip, getCongressionalDistrictFromAddress } from '@/lib/census-api';
import { getRepresentativesByLocation } from '@/lib/congress-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get('zip');
  
  if (!zipCode) {
    return NextResponse.json(
      { error: 'ZIP code is required' },
      { status: 400 }
    );
  }
  
  // Validate ZIP code format
  const zipRegex = /^\d{5}(-\d{4})?$/;
  if (!zipRegex.test(zipCode)) {
    return NextResponse.json(
      { error: 'Invalid ZIP code format' },
      { status: 400 }
    );
  }
  
  try {
    console.log(`Looking up representatives for ZIP: ${zipCode}`);
    
    // Step 1: Get congressional district from Census API
    let districtInfo = await getCongressionalDistrictFromZip(zipCode);
    
    // If the first method fails, try the one-line address method
    if (!districtInfo) {
      console.log('Trying alternative method with ZIP as address...');
      districtInfo = await getCongressionalDistrictFromAddress(zipCode);
    }
    
    if (!districtInfo) {
      return NextResponse.json(
        { 
          error: 'Could not find congressional district for this ZIP code',
          zipCode,
          message: 'The Census geocoding service could not locate this ZIP code. Please verify it is a valid US ZIP code.'
        },
        { status: 404 }
      );
    }
    
    console.log(`Found district: ${districtInfo.districtName} (${districtInfo.stateCode}-${districtInfo.district})`);
    
    // Step 2: Get representatives from Congress.gov API
    const representatives = await getRepresentativesByLocation(
      districtInfo.stateCode,
      districtInfo.district,
      process.env.CONGRESS_API_KEY
    );
    
    // Format the response
    const response = {
      zipCode,
      state: districtInfo.stateCode,
      stateName: districtInfo.districtName.split(' ')[0], // Extract state name
      district: districtInfo.district,
      districtName: districtInfo.districtName,
      representatives: representatives.map(rep => ({
        ...rep,
        title: rep.chamber === 'Senate' ? 'U.S. Senator' : 'U.S. Representative',
        dataComplete: rep.imageUrl ? 95 : 75 // Higher completeness if we have an image
      }))
    };
    
    // Add CORS headers for development
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    };
    
    return NextResponse.json(response, { headers });
    
  } catch (error) {
    console.error('API Error:', error);
    
    // Return a more detailed error in development
    const errorResponse = {
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : 'Unknown error'
        : 'An error occurred while fetching representative data'
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}