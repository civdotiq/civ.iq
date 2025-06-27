import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Simply return environment variable status
  const envStatus = {
    NODE_ENV: process.env.NODE_ENV,
    hasCongressKey: !!process.env.CONGRESS_API_KEY,
    hasFECKey: !!process.env.FEC_API_KEY,
    hasOpenStatesKey: !!process.env.OPENSTATES_API_KEY,
    congressKeyLength: process.env.CONGRESS_API_KEY?.length || 0,
    fecKeyLength: process.env.FEC_API_KEY?.length || 0,
    openStatesKeyLength: process.env.OPENSTATES_API_KEY?.length || 0,
    // Show partial keys for verification (first 4 and last 4 chars)
    congressKeyPreview: process.env.CONGRESS_API_KEY 
      ? `${process.env.CONGRESS_API_KEY.substring(0, 4)}...${process.env.CONGRESS_API_KEY.substring(process.env.CONGRESS_API_KEY.length - 4)}`
      : 'NOT FOUND',
    fecKeyPreview: process.env.FEC_API_KEY
      ? `${process.env.FEC_API_KEY.substring(0, 4)}...${process.env.FEC_API_KEY.substring(process.env.FEC_API_KEY.length - 4)}`
      : 'NOT FOUND',
    openStatesKeyPreview: process.env.OPENSTATES_API_KEY
      ? `${process.env.OPENSTATES_API_KEY.substring(0, 4)}...${process.env.OPENSTATES_API_KEY.substring(process.env.OPENSTATES_API_KEY.length - 4)}`
      : 'NOT FOUND',
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(envStatus);
}
