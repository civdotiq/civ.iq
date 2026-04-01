/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    exists: jest.fn().mockResolvedValue(false),
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
  }),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { describe, test, expect } from '@jest/globals';
import { checkStateStaleness } from '../state-event-detector';

// Minimal mock bill structure for staleness checks
function makeBill(updatedAt: string) {
  return {
    id: 'test-bill',
    identifier: 'HB 1',
    title: 'Test',
    session: '2025',
    classification: [],
    from_organization: null,
    jurisdiction: { name: 'Test State' },
    sponsorships: [],
    actions: [],
    votes: [],
    first_action_date: null,
    latest_action_date: null,
    latest_action_description: null,
    openstates_url: 'https://openstates.org/test',
    created_at: updatedAt,
    updated_at: updatedAt,
  };
}

describe('checkStateStaleness', () => {
  test('recent updated_at is NOT flagged stale', () => {
    const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago
    const result = checkStateStaleness('ca', [makeBill(recentDate)]);
    expect(result.stale).toBe(false);
    expect(result.state).toBe('CA');
    expect(result.billsChecked).toBe(1);
  });

  test('old updated_at (>14 days) IS flagged stale', () => {
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
    const result = checkStateStaleness('ny', [makeBill(oldDate)]);
    expect(result.stale).toBe(true);
    expect(result.state).toBe('NY');
  });

  test('empty bill list is NOT flagged stale', () => {
    const result = checkStateStaleness('tx', []);
    expect(result.stale).toBe(false);
    expect(result.lastUpdate).toBeNull();
    expect(result.billsChecked).toBe(0);
  });

  test('uses most recent updated_at across multiple bills', () => {
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const result = checkStateStaleness('fl', [makeBill(oldDate), makeBill(recentDate)]);
    expect(result.stale).toBe(false);
    expect(result.billsChecked).toBe(2);
  });
});
