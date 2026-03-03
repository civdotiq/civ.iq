/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * WebFinger Discovery (RFC 7033)
 *
 * Allows Mastodon/fediverse instances to discover the CIV.IQ
 * ActivityPub actor via standard WebFinger lookup.
 *
 * Example: GET /.well-known/webfinger?resource=acct:civiq@civdotiq.org
 */

import { NextRequest, NextResponse } from 'next/server';
import { activitypubConfig } from '@/config/activitypub.config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const resource = request.nextUrl.searchParams.get('resource');

  if (!resource) {
    return NextResponse.json({ error: 'Missing resource parameter' }, { status: 400 });
  }

  const expectedAcct = `acct:${activitypubConfig.actor.username}@${activitypubConfig.domain}`;

  if (resource !== expectedAcct && resource !== activitypubConfig.actor.id) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
  }

  const webfinger = {
    subject: expectedAcct,
    aliases: [activitypubConfig.actor.id],
    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: activitypubConfig.actor.id,
      },
      {
        rel: 'http://webfinger.net/rel/profile-page',
        type: 'text/html',
        href: activitypubConfig.baseUrl,
      },
    ],
  };

  return NextResponse.json(webfinger, {
    headers: {
      'Content-Type': 'application/jrd+json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
