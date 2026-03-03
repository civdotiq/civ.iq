/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * ActivityPub Followers Collection
 *
 * Returns the list of actors following CIV.IQ as an OrderedCollection.
 * Supports pagination: ?page=0, ?page=1, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { activitypubConfig } from '@/config/activitypub.config';
import { getFollowerIds, getFollowerCount } from '@/lib/activitypub/followers';
import type { APOrderedCollection, APOrderedCollectionPage } from '@/types/activitypub';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  const pageParam = request.nextUrl.searchParams.get('page');
  const followersUrl = activitypubConfig.actor.followers;

  if (pageParam === null) {
    const total = await getFollowerCount();

    const collection: APOrderedCollection = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'OrderedCollection',
      id: followersUrl,
      totalItems: total,
      first: `${followersUrl}?page=0`,
      last:
        total > 0
          ? `${followersUrl}?page=${Math.max(0, Math.ceil(total / PAGE_SIZE) - 1)}`
          : `${followersUrl}?page=0`,
    };

    return NextResponse.json(collection, {
      headers: {
        'Content-Type': 'application/activity+json; charset=utf-8',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Return a page of follower actor IRIs
  const page = Math.max(0, parseInt(pageParam) || 0);
  const allIds = await getFollowerIds();
  const total = allIds.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const pageIds = allIds.slice(start, start + PAGE_SIZE);

  const collectionPage: APOrderedCollectionPage = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'OrderedCollectionPage',
    id: `${followersUrl}?page=${page}`,
    partOf: followersUrl,
    totalItems: total,
    orderedItems: pageIds,
  };

  if (page > 0) {
    collectionPage.prev = `${followersUrl}?page=${page - 1}`;
  }
  if (page < totalPages - 1) {
    collectionPage.next = `${followersUrl}?page=${page + 1}`;
  }

  return NextResponse.json(collectionPage, {
    headers: {
      'Content-Type': 'application/activity+json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
