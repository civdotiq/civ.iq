/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') || 'Shri Thanedar';
  const state = searchParams.get('state') || 'MI';
  
  if (!process.env.FEC_API_KEY) {
    return NextResponse.json({ error: 'FEC API key not configured' });
  }

  try {
    const response = await fetch(
      `https://api.open.fec.gov/v1/candidates/search/?q=${encodeURIComponent(name)}&state=${state}&api_key=${process.env.FEC_API_KEY}&sort=-election_years`
    );

    if (!response.ok) {
      return NextResponse.json({ error: `FEC API error: ${response.status}` });
    }

    const data = await response.json();
    
    return NextResponse.json({
      search_query: { name, state },
      fec_response: data,
      matches: data.results?.filter((c: any) => 
        c.state === state && 
        (c.office === 'H' || c.office === 'S') &&
        c.cycles?.includes(2024)
      ) || []
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}