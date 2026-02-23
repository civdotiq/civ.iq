/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Public API v1 — Index
 *
 * Lists all available v1 endpoints with descriptions.
 * No authentication required. CORS-open.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const baseUrl = 'https://civ.iq/api/v1';

  const index = {
    name: 'CIV.IQ Public API',
    version: 'v1',
    description:
      'Open REST API for normalized U.S. government data. No API key required. Rate limited to 60 requests per minute.',
    documentation: 'https://civ.iq/docs/api',
    license: 'MIT',
    source: 'https://github.com/civdotiq/civic-intel-hub',
    endpoints: {
      representatives: {
        list: {
          url: `${baseUrl}/representatives`,
          method: 'GET',
          description: 'List all current members of Congress',
          params: {
            chamber: 'Filter by chamber: "house" or "senate"',
            state: 'Filter by two-letter state code (e.g., "MI")',
            party: 'Filter by party: "D", "R", or "I"',
            limit: 'Results per page (default: 100, max: 535)',
            offset: 'Pagination offset (default: 0)',
          },
        },
        detail: {
          url: `${baseUrl}/representatives/{bioguideId}`,
          method: 'GET',
          description: 'Get detailed info for a specific member of Congress',
          example: `${baseUrl}/representatives/P000197`,
        },
      },
      bills: {
        list: {
          url: `${baseUrl}/bills`,
          method: 'GET',
          description: 'List latest bills from Congress',
          params: {
            sort: 'Sort order: "updateDate+desc", "updateDate+asc", "number+desc", "number+asc"',
            limit: 'Results per page (default: 50, max: 250)',
            offset: 'Pagination offset (default: 0)',
          },
        },
        detail: {
          url: `${baseUrl}/bills/{billId}`,
          method: 'GET',
          description: 'Get bill detail from Congress.gov',
          example: `${baseUrl}/bills/119-hr-1`,
        },
        summary: {
          url: `${baseUrl}/bills/{billId}/summary`,
          method: 'GET',
          description: 'Get cached AI-generated plain-language summary (no live generation)',
          example: `${baseUrl}/bills/119-hr-1/summary`,
        },
      },
      votes: {
        detail: {
          url: `${baseUrl}/votes/{voteId}`,
          method: 'GET',
          description: 'Get roll-call vote details',
          example: `${baseUrl}/votes/house-119-116`,
        },
      },
      districts: {
        detail: {
          url: `${baseUrl}/districts/{districtId}`,
          method: 'GET',
          description: 'Get district info and representatives',
          example: `${baseUrl}/districts/MI-12`,
        },
      },
      committees: {
        list: {
          url: `${baseUrl}/committees`,
          method: 'GET',
          description: 'List congressional committees',
          params: {
            chamber: 'Filter by chamber',
            limit: 'Results per page (default: 100, max: 250)',
            offset: 'Pagination offset (default: 0)',
          },
        },
        detail: {
          url: `${baseUrl}/committees/{committeeId}`,
          method: 'GET',
          description: 'Get committee detail with members',
          example: `${baseUrl}/committees/HSJU`,
        },
      },
    },
    feeds: {
      description: 'Atom XML feeds for subscribing via RSS readers. No account required.',
      endpoints: {
        member: {
          url: 'https://civ.iq/api/feed/member/{bioguideId}',
          description: 'Activity feed for a specific member of Congress',
          example: 'https://civ.iq/api/feed/member/P000197',
        },
        bills: {
          url: 'https://civ.iq/api/feed/bills/latest',
          description: 'Latest bills introduced in Congress',
        },
        district: {
          url: 'https://civ.iq/api/feed/district/{districtId}',
          description: 'Activity feed for a congressional district',
          example: 'https://civ.iq/api/feed/district/MI-12',
        },
        bill: {
          url: 'https://civ.iq/api/feed/bill/{billId}',
          description: 'Status updates for a specific bill',
          example: 'https://civ.iq/api/feed/bill/119-hr-1',
        },
        committee: {
          url: 'https://civ.iq/api/feed/committee/{committeeId}',
          description: 'Activity feed for a committee',
          example: 'https://civ.iq/api/feed/committee/HSJU',
        },
      },
    },
    rateLimit: {
      requests: 60,
      window: '1 minute',
      headers: {
        'X-RateLimit-Limit': 'Maximum requests per window',
        'X-RateLimit-Remaining': 'Remaining requests in current window',
        'X-RateLimit-Reset': 'Unix timestamp when window resets',
      },
    },
    links: {
      documentation: 'https://civ.iq/docs/api',
      openapi: 'https://civ.iq/openapi.json',
      changelog: `${baseUrl}/changelog`,
    },
    meta: {
      apiVersion: 'v1',
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(index, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
