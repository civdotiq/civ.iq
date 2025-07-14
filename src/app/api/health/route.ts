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

interface SimpleHealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  apiKeys: {
    congress: boolean;
    fec: boolean;
    census: boolean;
    openstates: boolean;
  };
}

const startTime = Date.now();

export async function GET(request: NextRequest) {
  try {
    const healthCheck: SimpleHealthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      apiKeys: {
        congress: !!process.env.CONGRESS_API_KEY,
        fec: !!process.env.FEC_API_KEY,
        census: !!process.env.CENSUS_API_KEY,
        openstates: !!process.env.OPENSTATES_API_KEY,
      }
    };

    return NextResponse.json(healthCheck, { status: 200 });
  } catch (error) {
    const errorResponse: SimpleHealthCheck = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      apiKeys: {
        congress: false,
        fec: false,
        census: false,
        openstates: false,
      }
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}

// Simple health endpoint for load balancers
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}