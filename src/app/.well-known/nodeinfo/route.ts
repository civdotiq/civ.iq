/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * NodeInfo Discovery (JRD)
 *
 * Points fediverse directories to the NodeInfo 2.0 document.
 * https://nodeinfo.diaspora.software/protocol
 */

import { NextResponse } from 'next/server';
import { activitypubConfig } from '@/config/activitypub.config';

export async function GET() {
  return NextResponse.json(
    {
      links: [
        {
          rel: 'http://nodeinfo.diaspora.software/ns/schema/2.0',
          href: `${activitypubConfig.baseUrl}/api/activitypub/nodeinfo`,
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/jrd+json; charset=utf-8',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
