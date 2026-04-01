/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

let mockStore: Record<string, unknown> = {};

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: jest.fn().mockImplementation((key: string) => Promise.resolve(mockStore[key] ?? null)),
    set: jest.fn().mockImplementation((key: string, value: unknown) => {
      mockStore[key] = value;
      return Promise.resolve();
    }),
  }),
}));

import { describe, test, expect, beforeEach } from '@jest/globals';
import { addFollower, removeFollower, getFollowerInboxes, getFollowerEntries } from '../followers';

describe('ActivityPub Followers', () => {
  beforeEach(() => {
    mockStore = {};
  });

  test('addFollower stores entry with sharedInbox', async () => {
    await addFollower('actor1', 'https://a.social/inbox', 'https://a.social/shared-inbox');
    const entries = await getFollowerEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.sharedInbox).toBe('https://a.social/shared-inbox');
  });

  test('addFollower works without sharedInbox (backward compat)', async () => {
    await addFollower('actor1', 'https://a.social/inbox');
    const entries = await getFollowerEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.sharedInbox).toBeUndefined();
  });

  test('addFollower does not create duplicates', async () => {
    await addFollower('actor1', 'https://a.social/inbox');
    await addFollower('actor1', 'https://a.social/inbox');
    const entries = await getFollowerEntries();
    expect(entries).toHaveLength(1);
  });

  test('getFollowerInboxes deduplicates via sharedInbox', async () => {
    await addFollower(
      'actor1',
      'https://mastodon.social/users/a/inbox',
      'https://mastodon.social/inbox'
    );
    await addFollower(
      'actor2',
      'https://mastodon.social/users/b/inbox',
      'https://mastodon.social/inbox'
    );
    await addFollower('actor3', 'https://other.social/users/c/inbox', 'https://other.social/inbox');
    const inboxes = await getFollowerInboxes();
    expect(inboxes).toHaveLength(2);
    expect(inboxes).toContain('https://mastodon.social/inbox');
    expect(inboxes).toContain('https://other.social/inbox');
  });

  test('getFollowerInboxes falls back to individual inbox when no sharedInbox', async () => {
    await addFollower('actor1', 'https://solo.social/users/a/inbox');
    await addFollower(
      'actor2',
      'https://mastodon.social/users/b/inbox',
      'https://mastodon.social/inbox'
    );
    const inboxes = await getFollowerInboxes();
    expect(inboxes).toHaveLength(2);
    expect(inboxes).toContain('https://solo.social/users/a/inbox');
    expect(inboxes).toContain('https://mastodon.social/inbox');
  });

  test('removeFollower removes correct entry', async () => {
    await addFollower('actor1', 'https://a.social/inbox');
    await addFollower('actor2', 'https://b.social/inbox');
    await removeFollower('actor1');
    const entries = await getFollowerEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.actorId).toBe('actor2');
  });
});
