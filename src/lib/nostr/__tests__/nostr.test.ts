/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Nostr Publishing Layer Tests
 *
 * Covers key management, event creation/signing, and configuration.
 * nostr-tools uses ESM-only @noble/curves, so we mock at module boundaries.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

// Mock nostr-tools before any module imports that depend on it
jest.mock('nostr-tools/pure', () => ({
  generateSecretKey: () => {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) bytes[i] = i + 1;
    return bytes;
  },
  getPublicKey: (sk: Uint8Array) => {
    return Array.from(sk)
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');
  },
  finalizeEvent: (event: Record<string, unknown>, _sk: Uint8Array) => ({
    ...event,
    id: 'mock-event-id-abc123',
    pubkey: 'mock-pubkey-xyz',
    sig: 'mock-sig-000',
  }),
}));

jest.mock('nostr-tools/pool', () => ({
  SimplePool: jest.fn().mockImplementation(() => ({
    publish: jest.fn().mockResolvedValue(undefined),
    close: jest.fn(),
  })),
}));

jest.mock('ws', () => jest.fn());

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import type { CivicEvent } from '@/types/nostr';

describe('Nostr Key Management', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('getNostrKeypair returns null when env not set', () => {
    delete process.env.NOSTR_PRIVATE_KEY;
    const { getNostrKeypair } = require('../keys');
    const result = getNostrKeypair();
    expect(result).toBeNull();
  });

  test('getNostrKeypair returns null for empty string', () => {
    process.env.NOSTR_PRIVATE_KEY = '';
    const { getNostrKeypair } = require('../keys');
    const result = getNostrKeypair();
    expect(result).toBeNull();
  });

  test('getNostrKeypair returns null for invalid key length', () => {
    process.env.NOSTR_PRIVATE_KEY = 'abcdef1234';
    const { getNostrKeypair } = require('../keys');
    const result = getNostrKeypair();
    expect(result).toBeNull();
  });

  test('getNostrKeypair returns keypair for valid 64-char hex key', () => {
    process.env.NOSTR_PRIVATE_KEY = 'a'.repeat(64);
    const { getNostrKeypair } = require('../keys');
    const result = getNostrKeypair();
    expect(result).not.toBeNull();
    expect(result.privateKey).toBeInstanceOf(Uint8Array);
    expect(result.privateKey.length).toBe(32);
    expect(typeof result.publicKey).toBe('string');
    expect(result.publicKey.length).toBeGreaterThan(0);
  });

  test('generateNostrKeypair returns valid hex keypair', () => {
    const { generateNostrKeypair } = require('../keys');
    const keypair = generateNostrKeypair();
    expect(typeof keypair.privateKey).toBe('string');
    expect(typeof keypair.publicKey).toBe('string');
    expect(keypair.privateKey.length).toBe(64);
    expect(keypair.publicKey.length).toBe(64);
    expect(keypair.privateKey).toMatch(/^[0-9a-f]{64}$/);
    expect(keypair.publicKey).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('Nostr Event Creation', () => {
  const mockPrivateKey = new Uint8Array(32).fill(1);

  const baseCivicEvent: CivicEvent = {
    type: 'bill-action',
    id: 'hr1234-119-action-2025-01-15',
    timestamp: 1705276800,
    title: 'H.R. 1234: Passed House',
    summary: 'Test Bill Title — Passed House',
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

  test('createSignedCivicEvent creates event with kind 30023 (NIP-23)', () => {
    const { createSignedCivicEvent } = require('../events');
    const signed = createSignedCivicEvent(baseCivicEvent, mockPrivateKey);
    expect(signed.kind).toBe(30023);
  });

  test('event has correct d tag format: civiq:{type}:{id}', () => {
    const { createSignedCivicEvent } = require('../events');
    const signed = createSignedCivicEvent(baseCivicEvent, mockPrivateKey);
    const dTag = signed.tags.find((t: string[]) => t[0] === 'd');
    expect(dTag).toBeDefined();
    expect(dTag[1]).toBe('civiq:bill-action:hr1234-119-action-2025-01-15');
  });

  test('event content is Markdown with title, summary, and structured data', () => {
    const { createSignedCivicEvent } = require('../events');
    const signed = createSignedCivicEvent(baseCivicEvent, mockPrivateKey);
    const content: string = signed.content;

    // Markdown structure
    expect(content).toContain('# H.R. 1234: Passed House');
    expect(content).toContain('Test Bill Title — Passed House');
    expect(content).toContain('**Type**: bill-action');
    expect(content).toContain('[congress.gov]');
    expect(content).toContain('<details><summary>Structured Data</summary>');

    // Structured data in fenced JSON block
    expect(content).toContain('```json');
    expect(content).toContain('"platform": "civiq"');
    expect(content).toContain('"version": 1');
  });

  test('all CivicEvent tags are included as t tags', () => {
    const { createSignedCivicEvent } = require('../events');
    const signed = createSignedCivicEvent(baseCivicEvent, mockPrivateKey);
    const tTags = signed.tags.filter((t: string[]) => t[0] === 't').map((t: string[]) => t[1]);
    expect(tTags).toContain('bill-action');
    expect(tTags).toContain('legislation');
    expect(tTags).toContain('house');
  });

  test('source URL included as r tag', () => {
    const { createSignedCivicEvent } = require('../events');
    const signed = createSignedCivicEvent(baseCivicEvent, mockPrivateKey);
    const rTag = signed.tags.find((t: string[]) => t[0] === 'r');
    expect(rTag).toBeDefined();
    expect(rTag[1]).toBe('https://www.congress.gov/bill/119th-congress/house-bill/1234');
  });

  test('event has title and summary tags', () => {
    const { createSignedCivicEvent } = require('../events');
    const signed = createSignedCivicEvent(baseCivicEvent, mockPrivateKey);
    const titleTag = signed.tags.find((t: string[]) => t[0] === 'title');
    const summaryTag = signed.tags.find((t: string[]) => t[0] === 'summary');
    expect(titleTag[1]).toBe('H.R. 1234: Passed House');
    expect(summaryTag[1]).toBe('Test Bill Title — Passed House');
  });

  test('event has published_at tag matching timestamp', () => {
    const { createSignedCivicEvent } = require('../events');
    const signed = createSignedCivicEvent(baseCivicEvent, mockPrivateKey);
    const pubTag = signed.tags.find((t: string[]) => t[0] === 'published_at');
    expect(pubTag[1]).toBe(String(baseCivicEvent.timestamp));
  });

  test('event works with all civic event types', () => {
    const { createSignedCivicEvent } = require('../events');
    const types = [
      'bill-action',
      'bill-introduced',
      'vote-record',
      'executive-order',
      'comment-period',
      'hearing',
    ] as const;

    for (const type of types) {
      const event: CivicEvent = {
        ...baseCivicEvent,
        type,
        id: `test-${type}-1`,
      };
      const signed = createSignedCivicEvent(event, mockPrivateKey);
      const dTag = signed.tags.find((t: string[]) => t[0] === 'd');
      expect(dTag[1]).toBe(`civiq:${type}:test-${type}-1`);
    }
  });
});

describe('Nostr Configuration', () => {
  test('default relays are non-empty', () => {
    const { nostrConfig } = require('@/config/nostr.config');
    expect(nostrConfig.relays.length).toBeGreaterThan(0);
  });

  test('config has required properties', () => {
    const { nostrConfig } = require('@/config/nostr.config');
    expect(nostrConfig.eventKind).toBe(30023);
    expect(nostrConfig.dedupPrefix).toBe('nostr:published:');
    expect(nostrConfig.dedupTTL).toBeGreaterThan(0);
    expect(nostrConfig.publishTimeout).toBeGreaterThan(0);
    expect(nostrConfig.minRelaySuccess).toBeGreaterThan(0);
  });

  test('dedup TTL is 30 days', () => {
    const { nostrConfig } = require('@/config/nostr.config');
    expect(nostrConfig.dedupTTL).toBe(30 * 24 * 60 * 60);
  });

  test('relays are valid WebSocket URLs', () => {
    const { nostrConfig } = require('@/config/nostr.config');
    for (const relay of nostrConfig.relays) {
      expect(relay).toMatch(/^wss:\/\//);
    }
  });
});
