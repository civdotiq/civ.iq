/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { hashEmail, createToken } from '@/lib/alerts/token';
import {
  createSubscription,
  type AlertType,
  type WatchedEntity,
} from '@/lib/alerts/subscription-store';
import { confirmationEmail } from '@/lib/alerts/email-templates';
import { sendEmail } from '@/lib/alerts/email-sender';
import { checkRateLimitRedis } from '@/lib/security/rate-limit-redis';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

const VALID_ALERT_TYPES: AlertType[] = ['votes', 'finance', 'legislation'];
const VALID_CHAMBERS = new Set(['House', 'Senate']);

interface SubscribeRequestBody {
  email: string;
  entities: Array<{ type: string; id: string; name?: string; chamber?: string }>;
  alertTypes: string[];
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const parts = forwarded?.split(',').map(s => s.trim()) ?? [];
  return (parts.length > 1 ? parts[parts.length - 1] : parts[0]) || realIp || 'unknown';
}

export async function POST(request: NextRequest) {
  // Fail early if alert system is not configured
  if (!process.env.RESEND_API_KEY || !process.env.ALERT_TOKEN_SECRET) {
    return NextResponse.json(
      { error: 'Alert system is not configured on this server.' },
      { status: 503 }
    );
  }

  // Rate limit: 5 subscribe attempts per minute per IP
  const clientIp = getClientIp(request);
  const rateLimit = await checkRateLimitRedis(clientIp, '/api/alerts/subscribe', {
    requests: 5,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  let body: SubscribeRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Validate email
  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
  }

  // Validate entities
  if (!Array.isArray(body.entities) || body.entities.length === 0) {
    return NextResponse.json({ error: 'At least one entity is required' }, { status: 400 });
  }

  if (body.entities.length > 20) {
    return NextResponse.json({ error: 'Maximum 20 entities per subscription' }, { status: 400 });
  }

  const entities: WatchedEntity[] = body.entities
    .filter(e => e.type === 'representative' && typeof e.id === 'string' && e.id.length > 0)
    .map(e => ({
      type: 'representative' as const,
      id: e.id.toUpperCase(),
      name: e.name,
      chamber: VALID_CHAMBERS.has(e.chamber ?? '') ? (e.chamber as 'House' | 'Senate') : undefined,
    }));

  if (entities.length === 0) {
    return NextResponse.json({ error: 'No valid entities provided' }, { status: 400 });
  }

  // Validate alert types
  const alertTypes = (body.alertTypes ?? []).filter((t): t is AlertType =>
    VALID_ALERT_TYPES.includes(t as AlertType)
  );

  if (alertTypes.length === 0) {
    return NextResponse.json(
      { error: 'At least one valid alert type is required' },
      { status: 400 }
    );
  }

  try {
    const emailHash = await hashEmail(email);

    // Create/update subscription (starts unverified)
    const subscription = await createSubscription(email, emailHash, entities, alertTypes);

    // If already verified, no need for confirmation email
    if (subscription.verified) {
      return NextResponse.json({
        success: true,
        message: 'Subscription updated successfully.',
        verified: true,
      });
    }

    // Generate verification token (48-hour TTL)
    const token = await createToken(emailHash, 'verify', 48 * 60 * 60);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://civdotiq.org';
    const verifyUrl = `${siteUrl}/api/alerts/verify?token=${encodeURIComponent(token)}`;

    // Send confirmation email
    const entityNames = entities.map(e => e.name || e.id);
    const emailContent = confirmationEmail({ verifyUrl, entityNames });

    const sent = await sendEmail({
      to: email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    if (!sent) {
      logger.error('[Alerts] Failed to send confirmation email', new Error('Send failed'), {
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
    logger.error('[Alerts] Subscribe error', error as Error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
