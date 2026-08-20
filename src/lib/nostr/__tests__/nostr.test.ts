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

jest.mock('nostr-tools/nip19', () => ({
  naddrEncode: () => 'naddr1mock',
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

describe('Nostr Deletion Event (Kind 5, NIP-09)', () => {
  const mockPrivateKey = new Uint8Array(32).fill(1);

  test('creates Kind 5 deletion event', () => {
    const { createDeletionEvent } = require('../events');
    const signed = createDeletionEvent(
      'original-event-id-123',
      'Data corrected upstream',
      mockPrivateKey
    );
    expect(signed.kind).toBe(5);
  });

  test('has e-tag referencing original event', () => {
    const { createDeletionEvent } = require('../events');
    const signed = createDeletionEvent('original-event-id-123', 'Data corrected', mockPrivateKey);
    const eTag = signed.tags.find((t: string[]) => t[0] === 'e');
    expect(eTag).toBeDefined();
    expect(eTag[1]).toBe('original-event-id-123');
  });

  test('content is the reason string', () => {
    const { createDeletionEvent } = require('../events');
    const signed = createDeletionEvent('id-abc', 'Upstream correction', mockPrivateKey);
    expect(signed.content).toBe('Upstream correction');
  });
});

describe('Nostr Alert Event (Kind 1)', () => {
  const mockPrivateKey = new Uint8Array(32).fill(1);
  const mockPubkey = 'abcd1234';
  const mockArticleEventId = 'mock-article-event-id';

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

  test('creates Kind 1 event', () => {
    const { createSignedAlertEvent } = require('../events');
    const signed = createSignedAlertEvent(
      baseCivicEvent,
      mockPrivateKey,
      mockArticleEventId,
      mockPubkey
    );
    expect(signed.kind).toBe(1);
  });

  test('includes naddr reference in content', () => {
    const { createSignedAlertEvent } = require('../events');
    const signed = createSignedAlertEvent(
      baseCivicEvent,
      mockPrivateKey,
      mockArticleEventId,
      mockPubkey
    );
    expect(signed.content).toContain('nostr:naddr1mock');
  });

  test('has e-tag referencing article with mention marker', () => {
    const { createSignedAlertEvent } = require('../events');
    const signed = createSignedAlertEvent(
      baseCivicEvent,
      mockPrivateKey,
      mockArticleEventId,
      mockPubkey
    );
    const eTag = signed.tags.find((t: string[]) => t[0] === 'e');
    expect(eTag).toBeDefined();
    expect(eTag[1]).toBe(mockArticleEventId);
    expect(eTag[3]).toBe('mention');
  });

  test('includes event tags as t tags plus civictech', () => {
    const { createSignedAlertEvent } = require('../events');
    const signed = createSignedAlertEvent(
      baseCivicEvent,
      mockPrivateKey,
      mockArticleEventId,
      mockPubkey
    );
    const tTags = signed.tags.filter((t: string[]) => t[0] === 't').map((t: string[]) => t[1]);
    expect(tTags).toContain('legislation');
    expect(tTags).toContain('house');
    expect(tTags).toContain('civictech');
  });

  test('content includes title and summary', () => {
    const { createSignedAlertEvent } = require('../events');
    const signed = createSignedAlertEvent(
      baseCivicEvent,
      mockPrivateKey,
      mockArticleEventId,
      mockPubkey
    );
    expect(signed.content).toContain('H.R. 1234: Passed House');
    expect(signed.content).toContain('Test Bill Title — Passed House');
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

describe('canonicalEventUrl', () => {
  const base = 'https://civdotiq.org';

  function makeEvent(type: CivicEvent['type'], data: CivicEvent['data']): CivicEvent {
    return {
      type,
      id: 'test-id',
      timestamp: 1755640800,
      title: 'Test',
      summary: 'Test summary',
      tags: [],
      source: { url: 'https://example.gov', api: 'test' },
      data,
    };
  }

  test('federal bills use the canonical congress-type-number slug', () => {
    const { canonicalEventUrl } = require('@/lib/nostr/events');
    const event = makeEvent('bill-introduced', {
      billId: 'hr877-119',
      billType: 'HR',
      billNumber: '877',
      congress: 119,
      title: 'Example Act',
      sponsor: 'Rep. Example',
      chamber: 'House',
      introducedDate: '2026-08-01',
    });
    expect(canonicalEventUrl(event)).toBe(`${base}/bill/119-hr-877`);
  });

  test('votes link to /vote/{voteId} for both chambers', () => {
    const { canonicalEventUrl } = require('@/lib/nostr/events');
    const event = makeEvent('vote-record', {
      voteId: 'senate-119-2-42',
      chamber: 'Senate',
      rollNumber: 42,
      question: 'On Passage',
      result: 'Passed',
      date: '2026-08-01',
      yeas: 60,
      nays: 40,
      notVoting: 0,
    });
    expect(canonicalEventUrl(event)).toBe(`${base}/vote/senate-119-2-42`);
  });

  test('executive orders and comment periods link to /regulations/{documentNumber}', () => {
    const { canonicalEventUrl } = require('@/lib/nostr/events');
    const event = makeEvent('executive-order', {
      documentNumber: '2026-12345',
      title: 'Test EO',
      summary: null,
      agency: 'Executive Office',
      url: 'https://federalregister.gov/d/2026-12345',
    });
    expect(canonicalEventUrl(event)).toBe(`${base}/regulations/2026-12345`);
  });

  test('state bills use lowercase state and base64url ocd id', () => {
    const { canonicalEventUrl } = require('@/lib/nostr/events');
    const { encodeBase64Url } = require('@/lib/url-encoding');
    const ocdId = 'ocd-bill/abc-123-def';
    const event = makeEvent('state-bill-introduced', {
      billId: ocdId,
      identifier: 'AB 181',
      state: 'CA',
      title: 'Example State Act',
      chamber: 'lower',
      session: '2026',
      sponsor: 'Asm. Example',
      introducedDate: '2026-08-01',
      openstatesUrl: 'https://openstates.org/ca/bills/2026/AB181',
    });
    expect(canonicalEventUrl(event)).toBe(`${base}/state-bills/ca/${encodeBase64Url(ocdId)}`);
  });

  test('hearings and state votes have no canonical page', () => {
    const { canonicalEventUrl } = require('@/lib/nostr/events');
    const event = makeEvent('hearing', {
      packageId: 'CHRG-119hhrg12345',
      title: 'Test Hearing',
      congress: 119,
      chamber: 'House',
      dateIssued: '2026-08-01',
      url: 'https://govinfo.gov/x',
    });
    expect(canonicalEventUrl(event)).toBeNull();
  });
});
