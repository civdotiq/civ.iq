/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * ActivityPub Following Collection
 *
 * CIV.IQ doesn't follow anyone — returns an empty OrderedCollection.
 */

import { NextResponse } from 'next/server';
import { activitypubConfig } from '@/config/activitypub.config';
import type { APOrderedCollection } from '@/types/activitypub';

export const dynamic = 'force-dynamic';

export async function GET() {
  const collection: APOrderedCollection = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'OrderedCollection',
    id: activitypubConfig.actor.following,
    totalItems: 0,
    orderedItems: [],
  };

  return NextResponse.json(collection, {
    headers: {
      'Content-Type': 'application/activity+json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
