/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextResponse } from 'next/server';
import { verifyBearerToken } from './verify-bearer-token';
import logger from '@/lib/logging/simple-logger';

/**
 * Verify admin access for infrastructure endpoints (cache management,
 * refresh triggers) using a timing-safe Bearer token comparison against
 * ADMIN_API_KEY. Fails closed when the key is not configured.
 */
export function verifyAdminAccess(request: Request): boolean {
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    logger.warn('[AdminAuth] ADMIN_API_KEY not configured in environment');
    return false;
  }

  return verifyBearerToken(request.headers.get('authorization'), adminKey);
}

/**
 * Standard 401 response for failed admin auth, matching /api/admin/cache.
 */
export function adminUnauthorizedResponse(endpoint: string): NextResponse {
  logger.warn('[AdminAuth] Unauthorized access attempt', { endpoint });
  return NextResponse.json(
    { error: 'Unauthorized - Invalid or missing admin credentials' },
    { status: 401 }
  );
}
