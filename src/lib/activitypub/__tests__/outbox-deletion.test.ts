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
    exists: jest.fn().mockImplementation((key: string) => Promise.resolve(key in mockStore)),
    delete: jest.fn().mockImplementation((key: string) => {
      delete mockStore[key];
      return Promise.resolve();
    }),
  }),
}));

import { describe, test, expect, beforeEach } from '@jest/globals';
import { createDeleteActivity, removeFromOutbox } from '../outbox';

describe('createDeleteActivity', () => {
  test('produces Delete activity with Tombstone', () => {
    const noteId = 'https://civdotiq.org/api/activitypub/notes/test-1';
    const activity = createDeleteActivity(noteId);

    expect(activity.type).toBe('Delete');
    expect(activity.object.type).toBe('Tombstone');
    expect(activity.object.id).toBe(noteId);
    expect(activity['@context']).toBe('https://www.w3.org/ns/activitystreams');
    expect(activity.to).toContain('https://www.w3.org/ns/activitystreams#Public');
  });
});

describe('removeFromOutbox', () => {
  beforeEach(() => {
    mockStore = {};
  });

  test('removes activity and index entry', async () => {
    const noteId = 'https://civdotiq.org/api/activitypub/notes/test-1';
    const activityKey = `activitypub:outbox:${noteId}`;
    const indexKey = 'activitypub:outbox:index';

    // Set up mock data
    mockStore[activityKey] = { type: 'Create', id: `${noteId}/activity` };
    mockStore[indexKey] = [
      JSON.stringify({ id: noteId, ts: 1000 }),
      JSON.stringify({ id: 'https://civdotiq.org/api/activitypub/notes/other', ts: 900 }),
    ];

    await removeFromOutbox(noteId);

    expect(mockStore[activityKey]).toBeUndefined();
    const index = mockStore[indexKey] as string[];
    expect(index).toHaveLength(1);
    expect(JSON.parse(index[0]!).id).not.toBe(noteId);
  });

  test('handles missing index gracefully', async () => {
    const noteId = 'https://civdotiq.org/api/activitypub/notes/nonexistent';
    await removeFromOutbox(noteId);
    // Should not throw
  });
});
