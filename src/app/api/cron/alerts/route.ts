/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getWatchedEntities,
  getEntitySubscribers,
  getSubscription,
} from '@/lib/alerts/subscription-store';
import {
  detectChanges,
  type DetectedChange,
  type VoteChangeData,
  type LegislationChangeData,
} from '@/lib/alerts/change-detector';
import { createToken } from '@/lib/alerts/token';
import {
  voteAlertEmail,
  financeAlertEmail,
  legislationAlertEmail,
} from '@/lib/alerts/email-templates';
import { sendEmailBatch } from '@/lib/alerts/email-sender';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Verify cron secret
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

    // 2. For each entity, collect all alert types subscribers want
    const entityAlertTypes = new Map<string, Set<string>>();

    for (const entity of watchedEntities) {
      const subscriberHashes = await getEntitySubscribers(entity);
      const alertTypeSet = new Set<string>();

      for (const hash of subscriberHashes) {
        const sub = await getSubscription(hash);
        if (sub?.verified) {
          for (const at of sub.alertTypes) {
            alertTypeSet.add(at);
          }
        }
      }

      entityAlertTypes.set(`${entity.type}:${entity.id}`, alertTypeSet);
    }

    // 3. Detect changes for each entity
    const allChanges: DetectedChange[] = [];

    for (const entity of watchedEntities) {
      const alertTypes = entityAlertTypes.get(`${entity.type}:${entity.id}`);
      if (!alertTypes || alertTypes.size === 0) continue;

      const changes = await detectChanges(
        entity,
        Array.from(alertTypes) as Array<'votes' | 'finance' | 'legislation'>
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

    // 4. Build and send alert emails
    const emailsToSend: Array<{ to: string; subject: string; text: string; html: string }> = [];

    for (const change of allChanges) {
      const subscriberHashes = await getEntitySubscribers(change.entity);

      for (const hash of subscriberHashes) {
        const sub = await getSubscription(hash);
        if (!sub?.verified) continue;
        if (!sub.alertTypes.includes(change.alertType)) continue;

        // Generate unsubscribe/manage tokens (long-lived, 30 days)
        const [unsubToken, manageToken] = await Promise.all([
          createToken(hash, 'unsub', 30 * 24 * 60 * 60),
          createToken(hash, 'manage', 30 * 24 * 60 * 60),
        ]);

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://civdotiq.org';
        const urls = {
          unsubscribeUrl: `${siteUrl}/api/alerts/unsubscribe?token=${encodeURIComponent(unsubToken)}`,
          manageUrl: `${siteUrl}/api/alerts/manage?token=${encodeURIComponent(manageToken)}`,
        };

        const emails = buildEmails(change, sub.email, urls);
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
): Array<{ to: string; subject: string; text: string; html: string }> {
  const results: Array<{ to: string; subject: string; text: string; html: string }> = [];
  const repName = change.entity.name || change.entity.id;

  if (change.data.type === 'vote') {
    const voteData = change.data as VoteChangeData;
    // Send one email per new vote (limit to 5 most recent to avoid flooding)
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
      results.push({ to: email, ...content });
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
      results.push({ to: email, ...content });
    }
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
