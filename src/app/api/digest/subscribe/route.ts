/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { hashEmail, createToken } from '@/lib/alerts/token';
import { createDigestSubscription } from '@/lib/digest/subscription-store';
import { digestConfirmationEmail } from '@/lib/digest/digest-email';
import { sendEmail } from '@/lib/alerts/email-sender';
import { checkRateLimitRedis } from '@/lib/security/rate-limit-redis';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const parts = forwarded?.split(',').map(s => s.trim()) ?? [];
  return (parts.length > 1 ? parts[parts.length - 1] : parts[0]) || realIp || 'unknown';
}

export async function POST(request: NextRequest) {
  if (!process.env.RESEND_API_KEY || !process.env.ALERT_TOKEN_SECRET) {
    return NextResponse.json(
      { error: 'Email subscriptions are not configured on this server.' },
      { status: 503 }
    );
  }

  const clientIp = getClientIp(request);
  const rateLimit = await checkRateLimitRedis(clientIp, '/api/digest/subscribe', {
    requests: 5,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
  }

  try {
    const emailHash = await hashEmail(email);
    const subscription = await createDigestSubscription(email, emailHash);

    if (subscription.verified) {
      return NextResponse.json({
        success: true,
        message: 'You are already subscribed.',
        verified: true,
      });
    }

    const token = await createToken(emailHash, 'digest-verify', 48 * 60 * 60);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://civdotiq.org';
    const verifyUrl = `${siteUrl}/api/digest/verify?token=${encodeURIComponent(token)}`;

    const emailContent = digestConfirmationEmail(verifyUrl);
    const sent = await sendEmail({
      to: email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    if (!sent) {
      logger.error('[Digest] Failed to send confirmation email', new Error('Send failed'), {
        emailHash,
      });
      return NextResponse.json(
        { error: 'Failed to send confirmation email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Check your email to confirm your subscription.',
      verified: false,
    });
  } catch (error) {
    logger.error('[Digest] Subscribe error', error as Error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
