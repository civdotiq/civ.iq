/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getWatchedEntities,
  getEntitySubscribers,
  getSubscription,
  type Subscription,
} from '@/lib/alerts/subscription-store';
import {
  detectChanges,
  type DetectedChange,
  type VoteChangeData,
  type LegislationChangeData,
  type FinanceChangeData,
} from '@/lib/alerts/change-detector';
import { createToken } from '@/lib/alerts/token';
import {
  voteAlertEmail,
  financeAlertEmail,
  legislationAlertEmail,
} from '@/lib/alerts/email-templates';
import { sendEmailBatch, type SendEmailParams } from '@/lib/alerts/email-sender';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

/** Cached subscriber data per entity to avoid redundant Redis reads */
interface EntitySubscriberData {
  subscribers: Array<{ hash: string; subscription: Subscription }>;
  alertTypes: Set<string>;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logger.info('[Alerts Cron] Starting daily alert check');

  try {
    // 1. Get all entities that have subscribers
    const watchedEntities = await getWatchedEntities();

    if (watchedEntities.length === 0) {
      logger.info('[Alerts Cron] No watched entities, skipping');
      return NextResponse.json({
        success: true,
        message: 'No watched entities',
        duration: Date.now() - startTime,
      });
    }

    logger.info('[Alerts Cron] Checking entities', { count: watchedEntities.length });

    // 2. For each entity, fetch subscribers and their subscriptions ONCE.
    //    Cache results to avoid refetching in step 4.
    const entityData = new Map<string, EntitySubscriberData>();

    for (const entity of watchedEntities) {
      const subscriberHashes = await getEntitySubscribers(entity);
      const data: EntitySubscriberData = { subscribers: [], alertTypes: new Set() };

      for (const hash of subscriberHashes) {
        const sub = await getSubscription(hash);
        if (!sub?.verified) continue;

        data.subscribers.push({ hash, subscription: sub });
        for (const at of sub.alertTypes) {
          data.alertTypes.add(at);
        }
      }

      if (data.subscribers.length > 0) {
        entityData.set(`${entity.type}:${entity.id}`, data);
      }
    }

    // 3. Detect changes for each entity
    const allChanges: DetectedChange[] = [];

    for (const entity of watchedEntities) {
      const data = entityData.get(`${entity.type}:${entity.id}`);
      if (!data || data.alertTypes.size === 0) continue;

      const changes = await detectChanges(
        entity,
        Array.from(data.alertTypes) as Array<'votes' | 'finance' | 'legislation'>
      );
      allChanges.push(...changes);
    }

    if (allChanges.length === 0) {
      logger.info('[Alerts Cron] No changes detected');
      return NextResponse.json({
        success: true,
        message: 'No changes detected',
        entitiesChecked: watchedEntities.length,
        duration: Date.now() - startTime,
      });
    }

    logger.info('[Alerts Cron] Changes detected', { count: allChanges.length });

    // 4. Build alert emails using cached subscriber data (no redundant fetches)
    const emailsToSend: SendEmailParams[] = [];

    for (const change of allChanges) {
      const data = entityData.get(`${change.entity.type}:${change.entity.id}`);
      if (!data) continue;

      for (const { hash, subscription } of data.subscribers) {
        if (!subscription.alertTypes.includes(change.alertType)) continue;

        // Generate tokens for unsubscribe/manage (30-day TTL)
        const [unsubToken, manageToken] = await Promise.all([
          createToken(hash, 'unsub', 30 * 24 * 60 * 60),
          createToken(hash, 'manage', 30 * 24 * 60 * 60),
        ]);

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://civdotiq.org';
        const unsubscribeUrl = `${siteUrl}/api/alerts/unsubscribe?token=${encodeURIComponent(unsubToken)}`;
        const manageUrl = `${siteUrl}/api/alerts/manage?token=${encodeURIComponent(manageToken)}`;

        const emails = buildEmails(change, subscription.email, {
          unsubscribeUrl,
          manageUrl,
        });
        emailsToSend.push(...emails);
      }
    }

    if (emailsToSend.length === 0) {
      logger.info('[Alerts Cron] Changes detected but no matching subscribers');
      return NextResponse.json({
        success: true,
        message: 'Changes detected, no matching subscribers',
        changesDetected: allChanges.length,
        duration: Date.now() - startTime,
      });
    }

    // 5. Send in batches
    const result = await sendEmailBatch(emailsToSend);

    logger.info('[Alerts Cron] Complete', {
      entitiesChecked: watchedEntities.length,
      changesDetected: allChanges.length,
      emailsSent: result.sent,
      emailsFailed: result.failed,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      entitiesChecked: watchedEntities.length,
      changesDetected: allChanges.length,
      emailsSent: result.sent,
      emailsFailed: result.failed,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('[Alerts Cron] Failed', error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Alert cron job failed',
        message: (error as Error).message,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

function buildEmails(
  change: DetectedChange,
  email: string,
  urls: { unsubscribeUrl: string; manageUrl: string }
): SendEmailParams[] {
  const results: SendEmailParams[] = [];
  const repName = change.entity.name || change.entity.id;

  if (change.data.type === 'vote') {
    const voteData = change.data as VoteChangeData;
    // Limit to 5 most recent votes to avoid flooding
    for (const vote of voteData.votes.slice(0, 5)) {
      const content = voteAlertEmail(
        {
          representativeName: repName,
          bioguideId: change.entity.id,
          vote: vote.position as 'Yea' | 'Nay' | 'Not Voting' | 'Present',
          billTitle: vote.billTitle,
          billId: vote.billId,
          date: vote.date,
        },
        urls
      );
      results.push({
        to: email,
        ...content,
        unsubscribeUrl: urls.unsubscribeUrl,
      });
    }
  } else if (change.data.type === 'legislation') {
    const legData = change.data as LegislationChangeData;
    for (const bill of legData.bills.slice(0, 5)) {
      const content = legislationAlertEmail(
        {
          representativeName: repName,
          bioguideId: change.entity.id,
          action: bill.relationship,
          billTitle: bill.title,
          billId: bill.billId,
          date: bill.date,
        },
        urls
      );
      results.push({
        to: email,
        ...content,
        unsubscribeUrl: urls.unsubscribeUrl,
      });
    }
  } else if (change.data.type === 'finance') {
    const finData = change.data as FinanceChangeData;
    const content = financeAlertEmail(
      {
        representativeName: repName,
        bioguideId: change.entity.id,
        totalRaised: finData.totalRaised,
        period: String(finData.cycle),
      },
      urls
    );
    results.push({
      to: email,
      ...content,
      unsubscribeUrl: urls.unsubscribeUrl,
    });
  }

  return results;
}

// Allow GET for manual triggering in development
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return POST(request);
}
