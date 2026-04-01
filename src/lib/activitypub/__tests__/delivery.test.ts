/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

let mockFollowers: Array<{
  actorId: string;
  inbox: string;
  sharedInbox?: string;
  followedAt: string;
}> = [];

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'activitypub:followers') return Promise.resolve(mockFollowers);
      return Promise.resolve(null);
    }),
    set: jest.fn().mockImplementation((key: string, value: unknown) => {
      if (key === 'activitypub:followers') mockFollowers = value as typeof mockFollowers;
      return Promise.resolve();
    }),
    keys: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('@/lib/activitypub/http-signatures', () => ({
  signRequest: () => ({
    Signature: 'mock-sig',
    Date: new Date().toUTCString(),
    Digest: 'mock-digest',
  }),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { describe, test, expect, beforeEach } from '@jest/globals';
import { deliverToFollowers, GoneError } from '../delivery';
import type { APCreateActivity } from '@/types/activitypub';

// Track fetch calls
const fetchCalls: Map<string, number> = new Map();
const originalFetch = global.fetch;

const mockActivity: APCreateActivity = {
  '@context': 'https://www.w3.org/ns/activitystreams',
  type: 'Create',
  id: 'https://civdotiq.org/api/activitypub/notes/test-1/activity',
  actor: 'https://civdotiq.org/api/activitypub/actor',
  published: '2025-01-15T00:00:00.000Z',
  to: ['https://www.w3.org/ns/activitystreams#Public'],
  cc: ['https://civdotiq.org/api/activitypub/followers'],
  object: {
    type: 'Note',
    id: 'https://civdotiq.org/api/activitypub/notes/test-1',
    attributedTo: 'https://civdotiq.org/api/activitypub/actor',
    published: '2025-01-15T00:00:00.000Z',
    content: '<p>Test</p>',
    url: 'https://congress.gov/test',
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: ['https://civdotiq.org/api/activitypub/followers'],
    tag: [],
  },
};

describe('deliverToFollowers with 410 pruning', () => {
  beforeEach(() => {
    mockFollowers = [];
    fetchCalls.clear();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test('prunes follower on 410 Gone response', async () => {
    mockFollowers = [
      {
        actorId: 'https://dead.social/users/ghost',
        inbox: 'https://dead.social/users/ghost/inbox',
        followedAt: '2025-01-01T00:00:00Z',
      },
      {
        actorId: 'https://alive.social/users/human',
        inbox: 'https://alive.social/users/human/inbox',
        followedAt: '2025-01-01T00:00:00Z',
      },
    ];

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('dead.social')) {
        return Promise.resolve({ ok: false, status: 410 });
      }
      return Promise.resolve({ ok: true, status: 202 });
    }) as jest.Mock;

    const result = await deliverToFollowers(mockActivity);
    expect(result.delivered).toBe(1);
    expect(result.failed).toBe(1);

    // Ghost follower should be pruned
    expect(mockFollowers).toHaveLength(1);
    expect(mockFollowers[0]?.actorId).toBe('https://alive.social/users/human');
  });

  test('does NOT prune on non-410 errors', async () => {
    mockFollowers = [
      {
        actorId: 'https://flaky.social/users/person',
        inbox: 'https://flaky.social/users/person/inbox',
        followedAt: '2025-01-01T00:00:00Z',
      },
    ];

    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as jest.Mock;

    const result = await deliverToFollowers(mockActivity);
    expect(result.failed).toBe(1);
    // Follower should NOT be pruned
    expect(mockFollowers).toHaveLength(1);
  });

  test('successful delivery returns correct count', async () => {
    mockFollowers = [
      {
        actorId: 'https://a.social/users/a',
        inbox: 'https://a.social/users/a/inbox',
        followedAt: '2025-01-01T00:00:00Z',
      },
    ];

    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 202 }) as jest.Mock;

    const result = await deliverToFollowers(mockActivity);
    expect(result.delivered).toBe(1);
    expect(result.failed).toBe(0);
  });
});

describe('GoneError', () => {
  test('captures inbox URL', () => {
    const err = new GoneError('https://dead.social/inbox');
    expect(err.inbox).toBe('https://dead.social/inbox');
    expect(err.name).toBe('GoneError');
    expect(err.message).toContain('410');
  });
});
