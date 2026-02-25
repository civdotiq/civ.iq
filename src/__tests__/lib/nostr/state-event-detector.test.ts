/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Legislature Event Detector Tests
 *
 * Tests detection of state bill introductions, actions, and votes
 * from OpenStates API for Nostr publishing.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: jest.fn().mockReturnValue({
    exists: jest.fn().mockResolvedValue(false),
    keys: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
  }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

const mockBill = {
  id: 'ocd-bill/test-123',
  identifier: 'SB 100',
  title: 'An act relating to education funding',
  session: '2025',
  classification: ['bill'],
  from_organization: { classification: 'upper' },
  jurisdiction: { name: 'California' },
  sponsorships: [{ name: 'Sen. Smith', primary: true }],
  actions: [
    {
      description: 'Referred to Committee on Education',
      date: '2025-02-01',
      classification: ['referral-committee'],
    },
  ],
  votes: [
    {
      id: 'ocd-vote/vote-456',
      motion_text: 'Do Pass',
      start_date: '2025-02-15',
      result: 'pass',
      counts: [
        { option: 'yes', value: 30 },
        { option: 'no', value: 10 },
      ],
    },
  ],
  first_action_date: '2025-01-15',
  latest_action_date: '2025-02-01',
  latest_action_description: 'Referred to Committee on Education',
  openstates_url: 'https://openstates.org/ca/bills/2025/SB100/',
  created_at: '2025-01-15T00:00:00Z',
  updated_at: '2025-02-01T00:00:00Z',
};

describe('State Event Detector', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, OPENSTATES_API_KEY: 'test-key' };
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('returns empty array when OpenStates API key is missing', async () => {
    delete process.env.OPENSTATES_API_KEY;

    const { detectStateEvents } = require('@/lib/nostr/state-event-detector');
    const events = await detectStateEvents();

    expect(events).toHaveLength(0);
  });

  test('detects state bill introductions', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [mockBill], pagination: { total_items: 1 } }),
    });

    const { detectStateEvents } = require('@/lib/nostr/state-event-detector');
    const events = await detectStateEvents();

    const introEvents = events.filter((e: { type: string }) => e.type === 'state-bill-introduced');
    expect(introEvents.length).toBeGreaterThan(0);
    expect(introEvents[0].title).toContain('California');
    expect(introEvents[0].title).toContain('SB 100');
  });

  test('detects state bill actions', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [mockBill], pagination: { total_items: 1 } }),
    });

    const { detectStateEvents } = require('@/lib/nostr/state-event-detector');
    const events = await detectStateEvents();

    const actionEvents = events.filter((e: { type: string }) => e.type === 'state-bill-action');
    expect(actionEvents.length).toBeGreaterThan(0);
    expect(actionEvents[0].title).toContain('Referred to Committee');
  });

  test('detects state votes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [mockBill], pagination: { total_items: 1 } }),
    });

    const { detectStateEvents } = require('@/lib/nostr/state-event-detector');
    const events = await detectStateEvents();

    const voteEvents = events.filter((e: { type: string }) => e.type === 'state-vote');
    expect(voteEvents.length).toBeGreaterThan(0);
    expect(voteEvents[0].summary).toContain('30 yeas');
  });

  test('skips already-published events via dedup', async () => {
    const { getRedisCache } = require('@/lib/cache/redis-client');
    getRedisCache.mockReturnValue({
      exists: jest.fn().mockResolvedValue(true),
      keys: jest.fn().mockResolvedValue([]),
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [mockBill], pagination: { total_items: 1 } }),
    });

    const { detectStateEvents } = require('@/lib/nostr/state-event-detector');
    const events = await detectStateEvents();

    expect(events).toHaveLength(0);
  });

  test('uses correct d-tag pattern for state events', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [mockBill], pagination: { total_items: 1 } }),
    });

    const { detectStateEvents } = require('@/lib/nostr/state-event-detector');
    const events = await detectStateEvents();

    const introEvent = events.find((e: { type: string }) => e.type === 'state-bill-introduced');
    expect(introEvent?.id).toMatch(/^state-bill-intro-/);
    expect(introEvent?.source.api).toBe('openstates.org');
  });

  test('handles API errors gracefully per state', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { detectStateEvents } = require('@/lib/nostr/state-event-detector');
    const events = await detectStateEvents();

    expect(events).toHaveLength(0);
  });
});
