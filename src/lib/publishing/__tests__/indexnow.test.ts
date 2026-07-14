/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { eventToCanonicalPath, submitToIndexNow } from '@/lib/publishing/indexnow';
import type { CivicEvent } from '@/types/nostr';

function makeEvent(type: CivicEvent['type'], data: unknown): CivicEvent {
  return {
    type,
    id: 'evt-1',
    timestamp: 0,
    title: 't',
    summary: 's',
    tags: [],
    source: { url: 'https://www.congress.gov/x', api: 'test' },
    data: data as CivicEvent['data'],
  };
}

describe('eventToCanonicalPath', () => {
  it('maps federal bill events to the canonical bill path', () => {
    const introduced = makeEvent('bill-introduced', {
      billId: 'b',
      billType: 'H.R.',
      billNumber: '1234',
      congress: 119,
    });
    expect(eventToCanonicalPath(introduced)).toBe('/bill/119-hr-1234');

    const action = makeEvent('bill-action', {
      billId: 'b',
      billType: 's',
      billNumber: '5',
      congress: 118,
    });
    expect(eventToCanonicalPath(action)).toBe('/bill/118-s-5');
  });

  it('maps vote-record to the vote path', () => {
    const vote = makeEvent('vote-record', { voteId: '119-2-h456' });
    expect(eventToCanonicalPath(vote)).toBe('/vote/119-2-h456');
  });

  it('maps state bill events to the state-bills path (lowercased state)', () => {
    const stateBill = makeEvent('state-bill-introduced', {
      billId: 'HB 100',
      state: 'MI',
    });
    expect(eventToCanonicalPath(stateBill)).toBe('/state-bills/mi/HB%20100');
  });

  it('returns null for event types with no indexable detail page', () => {
    expect(eventToCanonicalPath(makeEvent('executive-order', {}))).toBeNull();
    expect(eventToCanonicalPath(makeEvent('comment-period', {}))).toBeNull();
    expect(eventToCanonicalPath(makeEvent('hearing', {}))).toBeNull();
    expect(eventToCanonicalPath(makeEvent('state-vote', {}))).toBeNull();
  });
});

describe('submitToIndexNow', () => {
  const original = process.env.INDEXNOW_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.INDEXNOW_KEY;
    else process.env.INDEXNOW_KEY = original;
  });

  it('is a no-op when INDEXNOW_KEY is unset', async () => {
    delete process.env.INDEXNOW_KEY;
    const result = await submitToIndexNow(['https://civdotiq.org/bill/119-hr-1']);
    expect(result).toEqual({ submitted: 0, skipped: true, reason: 'no_key' });
  });
});
