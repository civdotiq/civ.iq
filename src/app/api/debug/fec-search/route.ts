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