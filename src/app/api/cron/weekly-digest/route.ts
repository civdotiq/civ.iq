/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Weekly digest cron — Mondays.
 *
 * Assembles the issue for the ISO week that just ended and emails it to
 * verified digest subscribers. Idempotent per week (digest:sent:{weekId})
 * so a retry or manual trigger never double-sends.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedisCache } from '@/lib/cache/redis-client';
import { createToken } from '@/lib/alerts/token';
import { sendEmailBatch } from '@/lib/alerts/email-sender';
import { getDigestIssue } from '@/lib/digest/assemble';
import { digestIssueEmail } from '@/lib/digest/digest-email';
import { latestCompleteWeekId } from '@/lib/digest/week';
import { listVerifiedDigestSubscribers } from '@/lib/digest/subscription-store';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SENT_TTL = 30 * 24 * 60 * 60; // sent-marker survives a month of retries
const UNSUB_TOKEN_TTL = 90 * 24 * 60 * 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  // ?week=YYYY-Www overrides for backfills/tests; default is last complete week.
  const weekId = request.nextUrl.searchParams.get('week') ?? latestCompleteWeekId();
  const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true';

  const cache = getRedisCache();
  const sentKey = `digest:sent:${weekId}`;

  if (!dryRun && (await cache.exists(sentKey))) {
    return NextResponse.json({ ok: true, weekId, skipped: 'already sent' });
  }

  const issue = await getDigestIssue(weekId);
  if (!issue) {
    logger.error('[Digest] Cron could not assemble issue', new Error('assembly failed'), {
      weekId,
    });
    return NextResponse.json({ error: 'Issue assembly failed', weekId }, { status: 500 });
  }

  // A week where every section failed upstream is not worth emailing.
  if (issue.unavailable.length === 3) {
    logger.error('[Digest] All sections unavailable — not sending', new Error('empty issue'), {
      weekId,
    });
    return NextResponse.json({ error: 'All sections unavailable', weekId }, { status: 500 });
  }

  const subscribers = await listVerifiedDigestSubscribers();
  if (subscribers.length === 0) {
    // Mark sent anyway: the issue is published on the site either way.
    if (!dryRun) await cache.set(sentKey, { sentAt: new Date().toISOString(), sent: 0 }, SENT_TTL);
    return NextResponse.json({ ok: true, weekId, subscribers: 0, emailsSent: 0 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://civdotiq.org';
  const emails = await Promise.all(
    subscribers.map(async subscriber => {
      const unsubToken = await createToken(subscriber.emailHash, 'digest-unsub', UNSUB_TOKEN_TTL);
      const unsubscribeUrl = `${siteUrl}/api/digest/unsubscribe?token=${encodeURIComponent(unsubToken)}`;
      const content = digestIssueEmail(issue, unsubscribeUrl);
      return {
        to: subscriber.email,
        subject: content.subject,
        text: content.text,
        html: content.html,
        unsubscribeUrl,
      };
    })
  );

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      weekId,
      dryRun: true,
      subscribers: subscribers.length,
      sample: { subject: emails[0]?.subject, text: emails[0]?.text },
    });
  }

  const { sent, failed } = await sendEmailBatch(emails);
  await cache.set(sentKey, { sentAt: new Date().toISOString(), sent, failed }, SENT_TTL);

  logger.info('[Digest] Weekly send complete', {
    weekId,
    subscribers: subscribers.length,
    sent,
    failed,
    durationMs: Date.now() - started,
  });

  return NextResponse.json({ ok: true, weekId, subscribers: subscribers.length, sent, failed });
}
