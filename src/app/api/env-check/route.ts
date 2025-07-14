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
