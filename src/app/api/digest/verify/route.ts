/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/alerts/token';
import { verifyDigestSubscription } from '@/lib/digest/subscription-store';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/digest/verify?token=...
 * Confirms a digest subscription via the signed token from the
 * confirmation email. Redirects to the shared status page.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return redirectWithStatus('missing-token');
  }

  try {
    const payload = await verifyToken(token, 'digest-verify');
    if (!payload) {
      return redirectWithStatus('invalid-or-expired');
    }

    const subscription = await verifyDigestSubscription(payload.sub);
    if (!subscription) {
      return redirectWithStatus('not-found');
    }

    logger.info('[Digest] Subscription verified via email link', { emailHash: payload.sub });
    return redirectWithStatus('confirmed');
  } catch (error) {
    logger.error('[Digest] Verify error', error as Error);
    return redirectWithStatus('error');
  }
}

function redirectWithStatus(status: string): NextResponse {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://civdotiq.org';
  return NextResponse.redirect(`${siteUrl}/alerts/status?result=${status}`, { status: 302 });
}
