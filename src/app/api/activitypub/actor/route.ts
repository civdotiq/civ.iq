/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * ActivityPub Actor Endpoint
 *
 * Returns the CIV.IQ Service actor document as JSON-LD.
 * Mastodon and other fediverse servers fetch this to understand
 * who they're following and where to deliver activities.
 */

import { NextResponse } from 'next/server';
import { buildActorDocument } from '@/lib/activitypub/actor';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = buildActorDocument();

  return NextResponse.json(actor, {
    headers: {
      'Content-Type': 'application/activity+json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
