/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * ActivityPub Inbox
 *
 * Handles incoming Follow/Undo activities from fediverse instances.
 * Verifies HTTP signatures and manages the follower list.
 */

import { NextRequest, NextResponse } from 'next/server';
import { activitypubConfig } from '@/config/activitypub.config';
import { isFederationEnabled } from '@/lib/activitypub/actor';
import { verifySignature } from '@/lib/activitypub/http-signatures';
import { addFollower, removeFollower } from '@/lib/activitypub/followers';
import { signRequest } from '@/lib/activitypub/http-signatures';
import logger from '@/lib/logging/simple-logger';
import type { APFollowActivity, APUndoActivity } from '@/types/activitypub';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isFederationEnabled()) {
    return NextResponse.json({ error: 'Federation not configured' }, { status: 503 });
  }

  // Verify HTTP signature
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const verification = await verifySignature('POST', request.nextUrl.pathname, headers);

  if (!verification.valid) {
    logger.warn('ActivityPub inbox: signature verification failed', {
      error: verification.error,
      operation: 'activitypub_inbox',
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: APFollowActivity | APUndoActivity;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const activityType = body.type;

  if (activityType === 'Follow') {
    return handleFollow(body as APFollowActivity);
  }

  if (activityType === 'Undo') {
    const undo = body as APUndoActivity;
    if (undo.object?.type === 'Follow') {
      return handleUnfollow(undo);
    }
  }

  // Acknowledge but ignore unsupported activity types
  logger.info('ActivityPub inbox: unsupported activity type', {
    type: activityType,
    actor: body.actor,
    operation: 'activitypub_inbox',
  });

  return new NextResponse(null, { status: 202 });
}

async function handleFollow(follow: APFollowActivity): Promise<NextResponse> {
  const actorId = follow.actor;

  if (follow.object !== activitypubConfig.actor.id) {
    return NextResponse.json({ error: 'Invalid follow target' }, { status: 400 });
  }

  // Fetch the remote actor to get their inbox
  let inbox: string;
  try {
    const actorRes = await fetch(actorId, {
      headers: { Accept: 'application/activity+json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!actorRes.ok) {
      return NextResponse.json({ error: 'Could not fetch remote actor' }, { status: 422 });
    }

    const actor = await actorRes.json();
    inbox = actor.inbox;

    if (!inbox) {
      return NextResponse.json({ error: 'Remote actor has no inbox' }, { status: 422 });
    }
  } catch (error) {
    logger.error('ActivityPub inbox: failed to fetch remote actor', error as Error, {
      actorId,
      operation: 'activitypub_inbox',
    });
    return NextResponse.json({ error: 'Failed to fetch remote actor' }, { status: 502 });
  }

  // Add follower
  await addFollower(actorId, inbox);

  // Send Accept back to the follower's inbox
  const accept = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Accept',
    id: `${activitypubConfig.actor.id}/accepts/${Date.now()}`,
    actor: activitypubConfig.actor.id,
    object: follow,
  };

  const acceptBody = JSON.stringify(accept);
  const sigHeaders = signRequest('POST', inbox, acceptBody);

  if (sigHeaders) {
    try {
      await fetch(inbox, {
        method: 'POST',
        body: acceptBody,
        headers: {
          'Content-Type': 'application/activity+json',
          ...sigHeaders,
        },
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      // Accept delivery is best-effort; the follow is still stored
      logger.warn('ActivityPub inbox: Accept delivery failed', {
        inbox,
        error: error instanceof Error ? error.message : 'Unknown',
        operation: 'activitypub_inbox',
      });
    }
  }

  logger.info('ActivityPub: new follower accepted', {
    actorId,
    operation: 'activitypub_inbox',
  });

  return new NextResponse(null, { status: 202 });
}

async function handleUnfollow(undo: APUndoActivity): Promise<NextResponse> {
  const actorId = undo.actor;
  await removeFollower(actorId);

  logger.info('ActivityPub: follower removed', {
    actorId,
    operation: 'activitypub_inbox',
  });

  return new NextResponse(null, { status: 202 });
}
