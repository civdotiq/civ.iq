/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/alerts/token';
import {
  getSubscription,
  updateSubscription,
  deleteSubscription,
  type AlertType,
  type WatchedEntity,
} from '@/lib/alerts/subscription-store';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

const VALID_ALERT_TYPES: AlertType[] = ['votes', 'finance', 'legislation'];

/**
 * GET /api/alerts/manage?token=...
 * Returns current subscription preferences.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  try {
    const payload = await verifyToken(token, 'manage');
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const subscription = await getSubscription(payload.sub);
    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json({
      entities: subscription.entities,
      alertTypes: subscription.alertTypes,
      verified: subscription.verified,
      createdAt: subscription.createdAt,
    });
  } catch (error) {
    logger.error('[Alerts] Manage GET error', error as Error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * PUT /api/alerts/manage?token=...
 * Updates subscription preferences.
 * Body: { entities?: WatchedEntity[], alertTypes?: AlertType[] }
 */
export async function PUT(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  try {
    const payload = await verifyToken(token, 'manage');
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await request.json();
    const updates: { entities?: WatchedEntity[]; alertTypes?: AlertType[] } = {};

    if (Array.isArray(body.entities)) {
      updates.entities = body.entities
        .filter(
          (e: Record<string, unknown>) =>
            e.type === 'representative' && typeof e.id === 'string' && e.id.length > 0
        )
        .map((e: Record<string, unknown>) => ({
          type: 'representative' as const,
          id: (e.id as string).toUpperCase(),
          name: typeof e.name === 'string' ? e.name : undefined,
          chamber:
            e.chamber === 'House' || e.chamber === 'Senate'
              ? (e.chamber as 'House' | 'Senate')
              : undefined,
        }));
    }

    if (Array.isArray(body.alertTypes)) {
      updates.alertTypes = body.alertTypes.filter((t: string) =>
        VALID_ALERT_TYPES.includes(t as AlertType)
      );
    }

    const updated = await updateSubscription(payload.sub, updates);
    if (!updated) {
      return NextResponse.json(
        { error: 'Subscription not found or not verified' },
        { status: 404 }
      );
    }

    logger.info('[Alerts] Subscription preferences updated', { emailHash: payload.sub });

    return NextResponse.json({
      success: true,
      entities: updated.entities,
      alertTypes: updated.alertTypes,
    });
  } catch (error) {
    logger.error('[Alerts] Manage PUT error', error as Error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * DELETE /api/alerts/manage?token=...
 * Deletes the subscription entirely.
 */
export async function DELETE(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  try {
    const payload = await verifyToken(token, 'manage');
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    await deleteSubscription(payload.sub);
    logger.info('[Alerts] Subscription deleted via manage', { emailHash: payload.sub });

    return NextResponse.json({ success: true, message: 'Subscription deleted' });
  } catch (error) {
    logger.error('[Alerts] Manage DELETE error', error as Error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
