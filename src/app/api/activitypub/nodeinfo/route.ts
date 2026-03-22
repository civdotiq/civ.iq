/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * NodeInfo 2.0 Document
 *
 * Exposes instance metadata for fediverse directories
 * (fediverse.observer, fedidb.org, etc.)
 */

import { NextResponse } from 'next/server';
import { getOutboxItems } from '@/lib/activitypub/outbox';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { total } = await getOutboxItems(0, 0);

  return NextResponse.json(
    {
      version: '2.0',
      software: { name: 'civiq', version: '1.0.0' },
      protocols: ['activitypub'],
      usage: {
        users: { total: 1, activeMonth: 1, activeHalfyear: 1 },
        localPosts: total,
      },
      openRegistrations: false,
      metadata: { nodeName: 'CIV.IQ Civic Intelligence' },
    },
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
