/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/alerts/token';
import { deleteSubscription } from '@/lib/alerts/subscription-store';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/alerts/unsubscribe?token=...
 * One-click unsubscribe (CAN-SPAM required).
 * Redirects to a confirmation page.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return redirectWithStatus('missing-token');
  }

  try {
    const payload = await verifyToken(token, 'unsub');

    if (!payload) {
      return redirectWithStatus('invalid-or-expired');
    }

    await deleteSubscription(payload.sub);

    logger.info('[Alerts] Unsubscribed via email link', { emailHash: payload.sub });

    return redirectWithStatus('unsubscribed');
  } catch (error) {
    logger.error('[Alerts] Unsubscribe error', error as Error);
    return redirectWithStatus('error');
  }
}

function redirectWithStatus(status: string): NextResponse {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://civdotiq.org';
  const url = `${siteUrl}/alerts/status?result=${status}`;
  return NextResponse.redirect(url, { status: 302 });
}
