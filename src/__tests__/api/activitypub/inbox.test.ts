/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { describe, test, expect } from '@jest/globals';
import type {
  APFollowActivity,
  APUndoActivity,
  APAcceptActivity,
  APOrderedCollection,
} from '@/types/activitypub';

describe('ActivityPub Inbox Types', () => {
  test('Follow activity has correct structure', () => {
    const follow: APFollowActivity = {
      type: 'Follow',
      id: 'https://mastodon.social/users/testuser/follows/1',
      actor: 'https://mastodon.social/users/testuser',
      object: 'https://civdotiq.org/api/activitypub/actor',
    };

    expect(follow.type).toBe('Follow');
    expect(follow.actor).toContain('mastodon.social');
    expect(follow.object).toContain('activitypub/actor');
  });

  test('Undo Follow has nested Follow object', () => {
    const undo: APUndoActivity = {
      type: 'Undo',
      id: 'https://mastodon.social/users/testuser/undos/1',
      actor: 'https://mastodon.social/users/testuser',
      object: {
        type: 'Follow',
        id: 'https://mastodon.social/users/testuser/follows/1',
        actor: 'https://mastodon.social/users/testuser',
        object: 'https://civdotiq.org/api/activitypub/actor',
      },
    };

    expect(undo.type).toBe('Undo');
    expect(undo.object.type).toBe('Follow');
  });

  test('Accept activity wraps original Follow', () => {
    const follow: APFollowActivity = {
      type: 'Follow',
      id: 'https://mastodon.social/users/testuser/follows/1',
      actor: 'https://mastodon.social/users/testuser',
      object: 'https://civdotiq.org/api/activitypub/actor',
    };

    const accept: APAcceptActivity = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Accept',
      id: 'https://civdotiq.org/api/activitypub/actor/accepts/123',
      actor: 'https://civdotiq.org/api/activitypub/actor',
      object: follow,
    };

    expect(accept.type).toBe('Accept');
    expect(accept.object).toBe(follow);
  });

  test('OrderedCollection has correct pagination structure', () => {
    const collection: APOrderedCollection = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'OrderedCollection',
      id: 'https://civdotiq.org/api/activitypub/outbox',
      totalItems: 42,
      first: 'https://civdotiq.org/api/activitypub/outbox?page=0',
      last: 'https://civdotiq.org/api/activitypub/outbox?page=2',
    };

    expect(collection.type).toBe('OrderedCollection');
    expect(collection.totalItems).toBe(42);
    expect(collection.first).toContain('page=0');
  });
});
