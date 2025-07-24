/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
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

export async function GET(_request: NextRequest) {
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
      },
    };

    return NextResponse.json(healthCheck, { status: 200 });
  } catch {
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
      },
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}

// Simple health endpoint for load balancers
export async function HEAD(_request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}
