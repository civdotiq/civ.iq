/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * ActivityPub Outbox
 *
 * OrderedCollection of recent civic events as ActivityPub activities.
 * Fediverse instances poll this to get new content from CIV.IQ.
 *
 * Supports pagination: ?page=0, ?page=1, etc.
 * Without ?page, returns the collection summary.
 */

import { NextRequest, NextResponse } from 'next/server';
import { activitypubConfig } from '@/config/activitypub.config';
import { getOutboxItems } from '@/lib/activitypub/outbox';
import type { APOrderedCollection, APOrderedCollectionPage } from '@/types/activitypub';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const pageParam = request.nextUrl.searchParams.get('page');
  const { outboxPageSize } = activitypubConfig;
  const outboxUrl = activitypubConfig.actor.outbox;

  if (pageParam === null) {
    // Return collection summary (no items)
    const { total } = await getOutboxItems(0, 0);

    const collection: APOrderedCollection = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'OrderedCollection',
      id: outboxUrl,
      totalItems: total,
      first: `${outboxUrl}?page=0`,
      last:
        total > 0
          ? `${outboxUrl}?page=${Math.max(0, Math.ceil(total / outboxPageSize) - 1)}`
          : `${outboxUrl}?page=0`,
    };

    return NextResponse.json(collection, {
      headers: {
        'Content-Type': 'application/activity+json; charset=utf-8',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Return a page of items
  const page = Math.max(0, parseInt(pageParam) || 0);
  const { items, total } = await getOutboxItems(page, outboxPageSize);
  const totalPages = Math.max(1, Math.ceil(total / outboxPageSize));

  const collectionPage: APOrderedCollectionPage = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'OrderedCollectionPage',
    id: `${outboxUrl}?page=${page}`,
    partOf: outboxUrl,
    totalItems: total,
    orderedItems: items,
  };

  if (page > 0) {
    collectionPage.prev = `${outboxUrl}?page=${page - 1}`;
  }
  if (page < totalPages - 1) {
    collectionPage.next = `${outboxUrl}?page=${page + 1}`;
  }

  return NextResponse.json(collectionPage, {
    headers: {
      'Content-Type': 'application/activity+json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
