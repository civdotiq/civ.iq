/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/alerts/token';
import { deleteDigestSubscription } from '@/lib/digest/subscription-store';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/digest/unsubscribe?token=...
 * One-click unsubscribe from the weekly digest. POST accepted for
 * RFC 8058 List-Unsubscribe-Post one-click flows.
 */
export async function GET(request: NextRequest) {
  return handleUnsubscribe(request);
}

export async function POST(request: NextRequest) {
  return handleUnsubscribe(request);
}

async function handleUnsubscribe(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return redirectWithStatus('missing-token');
  }

  try {
    const payload = await verifyToken(token, 'digest-unsub');
    if (!payload) {
      return redirectWithStatus('invalid-or-expired');
    }

    await deleteDigestSubscription(payload.sub);
    logger.info('[Digest] Unsubscribed via email link', { emailHash: payload.sub });
    return redirectWithStatus('unsubscribed');
  } catch (error) {
    logger.error('[Digest] Unsubscribe error', error as Error);
    return redirectWithStatus('error');
  }
}

function redirectWithStatus(status: string): NextResponse {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://civdotiq.org';
  return NextResponse.redirect(`${siteUrl}/alerts/status?result=${status}`, { status: 302 });
}
