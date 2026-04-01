/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

const mockSet = jest.fn().mockResolvedValue(undefined);
const mockExists = jest.fn().mockResolvedValue(false);
const mockDelete = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    set: mockSet,
    exists: mockExists,
    get: jest.fn().mockResolvedValue(null),
    delete: mockDelete,
  }),
}));

jest.mock('nostr-tools/pure', () => ({
  finalizeEvent: (event: Record<string, unknown>) => ({
    ...event,
    id: 'mock-nostr-event-id',
    pubkey: 'mock-pubkey',
    sig: 'mock-sig',
  }),
  getPublicKey: () => 'mock-pubkey-hex',
}));

jest.mock('nostr-tools/nip19', () => ({
  naddrEncode: () => 'naddr1mock',
}));

jest.mock('nostr-tools/pool', () => ({
  SimplePool: jest.fn().mockImplementation(() => ({
    publish: jest.fn().mockReturnValue([Promise.resolve()]),
    destroy: jest.fn(),
  })),
}));

jest.mock('ws', () => jest.fn());

jest.mock('@/lib/activitypub/outbox', () => ({
  civicEventToNote: jest.fn().mockReturnValue({
    type: 'Note',
    id: 'https://civdotiq.org/api/activitypub/notes/test-1',
    attributedTo: 'https://civdotiq.org/api/activitypub/actor',
    published: '2025-01-15T00:00:00.000Z',
    content: '<p>Test</p>',
    url: 'https://congress.gov/test',
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: ['https://civdotiq.org/api/activitypub/followers'],
    tag: [],
  }),
  wrapInCreate: jest.fn().mockReturnValue({ type: 'Create', id: 'test-create' }),
  wrapInUpdate: jest.fn().mockReturnValue({ type: 'Update', id: 'test-update' }),
  addToOutbox: jest.fn().mockResolvedValue(undefined),
  isInOutbox: jest.fn().mockResolvedValue(false),
  createDeleteActivity: jest.fn().mockReturnValue({
    type: 'Delete',
    id: 'test-delete',
    object: { type: 'Tombstone', id: 'test-note' },
  }),
  removeFromOutbox: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/activitypub/delivery', () => ({
  deliverToFollowers: jest.fn().mockResolvedValue({ delivered: 2, failed: 0 }),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { describe, test, expect, beforeEach } from '@jest/globals';
import { publishAndFederate, computeContentHash } from '../publish-and-federate';
import type { CivicEvent } from '@/types/nostr';

const mockEvent: CivicEvent = {
  type: 'bill-action',
  id: 'hr1234-119-action-2025-01-15',
  timestamp: 1705276800,
  title: 'H.R. 1234: Passed House',
  summary: 'Test Bill — Passed House',
  tags: ['legislation', 'house'],
  source: {
    url: 'https://www.congress.gov/bill/119th-congress/house-bill/1234',
    api: 'congress.gov',
  },
  data: {
    billId: 'hr1234-119',
    billType: 'hr',
    billNumber: '1234',
    congress: 119,
    actionText: 'Passed House',
    actionDate: '2025-01-15',
    chamber: 'House',
  },
};

describe('publishAndFederate', () => {
  const privateKey = new Uint8Array(32).fill(1);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('publishes events and returns correct counts', async () => {
    const result = await publishAndFederate([mockEvent], privateKey);
    expect(result.eventsPublished).toBe(1);
    expect(result.eventsFailed).toBe(0);
    expect(result.activityPubAdded).toBe(1);
    expect(result.activityPubDelivered).toBe(2);
    expect(result.relayResults).toHaveLength(1);
  });

  test('records enhanced DedupEntry with content hash', async () => {
    await publishAndFederate([mockEvent], privateKey);
    expect(mockSet).toHaveBeenCalledWith(
      expect.stringContaining('nostr:published:'),
      expect.objectContaining({
        eventId: mockEvent.id,
        nostrEventId: 'mock-nostr-event-id',
        contentHash: expect.any(String),
        noteId: expect.stringContaining('activitypub/notes'),
      }),
      expect.any(Number)
    );
  });

  test('returns empty results for empty input', async () => {
    const result = await publishAndFederate([], privateKey);
    expect(result.eventsPublished).toBe(0);
    expect(result.eventsFailed).toBe(0);
    expect(result.relayResults).toHaveLength(0);
  });

  test('handles corrections by publishing deletion then re-publishing', async () => {
    const correctedEvent: CivicEvent = {
      ...mockEvent,
      _correction: {
        originalNostrEventId: 'old-nostr-id-123',
        originalNoteId: 'https://civdotiq.org/api/activitypub/notes/old-1',
      },
    };

    const result = await publishAndFederate([correctedEvent], privateKey);
    expect(result.correctionsPublished).toBe(1);
    expect(result.eventsPublished).toBe(1);

    // Should have delivered Delete activity
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const outbox = require('@/lib/activitypub/outbox');
    expect(outbox.createDeleteActivity).toHaveBeenCalledWith(
      'https://civdotiq.org/api/activitypub/notes/old-1'
    );
    expect(outbox.removeFromOutbox).toHaveBeenCalledWith(
      'https://civdotiq.org/api/activitypub/notes/old-1'
    );
  });
});

describe('computeContentHash', () => {
  test('produces consistent hash for same data', () => {
    const data = { billId: 'hr1234', actionText: 'Passed House' };
    const hash1 = computeContentHash(data);
    const hash2 = computeContentHash(data);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  test('produces different hash for different data', () => {
    const hash1 = computeContentHash({ text: 'Passed House' });
    const hash2 = computeContentHash({ text: 'Passed Senate' });
    expect(hash1).not.toBe(hash2);
  });
});
