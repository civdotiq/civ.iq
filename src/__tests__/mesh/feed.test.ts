/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Civic Mesh Nostr Feed Publishing (Phase 5).
 *
 * Tests publishCivicIntelligence() and entityTypeFromId().
 */

// Mock logger
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock Nostr keys
const mockGetKeypair = jest.fn();
jest.mock('@/lib/nostr/keys', () => ({
  getNostrKeypair: () => mockGetKeypair(),
}));

// Mock Nostr relay pool
const mockPublish = jest.fn();
jest.mock('@/lib/nostr/relay-pool', () => ({
  publishToRelays: (...args: unknown[]) => mockPublish(...args),
}));

// Mock nostr-tools finalizeEvent
jest.mock('nostr-tools/pure', () => ({
  finalizeEvent: (event: Record<string, unknown>, _key: Uint8Array) => ({
    ...event,
    id: 'mock-event-id-123',
    sig: 'mock-sig',
    pubkey: 'mock-pubkey',
  }),
}));

import {
  publishCivicIntelligence,
  retractCivicIntelligence,
  entityTypeFromId,
} from '@/lib/mesh/protocol/feed';
import type { InsightBase } from '@/lib/intelligence/types';

const mockInsight: InsightBase = {
  confidence: 0.85,
  dataAsOf: '2026-03-17T00:00:00Z',
  methodology: 'Test methodology',
  disclaimer: 'Test disclaimer',
  lastAnalyzedAt: '2026-03-17T00:00:00Z',
  source: 'statistical-fallback',
};

describe('entityTypeFromId', () => {
  it('extracts entity type prefix', () => {
    expect(entityTypeFromId('rep:A000360')).toBe('rep');
    expect(entityTypeFromId('bill:119-hr-1234')).toBe('bill');
    expect(entityTypeFromId('cmte:SSFI')).toBe('cmte');
  });

  it('returns null for invalid IDs', () => {
    expect(entityTypeFromId('')).toBeNull();
    expect(entityTypeFromId('nocolon')).toBeNull();
    expect(entityTypeFromId(':empty-prefix')).toBeNull();
  });
});

describe('publishCivicIntelligence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips low-confidence insights', async () => {
    const lowConfidence = { ...mockInsight, confidence: 0.3 };
    const result = await publishCivicIntelligence('rep:A000360', 'vote-finance', lowConfidence, {});
    expect(result).toBeNull();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('skips when no Nostr keypair configured', async () => {
    mockGetKeypair.mockReturnValue(null);
    const result = await publishCivicIntelligence('rep:A000360', 'vote-finance', mockInsight, {});
    expect(result).toBeNull();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('publishes valid insight and returns event ID', async () => {
    mockGetKeypair.mockReturnValue({
      privateKey: new Uint8Array(32),
      publicKey: 'mock-pubkey',
    });
    mockPublish.mockResolvedValue({
      successCount: 3,
      failureCount: 0,
      successes: ['relay1', 'relay2', 'relay3'],
      failures: [],
      eventId: 'mock-event-id-123',
    });

    const result = await publishCivicIntelligence('rep:A000360', 'vote-finance', mockInsight, {
      overallCorrelation: 0.72,
    });

    expect(result).toBe('mock-event-id-123');
    expect(mockPublish).toHaveBeenCalledTimes(1);

    // Verify the event structure
    const signedEvent = mockPublish.mock.calls[0][0];
    expect(signedEvent.kind).toBe(30078);
    expect(signedEvent.tags).toEqual(
      expect.arrayContaining([
        ['d', 'civiq:intelligence:rep:A000360:vote-finance'],
        ['t', 'civic-intelligence'],
        ['t', 'vote-finance'],
        ['entity', 'rep:A000360'],
        ['confidence', '0.85'],
      ])
    );

    // Verify content is valid JSON with payload
    const content = JSON.parse(signedEvent.content);
    expect(content.entityId).toBe('rep:A000360');
    expect(content.insightType).toBe('vote-finance');
    expect(content.payload.overallCorrelation).toBe(0.72);
    expect(content.disclaimer).toBe('Test disclaimer');
  });

  it('returns null on publish failure', async () => {
    mockGetKeypair.mockReturnValue({
      privateKey: new Uint8Array(32),
      publicKey: 'mock-pubkey',
    });
    mockPublish.mockRejectedValue(new Error('Network error'));

    const result = await publishCivicIntelligence('rep:A000360', 'vote-finance', mockInsight, {});
    expect(result).toBeNull();
  });

  it('publishes with correct NIP-78 kind (30078)', async () => {
    mockGetKeypair.mockReturnValue({
      privateKey: new Uint8Array(32),
      publicKey: 'mock-pubkey',
    });
    mockPublish.mockResolvedValue({
      successCount: 3,
      failureCount: 0,
      successes: [],
      failures: [],
      eventId: 'test',
    });

    await publishCivicIntelligence('rep:A000360', 'test', mockInsight, {});
    const event = mockPublish.mock.calls[0][0];
    expect(event.kind).toBe(30078);
  });
});

describe('retractCivicIntelligence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a Kind 5 deletion event referencing the original event ID', async () => {
    mockGetKeypair.mockReturnValue({
      privateKey: new Uint8Array(32),
      publicKey: 'mock-pubkey',
    });
    mockPublish.mockResolvedValue({
      successCount: 3,
      failureCount: 0,
      successes: ['relay1', 'relay2', 'relay3'],
      failures: [],
      eventId: 'mock-event-id-123',
    });

    const result = await retractCivicIntelligence(
      'abc123def456',
      'Data correction: updated source'
    );

    expect(result).toBe('mock-event-id-123');
    expect(mockPublish).toHaveBeenCalledTimes(1);

    const signedEvent = mockPublish.mock.calls[0][0];
    expect(signedEvent.kind).toBe(5);
    expect(signedEvent.tags).toEqual([['e', 'abc123def456']]);
    expect(signedEvent.content).toBe('Data correction: updated source');
  });

  it('signs the event before publishing', async () => {
    mockGetKeypair.mockReturnValue({
      privateKey: new Uint8Array(32),
      publicKey: 'mock-pubkey',
    });
    mockPublish.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      successes: ['relay1'],
      failures: [],
      eventId: 'mock-event-id-123',
    });

    await retractCivicIntelligence('abc123', 'reason');

    const signedEvent = mockPublish.mock.calls[0][0];
    expect(signedEvent.id).toBe('mock-event-id-123');
    expect(signedEvent.sig).toBe('mock-sig');
    expect(signedEvent.pubkey).toBe('mock-pubkey');
  });

  it('returns null when no keypair is configured', async () => {
    mockGetKeypair.mockReturnValue(null);

    const result = await retractCivicIntelligence('abc123', 'reason');

    expect(result).toBeNull();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('returns null on publish failure', async () => {
    mockGetKeypair.mockReturnValue({
      privateKey: new Uint8Array(32),
      publicKey: 'mock-pubkey',
    });
    mockPublish.mockRejectedValue(new Error('Network error'));

    const result = await retractCivicIntelligence('abc123', 'reason');

    expect(result).toBeNull();
  });
});
