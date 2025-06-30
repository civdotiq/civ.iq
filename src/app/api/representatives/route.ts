import { NextRequest, NextResponse } from 'next/server';
import { getCongressionalDistrictFromZip, getCongressionalDistrictFromAddress } from '@/lib/census-api';
import { getRepresentativesByLocation } from '@/lib/congress-api';
import { validateZipCode, validateRepresentativeData, createRateLimitValidator } from '@/lib/validation';

// Rate limiting: 100 requests per minute per IP
const rateLimitValidator = createRateLimitValidator(100, 60 * 1000);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get('zip');
  
  // Rate limiting
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (!rateLimitValidator(clientIP)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }
  
  if (!zipCode) {
    return NextResponse.json(
      { error: 'ZIP code is required' },
      { status: 400 }
    );
  }
  
  // Validate and sanitize ZIP code
  const zipValidation = validateZipCode(zipCode);
  if (!zipValidation.isValid) {
    return NextResponse.json(
      { 
        error: 'Invalid ZIP code',
        details: zipValidation.errors.map(e => e.message)
      },
      { status: 400 }
    );
  }
  
  const sanitizedZip = zipValidation.data;
  
  try {
    console.log(`Looking up representatives for ZIP: ${sanitizedZip}`);
    
    // Step 1: Get congressional district from Census API
    let districtInfo = await getCongressionalDistrictFromZip(sanitizedZip);
    
    // If the first method fails, try the one-line address method
    if (!districtInfo) {
      console.log('Trying alternative method with ZIP as address...');
      districtInfo = await getCongressionalDistrictFromAddress(sanitizedZip);
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
    
    // Validate and sanitize representative data
    const validatedReps = representatives
      .map(rep => {
        const validation = validateRepresentativeData(rep);
        if (validation.hasWarnings) {
          console.warn('Representative data warnings:', validation.warnings);
        }
        return validation.isValid ? validation.data : null;
      })
      .filter(rep => rep !== null);

    // Format the response
    const response = {
      zipCode: sanitizedZip,
      state: districtInfo.stateCode,
      stateName: districtInfo.districtName.split(' ')[0], // Extract state name
      district: districtInfo.district,
      districtName: districtInfo.districtName,
      representatives: validatedReps.map(rep => ({
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