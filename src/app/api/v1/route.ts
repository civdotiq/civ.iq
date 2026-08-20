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
  const baseUrl = 'https://civdotiq.org/api/v1';

  const index = {
    name: 'CIV.IQ Public API',
    version: 'v1',
    description:
      'Open REST API for normalized U.S. government data. No API key required. Rate limited to 60 requests per minute.',
    documentation: 'https://civdotiq.org/docs/api',
    license: 'MIT',
    source: 'https://github.com/civdotiq/civ.iq',
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
          url: 'https://civdotiq.org/api/feed/member/{bioguideId}',
          description: 'Activity feed for a specific member of Congress',
          example: 'https://civdotiq.org/api/feed/member/P000197',
        },
        bills: {
          url: 'https://civdotiq.org/api/feed/bills/latest',
          description: 'Latest bills introduced in Congress',
        },
        district: {
          url: 'https://civdotiq.org/api/feed/district/{districtId}',
          description: 'Activity feed for a congressional district',
          example: 'https://civdotiq.org/api/feed/district/MI-12',
        },
        bill: {
          url: 'https://civdotiq.org/api/feed/bill/{billId}',
          description: 'Status updates for a specific bill',
          example: 'https://civdotiq.org/api/feed/bill/119-hr-1',
        },
        committee: {
          url: 'https://civdotiq.org/api/feed/committee/{committeeId}',
          description: 'Activity feed for a committee',
          example: 'https://civdotiq.org/api/feed/committee/HSJU',
        },
        stateBills: {
          url: 'https://civdotiq.org/api/feed/state/{state}/bills',
          description: 'Recent state legislature bills via OpenStates',
          example: 'https://civdotiq.org/api/feed/state/CA/bills',
        },
        stateLegislator: {
          url: 'https://civdotiq.org/api/feed/state/{state}/legislator/{id}',
          description: 'State legislator sponsored bills',
          example: 'https://civdotiq.org/api/feed/state/NY/legislator/ocd-person/abc123',
        },
      },
    },
    federation: {
      description:
        'ActivityPub federation for fediverse interoperability. Follow @civiq@civdotiq.org from Mastodon. Activities delivered to follower inboxes via HTTP Signatures.',
      endpoints: {
        webfinger: {
          url: 'https://civdotiq.org/.well-known/webfinger?resource=acct:civiq@civdotiq.org',
          description: 'WebFinger discovery (RFC 7033)',
        },
        nodeinfo: {
          url: 'https://civdotiq.org/.well-known/nodeinfo',
          description: 'NodeInfo 2.0 discovery for fediverse directories',
        },
        actor: {
          url: 'https://civdotiq.org/api/activitypub/actor',
          description: 'ActivityPub Service actor document',
        },
        inbox: {
          url: 'https://civdotiq.org/api/activitypub/inbox',
          description: 'Receives Follow/Undo activities from remote instances',
        },
        outbox: {
          url: 'https://civdotiq.org/api/activitypub/outbox',
          description: 'Paginated OrderedCollection of published activities',
        },
        followers: {
          url: 'https://civdotiq.org/api/activitypub/followers',
          description: 'Paginated OrderedCollection of follower actors',
        },
        following: {
          url: 'https://civdotiq.org/api/activitypub/following',
          description: 'Empty collection (CIV.IQ is publish-only)',
        },
      },
    },
    nostr: {
      description:
        'Nostr publishing layer. Civic events signed with Schnorr signatures and distributed to relays as NIP-23 long-form Markdown content.',
      following: {
        nip05: 'civiq@civdotiq.org',
        pubkey: 'See /api/nostr/status publicKey field',
        eventKinds: {
          '30023': 'Long-form article per civic event (canonical record)',
          '1': 'Short alert note linking to the article',
        },
        description:
          'Every event carries `t` tags — subscribe to a topic without following the whole feed by filtering on them (most clients support hashtag follows).',
        tagScheme: {
          'event type':
            'bill-action, bill-introduced, vote-record, executive-order, comment-period, hearing, state-bill-introduced, state-bill-action, state-vote',
          federal:
            'legislation, new-bill, vote, hearing, executive-order, presidential, comment-period, regulation, house, senate',
          regulatory:
            'Federal Register agency slug on comment periods (e.g. environmental-protection-agency)',
          state:
            'state-legislation or state-vote plus the lowercase state code (e.g. ca, ny, il) and chamber (upper/lower)',
        },
        example:
          'Filter {"kinds":[30023],"authors":["<pubkey>"],"#t":["vote"]} yields every congressional roll-call article; add "senate" for one chamber.',
      },
      endpoints: {
        status: {
          url: 'https://civdotiq.org/api/nostr/status',
          description: 'Publishing layer status, relay list, recent activity',
        },
        verify: {
          url: 'https://civdotiq.org/api/nostr/verify',
          description: 'Read-back verification across all relays',
        },
        nip05: {
          url: 'https://civdotiq.org/.well-known/nostr.json?name=civiq',
          description: 'NIP-05 identity verification',
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
      documentation: 'https://civdotiq.org/docs/api',
      openapi: 'https://civdotiq.org/openapi.json',
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
