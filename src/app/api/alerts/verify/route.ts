/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/alerts/token';
import { verifySubscription } from '@/lib/alerts/subscription-store';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/alerts/verify?token=...
 * Confirms a subscription via the signed token from the confirmation email.
 * Redirects to a success page on the site.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return redirectWithStatus('missing-token');
  }

  try {
    const payload = await verifyToken(token, 'verify');

    if (!payload) {
      return redirectWithStatus('invalid-or-expired');
    }

    const subscription = await verifySubscription(payload.sub);

    if (!subscription) {
      return redirectWithStatus('not-found');
    }

    logger.info('[Alerts] Subscription verified via email link', {
      emailHash: payload.sub,
      entityCount: subscription.entities.length,
    });

    return redirectWithStatus('confirmed');
  } catch (error) {
    logger.error('[Alerts] Verify error', error as Error);
    return redirectWithStatus('error');
  }
}

function redirectWithStatus(status: string): NextResponse {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://civdotiq.org';
  const url = `${siteUrl}/alerts/status?result=${status}`;
  return NextResponse.redirect(url, { status: 302 });
}
