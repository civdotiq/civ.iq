/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Analytics Dashboard Endpoint
 * Returns per-endpoint request counts for a date range.
 * Authenticated via CACHE_WARM_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestCounts } from '@/lib/analytics/request-counter';
import { addVersionHeaders } from '@/lib/api/v1-versioning';
import { verifyBearerToken } from '@/lib/security/verify-bearer-token';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CACHE_WARM_SECRET;

  if (!expectedToken) {
    return NextResponse.json(
      { error: { code: 503, message: 'Analytics not configured' } },
      { status: 503 }
    );
  }

  if (!verifyBearerToken(authHeader, expectedToken)) {
    return NextResponse.json({ error: { code: 401, message: 'Unauthorized' } }, { status: 401 });
  }

  // Parse date range from query params (default: last 7 days)
  const { searchParams } = request.nextUrl;
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setDate(defaultStart.getDate() - 7);

  const startDate = searchParams.get('start') || defaultStart.toISOString().slice(0, 10);
  const endDate = searchParams.get('end') || now.toISOString().slice(0, 10);

  // Validate date format
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(startDate) || !datePattern.test(endDate)) {
    return NextResponse.json(
      { error: { code: 400, message: 'Invalid date format. Use YYYY-MM-DD.' } },
      { status: 400 }
    );
  }

  // Validate dates are semantically valid (regex alone accepts "2025-13-45")
  if (isNaN(new Date(startDate).getTime()) || isNaN(new Date(endDate).getTime())) {
    return NextResponse.json(
      { error: { code: 400, message: 'Invalid date values.' } },
      { status: 400 }
    );
  }

  const counts = await getRequestCounts(startDate, endDate);

  // Compute summary stats
  const totalRequests = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const endpointCount = Object.keys(counts).length;

  const response = NextResponse.json({
    data: {
      dateRange: { start: startDate, end: endDate },
      totalRequests,
      endpointCount,
      endpoints: counts,
    },
    meta: {
      apiVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      source: 'civiq-analytics',
    },
  });

  addVersionHeaders(response.headers);
  response.headers.set('Cache-Control', 'no-store');

  return response;
}
